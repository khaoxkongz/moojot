import { Stack } from "expo-router/stack";

import { OnboardingFlowProvider } from "@/features/onboarding/flow-context";

export default function OnboardingLayout() {
  return (
    <OnboardingFlowProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#FFDA60" } }} />
    </OnboardingFlowProvider>
  );
}
