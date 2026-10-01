import { File, Paths } from "expo-file-system";
import { useSyncExternalStore } from "react";
import { Appearance, useColorScheme as useRNColorScheme } from "react-native";

import type { AppThemeMode } from "@/constants/theme";
import { createThemePreference, type ThemePreferenceStorage } from "@/features/settings/theme-preference";

const STORAGE_KEY = "moojot-theme-v1";

/** One small file per device, readable before sign-in so auth screens use the chosen theme too. */
const deviceStorage: ThemePreferenceStorage =
  process.env.EXPO_OS === "web"
    ? {
        read: async () => globalThis.localStorage?.getItem(STORAGE_KEY) ?? null,
        write: async (text) => globalThis.localStorage?.setItem(STORAGE_KEY, text),
      }
    : {
        async read() {
          const file = new File(Paths.document, `${STORAGE_KEY}.txt`);
          return file.exists ? file.text() : null;
        },
        async write(text) {
          const file = new File(Paths.document, `${STORAGE_KEY}.txt`);
          if (!file.exists) file.create();
          file.write(text);
        },
      };

export const themePreference = createThemePreference(deviceStorage);

// Native views the app does not draw (keyboard, alerts, pickers) follow the same choice as the app's palette.
let appliedChoice: AppThemeMode | null = null;
themePreference.subscribe(() => {
  const { choice } = themePreference.getSnapshot();
  if (choice === appliedChoice) return;
  appliedChoice = choice;
  Appearance.setColorScheme(choice ?? "unspecified");
});

export function useThemePreference() {
  return useSyncExternalStore(themePreference.subscribe, themePreference.getSnapshot);
}

/** The app's color scheme: the theme chosen in settings, else the device setting. */
export function useColorScheme() {
  const systemColorScheme = useRNColorScheme();
  const { choice } = useThemePreference();
  const colorScheme: AppThemeMode = choice ?? (systemColorScheme === "dark" ? "dark" : "light");

  return {
    colorScheme,
    isDarkColorScheme: colorScheme === "dark",
    setColorScheme: themePreference.choose,
  };
}
