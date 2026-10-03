import { z } from "zod";

import {
  ONBOARDING_GOALS,
  ONBOARDING_STEPS,
  startOnboarding,
  type OnboardingFlow,
  type OnboardingGoal,
} from "./onboarding-flow";

const goalKeys = ONBOARDING_GOALS.map((goal) => goal.key) as [OnboardingGoal, ...OnboardingGoal[]];

/** Raw text kept on this device, such as one small file. */
export interface OnboardingDraftStorage {
  read(): Promise<string | null>;
  write(text: string): Promise<void>;
  remove(): Promise<void>;
}

const keptDraft = z.object({
  userId: z.string(),
  flow: z.object({
    screen: z.enum(["greeting", ...ONBOARDING_STEPS, "ready"]),
    termsAccepted: z.boolean(),
    goals: z.array(z.enum(goalKeys)),
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    consents: z.object({ personalization: z.boolean(), updates: z.boolean() }),
  }),
});

/**
 * Setup's answers kept on this device until they are saved. iOS stops the app when the person changes its photo
 * access in Settings, so setup must come back at the same step with the same answers. A draft belongs to one account.
 */
export function createOnboardingDrafts(storage: OnboardingDraftStorage) {
  return {
    /** The account's unsaved setup, or null to start at the greeting. */
    async load(userId: string): Promise<OnboardingFlow | null> {
      try {
        const text = await storage.read();
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
        await storage.write(JSON.stringify({ userId, flow: { screen, termsAccepted, goals, birthDate, consents } }));
      } catch {
        // Kept in memory for this run.
      }
    },
    async forget() {
      try {
        await storage.remove();
      } catch {
        // A draft left behind is replaced by the next setup, and an account with setup saved never opens it.
      }
    },
  };
}
