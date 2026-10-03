import { describe, expect, it } from "vite-plus/test";

import { goBack, goNext, onboardingProgress, startOnboarding, toggleGoal, toggleTerms } from "./onboarding-flow";

const onTerms = () => goNext(startOnboarding());

describe("onboarding flow", () => {
  it("keeps the person on the terms with an error until they accept them", () => {
    const refused = goNext(onTerms());
    expect(refused.screen).toBe("terms");
    expect(refused.termsError).toBe("กรุณายอมรับข้อตกลงการใช้งานก่อนเริ่มใช้งาน");

    const accepted = toggleTerms(refused);
    expect(accepted.termsError).toBeNull();
    expect(goNext(accepted).screen).toBe("slips");
  });

  it("asks for at least one goal, and lets the person pick several", () => {
    const onGoals = goNext(goNext(toggleTerms(onTerms())));
    expect(onGoals.screen).toBe("goals");

    const refused = goNext(onGoals);
    expect(refused.screen).toBe("goals");
    expect(refused.goalsError).toBe("เลือกอย่างน้อย 1 ข้อนะ");

    const picked = toggleGoal(toggleGoal(toggleGoal(refused, "save"), "debt"), "save");
    expect(picked.goalsError).toBeNull();
    expect(picked.goals).toEqual(["debt"]);
    expect(goNext(picked).screen).toBe("extras");
  });

  it("goes back one screen at a time from the recap to the greeting, keeping choices and dropping errors", () => {
    const onGoals = goNext(goNext(toggleTerms(onTerms())));
    let flow = goNext(goNext(toggleGoal(onGoals, "budget")));
    expect(flow.screen).toBe("ready");

    const visited: string[] = [];
    while (flow.screen !== "greeting") {
      flow = goBack(flow);
      visited.push(flow.screen);
    }
    expect(visited).toEqual(["extras", "goals", "slips", "terms", "greeting"]);
    expect(flow.goals).toEqual(["budget"]);
    expect(flow.termsAccepted).toBe(true);

    const leftWithError = goBack(goNext(toggleTerms(goNext(flow))));
    expect(leftWithError.screen).toBe("greeting");
    expect(goNext(leftWithError).termsError).toBeNull();
  });

  it("shows which of the four steps the person is on", () => {
    const onSlips = goNext(toggleTerms(onTerms()));
    expect(onboardingProgress(onSlips.screen)).toEqual({ number: 2, total: 4, label: "ขั้นที่ 2 จาก 4: อ่านสลิป" });
    expect(onboardingProgress("greeting")).toBeNull();
    expect(onboardingProgress("ready")).toBeNull();
  });
});
