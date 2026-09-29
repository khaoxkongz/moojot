import React from "react";
import Svg, { Line, Path, Rect } from "react-native-svg";

import { useAppTheme } from "@/lib/use-app-theme";

type IconName = "up" | "down" | "transfer" | "calendar" | "category" | "note" | "repeat";

export function EntryIcon({ name, size = 28, color }: { name: IconName; size?: number; color?: string }) {
  const theme = useAppTheme();
  const shared = {
    fill: "none" as const,
    stroke: color ?? theme.accentText,
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  let art: React.ReactNode;
  switch (name) {
    case "up":
      art = (
        <>
          <Path d="M12 21V3M5 10l7-7 7 7M4 22h16" {...shared} />
        </>
      );
      break;
    case "down":
      art = (
        <>
          <Path d="M12 3v18M5 14l7 7 7-7M4 22h16" {...shared} />
        </>
      );
      break;
    case "transfer":
      art = (
        <>
          <Path d="M3 8h18l-5-5M21 16H3l5 5" {...shared} />
        </>
      );
      break;
    case "calendar":
      art = (
        <>
          <Rect x="3" y="5" width="18" height="16" rx="1" {...shared} />
          <Line x1="3" y1="10" x2="21" y2="10" {...shared} />
          <Line x1="8" y1="2" x2="8" y2="7" {...shared} />
          <Line x1="16" y1="2" x2="16" y2="7" {...shared} />
        </>
      );
      break;
    case "category":
      art = (
        <>
          <Rect x="2" y="2" width="8" height="8" rx="1" {...shared} />
          <Rect x="14" y="2" width="8" height="8" rx="1" {...shared} />
          <Rect x="2" y="14" width="8" height="8" rx="1" {...shared} />
          <Rect x="14" y="14" width="8" height="8" rx="1" {...shared} />
        </>
      );
      break;
    case "note":
      art = (
        <>
          <Path d="M4 3h12l4 4v14H4V3Z" {...shared} />
          <Path d="M16 3v5h5M7 13h7M7 17h9M13 11l7-7 2 2-7 7-3 1 1-3Z" {...shared} />
        </>
      );
      break;
    case "repeat":
      art = (
        <>
          <Path d="M19 7H6a3 3 0 0 0-3 3v4m0 0-2-2m2 2 3-3M5 17h13a3 3 0 0 0 3-3v-4m0 0 2 2m-2-2-3 3" {...shared} />
        </>
      );
      break;
  }
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {art}
    </Svg>
  );
}
