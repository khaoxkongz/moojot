import { Stack } from "expo-router/stack";

import { OnboardingProvider } from "@/features/onboarding/onboarding-context";
import { useAppTheme } from "@/lib/use-app-theme";

export default function OnboardingLayout() {
  const theme = useAppTheme();
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }} />
    </OnboardingProvider>
  );
}
