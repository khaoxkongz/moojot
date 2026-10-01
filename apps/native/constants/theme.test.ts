import { describe, expect, it } from "vite-plus/test";

import { themes } from "./theme";

function luminance(hex: string) {
  const rgb = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = rgb.map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrast(a: string, b: string) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("native app theme", () => {
  it.each(["light", "dark"] as const)("%s text roles meet 4.5:1 where they are drawn", (mode) => {
    const theme = themes[mode];
    for (const surface of [theme.background, theme.surface, theme.raised]) {
      for (const text of [theme.text, theme.muted, theme.accentText, theme.success, theme.danger]) {
        expect(contrast(text, surface), `${mode}: ${text} on ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(contrast(theme.onAccent, theme.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme.onInverse, theme.inverse)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme.inverseAccent, theme.inverse)).toBeGreaterThanOrEqual(4.5);
  });
});
