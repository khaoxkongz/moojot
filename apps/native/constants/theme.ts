/**
 * App palettes from the design handoff (docs/design/native-redesign-2026-09-30/README.md, "Design tokens").
 * Both themes share the brand accent and differ in surfaces and readable text.
 */
export const themes = {
  light: {
    background: "#F9F9F7",
    surface: "#FFFFFF",
    raised: "#F0EFEC",
    text: "#2D2D2B",
    muted: "#5E5D59",
    border: "#D7D5CE",
    accent: "#CC7D5E",
    accentText: "#8D472D",
    onAccent: "#1E1B19",
    success: "#006F30",
    danger: "#AD3414",
    inverse: "#2D2D2B",
    onInverse: "#F9F9F7",
    inverseAccent: "#E1A68E",
    shade: "rgba(30,27,25,0.42)",
    /** Fills behind `onAccent` text or icons (badges, chart bars). `success`/`danger` are text colors. */
    successFill: "#00C853",
    dangerFill: "#FF5F38",
    /** Light accent tint kept for the existing plan gradient. */
    accentSoft: "#E1A68E",
  },
  dark: {
    background: "#2D2D2B",
    surface: "#383835",
    raised: "#454541",
    text: "#F9F9F7",
    muted: "#C9C8C3",
    border: "#565650",
    accent: "#CC7D5E",
    accentText: "#E1A68E",
    onAccent: "#1E1B19",
    success: "#20D269",
    danger: "#FF9984",
    inverse: "#F9F9F7",
    onInverse: "#2D2D2B",
    inverseAccent: "#8D472D",
    shade: "rgba(0,0,0,0.55)",
    /** Fills behind `onAccent` text or icons (badges, chart bars). `success`/`danger` are text colors. */
    successFill: "#00C853",
    dangerFill: "#FF5F38",
    /** Light accent tint kept for the existing plan gradient. */
    accentSoft: "#E1A68E",
  },
} as const;

export type AppTheme = { [K in keyof typeof themes.light]: string };
export type AppThemeMode = keyof typeof themes;

/** Hero 20, cards and grouped lists 16, tiles 14, chips 20 (half their 40 height), sheets 24 (top), tab bar 17 (top). */
export const radius = {
  hero: 20,
  card: 16,
  tile: 14,
  chip: 20,
  sheet: 24,
  tabBar: 17,
  input: 14,
  pill: 999,
} as const;

/** Side padding, card padding and the minimum touch sizes from the handoff. */
export const space = { side: 16, card: 16, section: 22, chipGap: 8 } as const;
export const touch = { min: 44, button: 52, row: 60 } as const;

/** Cards have no drop shadow: they use `raisedRing`. Shadows are only for floating things. */
export const shadow = {
  /** @deprecated Cards use an inset `raised` ring instead (see `raisedRing`). */
  card: { boxShadow: "0 8px 28px rgba(0, 0, 0, 0.08)" } as const,
  float: { boxShadow: "0 6px 16px rgba(45, 45, 43, 0.22)" } as const,
  toast: { boxShadow: "0 8px 24px rgba(0, 0, 0, 0.18)" } as const,
  dialog: { boxShadow: "0 10px 30px rgba(0, 0, 0, 0.22)" } as const,
  segment: { boxShadow: "0 1px 3px rgba(0, 0, 0, 0.14)" } as const,
};

export const raisedRing = (theme: AppTheme) => ({ boxShadow: `inset 0 0 0 1px ${theme.raised}` }) as const;
export const accentRing = (theme: AppTheme) => ({ boxShadow: `inset 0 0 0 2px ${theme.accent}` }) as const;

export function navigationTheme(mode: AppThemeMode) {
  const t = themes[mode];
  return {
    background: t.background,
    border: t.raised,
    card: t.surface,
    notification: t.danger,
    primary: t.accentText,
    text: t.text,
  };
}

export const NAV_THEME = {
  light: navigationTheme("light"),
  dark: navigationTheme("dark"),
};
