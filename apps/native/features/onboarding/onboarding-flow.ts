import type { ISODate } from "../../types/finance";
import type { ConsentSetting } from "../settings/profile-values";

/** The four setup steps, in order, after the greeting. The recap ("ready") follows the last one. */
export const ONBOARDING_STEPS = ["terms", "slips", "goals", "extras"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
export type OnboardingScreen = "greeting" | OnboardingStep | "ready";

/** Why the person wants to record spending. The keys are saved; the labels are what the person picked. */
export const ONBOARDING_GOALS = [
  { key: "reduce", label: "ลดรายจ่าย" },
  { key: "dream", label: "เก็บเงินซื้อของ ตามฝัน" },
  { key: "save", label: "ออมเงินเพิ่ม" },
  { key: "mindful", label: "ใช้จ่ายอย่างมีสติ" },
  { key: "budget", label: "คุมงบใช้จ่าย" },
  { key: "debt", label: "ปลดหนี้" },
] as const;
export type OnboardingGoal = (typeof ONBOARDING_GOALS)[number]["key"];

/** Setup's answers and where the person is. It lives on the device until the answers are saved. */
export type OnboardingFlow = {
  screen: OnboardingScreen;
  termsAccepted: boolean;
  termsError: string | null;
  goals: OnboardingGoal[];
  goalsError: string | null;
  /** Optional, YYYY-MM-DD. */
  birthDate: ISODate | null;
  /** The two consent switches start off. */
  consents: Record<ConsentSetting, boolean>;
};

export const TERMS_REQUIRED = "กรุณายอมรับข้อตกลงการใช้งานก่อนเริ่มใช้งาน";
export const GOAL_REQUIRED = "เลือกอย่างน้อย 1 ข้อนะ";

export function startOnboarding(): OnboardingFlow {
  return {
    screen: "greeting",
    termsAccepted: false,
    termsError: null,
    goals: [],
    goalsError: null,
    birthDate: null,
    consents: { personalization: false, updates: false },
  };
}

/** A new screen starts without the last screen's errors. */
const show = (flow: OnboardingFlow, screen: OnboardingScreen): OnboardingFlow => ({
  ...flow,
  screen,
  termsError: null,
  goalsError: null,
});

/** "ต่อไป" on the current screen: it moves on, or stays and says what is missing. */
export function goNext(flow: OnboardingFlow): OnboardingFlow {
  switch (flow.screen) {
    case "greeting":
      return show(flow, "terms");
    case "terms":
      return flow.termsAccepted ? show(flow, "slips") : { ...flow, termsError: TERMS_REQUIRED };
    case "slips":
      return show(flow, "goals");
    case "goals":
      return flow.goals.length > 0 ? show(flow, "extras") : { ...flow, goalsError: GOAL_REQUIRED };
    case "extras":
      return show(flow, "ready");
    case "ready":
      return flow;
  }
}

/** The step whose required answer is missing, showing its error, or null when setup can be saved. */
export function missingAnswer(flow: OnboardingFlow): OnboardingFlow | null {
  if (!flow.termsAccepted) return { ...show(flow, "terms"), termsError: TERMS_REQUIRED };
  if (flow.goals.length === 0) return { ...show(flow, "goals"), goalsError: GOAL_REQUIRED };
  return null;
}

/** The back button: the recap returns to the last step, the first step to the greeting. */
export function goBack(flow: OnboardingFlow): OnboardingFlow {
  if (flow.screen === "greeting") return flow;
  if (flow.screen === "ready") return show(flow, ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1]!);
  const index = ONBOARDING_STEPS.indexOf(flow.screen);
  return show(flow, index > 0 ? ONBOARDING_STEPS[index - 1]! : "greeting");
}

const STEP_NAMES: Record<OnboardingStep, string> = {
  terms: "ข้อตกลง",
  slips: "อ่านสลิป",
  goals: "เป้าหมาย",
  extras: "ข้อมูลเพิ่มเติม",
};

/** The step header's "N/4" and its spoken label, or null on the greeting and the recap, which have no progress. */
export function onboardingProgress(screen: OnboardingScreen) {
  const index = ONBOARDING_STEPS.indexOf(screen as OnboardingStep);
  if (index < 0) return null;
  const total = ONBOARDING_STEPS.length;
  return { number: index + 1, total, label: `ขั้นที่ ${index + 1} จาก ${total}: ${STEP_NAMES[screen as OnboardingStep]}` };
}

export function toggleTerms(flow: OnboardingFlow): OnboardingFlow {
  return { ...flow, termsAccepted: !flow.termsAccepted, termsError: null };
}

export function toggleGoal(flow: OnboardingFlow, goal: OnboardingGoal): OnboardingFlow {
  const goals = flow.goals.includes(goal) ? flow.goals.filter((key) => key !== goal) : [...flow.goals, goal];
  return { ...flow, goals, goalsError: null };
}

export function setBirthDate(flow: OnboardingFlow, birthDate: ISODate | null): OnboardingFlow {
  return { ...flow, birthDate };
}

export function toggleConsent(flow: OnboardingFlow, setting: ConsentSetting): OnboardingFlow {
  return { ...flow, consents: { ...flow.consents, [setting]: !flow.consents[setting] } };
}
