import type { AppThemeMode } from "@/constants/theme";

/** Raw text kept on this device, such as one small file. */
export interface ThemePreferenceStorage {
  read(): Promise<string | null>;
  write(text: string): Promise<void>;
}

export type ThemePreferenceSnapshot = {
  status: "loading" | "ready";
  /** null follows the device setting: nothing was chosen yet, or the saved choice could not be read. */
  choice: AppThemeMode | null;
  /** The saved choice could not be read, so the device setting is shown instead. */
  loadFailed: boolean;
  /** The last choice that could not be saved; the screen keeps the saved theme until a save succeeds. */
  saveFailed: AppThemeMode | null;
};

const parseChoice = (stored: string | null): AppThemeMode | null =>
  stored === "light" || stored === "dark" ? stored : null;

export function createThemePreference(storage: ThemePreferenceStorage) {
  let snapshot: ThemePreferenceSnapshot = {
    status: "loading",
    choice: null,
    loadFailed: false,
    saveFailed: null,
  };
  let saves: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();
  const update = (next: Partial<ThemePreferenceSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    for (const listener of listeners) listener();
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async load() {
      try {
        update({ status: "ready", choice: parseChoice(await storage.read()), loadFailed: false });
      } catch {
        update({ status: "ready", choice: null, loadFailed: true });
      }
    },
    /** Saves one choice at a time, so the theme on screen and on disk end on the last tap. */
    choose(choice: AppThemeMode) {
      const save = saves.then(async () => {
        try {
          await storage.write(choice);
        } catch (cause) {
          update({ saveFailed: choice });
          throw cause;
        }
        update({ choice, loadFailed: false, saveFailed: null });
      });
      saves = save.catch(() => {});
      return save;
    },
  };
}
