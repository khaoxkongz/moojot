import { birthdayParts } from "../settings/birthday";
import { PROFILE_SETTING_KEYS } from "../settings/profile-values";
import { missingAnswer, type OnboardingFlow } from "./onboarding-flow";

/** The account's settings on the server: the existing preference routes. */
export interface OnboardingSettings {
  setSetting(input: { key: string; value: string }): Promise<unknown>;
}

/** The flag the setup check reads. Setup is complete only once this is saved, and it is saved last. */
const COMPLETE_KEY = "onboarding_complete_v1";

export const SAVE_FAILED = "บันทึกไม่สำเร็จ ลองอีกครั้ง";

/**
 * `failed` leaves setup incomplete: the device keeps the answers, and the same save can be tried again.
 * `incomplete` sent nothing: its flow is the step with the missing answer.
 */
export type SaveOnboardingResult =
  | { status: "saved" }
  | { status: "failed"; message: string }
  | { status: "incomplete"; flow: OnboardingFlow };

/**
 * "เริ่มใช้งานหมูจดเลย!": saves setup's answers, then marks setup complete. The setup check then opens Home. A
 * failed answer stops before the mark, so a partial save never claims setup is done; saving again overwrites
 * whatever the failed try saved.
 */
export async function saveOnboarding(
  settings: OnboardingSettings,
  flow: OnboardingFlow,
  { email, now }: { email: string; now: Date }
): Promise<SaveOnboardingResult> {
  const missing = missingAnswer(flow);
  if (missing) return { status: "incomplete", flow: missing };
  const birthMonth = birthdayParts(flow.birthDate)?.month;
  const answers: Record<string, string> = {
    [PROFILE_SETTING_KEYS.email]: email,
    [PROFILE_SETTING_KEYS.birthDate]: flow.birthDate ?? "",
    [PROFILE_SETTING_KEYS.birthMonth]: birthMonth ? String(birthMonth) : "",
    [PROFILE_SETTING_KEYS.personalization]: flow.consents.personalization ? "yes" : "no",
    [PROFILE_SETTING_KEYS.updates]: flow.consents.updates ? "yes" : "no",
    onboarding_reasons: JSON.stringify(flow.goals),
    onboarding_terms_accepted_v1: now.toISOString(),
  };
  // Every answer settles before the result, so a retry never races writes from the failed try.
  const writes = await Promise.allSettled(
    Object.entries(answers).map(([key, value]) => settings.setSetting({ key, value }))
  );
  const failure = writes.find((write) => write.status === "rejected");
  if (failure) return failed(failure.reason);
  try {
    await settings.setSetting({ key: COMPLETE_KEY, value: "true" });
  } catch (cause) {
    return failed(cause);
  }
  return { status: "saved" };
}

function failed(cause: unknown): SaveOnboardingResult {
  console.warn("[onboarding-save]", cause);
  return { status: "failed", message: SAVE_FAILED };
}
