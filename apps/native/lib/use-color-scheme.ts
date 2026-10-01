import { useSyncExternalStore } from "react";
import { Appearance, useColorScheme as useRNColorScheme } from "react-native";

import type { AppThemeMode } from "@/constants/theme";
import { deviceThemeStorage } from "@/lib/device-theme-storage";
import { createThemePreference } from "@/lib/theme-preference";

export const themePreference = createThemePreference(deviceThemeStorage);

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

  return { colorScheme, isDarkColorScheme: colorScheme === "dark" };
}
