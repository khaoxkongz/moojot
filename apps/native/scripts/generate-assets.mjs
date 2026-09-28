import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const output = new URL("../assets/images/", import.meta.url);
const mascot = fileURLToPath(new URL("../assets/generated/brand-mascot.png", import.meta.url));
const path = (name) => fileURLToPath(new URL(name, output));
const charcoal = "#2D2D2B";

await mkdir(output, { recursive: true });

async function centeredMascot(size, figureSize) {
  const inset = Math.floor((size - figureSize) / 2);
  return sharp(mascot)
    .resize(figureSize, figureSize, { fit: "contain" })
    .extend({
      top: inset,
      bottom: size - figureSize - inset,
      left: inset,
      right: size - figureSize - inset,
      background: "#00000000",
    })
    .png()
    .toBuffer();
}

const iconFigure = await centeredMascot(1024, 830);
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: charcoal } })
  .composite([{ input: iconFigure }])
  .png()
  .toFile(path("icon.png"));

const adaptiveFigure = await centeredMascot(1024, 660);
await sharp(adaptiveFigure).toFile(path("android-icon-foreground.png"));
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: charcoal } })
  .png()
  .toFile(path("android-icon-background.png"));

const alpha = await sharp(adaptiveFigure).extractChannel("alpha").toBuffer();
await sharp({ create: { width: 1024, height: 1024, channels: 3, background: "#FFFFFF" } })
  .joinChannel(alpha)
  .png()
  .toFile(path("android-icon-monochrome.png"));

await sharp(path("icon.png")).resize(180, 180).png().toFile(path("favicon.png"));
await sharp(await centeredMascot(512, 430))
  .png()
  .toFile(path("splash-icon.png"));
