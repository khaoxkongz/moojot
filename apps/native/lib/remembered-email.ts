/**
 * The email of the latest account signed in on this device. After sign-out the auth screen opens in sign-in mode with
 * it; without one, the app opens signup. Only the email is kept, never the password.
 */

/** Raw text kept on this device, such as one small file. */
export interface RememberedEmailStorage {
  read(): Promise<string | null>;
  write(text: string): Promise<void>;
}

export type RememberedEmailSnapshot = { status: "loading" | "ready"; email: string | null };

export function createRememberedEmail(storage: RememberedEmailStorage) {
  let snapshot: RememberedEmailSnapshot = { status: "loading", email: null };
  const listeners = new Set<() => void>();
  const update = (next: RememberedEmailSnapshot) => {
    snapshot = next;
    for (const listener of listeners) listener();
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async load() {
      let email: string | null = null;
      try {
        email = (await storage.read())?.trim() || null;
      } catch {
        // An unreadable file only means the next screen is signup; the user can switch.
      }
      update({ status: "ready", email });
    },
    /** Shown at once; a failed save only loses it at the next app start. */
    async remember(email: string) {
      if (snapshot.email === email && snapshot.status === "ready") return;
      update({ status: "ready", email });
      try {
        await storage.write(email);
      } catch {
        // Kept in memory for this run.
      }
    },
  };
}

export type RememberedEmail = ReturnType<typeof createRememberedEmail>;
