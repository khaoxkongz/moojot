import { describe, expect, it } from "vite-plus/test";

import { createOnboardingDrafts, type OnboardingDraftStorage } from "./onboarding-draft";
import { goNext, setBirthDate, startOnboarding, toggleConsent, toggleGoal, toggleTerms } from "./onboarding-flow";

/** The device's kept text, one entry per account. */
function memoryStorage(initial: Record<string, string> = {}): OnboardingDraftStorage {
  const files = new Map(Object.entries(initial));
  return {
    read: async (userId) => files.get(userId) ?? null,
    write: async (userId, text) => {
      files.set(userId, text);
    },
    remove: async (userId) => {
      files.delete(userId);
    },
  };
}

/** On the photo step with terms accepted, a goal, a birthday and a consent already chosen. */
const onPhotoStep = () =>
  goNext(
    toggleConsent(setBirthDate(toggleGoal(toggleTerms(goNext(startOnboarding())), "debt"), "1999-12-31"), "updates")
  );

describe("setup draft", () => {
  it("resumes setup where the person left it after the app restarts, as after a change in Settings", async () => {
    const storage = memoryStorage();
    await createOnboardingDrafts(storage).keep("user-1", onPhotoStep());

    const resumed = await createOnboardingDrafts(storage).load("user-1");

    expect(resumed).toEqual(onPhotoStep());
    expect(resumed?.screen).toBe("photos");
  });

  it("does not show its errors again", async () => {
    const storage = memoryStorage();
    const withError = goNext(goNext(startOnboarding()));
    expect([withError.screen, withError.termsError]).toEqual(["terms", "กรุณายอมรับข้อตกลงการใช้งานก่อนเริ่มใช้งาน"]);
    await createOnboardingDrafts(storage).keep("user-1", withError);

    expect((await createOnboardingDrafts(storage).load("user-1"))?.termsError).toBeNull();
  });

  it("belongs to one account: another account on the device starts setup from the greeting", async () => {
    const storage = memoryStorage();
    await createOnboardingDrafts(storage).keep("user-1", onPhotoStep());

    expect(await createOnboardingDrafts(storage).load("user-2")).toBeNull();
  });

  it("keeps each account's draft, so a second account's setup leaves the first one's answers in place", async () => {
    const storage = memoryStorage();
    const drafts = createOnboardingDrafts(storage);
    await drafts.keep("user-1", onPhotoStep());
    await drafts.keep("user-2", goNext(startOnboarding()));
    await drafts.forget("user-2");

    expect(await createOnboardingDrafts(storage).load("user-1")).toEqual(onPhotoStep());
  });

  it("is gone once setup is saved", async () => {
    const storage = memoryStorage();
    const drafts = createOnboardingDrafts(storage);
    await drafts.keep("user-1", onPhotoStep());
    await drafts.forget("user-1");

    expect(await createOnboardingDrafts(storage).load("user-1")).toBeNull();
  });

  it("starts over when the kept draft cannot be read", async () => {
    expect(await createOnboardingDrafts(memoryStorage({ "user-1": "{not json" })).load("user-1")).toBeNull();
    const unknownScreen = JSON.stringify({ userId: "user-1", flow: { screen: "x" } });
    expect(await createOnboardingDrafts(memoryStorage({ "user-1": unknownScreen })).load("user-1")).toBeNull();
    const broken = memoryStorage();
    broken.read = async () => {
      throw new Error("disk");
    };
    expect(await createOnboardingDrafts(broken).load("user-1")).toBeNull();
  });
});
