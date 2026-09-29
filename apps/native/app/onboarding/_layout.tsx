import { Stack } from "expo-router/stack";

import { OnboardingFlowProvider } from "@/features/onboarding/flow-context";
import { useAppTheme } from "@/lib/use-app-theme";

export default function OnboardingLayout() {
  const theme = useAppTheme();
  return (
    <OnboardingFlowProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }} />
    </OnboardingFlowProvider>
  );
}
