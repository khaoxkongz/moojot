import { Stack } from "expo-router/stack";
import { useAppTheme } from "@/lib/use-app-theme";

export const unstable_settings = {
  anchor: "index",
};

export default function AuthLayout() {
  const theme = useAppTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" options={{ animation: "fade" }} />
    </Stack>
  );
}
