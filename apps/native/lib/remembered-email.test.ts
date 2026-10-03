import { describe, expect, it } from "vite-plus/test";

import { createRememberedEmail, type RememberedEmailStorage } from "./remembered-email";

function memoryStorage(initial: string | null = null): RememberedEmailStorage & { text: string | null } {
  const storage = {
    text: initial,
    read: async () => storage.text,
    write: async (text: string) => {
      storage.text = text;
    },
  };
  return storage;
}

describe("remembered email", () => {
  it("is empty on a first app start", async () => {
    const remembered = createRememberedEmail(memoryStorage());
    await remembered.load();
    expect(remembered.getSnapshot()).toEqual({ status: "ready", email: null });
  });

  it("keeps the latest signed-in email for the next app start", async () => {
    const storage = memoryStorage();
    const first = createRememberedEmail(storage);
    await first.load();
    await first.remember("old@example.test");
    await first.remember("latest@example.test");
    expect(first.getSnapshot().email).toBe("latest@example.test");

    const next = createRememberedEmail(storage);
    await next.load();
    expect(next.getSnapshot()).toEqual({ status: "ready", email: "latest@example.test" });
  });

  it("is empty when the device cannot read it, so the app still opens", async () => {
    const remembered = createRememberedEmail({
      read: async () => {
        throw new Error("disk");
      },
      write: async () => {},
    });
    await remembered.load();
    expect(remembered.getSnapshot()).toEqual({ status: "ready", email: null });
  });

  it("keeps the email in memory when the device cannot save it", async () => {
    const remembered = createRememberedEmail({
      read: async () => null,
      write: async () => {
        throw new Error("disk full");
      },
    });
    await remembered.load();
    await remembered.remember("memory@example.test");
    expect(remembered.getSnapshot().email).toBe("memory@example.test");
  });
});
