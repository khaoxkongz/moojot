import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";

export type FilterSourceIconKind = "wallet" | "card" | "other" | "removed-card" | "bank";

type FilterSourceIconProps = {
  kind: FilterSourceIconKind;
  bankName?: string;
  size?: number;
};

const BLUE = "#0B6EF3";
const INK = "#0B2741";

function normalizeBank(name: string) {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[\s._-]+/g, "");
  if (/kbank|kasikorn|กสิกร/.test(normalized)) return "kbank";
  if (/truemoney|ทรูมันนี่|ทรูมันนี/.test(normalized)) return "truemoney";
  if (/krungthai|กรุงไทย|ktb/.test(normalized)) return "krungthai";
  if (/scb|siamcommercial|ไทยพาณิชย์/.test(normalized)) return "scb";
  if (/bangkokbank|bbl|ธนาคารกรุงเทพ|กรุงเทพ/.test(normalized)) return "bangkok";
  if (/ttb|ทหารไทย|ธนชาต|ทีทีบี/.test(normalized)) return "ttb";
  return "unknown";
}

/** Compact source badges for the transaction filter. Drawn as SVG for native and web. */
export function FilterSourceIcon({ kind, bankName = "", size = 48 }: FilterSourceIconProps) {
  if (kind === "removed-card") {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48" accessible={false}>
        <Rect x="1" y="7" width="46" height="34" rx="4" fill={INK} />
        <Rect x="7" y="29" width="24" height="3.5" rx="1.75" fill="#7D92A8" />
      </Svg>
    );
  }

  if (kind !== "bank") {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48" accessible={false}>
        <Circle cx="24" cy="24" r="23" fill="#F3F8FF" stroke="#E6E8ED" />
        {kind === "wallet" ? (
          <>
            <Path
              d="M12.5 18.5v-4c0-1.3.9-2.4 2.1-2.7l17-4.2c1.6-.4 3 .8 3 2.4v8.5"
              fill="none"
              stroke={BLUE}
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <Rect x="12.5" y="17" width="23" height="19" rx="3" fill="none" stroke={BLUE} strokeWidth="2" />
            <Path d="M29 23h8v7h-8a3.5 3.5 0 0 1 0-7Z" fill="#F3F8FF" stroke={BLUE} strokeWidth="2" />
            <Circle cx="30.5" cy="26.5" r="1" fill={BLUE} />
          </>
        ) : kind === "card" ? (
          <>
            <Rect x="10.5" y="14.5" width="27" height="19" rx="3" fill="none" stroke={BLUE} strokeWidth="2" />
            <Line x1="11" y1="21" x2="37" y2="21" stroke={BLUE} strokeWidth="2" />
            <Line x1="15" y1="28.5" x2="20" y2="28.5" stroke={BLUE} strokeWidth="2" strokeLinecap="round" />
          </>
        ) : (
          <>
            <Path d="m17 32 4-14 13-4-4 14-13 4Z" fill="none" stroke={BLUE} strokeWidth="2" strokeLinejoin="round" />
            <Path d="m21 18 9 10M16 33l7-7" fill="none" stroke={BLUE} strokeWidth="1.6" strokeLinecap="round" />
          </>
        )}
      </Svg>
    );
  }

  const bank = normalizeBank(bankName);

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessible={false}>
      {bank === "kbank" ? (
        <>
          <Circle cx="24" cy="24" r="22" fill="#FFFFFF" stroke="#EC1D2B" strokeWidth="3" />
          <Path
            d="M24 19c-5-3-9-7-10-12v12c0 3 1 5 4 7l6 4V19Zm0 0c5-3 9-7 10-12v12c0 3-1 5-4 7l-6 4V19Z"
            fill="#0BA64B"
          />
          <Path d="M24 19v17" stroke="#0BA64B" strokeWidth="2" />
          <Path
            d="M10 37c4-2 9-2 14 0 5-2 10-2 14 0M11 40c4-2 9-2 13 0 4-2 9-2 13 0"
            fill="none"
            stroke="#B9BDC2"
            strokeWidth="1"
          />
        </>
      ) : bank === "truemoney" ? (
        <>
          <Circle cx="24" cy="24" r="23" fill="#FFFFFF" stroke="#E9EBEF" />
          <Path d="M12 11h9l4 13h-9L12 11Z" fill="#E52829" />
          <Path d="M20 13h9l-4 13h-8l3-13Z" fill="#E96922" />
          <Path d="M29 12h8l-5 14h-8l5-14Z" fill="#F9A01B" />
          <SvgText x="24" y="34" textAnchor="middle" fontSize="7.2" fontWeight="700" fill="#D72E32">
            true
          </SvgText>
          <SvgText x="24" y="40" textAnchor="middle" fontSize="6.1" fontWeight="700" fill="#F08A21">
            money
          </SvgText>
        </>
      ) : bank === "krungthai" ? (
        <>
          <Circle cx="24" cy="24" r="23" fill="#0799D6" />
          <Path
            d="M12 19c1-5 5-8 11-8 4 0 6 1 8 4 5-1 9 2 9 7 0 3-1 5-3 7l-3-1v-7c-2 2-4 2-7 1-2 3-5 4-9 3v9h-4v-9c-2-1-3-3-2-6Z"
            fill="#FFFFFF"
          />
          <Path
            d="M34 27c0 5 1 7 5 7 1 0 2-1 2-2"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <Circle cx="31" cy="18" r="1" fill="#0799D6" />
          <Path d="M15 38h18" stroke="#FFFFFF" strokeWidth="1.7" strokeLinecap="round" opacity="0.8" />
        </>
      ) : bank === "scb" ? (
        <>
          <Circle cx="24" cy="24" r="23" fill="#4A2D84" />
          <Path
            d="M24 10C18 16 12 20 12 28c0 5 3 8 7 8 2 0 4-1 5-3 1 2 3 3 5 3 4 0 7-3 7-8 0-8-6-12-12-18Z"
            fill="#FFCE32"
          />
          <Path
            d="M24 15c-5 6-8 9-8 14 0 3 2 5 5 5 1 0 2-.4 3-1 1 .6 2 1 3 1 3 0 5-2 5-5 0-5-3-8-8-14Z"
            fill="#4A2D84"
          />
        </>
      ) : bank === "bangkok" ? (
        <>
          <Circle cx="24" cy="24" r="23" fill="#2C4B91" />
          <Path
            d="m24 9 12 16-12 14-12-14L24 9Z"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <Path
            d="m24 9-5 18 5 12 5-12-5-18ZM19 27l5-3 5 3"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </>
      ) : bank === "ttb" ? (
        <>
          <Circle cx="24" cy="24" r="23" fill="#FFFFFF" stroke="#E9EBEF" />
          <SvgText x="6" y="32" fontSize="27" fontWeight="800" fill="#1764C5">
            t
          </SvgText>
          <SvgText x="17" y="32" fontSize="27" fontWeight="800" fill="#F38C2C">
            t
          </SvgText>
          <SvgText x="27" y="32" fontSize="27" fontWeight="800" fill="#183F6D">
            b
          </SvgText>
        </>
      ) : (
        <>
          <Circle cx="24" cy="24" r="23" fill="#F3F8FF" stroke="#E6E8ED" />
          <Path
            d="M12.5 18.5v-4c0-1.3.9-2.4 2.1-2.7l17-4.2c1.6-.4 3 .8 3 2.4v8.5"
            fill="none"
            stroke={BLUE}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <Rect x="12.5" y="17" width="23" height="19" rx="3" fill="none" stroke={BLUE} strokeWidth="2" />
          <Path d="M29 23h8v7h-8a3.5 3.5 0 0 1 0-7Z" fill="#F3F8FF" stroke={BLUE} strokeWidth="2" />
        </>
      )}
    </Svg>
  );
}
