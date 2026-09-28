import { Stack } from "expo-router/stack";
import { useAppTheme } from "@/lib/use-app-theme";

export const unstable_settings = {
  anchor: "sign-in",
};

export default function AuthLayout() {
  const theme = useAppTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
