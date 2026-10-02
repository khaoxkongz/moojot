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
const scrollSummary = (p, y) =>
  p.evaluate((top) => {
    const screen = document.querySelector('[data-screen-label="03 สรุป"]');
    const panel = [...screen.querySelectorAll("div")].find((d) => d.scrollHeight > d.clientHeight + 10);
    if (panel) panel.scrollTop = top;
  }, y);

const { b, p } = await open(theme);
await signIn(p);
await sleep(3000);
await step("summary", async () => {
  await click(p, "ดูสรุป");
  await sleep(900);
  await shot(p, `../08-summary${t}.png`);
  await scrollSummary(p, 2000);
  await sleep(300);
  await shot(p, `../08-summary-bottom${t}.png`);
  await scrollSummary(p, 0);
});
await step("tags", async () => {
  await click(p, "ตามแท็ก");
  await sleep(400);
  await shot(p, `../08-summary-tags${t}.png`);
  await click(p, "ตามหมวด");
});
await step("income", async () => {
  await click(p, "รายรับ");
  await sleep(400);
  await shot(p, `../08-summary-income${t}.png`);
});
await step("transfer", async () => {
  await click(p, "ย้ายเงิน");
  await sleep(400);
  await shot(p, `../08-summary-transfer${t}.png`);
  await click(p, "รายจ่าย");
});
await step("previous", async () => {
  await click(p, "เดือนก่อน");
  await sleep(400);
  await shot(p, `../08-summary-previous${t}.png`);
  await click(p, "เดือนถัดไป");
});
await step("filtered", async () => {
  await click(p, "กรองรายการ");
  await sleep(700);
  await click(p, "เลือกทั้งหมด");
  await sleep(300);
  await click(p, "กสิกรไทย");
  await sleep(300);
  await click(p, "แสดงรายการ");
  await sleep(700);
  await shot(p, `../08-summary-filtered${t}.png`);
  await click(p, "ล้าง");
  await sleep(400);
});
await step("queue", async () => {
  // The ยังไม่เลือกหมวด row shows in 08-summary-bottom.
  await scrollSummary(p, 2000);
  await sleep(300);
  await click(p, "ยังไม่เลือกหมวด");
  await sleep(800);
  await shot(p, `../08-summary-queue${t}.png`);
});
console.log(await visible(p));
await b.close();
