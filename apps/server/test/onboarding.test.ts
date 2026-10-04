import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { Effect, Layer } from "effect";
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
import { appEntry } from "../../native/features/auth/app-entry";
import {
  goNext,
  setBirthDate,
  startOnboarding,
  toggleConsent,
  toggleGoal,
  toggleTerms,
  type OnboardingFlow,
} from "../../native/features/onboarding/onboarding-flow";
import { saveOnboarding } from "../../native/features/onboarding/save-onboarding";
import { SETUP_SETTING_KEYS } from "@moojot/api/shared/finance/setup-keys";

// Setup's last step against the real preference routes and MongoDB: what it saves, and what a failed save leaves.

const env = {
  BETTER_AUTH_URL: "https://localhost:3333",
  BETTER_AUTH_SECRET: "test-only-secret-with-at-least-32-characters",
  CORS_ORIGIN: "http://localhost:3001",
  NODE_ENV: "development" as const,
};
const now = new Date("2026-10-04T09:30:00+07:00");

let database: Awaited<ReturnType<typeof startTestDatabase>>;
let runtime: ReturnType<typeof createAppRuntime>;
let app: ReturnType<typeof createServerApp>;

/**
 * A new account on a phone. `dropsSetting` loses the phone's connection for any request that carries that settings
 * key, until `reconnect()`.
 */
async function newAccount(email: string, { dropsSetting }: { dropsSetting?: string } = {}) {
  const response = await app.request(`${env.BETTER_AUTH_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: env.CORS_ORIGIN },
    body: JSON.stringify({ name: "หมูใหม่", email, password: "test-only-password" }),
  });
  expect(response.status).toBe(200);
  const cookie = response.headers.get("set-cookie")!.split(";")[0]!;
  let dropped = dropsSetting;
  const rpc: AppRouterClient = createORPCClient(
    new RPCLink({
      url: `${env.BETTER_AUTH_URL}/rpc`,
      plugins: [new SimpleCsrfProtectionLinkPlugin()],
      headers: { cookie },
      fetch: async (request) => {
        if (dropped && (await request.clone().text()).includes(`"${dropped}"`)) {
          throw new TypeError("Network request failed");
        }
        return app.fetch(request);
      },
    })
  );
  return {
    rpc,
    email,
    reconnect: () => {
      dropped = undefined;
    },
    /** Where the app's guard sends this phone next. */
    entry: async () =>
      appEntry({
        session: "signed-in",
        onboarding: { status: "ready", complete: await rpc.financePreferences.hasCompletedOnboarding() },
      }),
    setting: (key: string) => rpc.financePreferences.getSetting({ key }),
  };
}

/** Setup answered up to the recap: terms accepted, goals picked, then the optional birthday and consents. */
function answeredSetup(answers: (flow: OnboardingFlow) => OnboardingFlow = (flow) => flow): OnboardingFlow {
  const onGoals = goNext(goNext(toggleTerms(goNext(startOnboarding()))));
  return goNext(answers(goNext(toggleGoal(toggleGoal(onGoals, "save"), "budget"))));
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

describe("finishing setup", () => {
  it("saves the answers and opens Home; the profile reads the same birthday and consent values", async () => {
    const phone = await newAccount("finish@example.test");
    expect(await phone.entry()).toBe("onboarding");

    const flow = answeredSetup((extras) => toggleConsent(setBirthDate(extras, "2000-02-29"), "personalization"));
    expect(flow.screen).toBe("ready");

    expect(await saveOnboarding(phone.rpc.financePreferences, flow, { email: phone.email, now })).toEqual({
      status: "saved",
    });
    expect(await phone.entry()).toBe("app");
    expect(await phone.setting(SETUP_SETTING_KEYS.personalization)).toBe("yes");
    expect(await phone.setting(SETUP_SETTING_KEYS.updates)).toBe("no");
    expect(await phone.setting(SETUP_SETTING_KEYS.birthDate)).toBe("2000-02-29");
    expect(await phone.setting(SETUP_SETTING_KEYS.birthMonth)).toBe("2");
    expect(await phone.setting(SETUP_SETTING_KEYS.email)).toBe("finish@example.test");
  });

  it("leaves setup incomplete when one answer is not saved, and completes when the same answers are sent again", async () => {
    const phone = await newAccount("partial@example.test", { dropsSetting: SETUP_SETTING_KEYS.updates });
    const flow = answeredSetup((extras) => toggleConsent(extras, "updates"));

    expect(await saveOnboarding(phone.rpc.financePreferences, flow, { email: phone.email, now })).toEqual({
      status: "failed",
      message: "บันทึกไม่สำเร็จ ลองอีกครั้ง",
    });
    expect(await phone.entry()).toBe("onboarding");

    phone.reconnect();
    expect(await saveOnboarding(phone.rpc.financePreferences, flow, { email: phone.email, now })).toEqual({
      status: "saved",
    });
    expect(await phone.entry()).toBe("app");
    expect(await phone.setting(SETUP_SETTING_KEYS.updates)).toBe("yes");
  });

  it("saves nothing without accepted terms or a goal, and returns to the step that needs them", async () => {
    const phone = await newAccount("required@example.test");
    const save = (flow: OnboardingFlow) =>
      saveOnboarding(phone.rpc.financePreferences, flow, { email: phone.email, now });

    const noTerms = await save(answeredSetup((extras) => toggleTerms(extras)));
    expect(noTerms.status === "incomplete" && [noTerms.flow.screen, noTerms.flow.termsError]).toEqual([
      "terms",
      "กรุณายอมรับข้อตกลงการใช้งานก่อนเริ่มใช้งาน",
    ]);
    const noGoals = await save(answeredSetup((extras) => toggleGoal(toggleGoal(extras, "save"), "budget")));
    expect(noGoals.status === "incomplete" && [noGoals.flow.screen, noGoals.flow.goalsError]).toEqual([
      "goals",
      "เลือกอย่างน้อย 1 ข้อนะ",
    ]);

    expect(await phone.entry()).toBe("onboarding");
    expect(await phone.setting(SETUP_SETTING_KEYS.personalization)).toBeNull();
  });
});
