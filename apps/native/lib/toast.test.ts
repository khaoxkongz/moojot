import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { createToastStore } from "./toast";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("toast", () => {
  it("shows a message for 2.6 seconds", () => {
    const toast = createToastStore();
    toast.show({ message: "บันทึกแล้ว" });
    expect(toast.getSnapshot()?.message).toBe("บันทึกแล้ว");
    vi.advanceTimersByTime(2599);
    expect(toast.getSnapshot()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(toast.getSnapshot()).toBeNull();
  });

  it("keeps a toast with an action for 5 seconds", () => {
    const toast = createToastStore();
    toast.show({ message: "ลบรายการแล้ว", action: { label: "เอากลับคืน", run: async () => {} } });
    vi.advanceTimersByTime(4999);
    expect(toast.getSnapshot()?.action?.label).toBe("เอากลับคืน");
    vi.advanceTimersByTime(1);
    expect(toast.getSnapshot()).toBeNull();
  });

  it("replaces the previous toast and its action with the newest one", async () => {
    const toast = createToastStore();
    const first = vi.fn(async () => {});
    toast.show({ message: "ลบรายการแล้ว", action: { label: "เอากลับคืน", run: first } });
    vi.advanceTimersByTime(4000);
    toast.show({ message: "บันทึกแล้ว" });
    await toast.runAction();
    expect(first).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(toast.getSnapshot()?.message).toBe("บันทึกแล้ว");
  });

  it("runs the action once, even when tapped twice", async () => {
    const toast = createToastStore();
    const restore = vi.fn(async () => {});
    toast.show({ message: "ลบรายการแล้ว", action: { label: "เอากลับคืน", run: restore } });
    await Promise.all([toast.runAction(), toast.runAction()]);
    expect(restore).toHaveBeenCalledTimes(1);
    expect(toast.getSnapshot()).toBeNull();
  });

  it("shows that the action is running and then why it failed, so it can be tried again", async () => {
    const toast = createToastStore();
    let fail: (cause: Error) => void = () => {};
    const restore = vi
      .fn<() => Promise<void>>(async () => {})
      .mockImplementationOnce(
        () =>
          new Promise<void>((_, reject) => {
            fail = reject;
          })
      );
    toast.show({ message: "ลบรายการแล้ว", action: { label: "เอากลับคืน", busyLabel: "กำลังเอากลับคืน…", run: restore } });
    const running = toast.runAction();
    expect(toast.getSnapshot()?.busy).toBe(true);
    vi.advanceTimersByTime(10_000);
    expect(toast.getSnapshot()?.busy).toBe(true);
    fail(new Error("เชื่อมต่อไม่ได้"));
    await running;
    expect(toast.getSnapshot()).toMatchObject({ message: "เชื่อมต่อไม่ได้", busy: false });
    await toast.runAction();
    expect(restore).toHaveBeenCalledTimes(2);
    expect(toast.getSnapshot()).toBeNull();
  });

  it("does nothing once the action is gone", async () => {
    const toast = createToastStore();
    const restore = vi.fn(async () => {});
    toast.show({ message: "ลบรายการแล้ว", action: { label: "เอากลับคืน", run: restore } });
    vi.advanceTimersByTime(5000);
    await toast.runAction();
    expect(restore).not.toHaveBeenCalled();
  });

  it("lets subscribers see every toast that is shown and dismissed", () => {
    const toast = createToastStore();
    const seen: (string | null)[] = [];
    toast.subscribe(() => seen.push(toast.getSnapshot()?.message ?? null));
    toast.show({ message: "บันทึกแล้ว" });
    toast.show({ message: "ลบรายการแล้ว" });
    toast.dismiss();
    expect(seen).toEqual(["บันทึกแล้ว", "ลบรายการแล้ว", null]);
  });
});
