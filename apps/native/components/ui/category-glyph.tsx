import { Text } from "@/components/ui/typography";
import type React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

export function CategoryGlyph({ id, icon }: { id: string; icon: string }) {
  const stroke = "#627286";
  const basic = {
    fill: "none",
    stroke,
    strokeWidth: 2.2,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
  };
  let art: React.ReactNode;
  switch (id) {
    case "expense-food":
      art = (
        <>
          <Path d="M8 19h32l-4 13-12 5-12-5-4-13Z" fill="#FF9E15" stroke={stroke} strokeWidth="2" />
          <Path d="M20 17 24 4M27 17l5-11M15 39h18" {...basic} />
        </>
      );
      break;
    case "expense-transport":
      art = (
        <>
          <Path d="M6 21h36v13H6V21Zm5-7h25l4 7H8l3-7Z" fill="#30BFD2" stroke={stroke} strokeWidth="2" />
          <Rect x="7" y="25" width="34" height="5" fill="#19B1C7" />
          <Circle cx="13" cy="34" r="3" fill="#FFFFFF" stroke={stroke} strokeWidth="1.7" />
          <Circle cx="35" cy="34" r="3" fill="#FFFFFF" stroke={stroke} strokeWidth="1.7" />
        </>
      );
      break;
    case "expense-essentials":
      art = (
        <>
          <Path d="M13 5h18l6 6v31H13V5Z" {...basic} />
          <Path d="M31 5v8h6" {...basic} />
          <Rect x="17" y="24" width="17" height="15" fill="#F0E926" stroke={stroke} strokeWidth="1.6" />
          <Path d="m21 31 3 3 6-7" {...basic} />
        </>
      );
      break;
    case "expense-shopping":
      art = (
        <>
          <Path d="m12 14-5 27h34l-5-27H12Z" fill="#E52DD3" stroke={stroke} strokeWidth="2" />
          <Path d="M17 18 19 7h17l-2 11M17 22V13M31 22V13" {...basic} />
        </>
      );
      break;
    case "expense-fun":
      art = (
        <>
          <Rect x="10" y="5" width="28" height="38" fill="#FF5E2C" stroke={stroke} strokeWidth="2" />
          <Path d="M10 16h28" {...basic} />
          <Path d="m21 22 11 6-11 7V22Z" fill="#FFFFFF" stroke={stroke} strokeWidth="1.7" />
        </>
      );
      break;
    case "expense-home":
      art = (
        <>
          <Path d="M5 24 24 6l19 18M10 22v20h28V22M17 42V29h14v13" {...basic} />
          <Path d="M18 40V29h12v11" fill="#2178E8" />
          <Path d="M35 13V6" {...basic} />
        </>
      );
      break;
    case "expense-health":
      art = (
        <>
          <Path
            d="M24 41 5 23C-1 15 8 7 16 10l8 7 8-7c9-3 17 5 11 13L24 41Z"
            fill="#19D0AA"
            stroke={stroke}
            strokeWidth="2"
          />
          <Path d="M24 20v13M17.5 26.5h13" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
        </>
      );
      break;
    case "expense-family":
      art = (
        <>
          <Circle cx="14" cy="13" r="5" fill="#F06BC8" stroke={stroke} strokeWidth="1.7" />
          <Circle cx="34" cy="13" r="5" fill="#F06BC8" stroke={stroke} strokeWidth="1.7" />
          <Path d="M8 40V25h12v15M28 40V25h12v15M19 25h10v16H19V25Z" fill="#FFFFFF" stroke={stroke} strokeWidth="1.7" />
          <Path d="m24 34-5-5a3 3 0 0 1 5-3 3 3 0 0 1 5 3l-5 5Z" fill="#EE67C8" />
        </>
      );
      break;
    case "expense-gifts":
      art = (
        <>
          <Rect x="7" y="18" width="34" height="25" fill="#FFFFFF" stroke={stroke} strokeWidth="2" />
          <Path d="M7 24h34M24 18v25" stroke="#9334DF" strokeWidth="4" />
          <Path
            d="M24 18C12 16 9 12 13 8c4-4 9 4 11 10Zm0 0C36 16 39 12 35 8c-4-4-9 4-11 10Z"
            fill="#9E38E7"
            stroke={stroke}
            strokeWidth="1.5"
          />
        </>
      );
      break;
    case "expense-travel":
      art = (
        <>
          <Path d="M7 22 25 11l18 13-18-4-18 2Z" fill="#1985ED" stroke={stroke} strokeWidth="1.9" />
          <Path d="m25 20-3 19c-3-2-5-2-8 0-3-2-5-2-8 0M22 39l4 3" {...basic} />
        </>
      );
      break;
    case "expense-education":
      art = (
        <>
          <Path d="M11 7h24v32H11V7Z" fill="#7159E5" stroke={stroke} strokeWidth="2" />
          <Path d="M13 37h25v5H11c-2 0-2-5 2-5ZM35 8v29" fill="#FFFFFF" stroke={stroke} strokeWidth="1.7" />
        </>
      );
      break;
    case "expense-work":
      art = (
        <>
          <Rect x="6" y="17" width="36" height="25" fill="#FFFFFF" stroke={stroke} strokeWidth="2" />
          <Path d="M6 24h36v8H6v-8Z" fill="#D99B1A" stroke={stroke} strokeWidth="1.5" />
          <Path d="M17 17v-6h14v6M20 38h8" {...basic} />
        </>
      );
      break;
    case "expense-savings":
      art = (
        <>
          <Rect x="7" y="8" width="34" height="29" fill="#C3EA25" stroke={stroke} strokeWidth="2" />
          <Path d="M18 37v6m12-6v6M14 43h20M13 30V23h5v7m4 0V17h5v13m4 0V11h5v19" {...basic} />
        </>
      );
      break;
    case "expense-bills":
      art = (
        <>
          <Rect x="5" y="11" width="38" height="27" fill="#FFFFFF" stroke={stroke} strokeWidth="2" />
          <Rect x="5" y="17" width="38" height="6" fill="#6554AD" />
          <Path d="M10 30h15m8 0h5v4h-5z" {...basic} />
        </>
      );
      break;
    case "income-salary":
      art = (
        <>
          <Path d="M6 18h36v23H6V18Z" fill="#FFFFFF" stroke={stroke} strokeWidth="2" />
          <Path d="m6 19 18 12 18-12" {...basic} />
          <Rect x="17" y="12" width="15" height="12" fill="#26B95A" stroke={stroke} strokeWidth="1.5" />
          <Circle cx="24" cy="17" r="3" fill="#FFFFFF" stroke={stroke} strokeWidth="1" />
        </>
      );
      break;
    case "income-extra":
      art = (
        <>
          <Path d="M7 26c8-3 15-2 20 1l9-6c6-3 9 2 4 6L28 38H11L5 33" {...basic} />
          <Rect x="12" y="8" width="25" height="16" rx="2" fill="#27C340" stroke={stroke} strokeWidth="2" />
          <Circle cx="24" cy="16" r="4" fill="#FFFFFF" stroke={stroke} strokeWidth="1.2" />
        </>
      );
      break;
    case "income-gift":
      art = (
        <>
          <Rect x="8" y="19" width="32" height="22" fill="#FFFFFF" stroke={stroke} strokeWidth="2" />
          <Path d="M8 24h32M24 19v22" {...basic} />
          <Path
            d="M24 19c-9-4-13-9-7-11 4-1 7 6 7 11Zm0 0c9-4 13-9 7-11-4-1-7 6-7 11Z"
            fill="#A1DD2A"
            stroke={stroke}
            strokeWidth="1.4"
          />
          <Circle cx="37" cy="38" r="6" fill="#A4DF23" stroke={stroke} strokeWidth="1.5" />
        </>
      );
      break;
    case "income-business":
      art = (
        <>
          <Rect x="7" y="8" width="22" height="33" fill="#FFFFFF" stroke={stroke} strokeWidth="2" />
          <Path d="M12 13h4m5 0h4m-13 6h4m5 0h4m-13 6h4m5 0h4m-13 6h4m5 0h4" {...basic} />
          <Rect x="24" y="26" width="19" height="16" fill="#20A6A7" stroke={stroke} strokeWidth="1.8" />
        </>
      );
      break;
    case "income-refund":
      art = (
        <>
          <Rect x="14" y="21" width="29" height="19" fill="#1DC830" stroke={stroke} strokeWidth="2" />
          <Path d="M18 30h12M11 13h17m0 0-5-5m5 5-5 5" {...basic} />
          <Circle cx="9" cy="10" r="6" fill="#FFFFFF" stroke={stroke} strokeWidth="1.5" />
        </>
      );
      break;
    default:
      art = id.endsWith("-other") ? (
        <>
          <Circle
            cx="12"
            cy="25"
            r="3.6"
            fill={id.startsWith("income") ? "#178E41" : "#9AA8B6"}
            stroke={stroke}
            strokeWidth="1.6"
          />
          <Circle
            cx="24"
            cy="25"
            r="3.6"
            fill={id.startsWith("income") ? "#178E41" : "#9AA8B6"}
            stroke={stroke}
            strokeWidth="1.6"
          />
          <Circle
            cx="36"
            cy="25"
            r="3.6"
            fill={id.startsWith("income") ? "#178E41" : "#9AA8B6"}
            stroke={stroke}
            strokeWidth="1.6"
          />
        </>
      ) : null;
  }
  if (art === null) return <Text style={{ fontSize: 30 }}>{icon}</Text>;
  return (
    <Svg
      width={40}
      height={40}
      viewBox="0 0 48 48"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {art}
    </Svg>
  );
}
