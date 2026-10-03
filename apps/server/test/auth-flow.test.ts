import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { Effect, Layer } from "effect";
import { createAuthClient } from "better-auth/client";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { SimpleCsrfProtectionLinkPlugin } from "@orpc/client/plugins";
import type { AppRouterClient } from "@moojot/api/features/index";
import { createAuth } from "@moojot/auth";
import { createAppRuntime } from "@moojot/api/runtime";
import { GeminiProvider } from "@moojot/api/features/import/gemini.provider";
import { createServerApp } from "../src/app";
import { startTestDatabase } from "./mongo";
// Native modules are imported by path; see manual-entry.test.ts.
import {
  authSubmitter,
  editAuthField,
  followAuthNotice,
  startAuthForm,
  submitAuthForm,
  switchAuthMode,
  type AuthFieldName,
  type AuthForm,
} from "../../native/features/auth/auth-form";
import { appEntry } from "../../native/features/auth/app-entry";

// The native signup and sign-in forms against the real Better Auth routes and MongoDB, with fixture accounts.

const env = {
  BETTER_AUTH_URL: "https://localhost:3333",
  BETTER_AUTH_SECRET: "test-only-secret-with-at-least-32-characters",
  CORS_ORIGIN: "http://localhost:3001",
  NODE_ENV: "development" as const,
};

let database: Awaited<ReturnType<typeof startTestDatabase>>;
let runtime: ReturnType<typeof createAppRuntime>;
let app: ReturnType<typeof createServerApp>;

/** One device: its own auth client, which keeps the session cookie the server sets, and its API client. */
function device({ online = () => true }: { online?: () => boolean } = {}) {
  let cookie = "";
  const auth = createAuthClient({
    baseURL: env.BETTER_AUTH_URL,
    fetchOptions: {
      customFetchImpl: async (input, init) => {
        if (!online()) throw new TypeError("Network request failed");
        const headers = new Headers(init?.headers);
        headers.set("origin", env.CORS_ORIGIN);
        if (cookie) headers.set("cookie", cookie);
        const url = input instanceof Request ? input.url : input.toString();
        const response = await app.fetch(new Request(url, { ...init, headers }));
        const set = response.headers.get("set-cookie");
        if (set) cookie = set.split(";")[0]!;
        return response;
      },
    },
  });
  const rpc: AppRouterClient = createORPCClient(
    new RPCLink({
      url: `${env.BETTER_AUTH_URL}/rpc`,
      plugins: [new SimpleCsrfProtectionLinkPlugin()],
      headers: () => (cookie ? { cookie } : {}),
      fetch: async (request) => app.fetch(request),
    })
  );
  return { signUp: auth.signUp, signIn: auth.signIn, rpc };
}

/** Where the app's guard sends this device next. */
async function entryOf({ rpc }: ReturnType<typeof device>) {
  return appEntry({
    session: "signed-in",
    onboarding: { status: "ready", complete: await rpc.financePreferences.hasCompletedOnboarding() },
  });
}

const fill = (form: AuthForm, values: Partial<Record<AuthFieldName, string>>) =>
  Object.entries(values).reduce((next, [field, value]) => editAuthField(next, field as AuthFieldName, value), form);

const FIXTURE_PASSWORD = "fixture-password";

