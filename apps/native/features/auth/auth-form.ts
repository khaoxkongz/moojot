/**
 * The signup and sign-in form shared by both modes: its values, field errors, account notice and the submit that sends
 * it to Better Auth. Screens keep one `AuthForm` in state and replace it with what these functions return.
 */

import { isValidEmail, normalizeEmail } from "../../utils/email-identity";

export type AuthMode = "signup" | "signin";

const AUTH_FIELDS = ["name", "email", "password"] as const;
export type AuthFieldName = (typeof AUTH_FIELDS)[number];

const PASSWORD_MIN_LENGTH = 8;

/** The password rule as the handoff words it, under the signup password and as its placeholder. */
export const PASSWORD_RULE = `อย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร`;

/**
 * Everything that differs between the two modes. Signup does not ask iOS for a new password: with that content type,
 * Automatic Strong Password covered the field and, after แสดง / ซ่อน (show / hide), replaced what the user typed.
 * Sign-in keeps Keychain autofill.
 */
export const AUTH_MODES = {
  signup: {
    label: "สมัครสมาชิก",
    subtitle: "สมัครด้วยอีเมล แล้วตั้งค่าอีก 4 ขั้นสั้น ๆ",
    busyLabel: "กำลังสมัคร…",
    failed: "สมัครสมาชิกไม่สำเร็จ ลองอีกครั้ง",
    success: "signed-up",
    asksName: true,
    showsPasswordRule: true,
    passwordAutoComplete: "off",
    passwordContentType: "none",
  },
  signin: {
    label: "เข้าสู่ระบบ",
    subtitle: "เข้าสู่ระบบด้วยอีเมลที่เคยสมัครไว้",
    busyLabel: "กำลังเข้าสู่ระบบ…",
    failed: "เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้ง",
    success: "signed-in",
    asksName: false,
    showsPasswordRule: false,
    passwordAutoComplete: "current-password",
    passwordContentType: "password",
  },
} as const satisfies Record<AuthMode, Record<string, string | boolean>>;

/** An account fact from the server, with the mode that resolves it when there is one. */
export type AuthNotice = { text: string; action: { label: string; mode: AuthMode } | null };

export type AuthForm = {
  mode: AuthMode;
  name: string;
  email: string;
  password: string;
  errors: Partial<Record<AuthFieldName, string>>;
  notice: AuthNotice | null;
};

/** What the server said about one submit. */
export type AuthResult =
  | { status: (typeof AUTH_MODES)[AuthMode]["success"]; name: string; email: string }
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
export function editAuthField(form: AuthForm, field: AuthFieldName, value: string): AuthForm {
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
  const unchanged = (field: AuthFieldName) => current[field] === sent[field];
  const errors = Object.fromEntries(
    Object.entries(answered.errors).filter(([field]) => unchanged(field as AuthFieldName))
  ) as AuthForm["errors"];
  const same = current.mode === sent.mode && AUTH_FIELDS.every(unchanged);
  return { ...current, errors, notice: same ? answered.notice : null };
}

/** The live rule under the signup password. */
export const passwordRuleMet = (password: string) => password.length >= PASSWORD_MIN_LENGTH;

/** Every incomplete field gets its own error; the name counts only in signup. */
export function checkAuthForm(form: AuthForm): AuthForm["errors"] {
  const errors: AuthForm["errors"] = {};
  if (AUTH_MODES[form.mode].asksName && form.name.trim().length < 2) errors.name = "กรุณาใส่ชื่ออย่างน้อย 2 ตัวอักษร";
  if (!form.email.trim()) errors.email = "กรุณาใส่อีเมล";
  else if (!isValidEmail(form.email)) errors.email = "กรุณาใส่อีเมลให้ถูกต้อง";
  if (!passwordRuleMet(form.password)) errors.password = `รหัสผ่านต้องมี${PASSWORD_RULE}`;
  return errors;
}

/**
 * Checks the form, then sends it. A form that passes the check goes out without its old errors and notice, as the
 * handoff's `submitAuth` clears them, so the answer holds only what the server said about this submit.
 */
export async function submitAuthForm(client: AuthClient, form: AuthForm): Promise<AuthResult> {
  const errors = checkAuthForm(form);
  if (Object.keys(errors).length) return { status: "invalid", form: { ...form, errors, notice: null } };
  const sent = clearAuthMessages(form);
  const email = normalizeEmail(form.email);
  let response: AuthResponse;
  try {
    response =
      form.mode === "signup"
        ? await client.signUp.email({ name: form.name.trim(), email, password: form.password })
        : await client.signIn.email({ email, password: form.password });
  } catch {
    return { status: "refused", form: { ...sent, notice: generalNotice(CONNECTION_FAILED) } };
  }
  if (response.data) {
    const { name, email: accountEmail } = response.data.user;
    return { status: AUTH_MODES[form.mode].success, name, email: accountEmail };
  }
  return { status: "refused", form: refusedForm(sent, response.error) };
}

/**
 * The form while a submit that passed the check is pending: no old errors and no notice, as in the handoff. A form
 * that fails the check keeps them, because the check answers at once.
 */
export function pendingAuthForm(form: AuthForm): AuthForm {
  return Object.keys(checkAuthForm(form)).length ? form : clearAuthMessages(form);
}

const clearAuthMessages = (form: AuthForm): AuthForm => ({ ...form, errors: {}, notice: null });

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
  return { ...form, notice: generalNotice(AUTH_MODES[form.mode].failed) };
}
