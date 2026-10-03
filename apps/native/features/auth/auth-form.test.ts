import { describe, expect, it } from "vite-plus/test";

import { applyAuthOutcome, editAuthField, startAuthForm, switchAuthMode, type AuthForm } from "./auth-form";

const sent: AuthForm = { ...startAuthForm({ rememberedEmail: "moo@example.test" }), password: "wrong-password" };
const refused: AuthForm = { ...sent, errors: { password: "รหัสผ่านไม่ถูกต้อง ลองอีกครั้ง" } };

describe("startAuthForm", () => {
  it("opens signup on a first start, and sign-in with the latest email and no password after sign-out", () => {
    expect(startAuthForm({ rememberedEmail: null })).toMatchObject({ mode: "signup", email: "", password: "" });
    expect(startAuthForm({ rememberedEmail: "latest@example.test" })).toMatchObject({
      mode: "signin",
      email: "latest@example.test",
      password: "",
    });
  });
});

describe("switchAuthMode", () => {
  it("keeps every typed value, so switching back and forth loses nothing", () => {
    const typed = { ...startAuthForm({ rememberedEmail: null }), name: "หมู", email: "a@b.test", password: "12345678" };
    const back = switchAuthMode(switchAuthMode(typed, "signin"), "signup");
    expect(back).toEqual(typed);
  });
});

describe("applyAuthOutcome", () => {
  it("shows the server's answer on the form that was sent", () => {
    expect(applyAuthOutcome(sent, sent, refused)).toEqual(refused);
  });

  it("keeps what the user typed while the submit was pending, and drops the error about the old value", () => {
    const typedOn = editAuthField(sent, "password", "right-password");

    expect(applyAuthOutcome(typedOn, sent, refused)).toEqual(typedOn);
  });

  it("drops an account notice once any value changed, because it was about the old values", () => {
    const notice = {
      ...sent,
      notice: { text: "ยังไม่มีบัญชีของอีเมลนี้", action: { label: "สมัครสมาชิกด้วยอีเมลนี้", mode: "signup" as const } },
    };
    const typedOn = editAuthField(sent, "email", "other@example.test");

    expect(applyAuthOutcome(typedOn, sent, notice).notice).toBeNull();
    expect(applyAuthOutcome(sent, sent, notice).notice).toEqual(notice.notice);
  });
});
