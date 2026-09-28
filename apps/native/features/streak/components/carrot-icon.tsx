import Svg, { Path } from "react-native-svg";

export function CarrotIcon({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72" accessibilityLabel="แครอต">
      <Path
        d="M35 22C27 11 30 5 34 5c5 0 7 8 8 13 2-7 6-12 11-11 5 2 1 10-6 15 9-3 15-2 16 3 1 5-6 8-16 7"
        fill="#58A979"
        stroke="#328E5E"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <Path
        d="M29 25c-7 2-12 8-11 16 1 9 8 20 18 27 4 2 18-25 18-36 0-8-7-12-15-12-4 0-7 2-10 5Z"
        fill="#F68A39"
        stroke="#D86225"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <Path
        d="M27 38c3 2 6 2 9 1m5 10c4 2 7 1 9-1M31 54c3 2 6 2 8 1"
        fill="none"
        stroke="#D86225"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <Path d="M24 29c3-4 7-6 11-7" fill="none" stroke="#FFC381" strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}
