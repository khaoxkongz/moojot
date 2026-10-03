import { SETUP_SETTING_KEYS } from "@moojot/api/shared/finance/setup-keys";

import { birthdayParts } from "../settings/birthday";
import { consentValue } from "../settings/profile-values";
import { missingAnswer, type OnboardingFlow } from "./onboarding-flow";

/** The account's settings on the server: the existing preference routes. */
export interface OnboardingSettings {
  setSetting(input: { key: string; value: string }): Promise<unknown>;
}

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
    [SETUP_SETTING_KEYS.email]: email,
    [SETUP_SETTING_KEYS.birthDate]: flow.birthDate ?? "",
    [SETUP_SETTING_KEYS.birthMonth]: birthMonth ? String(birthMonth) : "",
    [SETUP_SETTING_KEYS.personalization]: consentValue(flow.consents.personalization),
    [SETUP_SETTING_KEYS.updates]: consentValue(flow.consents.updates),
    [SETUP_SETTING_KEYS.goals]: JSON.stringify(flow.goals),
    [SETUP_SETTING_KEYS.termsAcceptedAt]: now.toISOString(),
  };
  // Every answer settles before the result, so a retry never races writes from the failed try.
  const writes = await Promise.allSettled(
    Object.entries(answers).map(([key, value]) => settings.setSetting({ key, value }))
  );
  const failure = writes.find((write) => write.status === "rejected");
  if (failure) return failed(failure.reason);
  // The setup check reads this flag, so it is saved last: setup is complete only once every answer is saved.
  try {
    await settings.setSetting({ key: SETUP_SETTING_KEYS.complete, value: "true" });
  } catch (cause) {
    return failed(cause);
  }
  return { status: "saved" };
}

function failed(cause: unknown): SaveOnboardingResult {
  console.warn("[onboarding-save]", cause);
  return { status: "failed", message: SAVE_FAILED };
}

export const CHECK_FAILED = "บันทึกแล้ว แต่ยังเปิดหน้าแรกไม่ได้ ลองอีกครั้ง";

/**
 * What a tap on the recap's button led to. `unconfirmed`: the server saved setup, but the setup check that opens Home
 * did not answer "complete". The next tap only asks the check again.
 */
export type SetupSaveResult = SaveOnboardingResult | { status: "unconfirmed"; message: string };
export type SetupSaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved" }
  | { status: "failed"; message: string }
  | { status: "unconfirmed"; message: string };

/**
 * The recap's save, held above the screen so it outlives it. A tap while a save is pending gets that save's result
 * and sends nothing. Setup shows `saving` as pending work and keeps the person on the recap until it ends.
 */
export function createSetupSave({
  settings,
  isComplete,
  forgetDraft,
}: {
  settings: OnboardingSettings;
  /** The setup check that opens Home. */
  isComplete: () => Promise<boolean>;
  /** Drops the device's copy of the answers once the server holds them. */
  forgetDraft: () => Promise<void>;
}) {
  let state: SetupSaveState = { status: "idle" };
  let pending: Promise<SetupSaveResult> | null = null;
  let savedOnServer = false;
  const listeners = new Set<() => void>();
  const set = (next: SetupSaveState) => {
    state = next;
    for (const listener of listeners) listener();
  };

  async function confirm(): Promise<SetupSaveResult> {
    let complete = false;
    try {
      complete = await isComplete();
    } catch (cause) {
      console.warn("[onboarding-check]", cause);
    }
    if (complete) {
      set({ status: "saved" });
      return { status: "saved" };
    }
    set({ status: "unconfirmed", message: CHECK_FAILED });
    return { status: "unconfirmed", message: CHECK_FAILED };
  }

  async function run(flow: OnboardingFlow, context: { email: string; now: Date }): Promise<SetupSaveResult> {
    set({ status: "saving" });
    if (!savedOnServer) {
      const result = await saveOnboarding(settings, flow, context);
      if (result.status === "incomplete") {
        set({ status: "idle" });
        return result;
      }
      if (result.status === "failed") {
        set(result);
        return result;
      }
      savedOnServer = true;
      await forgetDraft();
    }
    return confirm();
  }

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    save(flow: OnboardingFlow, context: { email: string; now: Date }): Promise<SetupSaveResult> {
      pending ??= run(flow, context).finally(() => {
        pending = null;
      });
      return pending;
    },
  };
}

export type SetupSave = ReturnType<typeof createSetupSave>;
