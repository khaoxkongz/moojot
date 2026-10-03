import { useEffect } from "react";
import { BackHandler, View } from "react-native";

import { ExtrasStep } from "@/features/onboarding/components/extras-step";
import { GoalsStep } from "@/features/onboarding/components/goals-step";
import { Greeting } from "@/features/onboarding/components/greeting";
import { ReadyScreen } from "@/features/onboarding/components/ready-screen";
import { PhotoAccessStep } from "@/features/onboarding/components/photo-access-step";
import { StepHeader } from "@/features/onboarding/components/step-parts";
import { TermsStep } from "@/features/onboarding/components/terms-step";
import { useOnboarding } from "@/features/onboarding/onboarding-context";
import { goBack, goNext } from "@/features/onboarding/onboarding-flow";
import { useAppTheme } from "@/lib/use-app-theme";

const steps = { terms: TermsStep, photos: PhotoAccessStep, goals: GoalsStep, extras: ExtrasStep, ready: ReadyScreen };

/**
 * Setup: the greeting, four steps (terms, photo access, goals, optional information) and the recap. The guard opens
 * it for an account whose setup is not complete. It starts at the greeting, or at the step the account's draft on this
 * device kept. While the recap's save is pending, back does nothing, so the person stays on the recap until it ends.
 */
export default function OnboardingRoute() {
  const theme = useAppTheme();
  const { flow, update, saveState } = useOnboarding();
  const { screen } = flow;
  const saving = saveState.status === "saving";
  const back = () => {
    if (!saving) update(goBack);
  };

  useEffect(() => {
    // Android's back button walks the steps like the header's back button; on the greeting it leaves the app.
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (screen === "greeting") return false;
      if (!saving) update(goBack);
      return true;
    });
    return () => subscription.remove();
  }, [screen, saving, update]);

  if (screen === "greeting") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <Greeting onStart={() => update(goNext)} />
      </View>
    );
  }
  const Step = steps[screen];
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StepHeader screen={screen} onBack={back} />
      <Step />
    </View>
  );
}
