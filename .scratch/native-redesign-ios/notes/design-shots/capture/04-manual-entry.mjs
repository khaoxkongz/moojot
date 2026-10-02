import { open, click, shot, signIn, sleep } from "./lib.mjs";
const theme = process.argv[2];
const t = theme === "dark" ? "-dark" : "";
const fresh = async () => {
  const r = await open(theme);
  await signIn(r.p);
  await sleep(3000);
  return r;
};
const step = async (name, fn) => {
  try {
    await fn();
  } catch (e) {
    console.log("FAIL", name, e.message);
  }
};

let { b, p } = await fresh();
await step("keypad", async () => {
  await click(p, "จดเพิ่ม");
  await p.keyboard.type("120+35");
  await sleep(400);
  await shot(p, `../04-keypad-calculating${t}.png`);
  await p.keyboard.press("Enter");
  await sleep(400);
  await p.keyboard.press("Enter");
  await sleep(900);
  await shot(p, `../04-category-sheet${t}.png`);
  await click(p, "เพิ่มแท็ก");
  await sleep(600);
  await shot(p, `../04-tag-add${t}.png`);
  await p.keyboard.press("Escape");
  await sleep(600);
});
await step("form", async () => {
  await click(p, "อาหาร").catch(async () => {
    await click(p, "หมวด");
    await click(p, "อาหาร");
  });
  await sleep(800);
  await shot(p, `../04-form-new${t}.png`);
});
await step("calendar", async () => {
  await click(p, "วันที่วันนี้");
  await sleep(700);
  await shot(p, `../04-calendar${t}.png`);
  await p.keyboard.press("Escape");
  await sleep(600);
});
await step("exit", async () => {
  await click(p, "ปิดหน้าจดรายการ");
  await sleep(700);
  await shot(p, `../04-exit-dialog${t}.png`);
});
await b.close();

({ b, p } = await fresh());
await step("empty-save", async () => {
  await click(p, "จดเพิ่ม");
  await click(p, "เสร็จ");
  await sleep(600);
  await shot(p, `../04-form-empty${t}.png`);
  await click(p, "บันทึก");
  await sleep(700);
  await shot(p, `../04-save-missing-amount${t}.png`);
  await click(p, "ย้ายเงิน");
  await sleep(600);
  await shot(p, `../04-type-transfer${t}.png`);
});
await b.close();

({ b, p } = await fresh());
await step("edit", async () => {
  await click(p, "ข้าวมันไก่ประตูน้ำ");
  await sleep(900);
  await shot(p, `../04-edit-manual${t}.png`);
  await click(p, "ตัวเลือกเพิ่มเติม");
  await sleep(600);
  await shot(p, `../04-edit-menu${t}.png`);
  await click(p, "ลบ");
  await sleep(900);
  await shot(p, `../04-delete-toast${t}.png`);
});
await b.close();
