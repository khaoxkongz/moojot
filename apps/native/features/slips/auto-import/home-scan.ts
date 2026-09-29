import type { PhotoAccess } from "./photo-access";
import type { ScanRound, ScanTrigger, SlipScanSession } from "./scan-session";

/** What Home knows about where the person is: reading happens only while all of it allows. */
export interface HomeActivity {
  accountId: string | null;
  sessionId: string | null;
  /** Home is the screen in front, not covered by another screen. */
  focused: boolean;
  /** The app is in the foreground and active: not in another app, the app switcher or behind the lock screen. */
  appActive: boolean;
}

export interface HomeScanDisplay {
  /** A round is reading photos: Home says “หมูกำลังอ่านสลิปใหม่”. */
  reading: boolean;
  /** Home shows the slip animation: while reading, and while a pull-to-refresh is held or released. */
  animating: boolean;
  access: PhotoAccess | null;
}

/**
 * How far from the top a pull must still be when the finger lifts to count as a refresh. Pushing a pull back up to the
 * top before letting go cancels it.
 */
export const PULL_RELEASE_DISTANCE = 32;

const eligible = (activity: HomeActivity) => activity.accountId !== null && activity.focused && activity.appActive;

/**
 * Decides when Home reads slips. Entering Home, the app becoming active again while Home is focused, and a released
 * pull-to-refresh each request a round; they join one already running. Leaving Home or the app pauses it, and signing
 * out or switching accounts cancels it. Rounds end when their eligible work is done: nothing polls.
 *
 * The pull gesture is kept apart from the round itself. Holding a pull animates Home but requests nothing; only a
 * release requests a round, and neither holding nor cancelling changes a round already running.
 */
export function createHomeScan(session: SlipScanSession) {
  const listeners = new Set<() => void>();
  let activity: HomeActivity = { accountId: null, sessionId: null, focused: false, appActive: false };
  /**
   * `dragging`: finger down; `held`: finger down past the refresh point; `released`: let go, until the round it asked
   * for is reading or has ended.
   */
  let pull: "idle" | "dragging" | "held" | "released" = "idle";
  /** Identifies the latest release, so an earlier round finishing cannot end the animation of a later one. */
  let releaseId = 0;
  let display = compute();

  function compute(): HomeScanDisplay {
    const { scanning, access } = session.getState();
    return { reading: scanning, animating: scanning || pull === "held" || pull === "released", access };
  }

  function publish() {
    // Once a round is reading, it alone keeps Home animating.
    if (pull === "released" && session.getState().scanning) pull = "idle";
    const next = compute();
    if (next.reading === display.reading && next.animating === display.animating && next.access === display.access)
      return;
    display = next;
    for (const listener of listeners) listener();
  }

  function setPull(next: typeof pull) {
    pull = next;
    publish();
  }

  function request(trigger: ScanTrigger): Promise<ScanRound> | null {
    if (!eligible(activity)) return null;
    return session.request({ accountId: activity.accountId!, sessionId: activity.sessionId, trigger });
  }

  function refresh() {
    const round = request("refresh");
    if (!round) {
      setPull("idle");
      return null;
    }
    const id = ++releaseId;
    setPull("released");
    const end = () => {
      if (releaseId === id && pull === "released") setPull("idle");
    };
    void round.then(end, end);
    return round;
  }

  session.subscribe(publish);

  /** Report where the person is now. Returns the round this change started or joined, if any. */
  function update(next: HomeActivity): Promise<ScanRound> | null {
    const previous = activity;
    activity = next;
    const sameSignIn = previous.accountId === next.accountId && previous.sessionId === next.sessionId;
    if (previous.accountId !== null && previous.accountId !== next.accountId) session.cancel();
    if (!eligible(next)) {
      if (pull !== "idle") setPull("idle");
      if (eligible(previous)) session.pause();
      return null;
    }
    if (sameSignIn && eligible(previous)) return null;
    return request(sameSignIn && previous.focused ? "foreground" : "home");
  }

  return {
    getState: () => display,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update,
    /** Home is gone, such as when it unmounts: the same as it losing focus. */
    leave() {
      void update({ ...activity, focused: false });
    },
    /**
     * Request a round now, such as after the person answers the photo prompt: the round started by returning from the
     * prompt may have read the permission before the answer was recorded.
     */
    recheck: () => request("home"),
    /** The finger started dragging Home. */
    pullStart() {
      if (pull === "idle") setPull("dragging");
    },
    /**
     * The pull reached the refresh point. While the finger is still down (iOS) this only animates; when the platform
     * reports it on release (Android), it requests a round at once.
     */
    pullReady(): Promise<ScanRound> | null {
      if (pull === "dragging" || pull === "held") {
        setPull("held");
        return null;
      }
      return refresh();
    },
    /** The finger lifted, `distance` points below the top. A held pull still pulled down requests a round. */
    pullEnd(distance: number): Promise<ScanRound> | null {
      if (pull === "dragging") setPull("idle");
      if (pull !== "held") return null;
      if (distance >= PULL_RELEASE_DISTANCE) return refresh();
      setPull("idle");
      return null;
    },
  };
}

export type HomeScan = ReturnType<typeof createHomeScan>;
