import { open, click, shot, sleep } from "./lib.mjs";
const theme = process.argv[2];
const t = theme === "dark" ? "-dark" : "";
const step = async (name, fn) => {
  try {
    await fn();
  } catch (e) {
    console.log("FAIL", name, e.message);
  }
};
// Replaces a field's text, like a user selecting all and typing.
const type = async (p, selector, text) => {
  const input = await p.$(selector);
  await input.click({ clickCount: 3 });
  await p.keyboard.press("Backspace");
  if (text) await input.type(text);
  await sleep(300);
};

const { b, p } = await open(theme);
await sleep(2500);
await step("signup", async () => {
  await shot(p, `../02-signup${t}.png`);
});
await step("errors", async () => {
  await click(p, "สมัครสมาชิก", { exact: true });
  await sleep(300);
  // The tab and the submit share the text; the submit is the last match.
  await p.evaluate(() =>
    [...document.querySelectorAll("button")]
      .filter((e) => e.textContent.trim() === "สมัครสมาชิก")
      .pop()
      .click()
  );
  await sleep(500);
  await shot(p, `../02-signup-errors${t}.png`);
});
await step("typing", async () => {
  await type(p, "#mj-auth-name", "หมูกลับมา");
  await type(p, "#mj-auth-email", "moo.user@example.com");
  await type(p, "#mj-auth-pw", "moojot12");
  await click(p, "แสดงรหัสผ่าน");
  await shot(p, `../02-password-shown${t}.png`);
  await click(p, "ซ่อนรหัสผ่าน");
});
await step("duplicate", async () => {
  await p.focus("#mj-auth-pw");
  await p.keyboard.press("Enter");
  await sleep(1200);
  await shot(p, `../02-signup-duplicate${t}.png`);
});
await step("wrong password", async () => {
  await click(p, "เข้าสู่ระบบด้วยอีเมลนี้");
  await p.focus("#mj-auth-pw");
  await p.keyboard.press("Enter");
  await sleep(1200);
  await shot(p, `../02-signin-wrong-password${t}.png`);
});
await step("unknown", async () => {
  await type(p, "#mj-auth-email", "nobody@example.com");
  await p.focus("#mj-auth-pw");
  await p.keyboard.press("Enter");
  await sleep(1200);
  await shot(p, `../02-signin-unknown${t}.png`);
});
await step("greeting", async () => {
  await click(p, "สมัครสมาชิกด้วยอีเมลนี้");
  await p.focus("#mj-auth-pw");
  await p.keyboard.press("Enter");
  await sleep(1500);
  await shot(p, `../02-greeting${t}.png`);
});
await b.close();
