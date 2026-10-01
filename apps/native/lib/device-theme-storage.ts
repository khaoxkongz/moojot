import { File, Paths } from "expo-file-system";

import type { ThemePreferenceStorage } from "@/lib/theme-preference";

const STORAGE_KEY = "moojot-theme-v1";
const themeFile = () => new File(Paths.document, `${STORAGE_KEY}.txt`);

/** One small file per device, readable before sign-in so auth screens use the chosen theme too. */
export const deviceThemeStorage: ThemePreferenceStorage =
  process.env.EXPO_OS === "web"
    ? {
        read: async () => globalThis.localStorage?.getItem(STORAGE_KEY) ?? null,
        write: async (text) => globalThis.localStorage?.setItem(STORAGE_KEY, text),
      }
    : {
        async read() {
          const file = themeFile();
          return file.exists ? file.text() : null;
        },
        async write(text) {
          const file = themeFile();
          if (!file.exists) file.create();
          file.write(text);
        },
      };