/** A fixture account made straight through the auth route, as an earlier install would have made it. */
async function registerFixture(email: string, name = "หมูทดสอบ") {
  const response = await app.request(`${env.BETTER_AUTH_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: env.CORS_ORIGIN },
    body: JSON.stringify({ name, email, password: FIXTURE_PASSWORD }),
  });
  expect(response.status).toBe(200);
}

beforeAll(async () => {
  database = await startTestDatabase();
  runtime = createAppRuntime(
    database.db,
    Layer.succeed(GeminiProvider, { extract: () => Effect.die("Unused test provider") })
  );
  app = createServerApp({ auth: createAuth(env, database.db), db: database.db, runtime, env });
}, 120_000);

afterAll(async () => {
  await runtime?.dispose();
  await database?.close();
});

describe("sign-in", () => {
  it("says the email has no account, and offers signup with that email", async () => {
    const form = fill(switchAuthMode(startAuthForm({ rememberedEmail: null }), "signin"), {
      email: "nobody@example.test",
      password: "test-only-password",
    });

    const result = await submitAuthForm(device(), form);

    expect(result.status).toBe("refused");
    if (result.status !== "refused") return;
    expect(result.form.notice).toEqual({
      text: "ยังไม่มีบัญชีของอีเมลนี้",
      action: { label: "สมัครสมาชิกด้วยอีเมลนี้", mode: "signup" },
    });
    expect(result.form.errors).toEqual({});
  });

  it("says the password is wrong for an email that has an account", async () => {
    await registerFixture("wrong-password@example.test");
    const form = fill(startAuthForm({ rememberedEmail: "wrong-password@example.test" }), {
      password: "not-the-password",
    });

    const result = await submitAuthForm(device(), form);

    expect(result.status).toBe("refused");
    if (result.status !== "refused") return;
    expect(result.form.errors).toEqual({ password: "รหัสผ่านไม่ถูกต้อง ลองอีกครั้ง" });
    expect(result.form.notice).toBeNull();
    expect(result.form.password).toBe("not-the-password");
  });

  it("drops the wrong-password error when a changed email turns out to have no account", async () => {
    await registerFixture("changed-email@example.test");
    const phone = device();
    const wrong = await submitAuthForm(
      phone,
      fill(startAuthForm({ rememberedEmail: "changed-email@example.test" }), { password: "not-the-password" })
    );
    expect(wrong.status).toBe("refused");
    if (wrong.status !== "refused") return;

    const result = await submitAuthForm(phone, fill(wrong.form, { email: "never-registered@example.test" }));

    expect(result.status).toBe("refused");
    if (result.status !== "refused") return;
    expect(result.form.errors).toEqual({});
    expect(result.form.notice?.text).toBe("ยังไม่มีบัญชีของอีเมลนี้");
  });
});

describe("sign-in without a provable cause", () => {
  it("uses the shared wording for an account that has no password, because neither case is proved", async () => {
    await registerFixture("no-password@example.test");
    await database.db.account.updateMany({
      where: { user: { email: "no-password@example.test" } },
      data: { password: null },
    });
    const form = fill(startAuthForm({ rememberedEmail: "no-password@example.test" }), {
      password: FIXTURE_PASSWORD,
    });

    const result = await submitAuthForm(device(), form);

    expect(result.status === "refused" && result.form.notice).toEqual({
      text: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      action: null,
    });
  });
});

describe("connection", () => {
  it("keeps what was typed when the server cannot be reached, and the same submit works once it can", async () => {
    await registerFixture("offline@example.test", "ออฟไลน์");
    let online = false;
    const submit = authSubmitter(device({ online: () => online }));
    const form = fill(startAuthForm({ rememberedEmail: "offline@example.test" }), { password: FIXTURE_PASSWORD });

    const failed = await submit(form);

    expect(failed.status).toBe("refused");
    if (failed.status !== "refused") return;
    expect(failed.form.notice).toEqual({ text: "เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง", action: null });
    expect(failed.form).toMatchObject({ email: "offline@example.test", password: FIXTURE_PASSWORD, errors: {} });

    online = true;
    expect(await submit(failed.form)).toMatchObject({ status: "signed-in", name: "ออฟไลน์" });
  });
});

describe("signup", () => {
  it("shows an error beside each incomplete field, sends nothing, and typing clears only that field's error", async () => {
    const form = fill(startAuthForm({ rememberedEmail: null }), {
      name: " ก ",
      email: "incomplete@example",
      password: "1234567",
    });

    const result = await submitAuthForm(device(), form);

    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;
    expect(result.form.errors).toEqual({
      name: "กรุณาใส่ชื่ออย่างน้อย 2 ตัวอักษร",
      email: "กรุณาใส่อีเมลให้ถูกต้อง",
      password: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
    });
    expect(editAuthField(result.form, "name", "หมู").errors).toEqual({
      email: "กรุณาใส่อีเมลให้ถูกต้อง",
      password: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
    });
    const blank = await submitAuthForm(device(), fill(result.form, { email: "  " }));
    expect(blank.status === "invalid" && blank.form.errors.email).toBe("กรุณาใส่อีเมล");

    const nothingMade = await submitAuthForm(
      device(),
      fill(switchAuthMode(result.form, "signin"), { email: "incomplete@example.test", password: "12345678" })
    );
    expect(nothingMade.status === "refused" && nothingMade.form.notice?.text).toBe("ยังไม่มีบัญชีของอีเมลนี้");
  });

  it("makes the account, signs it in, and sends it to setup; after setup a new sign-in goes to Home", async () => {
    const phone = device();
    const form = fill(startAuthForm({ rememberedEmail: null }), {
      name: "  หมูใหม่ ",
      email: "New@Example.test",
      password: "new-password",
    });

    expect(await submitAuthForm(phone, form)).toEqual({
      status: "signed-up",
      name: "หมูใหม่",
      email: "new@example.test",
    });
    expect(await entryOf(phone)).toBe("onboarding");

    await phone.rpc.financePreferences.setSetting({ key: "onboarding_complete_v1", value: "true" });
    const otherPhone = device();
    const signIn = fill(startAuthForm({ rememberedEmail: "new@example.test" }), { password: "new-password" });
    expect(await submitAuthForm(otherPhone, signIn)).toMatchObject({ status: "signed-in", name: "หมูใหม่" });
    expect(await entryOf(otherPhone)).toBe("app");
  });

  it("sends one signup while one is pending, so a double tap cannot refuse its own account", async () => {
    const submit = authSubmitter(device());
    const form = fill(startAuthForm({ rememberedEmail: null }), {
      name: "กดสองที",
      email: "double-tap@example.test",
      password: "double-tap-password",
    });

    const [first, second] = await Promise.all([submit(form), submit(form)]);

    expect(first).toMatchObject({ status: "signed-up", email: "double-tap@example.test" });
    expect(second).toEqual(first);
    expect(await submit(switchAuthMode(form, "signin"))).toMatchObject({ status: "signed-in" });
  });

  it("shows the server's password limit beside the password", async () => {
    const form = fill(startAuthForm({ rememberedEmail: null }), {
      name: "ยาวมาก",
      email: "long-password@example.test",
      password: "x".repeat(129),
    });

    const result = await submitAuthForm(device(), form);

    expect(result.status === "refused" && result.form.errors).toEqual({
      password: "รหัสผ่านต้องไม่เกิน 128 ตัวอักษร",
    });
  });

  it("does not ask for a name when signing in", async () => {
    await registerFixture("no-name@example.test", "ไม่มีชื่อในฟอร์ม");
    const form = fill(startAuthForm({ rememberedEmail: "no-name@example.test" }), { password: FIXTURE_PASSWORD });

    expect(await submitAuthForm(device(), form)).toMatchObject({ status: "signed-in", name: "ไม่มีชื่อในฟอร์ม" });
  });

  it("says an email already has an account, and its action signs in with what was typed", async () => {
    await registerFixture("taken@example.test", "เจ้าของเดิม");
    const form = fill(startAuthForm({ rememberedEmail: null }), {
      name: "คนใหม่",
      email: " Taken@Example.test ",
      password: FIXTURE_PASSWORD,
    });

    const refused = await submitAuthForm(device(), form);

    expect(refused.status).toBe("refused");
    if (refused.status !== "refused") return;
    expect(refused.form.notice).toEqual({
      text: "อีเมลนี้มีบัญชีอยู่แล้ว",
      action: { label: "เข้าสู่ระบบด้วยอีเมลนี้", mode: "signin" },
    });

    const signIn = followAuthNotice(refused.form);
    expect(signIn).toMatchObject({ mode: "signin", email: " Taken@Example.test ", notice: null });
    const result = await submitAuthForm(device(), signIn);

    expect(result).toEqual({ status: "signed-in", name: "เจ้าของเดิม", email: "taken@example.test" });
  });
});
