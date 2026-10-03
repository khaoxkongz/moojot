import { Redirect } from "expo-router";

/** The splash now plays before auth, so a new account starts setup at its first screen. */
export default function OnboardingStartRoute() {
  return <Redirect href="/onboarding/greeting" />;
}
