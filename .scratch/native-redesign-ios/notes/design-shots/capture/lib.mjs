import { createRequire } from "node:module";
// puppeteer-core is installed outside the repo; DESIGN_SHOTS_DEPS points at that directory.
const puppeteer = createRequire(`${process.env.DESIGN_SHOTS_DEPS}/`)("puppeteer-core");
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function open(theme = "light") {
  const b = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const p = await b.newPage();
  await p.setViewport({ width: 1400, height: 1250, deviceScaleFactor: 2 });
  await p.goto("http://localhost:8765/Moojot%20Home.dc.html", { waitUntil: "networkidle0" });
  await sleep(2000);
  if (theme === "dark") await click(p, "มืด");
  return { b, p };
}
// click the topmost visible button/element whose aria-label or text includes `text`
export async function click(p, text, { exact = false } = {}) {
  const ok = await p.evaluate(
    (text, exact) => {
      const els = [...document.querySelectorAll("button,[role=button],[onclick],div,span")];
      for (const e of els) {
        const label = (e.getAttribute("aria-label") || e.textContent || "").trim();
        if (exact ? label !== text : !label.includes(text)) continue;
        if (!["BUTTON"].includes(e.tagName) && e.getAttribute("role") !== "button" && !exact) continue;
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        if (hit && (hit === e || e.contains(hit))) {
          // An SVG icon inside the button has no click(); click the button itself then.
          (typeof hit.click === "function" ? hit : e).click();
          return true;
        }
      }
      return false;
    },
    text,
    exact
  );
  if (!ok) throw new Error("not clickable: " + text);
  await sleep(500);
}
export async function shot(p, path) {
  const box = await p.evaluate(() => {
    const e = [...document.querySelectorAll("div")].find((d) => {
      const r = d.getBoundingClientRect();
      return Math.round(r.width) === 402 && r.height > 800;
    });
    const r = e.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  await p.screenshot({ path, clip: box });
}
export async function signIn(p) {
  await click(p, "เข้าสู่ระบบ", { exact: true });
  const inputs = await p.$$("input[type=email], input[type=password]");
  for (const i of inputs) {
    const v = await i.evaluate((e) => e.getBoundingClientRect().width > 0);
    if (!v) continue;
    const t = await i.evaluate((e) => e.type);
    await i.click();
    await i.type(t === "email" ? "moo.user@example.com" : "moojot123");
  }
  await p.keyboard.press("Enter");
  await sleep(1500);
}
export async function visible(p) {
  return p.evaluate(() =>
    [...document.querySelectorAll("button,[role=button],input,textarea")]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        if (!r.width) return false;
        const h = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return h && (h === e || e.contains(h));
      })
      .map(
        (e) =>
          `${e.tagName}|${(e.getAttribute("aria-label") || e.textContent || e.placeholder || "").trim().replace(/\s+/g, " ").slice(0, 50)}`
      )
      .join("\n")
  );
}
