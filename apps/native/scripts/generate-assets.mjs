import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const output = new URL("../assets/images/", import.meta.url);
await mkdir(output, { recursive: true });

function pigSvg(size, background = true, monochrome = false) {
  const pink = monochrome ? "#FFFFFF" : "#FFCCD5";
  const ear = monochrome ? "#FFFFFF" : "#FCA7B8";
  const outline = monochrome ? "#FFFFFF" : "#D94D6A";
  const snout = monochrome ? "#FFFFFF" : "#F795AB";
  const detail = monochrome ? "#D94D6A" : "#843947";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
    ${background ? '<rect width="1024" height="1024" fill="#F15F78"/>' : ""}
    <circle cx="815" cy="224" r="126" fill="#FFFFFF" opacity=".10"/>
    <circle cx="160" cy="860" r="174" fill="#FFFFFF" opacity=".12"/>
    <path d="M242 377 Q175 196 257 185 Q341 185 384 301 Z" fill="${ear}" stroke="${outline}" stroke-width="28" stroke-linejoin="round"/>
    <path d="M640 301 Q684 185 767 185 Q849 195 782 377 Z" fill="${ear}" stroke="${outline}" stroke-width="28" stroke-linejoin="round"/>
    <ellipse cx="512" cy="552" rx="326" ry="294" fill="${pink}" stroke="${outline}" stroke-width="30"/>
    <path d="M370 514 Q394 489 420 514" fill="none" stroke="${detail}" stroke-width="30" stroke-linecap="round"/>
    <path d="M604 514 Q630 489 654 514" fill="none" stroke="${detail}" stroke-width="30" stroke-linecap="round"/>
    <ellipse cx="512" cy="632" rx="169" ry="113" fill="${snout}" stroke="${outline}" stroke-width="20"/>
    <ellipse cx="450" cy="632" rx="23" ry="38" fill="${detail}" opacity=".75"/>
    <ellipse cx="574" cy="632" rx="23" ry="38" fill="${detail}" opacity=".75"/>
    <circle cx="293" cy="596" r="28" fill="#F487A0" opacity=".7"/>
    <circle cx="731" cy="596" r="28" fill="#F487A0" opacity=".7"/>
    <path d="M736 764 L824 674 L863 713 L775 803 Z" fill="#F9C766" stroke="${detail}" stroke-width="14" stroke-linejoin="round"/>
    <path d="M736 764 L719 820 L775 803 Z" fill="#FFF0CE" stroke="${detail}" stroke-width="11" stroke-linejoin="round"/>
  </svg>`;
}

const path = (name) => fileURLToPath(new URL(name, output));
await sharp(Buffer.from(pigSvg(1024)))
  .png()
  .toFile(path("icon.png"));
await sharp(Buffer.from(pigSvg(1024, false)))
  .png()
  .toFile(path("android-icon-foreground.png"));
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: "#F15F78" } })
  .png()
  .toFile(path("android-icon-background.png"));
await sharp(Buffer.from(pigSvg(1024, false, true)))
  .png()
  .toFile(path("android-icon-monochrome.png"));
await sharp(Buffer.from(pigSvg(1024)))
  .resize(180, 180)
  .png()
  .toFile(path("favicon.png"));
await sharp(Buffer.from(pigSvg(1024, false)))
  .resize(512, 512)
  .png()
  .toFile(path("splash-icon.png"));
