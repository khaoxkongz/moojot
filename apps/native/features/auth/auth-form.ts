/**
 * The signup and sign-in form shared by both modes: its values, field errors, account notice and the submit that sends
 * it to Better Auth. Screens keep one `AuthForm` in state and replace it with what these functions return.
 */

import { isValidEmail } from "../../utils/email-identity";

export type AuthMode = "signup" | "signin";
export type AuthField = "name" | "email" | "password";

/** An account fact from the server, with the mode that resolves it when there is one. */
export type AuthNotice = { text: string; action: { label: string; mode: AuthMode } | null };

export type AuthForm = {
  mode: AuthMode;
  name: string;
  email: string;
  password: string;
  errors: Partial<Record<AuthField, string>>;
  notice: AuthNotice | null;
};

/** What the server said about one submit. */
export type AuthResult =
  | { status: "signed-up" | "signed-in"; name: string; email: string }
  | { status: "invalid" | "refused"; form: AuthForm };

type AuthResponse = {
  data: { user: { name: string; email: string } } | null;
  error: { code?: string; message?: string; status: number } | null;
};

/** The part of the Better Auth client the form uses. */
export type AuthClient = {
  signUp: { email(input: { name: string; email: string; password: string }): Promise<AuthResponse> };
  signIn: { email(input: { email: string; password: string }): Promise<AuthResponse> };
};

export function startAuthForm({ rememberedEmail }: { rememberedEmail: string | null }): AuthForm {
  return {
    mode: rememberedEmail ? "signin" : "signup",
    name: "",
    email: rememberedEmail ?? "",
    password: "",
    errors: {},
    notice: null,
  };
}

/** A new value clears only that field's error, and the account notice, which was about the old values. */
export function editAuthField(form: AuthForm, field: AuthField, value: string): AuthForm {
  const { [field]: _cleared, ...errors } = form.errors;
  return { ...form, [field]: value, errors, notice: null };
}

/** Both modes keep every value, so switching back and forth never loses typing. */
export function switchAuthMode(form: AuthForm, mode: AuthMode): AuthForm {
  return { ...form, mode, errors: {}, notice: null };
}

/** The notice's action: the other mode, keeping every value. */
export function followAuthNotice(form: AuthForm): AuthForm {
  return form.notice?.action ? switchAuthMode(form, form.notice.action.mode) : form;
}

/**
 * Puts a refused or invalid result on the form the user has now. Fields keep their current values; an error stays
 * only on a field still holding the value that was sent, and the notice only when nothing changed.
 */
export function applyAuthOutcome(current: AuthForm, sent: AuthForm, answered: AuthForm): AuthForm {
  const unchanged = (field: AuthField) => current[field] === sent[field];
  const errors = Object.fromEntries(
    Object.entries(answered.errors).filter(([field]) => unchanged(field as AuthField))
  ) as AuthForm["errors"];
  const same = current.mode === sent.mode && (["name", "email", "password"] as const).every(unchanged);
  return { ...current, errors, notice: same ? answered.notice : null };
}

export const PASSWORD_MIN_LENGTH = 8;

/** The live rule under the signup password: met once it has eight characters. */
export const passwordRuleMet = (password: string) => password.length >= PASSWORD_MIN_LENGTH;

/** Every incomplete field gets its own error; the name counts only in signup. */
export function checkAuthForm(form: AuthForm): AuthForm["errors"] {
  const errors: AuthForm["errors"] = {};
  if (form.mode === "signup" && form.name.trim().length < 2) errors.name = "กรุณาใส่ชื่ออย่างน้อย 2 ตัวอักษร";
  if (!form.email.trim()) errors.email = "กรุณาใส่อีเมล";
  else if (!isValidEmail(form.email)) errors.email = "กรุณาใส่อีเมลให้ถูกต้อง";
  if (!passwordRuleMet(form.password)) errors.password = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
  return errors;
}

export async function submitAuthForm(client: AuthClient, form: AuthForm): Promise<AuthResult> {
  const errors = checkAuthForm(form);
  if (Object.keys(errors).length) return { status: "invalid", form: { ...form, errors, notice: null } };
  const email = form.email.trim().toLowerCase();
  let response: AuthResponse;
  try {
    response =
      form.mode === "signup"
        ? await client.signUp.email({ name: form.name.trim(), email, password: form.password })
        : await client.signIn.email({ email, password: form.password });
  } catch {
    return { status: "refused", form: { ...form, notice: generalNotice(CONNECTION_FAILED) } };
  }
  if (response.data) {
    const { name, email: accountEmail } = response.data.user;
    return { status: form.mode === "signup" ? "signed-up" : "signed-in", name, email: accountEmail };
  }
  return { status: "refused", form: refusedForm(form, response.error) };
}

const CONNECTION_FAILED = "เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง";
const generalNotice = (text: string): AuthNotice => ({ text, action: null });

/**
 * The screen's submit: while one submit is pending, another call returns that same pending result instead of
 * sending again, so a double tap or Enter during a tap cannot make the second request refuse the first's account.
 */
export function authSubmitter(client: AuthClient) {
  let pending: Promise<AuthResult> | null = null;
  return (form: AuthForm): Promise<AuthResult> => {
    pending ??= submitAuthForm(client, form).finally(() => {
      pending = null;
    });
    return pending;
  };
}

/**
 * Each server code maps to the fact it proves. `INVALID_EMAIL_OR_PASSWORD` still arrives for an account without a
 * password; it proves neither case, so it gets the shared wording.
 */
function refusedForm(form: AuthForm, error: AuthResponse["error"]): AuthForm {
  switch (error?.code) {
    case "EMAIL_NOT_REGISTERED":
      return {
        ...form,
        notice: { text: "ยังไม่มีบัญชีของอีเมลนี้", action: { label: "สมัครสมาชิกด้วยอีเมลนี้", mode: "signup" } },
      };
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return {
        ...form,
        notice: { text: "อีเมลนี้มีบัญชีอยู่แล้ว", action: { label: "เข้าสู่ระบบด้วยอีเมลนี้", mode: "signin" } },
      };
    case "WRONG_PASSWORD":
      return { ...form, errors: { password: "รหัสผ่านไม่ถูกต้อง ลองอีกครั้ง" } };
    case "INVALID_EMAIL_OR_PASSWORD":
      return { ...form, notice: generalNotice("อีเมลหรือรหัสผ่านไม่ถูกต้อง") };
    case "PASSWORD_TOO_LONG":
      return { ...form, errors: { password: "รหัสผ่านต้องไม่เกิน 128 ตัวอักษร" } };
  }
  if (error?.status === 429) return { ...form, notice: generalNotice("ลองหลายครั้งเกินไป รอสักครู่แล้วลองอีกครั้ง") };
  if (!error?.status) return { ...form, notice: generalNotice(CONNECTION_FAILED) };
  return {
    ...form,
    notice: generalNotice(form.mode === "signup" ? "สมัครสมาชิกไม่สำเร็จ ลองอีกครั้ง" : "เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้ง"),
  };
}
