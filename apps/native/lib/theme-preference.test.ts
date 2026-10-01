import { describe, expect, it } from "vite-plus/test";

import { createThemePreference, type ThemePreferenceStorage } from "./theme-preference";

function memoryStorage(initial: string | null = null) {
  let stored = initial;
  const storage: ThemePreferenceStorage = {
    read: async () => stored,
    write: async (text) => {
      stored = text;
    },
  };
  return storage;
}

async function reopen(storage: ThemePreferenceStorage) {
  const preference = createThemePreference(storage);
  await preference.load();
  return preference.getSnapshot();
}

describe("theme preference", () => {
  it("keeps the chosen theme after the app is opened again", async () => {
    const storage = memoryStorage();
    const preference = createThemePreference(storage);
    await preference.load();

    await preference.choose("dark");

    expect(preference.getSnapshot().choice).toBe("dark");
    expect((await reopen(storage)).choice).toBe("dark");
  });

  it("follows the device and says so when the saved choice cannot be read", async () => {
    const preference = createThemePreference({
      read: async () => {
        throw new Error("disk unavailable");
      },
      write: async () => {},
    });

    await preference.load();

    expect(preference.getSnapshot()).toMatchObject({ status: "ready", choice: null, loadFailed: true });
  });

  it("keeps showing the saved theme when a new choice cannot be saved, and saves it on a later try", async () => {
    const storage = memoryStorage("light");
    let failWrites = true;
    const preference = createThemePreference({
      read: storage.read,
      write: async (text) => {
        if (failWrites) throw new Error("disk full");
        await storage.write(text);
      },
    });
    await preference.load();

    await expect(preference.choose("dark")).rejects.toThrow("disk full");

    expect(preference.getSnapshot()).toMatchObject({ choice: "light", saveFailed: "dark" });
    expect((await reopen(storage)).choice).toBe("light");

    failWrites = false;
    await preference.choose("dark");

    expect(preference.getSnapshot()).toMatchObject({ choice: "dark", saveFailed: null });
    expect((await reopen(storage)).choice).toBe("dark");
  });

  it("ends on the last theme tapped when an earlier save finishes later", async () => {
    const storage = memoryStorage();
    const slowSaves: Array<() => Promise<void>> = [];
    const preference = createThemePreference({
      read: storage.read,
      write: (text) => new Promise<void>((resolve) => slowSaves.push(() => storage.write(text).then(resolve))),
    });
    await preference.load();

    const taps = Promise.all([preference.choose("dark"), preference.choose("light")]);
    // Finish whichever saves have started, newest first, until every tap has settled.
    let settled = false;
    void taps.then(() => (settled = true));
    while (!settled) {
      for (const finish of slowSaves.splice(0).reverse()) await finish();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    expect(preference.getSnapshot().choice).toBe("light");
    expect((await reopen(storage)).choice).toBe("light");
  });
});
