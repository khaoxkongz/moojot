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
import { AppEntryProvider, useAppEntry } from "@/context/app-entry";
import { authClient } from "@/lib/auth-client";
import { rememberedEmail, useRememberedEmail } from "@/lib/device-remembered-email";
import { NAV_THEME, themes } from "@/constants/theme";
import { themePreference, useColorScheme, useThemePreference } from "@/lib/use-color-scheme";
import { queryClient } from "@/utils/orpc";
import { GestureHandlerRootView } from "react-native-gesture-handler";

void SplashScreen.preventAutoHideAsync();
// The splash stays up until the saved theme is known, so the first screen never flashes the other palette.
void themePreference.load();
// The auth screen opens in sign-in mode with the remembered email, so it must be known before the first screen.
void rememberedEmail.load();

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
  const emailReady = useRememberedEmail().status === "ready";
  const ready = (fontsLoaded || Boolean(fontError)) && themeReady && emailReady;

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
      <AppEntryProvider>
        <RootNavigation isDarkColorScheme={isDarkColorScheme} />
      </AppEntryProvider>
    </QueryClientProvider>
  );
}

function RootNavigation({ isDarkColorScheme }: { isDarkColorScheme: boolean }) {
  const { entry } = useAppEntry();
  const { data: session } = authClient.useSession();
  const email = session?.user.email ?? null;

  // Every signed-in account becomes the remembered email, so sign-out reopens sign-in with it.
  useEffect(() => {
    if (email) void rememberedEmail.remember(email);
  }, [email]);

  return (
    <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
      <AppDataProvider>
        <GestureHandlerRootView style={styles.container}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={entry === "auth"}>
              <Stack.Screen
                name="(auth)"
                options={{ contentStyle: { backgroundColor: themes[isDarkColorScheme ? "dark" : "light"].background } }}
              />
            </Stack.Protected>
            <Stack.Protected guard={entry === "onboarding"}>
              <Stack.Screen
                name="onboarding"
                options={{ contentStyle: { backgroundColor: themes[isDarkColorScheme ? "dark" : "light"].background } }}
              />
            </Stack.Protected>
            <Stack.Protected guard={entry === "app"}>
              <Stack.Screen name="(app)" />
            </Stack.Protected>
          </Stack>
        </GestureHandlerRootView>
      </AppDataProvider>
    </ThemeProvider>
  );
}
