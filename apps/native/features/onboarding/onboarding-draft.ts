import { z } from "zod";

import { isValidISODate } from "../../utils/format";

import {
  ONBOARDING_GOALS,
  ONBOARDING_STEPS,
  startOnboarding,
  type OnboardingFlow,
  type OnboardingGoal,
} from "./onboarding-flow";

const goalKeys = ONBOARDING_GOALS.map((goal) => goal.key) as [OnboardingGoal, ...OnboardingGoal[]];

/** Raw text kept on this device for one account, such as one small file per account. */
export interface OnboardingDraftStorage {
  read(userId: string): Promise<string | null>;
  write(userId: string, text: string): Promise<void>;
  remove(userId: string): Promise<void>;
}

const keptDraft = z.object({
  userId: z.string(),
  flow: z.object({
    screen: z.enum(["greeting", ...ONBOARDING_STEPS, "ready"]),
    termsAccepted: z.boolean(),
    goals: z.array(z.enum(goalKeys)),
    birthDate: z.string().refine(isValidISODate).nullable(),
    consents: z.object({ personalization: z.boolean(), updates: z.boolean() }),
  }),
});

/**
 * Setup's answers kept on this device until they are saved. iOS stops the app when the person changes its photo
 * access in Settings, so setup must come back at the same step with the same answers. Each account keeps its own
 * draft, so a second account's setup on the device leaves the first one's answers in place.
 */
export function createOnboardingDrafts(storage: OnboardingDraftStorage) {
  return {
    /** The account's unsaved setup, or null to start at the greeting. */
    async load(userId: string): Promise<OnboardingFlow | null> {
      try {
        const text = await storage.read(userId);
        if (!text) return null;
        const kept = keptDraft.safeParse(JSON.parse(text));
        if (!kept.success || kept.data.userId !== userId) return null;
        return { ...startOnboarding(), ...kept.data.flow };
      } catch {
        // An unreadable draft only means setup starts again from the greeting.
        return null;
      }
    },
    /** A failed write only loses the draft if the app stops before setup is saved. */
    async keep(userId: string, { screen, termsAccepted, goals, birthDate, consents }: OnboardingFlow) {
      try {
        await storage.write(
          userId,
          JSON.stringify({ userId, flow: { screen, termsAccepted, goals, birthDate, consents } })
        );
      } catch {
        // Kept in memory for this run.
      }
    },
    async forget(userId: string) {
      try {
        await storage.remove(userId);
      } catch {
        // An account with setup saved never opens its draft again.
      }
    },
  };
}
