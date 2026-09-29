import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";

export type HomeIconName =
  | "search"
  | "wallet"
  | "calendar"
  | "chart"
  | "clock"
  | "edit"
  | "chevronLeft"
  | "chevronRight"
  | "chevronUp"
  | "plus"
  | "filter";

export function HomeIcon({
  name,
  size = 24,
  color = "currentColor",
  strokeWidth = 2,
}: {
  name: HomeIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const shared = {
    fill: "none" as const,
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const shapes = {
    search: (
      <>
        <Circle cx="10.8" cy="10.8" r="6.8" {...shared} />
        <Line x1="16" y1="16" x2="21" y2="21" {...shared} />
      </>
    ),
    wallet: (
      <>
        <Rect x="3" y="6" width="18" height="14" rx="2.5" {...shared} />
        <Path d="M5 6V4.5C5 3.7 5.7 3 6.5 3H18" {...shared} />
        <Path d="M15 11h6v5h-6a2.5 2.5 0 0 1 0-5Z" {...shared} />
      </>
    ),
    calendar: (
      <>
        <Rect x="3" y="5" width="18" height="16" rx="2" {...shared} />
        <Line x1="3" y1="9" x2="21" y2="9" {...shared} />
        <Line x1="8" y1="3" x2="8" y2="7" {...shared} />
        <Line x1="16" y1="3" x2="16" y2="7" {...shared} />
      </>
    ),
    chart: (
      <>
        <Path d="M11 3a9 9 0 1 0 10 10h-10V3Z" {...shared} />
        <Path d="M14 3v7h7a9 9 0 0 0-7-7Z" {...shared} />
      </>
    ),
    clock: (
      <>
        <Circle cx="12" cy="12" r="9" {...shared} />
        <Path d="M12 7v5l3.5 2" {...shared} />
      </>
    ),
    edit: (
      <>
        <Path d="m4 17 12.8-12.8a2 2 0 0 1 2.9 0l.1.1a2 2 0 0 1 0 2.9L7 20H4v-3Z" {...shared} />
        <Path d="m14.8 6.2 3 3" {...shared} />
      </>
    ),
    chevronLeft: <Polyline points="15 4 7 12 15 20" {...shared} />,
    chevronRight: <Polyline points="9 4 17 12 9 20" {...shared} />,
    chevronUp: <Polyline points="4 15 12 7 20 15" {...shared} />,
    plus: (
      <>
        <Line x1="12" y1="4" x2="12" y2="20" {...shared} />
        <Line x1="4" y1="12" x2="20" y2="12" {...shared} />
      </>
    ),
    filter: (
      <>
        <Path d="M3 5h18l-7 8v5l-4 2v-7L3 5Z" {...shared} />
      </>
    ),
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {shapes[name]}
    </Svg>
  );
}
