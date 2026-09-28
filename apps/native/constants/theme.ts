/** The two app palettes share their brand accents and differ only in surfaces and readable text. */
export const themes = {
  light: {
    background: "#F9F9F7",
    surface: "#FFFFFF",
    raised: "#F0EFEC",
    text: "#2D2D2B",
    muted: "#5E5D59",
    border: "#D7D5CE",
    accent: "#CC7D5E",
    accentSoft: "#E1A68E",
    accentText: "#8D472D",
    onAccent: "#1E1B19",
    success: "#00C853",
    successText: "#006F30",
    danger: "#FF5F38",
    dangerText: "#AD3414",
  },
  dark: {
    background: "#2D2D2B",
    surface: "#383835",
    raised: "#454541",
    text: "#F9F9F7",
    muted: "#C9C8C3",
    border: "#565650",
    accent: "#CC7D5E",
    accentSoft: "#E1A68E",
    accentText: "#E1A68E",
    onAccent: "#1E1B19",
    success: "#00C853",
    successText: "#20D269",
    danger: "#FF5F38",
    dangerText: "#FF9984",
  },
} as const;

export type AppTheme = { [K in keyof typeof themes.light]: string };
export type AppThemeMode = keyof typeof themes;

export const radius = { card: 24, input: 16, pill: 999 } as const;

export const shadow = {
  card: { boxShadow: "0 8px 28px rgba(0, 0, 0, 0.08)" } as const,
  float: { boxShadow: "0 8px 22px rgba(0, 0, 0, 0.14)" } as const,
};

export function navigationTheme(mode: AppThemeMode) {
  const t = themes[mode];
  return {
    background: t.background,
    border: t.border,
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
