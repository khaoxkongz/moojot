import { open, click, shot, signIn, sleep } from "./lib.mjs";
const theme = process.argv[2];
const t = theme === "dark" ? "-dark" : "";
const step = async (name, fn) => {
  try {
    await fn();
  } catch (e) {
    console.log("FAIL", name, e.message);
  }
};

const { b, p } = await open(theme);
await signIn(p);
await sleep(3000);
await step("home", async () => {
  await shot(p, `../05-home${t}.png`);
});
await step("filter", async () => {
  await click(p, "กรองรายการ");
  await sleep(700);
  await shot(p, `../05-filter-sheet${t}.png`);
  await click(p, "เลือกทั้งหมด");
  await sleep(400);
  await shot(p, `../05-filter-none${t}.png`);
  await click(p, "กสิกรไทย");
  await sleep(300);
  await click(p, "แสดงรายการ");
  await sleep(700);
  await shot(p, `../05-home-filtered${t}.png`);
  await click(p, "ล้าง");
  await sleep(500);
});
await step("queue", async () => {
  await click(p, "รายการรอเลือกหมวด");
  await sleep(800);
  await shot(p, `../05-queue${t}.png`);
});
await b.close();
