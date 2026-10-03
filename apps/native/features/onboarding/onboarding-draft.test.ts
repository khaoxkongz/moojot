import { describe, expect, it } from "vite-plus/test";

import { createOnboardingDrafts, type OnboardingDraftStorage } from "./onboarding-draft";
import { goNext, setBirthDate, startOnboarding, toggleConsent, toggleGoal, toggleTerms } from "./onboarding-flow";

function memoryStorage(initial: string | null = null): OnboardingDraftStorage & { text: string | null } {
  const storage = {
    text: initial,
    read: async () => storage.text,
    write: async (text: string) => {
      storage.text = text;
    },
    remove: async () => {
      storage.text = null;
    },
  };
  return storage;
}

/** On the photo step with terms accepted, a goal, a birthday and a consent already chosen. */
const onSlips = () =>
  goNext(
    toggleConsent(setBirthDate(toggleGoal(toggleTerms(goNext(startOnboarding())), "debt"), "1999-12-31"), "updates")
  );

describe("setup draft", () => {
  it("resumes setup where the person left it after the app restarts, as after a change in Settings", async () => {
    const storage = memoryStorage();
    await createOnboardingDrafts(storage).keep("user-1", onSlips());

    const resumed = await createOnboardingDrafts(storage).load("user-1");

    expect(resumed).toEqual(onSlips());
    expect(resumed?.screen).toBe("slips");
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
    await createOnboardingDrafts(storage).keep("user-1", onSlips());

    expect(await createOnboardingDrafts(storage).load("user-2")).toBeNull();
  });

  it("is gone once setup is saved", async () => {
    const storage = memoryStorage();
    const drafts = createOnboardingDrafts(storage);
    await drafts.keep("user-1", onSlips());
    await drafts.forget();

    expect(await createOnboardingDrafts(storage).load("user-1")).toBeNull();
  });

  it("starts over when the kept draft cannot be read", async () => {
    expect(await createOnboardingDrafts(memoryStorage("{not json")).load("user-1")).toBeNull();
    expect(
      await createOnboardingDrafts(memoryStorage(JSON.stringify({ userId: "user-1", flow: { screen: "x" } }))).load(
        "user-1"
      )
    ).toBeNull();
    const broken = memoryStorage();
    broken.read = async () => {
      throw new Error("disk");
    };
    expect(await createOnboardingDrafts(broken).load("user-1")).toBeNull();
  });
});
