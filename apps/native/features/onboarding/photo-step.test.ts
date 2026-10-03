import { describe, expect, it } from "vite-plus/test";

import type { PhotoAccess } from "../slips/auto-import/photo-access";
import { createPhotoStep, photoRecap, slipAlbumRows, type PhotoStepPorts } from "./photo-step";

const found = { counts: { krungthai: 2, kplus: 0, paotang: 1, truemoney: 0 }, total: 3, matchedAlbums: 2 };

/** The device: its photo permission, the answer the person gives the system prompt, and the bank albums. */
function device(access: PhotoAccess, { answer = "all" as PhotoAccess } = {}) {
  const phone = { access, prompts: 0, countFails: false };
  const ports: PhotoStepPorts = {
    read: async () => phone.access,
    request: async () => {
      if (phone.access !== "permission-required") return phone.access;
      phone.prompts++;
      phone.access = answer;
      return answer;
    },
    count: async () => {
      if (phone.countFails) throw new Error("อ่านอัลบั้มไม่ได้");
      return found;
    },
  };
  return { phone, ports };
}

describe("photo step", () => {
  it("counts the bank albums at once, without a prompt, when full access was given before", async () => {
    const { phone, ports } = device("all");
    const step = createPhotoStep(ports);

    await step.check();

    expect(step.getState()).toEqual({ status: "counted", ...found });
    expect(phone.prompts).toBe(0);
  });

  it("explains first: an unanswered permission waits until the person allows or skips", async () => {
    const { phone, ports } = device("permission-required");
    const step = createPhotoStep(ports);

    await step.check();
    expect(step.getState()).toEqual({ status: "ask" });

    step.skip();
    await step.check();
    expect(step.getState()).toEqual({ status: "skipped" });
    expect(phone.prompts).toBe(0);
  });

  it("shows the system prompt when the person allows, then counts the albums", async () => {
    const { phone, ports } = device("permission-required", { answer: "all" });
    const seen: string[] = [];
    const step = createPhotoStep(ports);
    step.subscribe(() => seen.push(step.getState().status));

    await step.check();
    await step.allow();

    expect(phone.prompts).toBe(1);
    expect(seen).toEqual(["ask", "counting", "counted"]);
    expect(step.getState()).toEqual({ status: "counted", ...found });
  });

  it("shows a limited or denied answer as it is, and picks up full access given later in Settings", async () => {
    for (const answer of ["limited", "denied"] as const) {
      const { phone, ports } = device("permission-required", { answer });
      const step = createPhotoStep(ports);

      await step.allow();
      expect(step.getState()).toEqual({ status: answer });

      phone.access = "all";
      await step.check();
      expect(step.getState()).toEqual({ status: "counted", ...found });
    }
  });

  it("says so when the albums cannot be counted, and counts on the next check", async () => {
    const { phone, ports } = device("all");
    phone.countFails = true;
    const step = createPhotoStep(ports);

    await step.check();
    expect(step.getState()).toEqual({ status: "failed", message: "อ่านอัลบั้มไม่ได้" });

    phone.countFails = false;
    await step.check();
    expect(step.getState()).toEqual({ status: "counted", ...found });
  });

  it("keeps the newest answer when an earlier check finishes last", async () => {
    let releaseFirst = () => {};
    const { phone, ports } = device("denied");
    const step = createPhotoStep({
      ...ports,
      read: () =>
        phone.access === "denied"
          ? new Promise<PhotoAccess>((resolve) => (releaseFirst = () => resolve("denied")))
          : ports.read(),
    });

    const first = step.check();
    phone.access = "all";
    await step.check();
    releaseFirst();
    await first;

    expect(step.getState()).toEqual({ status: "counted", ...found });
  });
});

describe("what setup says about photos", () => {
  it("lists each bank album with its photo count", () => {
    expect(slipAlbumRows({ status: "counted", ...found }).map((row) => [row.name, row.count])).toEqual([
      ["Krungthai NEXT", "2 รูป"],
      ["K PLUS", "ไม่พบรูป"],
      ["Paotang", "1 รูป"],
      ["TrueMoney", "ไม่พบรูป"],
    ]);
    expect(slipAlbumRows({ status: "counting" }).map((row) => row.count)).toEqual(["…", "…", "…", "…"]);
    expect(slipAlbumRows({ status: "ask" }).map((row) => row.count)).toEqual(["", "", "", ""]);
  });

  it("recaps photos found, not transactions saved, and says plainly when access is missing", () => {
    expect(photoRecap({ status: "counted", ...found })).toBe("เข้าหน้าแรกแล้ว หมูจะอ่าน 3 รูปและจดให้อัตโนมัติ");
    expect(photoRecap({ status: "counted", ...found, total: 0 })).toBe("อนุญาตแล้ว แต่ยังไม่พบรูปในอัลบั้มสลิป 30 วันที่ผ่านมา");
    expect(photoRecap({ status: "limited" })).toBe("เข้าถึงรูปได้บางส่วน หมูจึงยังอ่านสลิปไม่ได้ อนุญาตทั้งหมดภายหลังจากหน้าแรกได้");
    for (const status of ["ask", "skipped", "denied"] as const) {
      expect(photoRecap({ status })).toBe("ยังไม่ได้อนุญาตให้เข้าถึงรูป อนุญาตภายหลังจากหน้าแรกได้");
    }
  });
});
