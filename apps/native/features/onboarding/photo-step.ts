import { slipAlbumSources, slipLookbackDays } from "../slips/auto-import/albums";
import type { SlipAlbumCounts } from "../slips/auto-import/discovery";
import type { PhotoAccess } from "../slips/auto-import/photo-access";
import { errorMessage } from "../../utils/format";

export type SlipPhotoCount = { counts: SlipAlbumCounts; total: number; matchedAlbums: number };

/** The device's photo permission and its bank albums' metadata. Nothing here reads a photo or sends one anywhere. */
export interface PhotoStepPorts {
  /** The current permission, without a system prompt. */
  read(): Promise<PhotoAccess>;
  /** The system prompt, while it can still appear; otherwise the current permission. */
  request(): Promise<PhotoAccess>;
  /** Photos from the last 30 days in the supported bank albums. */
  count(): Promise<SlipPhotoCount>;
}

/**
 * The setup step's view of photo access. `ask` is a permission never answered: the step explains slip reading and
 * waits for "allow" or "skip". `skipped` is the person's choice in setup, not a system permission.
 */
export type PhotoStepState =
  | { status: "checking" }
  | { status: "ask" }
  | { status: "skipped" }
  | { status: "counting" }
  | ({ status: "counted" } & SlipPhotoCount)
  | { status: "limited" }
  | { status: "denied" }
  | { status: "unsupported" }
  | { status: "failed"; message: string };

export function createPhotoStep(ports: PhotoStepPorts) {
  let state: PhotoStepState = { status: "checking" };
  let skipped = false;
  const listeners = new Set<() => void>();
  const set = (next: PhotoStepState) => {
    state = next;
    for (const listener of listeners) listener();
  };

  // Each check or prompt is a run; only the latest run may change what the step shows.
  let latestRun = 0;

  async function run(readAccess: () => Promise<PhotoAccess>) {
    const current = ++latestRun;
    const isLatest = () => current === latestRun;
    try {
      const access = await readAccess();
      if (!isLatest()) return;
      if (access !== "all")
        return set(access === "permission-required" ? { status: skipped ? "skipped" : "ask" } : { status: access });
      set({ status: "counting" });
      const found = await ports.count();
      if (isLatest()) set({ status: "counted", ...found });
    } catch (cause) {
      if (isLatest()) set({ status: "failed", message: errorMessage(cause) });
    }
  }

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** Reads the permission again, as on entering setup or on returning from Settings. Never prompts. */
    check: () => run(ports.read),
    /** "อนุญาตและค้นหาสลิป": the system prompt while it can still appear, then the count. */
    allow() {
      skipped = false;
      return run(ports.request);
    },
    /** "ข้ามไปก่อน": setup goes on without photos; Home can ask again later. */
    skip() {
      skipped = true;
      if (state.status === "ask") set({ status: "skipped" });
    },
  };
}

export type PhotoStep = ReturnType<typeof createPhotoStep>;

const albumIcons = {
  krungthai: "bank-outline",
  kplus: "bank-outline",
  paotang: "cellphone",
  truemoney: "wallet-outline",
} as const;

/** "อัลบั้มที่หมูอ่านได้": each supported bank album, with its count once the albums are counted. */
export function slipAlbumRows(state: PhotoStepState) {
  return slipAlbumSources.map((source) => {
    const found = state.status === "counted" ? state.counts[source.id] : 0;
    return {
      id: source.id,
      name: source.name,
      icon: albumIcons[source.id],
      found: found > 0,
      count:
        state.status === "counted" ? (found > 0 ? `${found} รูป` : "ไม่พบรูป") : state.status === "counting" ? "…" : "",
    };
  });
}

const NOT_ALLOWED = "ยังไม่ได้อนุญาตให้เข้าถึงรูป อนุญาตภายหลังจากหน้าแรกได้";

/** The recap's "สลิป" row: photos found in the albums, which Home reads after setup. They are not saved entries yet. */
export function photoRecap(state: PhotoStepState): string {
  switch (state.status) {
    case "counted":
      return state.total > 0
        ? `เข้าหน้าแรกแล้ว หมูจะอ่าน ${state.total} รูปและจดให้อัตโนมัติ`
        : `อนุญาตแล้ว แต่ยังไม่พบรูปในอัลบั้มสลิป ${slipLookbackDays} วันที่ผ่านมา`;
    case "failed":
      return "อนุญาตแล้ว เข้าหน้าแรกแล้วหมูจะอ่านรูปในอัลบั้มสลิปให้";
    case "checking":
    case "counting":
      return "กำลังนับรูปในอัลบั้ม…";
    case "limited":
      return "เข้าถึงรูปได้บางส่วน หมูจึงยังอ่านสลิปไม่ได้ อนุญาตทั้งหมดภายหลังจากหน้าแรกได้";
    case "unsupported":
      return "เครื่องนี้ไม่มีคลังรูปให้หมูอ่าน จดรายการเองได้ตามปกติ";
    case "ask":
    case "skipped":
    case "denied":
      return NOT_ALLOWED;
  }
}
