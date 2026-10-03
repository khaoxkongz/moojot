import { describe, expect, it } from "vite-plus/test";

import { appEntry } from "./app-entry";

describe("appEntry", () => {
  it("opens auth when nobody is signed in, whatever the setup check says", () => {
    expect(appEntry({ session: "signed-out", onboarding: { status: "failed" } })).toBe("auth");
  });

  it("asks to retry, rather than restarting setup, when the setup check fails for a signed-in account", () => {
    expect(appEntry({ session: "signed-in", onboarding: { status: "failed" } })).toBe("retry");
  });
});
