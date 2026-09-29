import { Stack } from "expo-router/stack";

export const unstable_settings = {
  anchor: "sign-in",
};

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#FFDA60" } }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
