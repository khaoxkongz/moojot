import { describe, expect, it } from "vite-plus/test";

import { SETUP_SETTING_KEYS } from "@moojot/api/shared/finance/setup-keys";

import { goNext, startOnboarding, toggleGoal, toggleTerms } from "./onboarding-flow";
import { createSetupSave, SAVE_FAILED, type OnboardingSettings } from "./save-onboarding";

const now = new Date("2026-10-04T09:30:00+07:00");
const answered = () => goNext(goNext(toggleGoal(goNext(goNext(toggleTerms(goNext(startOnboarding())))), "save")));

/**
 * The account's settings on the server, reached over the network. `held` keeps every write waiting until
 * `release()`. The setup check fails `checkFailures` times before it answers.
 */
function server({ held = false, writesFail = false, checkFailures = 0 } = {}) {
  const saved = new Map<string, string>();
  let requests = 0;
  let release = () => {};
  const gate = held ? new Promise<void>((resolve) => (release = resolve)) : Promise.resolve();
  const settings: OnboardingSettings = {
    async setSetting({ key, value }) {
      requests++;
      await gate;
      if (writesFail) throw new TypeError("Network request failed");
      saved.set(key, value);
    },
  };
  let failures = checkFailures;
  const isComplete = async () => {
    if (failures-- > 0) throw new TypeError("Network request failed");
    return saved.get(SETUP_SETTING_KEYS.complete) === "true";
  };
  const draft = { kept: true };
  const save = createSetupSave({
    settings,
    isComplete,
    forgetDraft: async () => {
      draft.kept = false;
    },
  });
  return { save, draft, release, requests: () => requests };
}

describe("saving setup", () => {
  it("sends one save for a double tap, and shows it as pending until it ends", async () => {
    const phone = server({ held: true });

    const first = phone.save.save(answered(), { email: "a@example.test", now });
    const second = phone.save.save(answered(), { email: "a@example.test", now });
    expect(phone.save.getState()).toEqual({ status: "saving" });
    phone.release();

    expect(await first).toEqual({ status: "saved" });
    expect(await second).toEqual({ status: "saved" });
    expect(phone.requests()).toBe(8);
    expect(phone.save.getState()).toEqual({ status: "saved" });
  });

  it("keeps the draft and says the save failed when an answer is not saved", async () => {
    const phone = server({ writesFail: true });

    expect(await phone.save.save(answered(), { email: "a@example.test", now })).toEqual({
      status: "failed",
      message: SAVE_FAILED,
    });
    expect(phone.save.getState()).toEqual({ status: "failed", message: SAVE_FAILED });
    expect(phone.draft.kept).toBe(true);
  });

  it("does not call a completed save a failure when the setup check fails after it, and the next tap only checks", async () => {
    const phone = server({ checkFailures: 1 });

    const unconfirmed = await phone.save.save(answered(), { email: "a@example.test", now });
    expect(unconfirmed).toEqual({ status: "unconfirmed", message: "บันทึกแล้ว แต่ยังเปิดหน้าแรกไม่ได้ ลองอีกครั้ง" });
    expect(phone.draft.kept).toBe(false);

    expect(await phone.save.save(answered(), { email: "a@example.test", now })).toEqual({ status: "saved" });
    expect(phone.requests()).toBe(8);
  });
});
