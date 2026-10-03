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
// Scrolls the open full-screen panel (plan or budget form) to `top`.
const scrollPanel = (p, label, top) =>
  p.evaluate(
    (label, top) => {
      const screen = document.querySelector(`[aria-label="${label}"]`);
      const panel = [...screen.querySelectorAll("div")].find((d) => d.scrollHeight > d.clientHeight + 10);
      if (panel) panel.scrollTop = top;
    },
    label,
    top
  );
// Types into the amount field the way a person would, so the prototype's onChange runs.
const typeAmount = async (p, text) => {
  const input = await p.$('input[aria-label="วงเงินต่อเดือน (บาท)"]');
  await input.click({ clickCount: 3 });
  await p.keyboard.press("Backspace");
  await input.type(text);
  await sleep(400);
};

const { b, p } = await open(theme);
await signIn(p);
await sleep(3000);
await step("plan", async () => {
  await click(p, "ดูสรุป");
  await sleep(900);
  await p.evaluate(() => {
    const screen = document.querySelector('[aria-label="สรุป"]');
    const panel = [...screen.querySelectorAll("div")].find((d) => d.scrollHeight > d.clientHeight + 10);
    if (panel) panel.scrollTop = 4000;
  });
  await sleep(400);
  await click(p, "วางแผนงบ");
  await sleep(900);
  await shot(p, `../10-plan${t}.png`);
});
await step("plan-bottom", async () => {
  await scrollPanel(p, "วางแผน", 2000);
  await sleep(400);
  await shot(p, `../10-plan-bottom${t}.png`);
  await scrollPanel(p, "วางแผน", 0);
});
await step("previous", async () => {
  await click(p, "เดือนก่อน");
  await sleep(600);
  await shot(p, `../10-plan-previous${t}.png`);
  await click(p, "เดือนถัดไป");
  await sleep(600);
});
await step("edit", async () => {
  await click(p, "แก้ไขงบ อาหาร");
  await sleep(900);
  await shot(p, `../10-form-edit${t}.png`);
});
await step("replace", async () => {
  await click(p, "ช้อปปิ้ง");
  await sleep(500);
  await shot(p, `../10-form-replace${t}.png`);
});
await step("delete", async () => {
  await scrollPanel(p, "แก้ไขงบ", 2000);
  await click(p, "ลบงบนี้");
  await sleep(700);
  await shot(p, `../10-delete-toast${t}.png`);
});
await step("new-all", async () => {
  await click(p, "ตั้งงบแยกหมวด");
  await sleep(900);
  await click(p, "รวมทุกหมวด");
  await typeAmount(p, "5000");
  await shot(p, `../10-form-new${t}.png`);
});
await step("missing", async () => {
  await click(p, "เลือกแท็ก");
  await typeAmount(p, "300");
  await click(p, "ตั้งงบนี้");
  await sleep(400);
  await shot(p, `../10-form-missing${t}.png`);
});
console.log(await visible(p));
await b.close();
