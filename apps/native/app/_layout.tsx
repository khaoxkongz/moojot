import { QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { Stack } from "expo-router/stack";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { StyleSheet } from "react-native";

import { useAppFonts } from "@/constants/fonts";
import { AppDataProvider } from "@/context/app-data";
import { OnboardingProvider, useOnboarding } from "@/context/onboarding";
import { authClient } from "@/lib/auth-client";
import { NAV_THEME, themes } from "@/constants/theme";
import { themePreference, useColorScheme, useThemePreference } from "@/lib/use-color-scheme";
import { queryClient } from "@/utils/orpc";
import { GestureHandlerRootView } from "react-native-gesture-handler";

void SplashScreen.preventAutoHideAsync();
// The splash stays up until the saved theme is known, so the first screen never flashes the other palette.
void themePreference.load();

const LIGHT_THEME = {
  ...DefaultTheme,
  colors: NAV_THEME.light,
};
const DARK_THEME = {
  ...DarkTheme,
  colors: NAV_THEME.dark,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();
  const { isDarkColorScheme } = useColorScheme();
  const themeReady = useThemePreference().status === "ready";
  const ready = (fontsLoaded || Boolean(fontError)) && themeReady;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // The root view shows behind modals and during transitions; keep it on the same palette.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(themes[isDarkColorScheme ? "dark" : "light"].background);
  }, [isDarkColorScheme]);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={isDarkColorScheme ? "light" : "dark"} />
      <OnboardingProvider>
        <RootNavigation isDarkColorScheme={isDarkColorScheme} />
      </OnboardingProvider>
    </QueryClientProvider>
  );
}

function RootNavigation({ isDarkColorScheme }: { isDarkColorScheme: boolean }) {
  const { isComplete } = useOnboarding();
  const { data: session } = authClient.useSession();
  const userId = session?.user.id ?? null;
  const hasAccount = isComplete && Boolean(userId);

  return (
    <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
      <AppDataProvider>
        <GestureHandlerRootView style={styles.container}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!userId}>
              <Stack.Screen
                name="(auth)"
                options={{ contentStyle: { backgroundColor: themes[isDarkColorScheme ? "dark" : "light"].background } }}
              />
            </Stack.Protected>
            <Stack.Protected guard={Boolean(userId) && !isComplete}>
              <Stack.Screen
                name="onboarding"
                options={{ contentStyle: { backgroundColor: themes[isDarkColorScheme ? "dark" : "light"].background } }}
              />
            </Stack.Protected>
            <Stack.Protected guard={hasAccount}>
              <Stack.Screen name="(app)" />
            </Stack.Protected>
          </Stack>
        </GestureHandlerRootView>
      </AppDataProvider>
    </ThemeProvider>
  );
}
