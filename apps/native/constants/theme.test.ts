import { describe, expect, it } from "vitest";

import { NAV_THEME, themes } from "./theme";

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
  it("uses the requested brand colors in both modes", () => {
    expect(themes.light.background).toBe("#F9F9F7");
    expect(themes.dark.background).toBe("#2D2D2B");
    for (const mode of ["light", "dark"] as const) {
      expect(themes[mode].accent).toBe("#CC7D5E");
      expect(themes[mode].success).toBe("#00C853");
      expect(themes[mode].danger).toBe("#FF5F38");
      expect(NAV_THEME[mode].background).toBe(themes[mode].background);
      expect(NAV_THEME[mode].text).toBe(themes[mode].text);
    }
  });

  it.each(["light", "dark"] as const)("%s text roles meet 4.5:1 on app surfaces", (mode) => {
    const theme = themes[mode];
    for (const surface of [theme.background, theme.surface, theme.raised]) {
      for (const text of [theme.text, theme.muted, theme.accentText, theme.successText, theme.dangerText]) {
        expect(contrast(text, surface), `${mode}: ${text} on ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(contrast(theme.onAccent, theme.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme.onAccent, theme.accentSoft)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme.onAccent, theme.success)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme.onAccent, theme.danger)).toBeGreaterThanOrEqual(4.5);
  });
});
