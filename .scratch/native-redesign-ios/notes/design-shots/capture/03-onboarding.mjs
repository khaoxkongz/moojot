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
const type = async (p, selector, text) => {
  const input = await p.$(selector);
  await input.click({ clickCount: 3 });
  await p.keyboard.press("Backspace");
  if (text) await input.type(text);
  await sleep(300);
};
// Scrolls one birthday column (aria-label วัน / เดือน / ปี พ.ศ.) to the option with this text.
const scrollColumn = (p, label, text) =>
  p.evaluate(
    (label, text) => {
      const list = document.querySelector(`[role=listbox][aria-label="${label}"]`);
      const option = [...list.querySelectorAll("[role=option]")].find((o) => o.textContent.trim() === text);
      list.scrollTop = option.offsetTop - 88;
    },
    label,
    text
  );

// Scrolls the button with this text into view inside its scrolling step, so click() can hit it.
const reveal = (p, text) =>
  p.evaluate((text) => {
    const button = [...document.querySelectorAll("button")].find((e) => e.textContent.trim() === text);
    // Only the step's own scroller moves; scrollIntoView would also shift the phone frame.
    let scroller = button.parentElement;
    while (scroller && getComputedStyle(scroller).overflowY !== "auto") scroller = scroller.parentElement;
    scroller.scrollTop = button.offsetTop - scroller.clientHeight / 2;
  }, text);

/** Signs up from the auth screen and walks to the photo step, which still asks. */
async function toSlips(p) {
  await type(p, "#mj-auth-name", "หมูกลับมา");
  await type(p, "#mj-auth-email", "new.pig@example.com");
  await type(p, "#mj-auth-pw", "moojot12");
  await p.focus("#mj-auth-pw");
  await p.keyboard.press("Enter");
  await sleep(1500);
}

const { b, p } = await open(theme);
// "ลอง: เปิดแอปครั้งแรก" replays the two-second splash; its entrance takes 0.8 s.
await step("splash", async () => {
  await click(p, "ลอง: เปิดแอปครั้งแรก");
  await sleep(500);
  await shot(p, `../03-splash${t}.png`);
});
await sleep(2500);
await toSlips(p);
await step("terms", async () => {
  await click(p, "สวัสดี หมูจด!");
  await sleep(400);
  await shot(p, `../03-terms${t}.png`);
});
await step("terms error", async () => {
  await click(p, "ต่อไป", { exact: true });
  await shot(p, `../03-terms-error${t}.png`);
});
await step("terms sheet", async () => {
  await click(p, "อ่านข้อตกลงฉบับเต็ม");
  await sleep(500);
  await shot(p, `../03-terms-sheet${t}.png`);
  await click(p, "เข้าใจแล้ว");
  await sleep(500);
});
await step("slips ask", async () => {
  await click(p, "ฉันได้อ่านและยอมรับ");
  await click(p, "ต่อไป", { exact: true });
  await sleep(400);
  await shot(p, `../03-slips-ask${t}.png`);
});
await step("slips info", async () => {
  await reveal(p, "หมูจดอ่านสลิปอะไรได้บ้าง?");
  await click(p, "หมูจดอ่านสลิปอะไรได้บ้าง?");
  await sleep(500);
  await shot(p, `../03-slips-info${t}.png`);
  await click(p, "เข้าใจแล้ว");
  await sleep(500);
});
await step("slips limited", async () => {
  await click(p, "อนุญาตและค้นหาสลิป");
  await sleep(400);
  await click(p, "จำกัดการเข้าถึง…");
  await sleep(400);
  await shot(p, `../03-slips-limited${t}.png`);
});
await step("slips counting", async () => {
  await reveal(p, "เปิดการตั้งค่ารูปภาพ");
  await click(p, "เปิดการตั้งค่ารูปภาพ");
  await sleep(300);
  await shot(p, `../03-slips-counting${t}.png`);
  await sleep(1700);
  await shot(p, `../03-slips-counted${t}.png`);
});
await step("goals", async () => {
  await click(p, "ต่อไป", { exact: true });
  await sleep(400);
  await shot(p, `../03-goals${t}.png`);
  await click(p, "ต่อไป", { exact: true });
  await shot(p, `../03-goals-error${t}.png`);
  await click(p, "ออมเงินเพิ่ม", { exact: true });
  await click(p, "คุมงบใช้จ่าย", { exact: true });
  await shot(p, `../03-goals-picked${t}.png`);
});
await step("extras", async () => {
  await click(p, "ต่อไป", { exact: true });
  await sleep(400);
  await shot(p, `../03-extras${t}.png`);
});
await step("birthday", async () => {
  await click(p, "พี่มนุษย์เกิดวันไหนนะ?");
  await sleep(600);
  await shot(p, `../03-birth-sheet${t}.png`);
  await click(p, "กุมภาพันธ์", { exact: true });
  await scrollColumn(p, "ปี พ.ศ.", "2544");
  await click(p, "2544", { exact: true });
  await scrollColumn(p, "วัน", "29");
  await click(p, "29", { exact: true });
  await shot(p, `../03-birth-invalid${t}.png`);
  await scrollColumn(p, "ปี พ.ศ.", "2543");
  await click(p, "2543", { exact: true });
  await click(p, "เลือก", { exact: true });
  await sleep(500);
  await click(p, "ให้หมูจดใช้ข้อมูลรายการ");
  await shot(p, `../03-extras-filled${t}.png`);
});
await step("ready", async () => {
  await click(p, "ต่อไป", { exact: true });
  await sleep(400);
  await shot(p, `../03-ready${t}.png`);
});
await b.close();

// A second signup for the refused answer and the recap without photos.
const second = await open(theme);
await sleep(2500);
await toSlips(second.p);
await step("slips denied", async () => {
  const q = second.p;
  await click(q, "สวัสดี หมูจด!");
  await click(q, "ฉันได้อ่านและยอมรับ");
  await click(q, "ต่อไป", { exact: true });
  await click(q, "อนุญาตและค้นหาสลิป");
  await sleep(400);
  await click(q, "ไม่อนุญาต", { exact: true });
  await sleep(400);
  await shot(q, `../03-slips-denied${t}.png`);
});
await step("ready skipped", async () => {
  const q = second.p;
  await click(q, "ต่อไป", { exact: true });
  await click(q, "ปลดหนี้", { exact: true });
  await click(q, "ต่อไป", { exact: true });
  await click(q, "ต่อไป", { exact: true });
  await sleep(400);
  await shot(q, `../03-ready-no-photos${t}.png`);
});
await second.b.close();
