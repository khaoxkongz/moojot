import { open, click, shot, signIn, sleep, visible } from "./lib.mjs";
const theme = process.argv[2];
const t = theme === "dark" ? "-dark" : "";
const step = async (name, fn) => {
  try {
    await fn();
  } catch (e) {
    console.log("FAIL", name, e.message);
  }
};
// Types into the search field the way a person would, so the prototype's onChange runs.
const type = async (p, text) => {
  const input = await p.$('input[aria-label="ค้นหารายการ"]');
  await input.click({ clickCount: 3 });
  await p.keyboard.press("Backspace");
  await input.type(text);
  await sleep(500);
};

const { b, p } = await open(theme);
await signIn(p);
await sleep(3000);
await step("start", async () => {
  await click(p, "ค้นหารายการ");
  await sleep(900);
  await shot(p, `../09-search-start${t}.png`);
});
await step("amount", async () => {
  await type(p, "419");
  await shot(p, `../09-search-amount${t}.png`);
});
await step("bank", async () => {
  await type(p, "กสิกร");
  await shot(p, `../09-search-bank${t}.png`);
});
await step("none", async () => {
  await type(p, "หมูไม่เคยจดคำนี้");
  await shot(p, `../09-search-none${t}.png`);
});
console.log(await visible(p));
await b.close();
