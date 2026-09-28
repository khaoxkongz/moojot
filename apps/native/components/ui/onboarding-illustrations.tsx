import { useEffect, useState } from "react";
import { Animated } from "react-native";
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from "react-native-svg";

const ink = "#0B243B";
const blue = "#1978F2";
const lightBlue = "#A8D3FF";
const paleBlue = "#E6F3FF";
const fur = "#BF7931";
const peach = "#FFAC5D";
const box = "#FFE998";
const boxSide = "#E2B43D";
const boxFlap = "#D9AE37";
const AnimatedGroup = Animated.createAnimatedComponent(G);

export type OnboardingIllustrationVariant =
  | "logo"
  | "welcome"
  | "privacy"
  | "slips"
  | "reasons"
  | "motivation"
  | "final";

export type OnboardingIllustrationProps = {
  variant: OnboardingIllustrationVariant;
  /** The rendered width in points. The illustration keeps its 320:260 aspect ratio. */
  size?: number;
  /** A value from 0 to 1 that reveals the six symbols around the reasons mascot. */
  progress?: number;
  /** Selected answers also reveal symbols, one per answer. */
  selectedReasons?: readonly string[];
};

function CatHead({ happy = false }: { happy?: boolean }) {
  return (
    <G>
      <Path d="M15 62 18 9q1-7 8-4l40 21h18l40-21q7-3 8 4l3 53Z" fill={fur} />
      <Path d="M16 77q3-29 15-44l36-19q8-4 16 0l36 19q13 17 16 44l-19 11-19-26H54L35 88Z" fill="#FFFFFF" />
      <Path d="m24 84 28-31h47l28 31-20 22-21-13H63l-20 14Z" fill={fur} />
      <Path d="m56 92 19 18 19-18 13 23H43Z" fill={peach} />
      {happy ? (
        <G fill="none" stroke={ink} strokeLinecap="round" strokeWidth={5}>
          <Path d="M47 79q8-9 17 0" />
          <Path d="M87 79q8-9 17 0" />
        </G>
      ) : (
        <G fill={ink}>
          <Ellipse cx={56} cy={78} rx={5.5} ry={8.5} />
          <Ellipse cx={95} cy={78} rx={5.5} ry={8.5} />
        </G>
      )}
      <Path d="m65 91 20-1-10 10Z" fill={ink} />
      <G stroke="#FFFFFF" strokeLinecap="square" strokeWidth={5}>
        <Line x1={7} y1={88} x2={34} y2={86} />
        <Line x1={16} y1={106} x2={38} y2={94} />
        <Line x1={115} y1={86} x2={143} y2={88} />
        <Line x1={111} y1={94} x2={135} y2={107} />
      </G>
    </G>
  );
}

function CatBox({ happy = false }: { happy?: boolean }) {
  return (
    <G>
      <Path d="M13 134h124v103H13Z" fill={box} />
      <Path d="M75 134h62v103H75Z" fill={boxSide} />
      <CatHead happy={happy} />
      <Path d="M13 136h62l-27 36h-65Z" fill={boxFlap} />
      <Path d="M75 136h62l30 36h-65Z" fill={boxFlap} />
      <Path d="M13 138h62l-21 32h-70Z" fill="#E8BD46" />
      <Path d="M75 138h62l30 32h-70Z" fill="#D9A838" />
      <Path d="m29 132 15 19-7 18-18-6-11-18Z" fill={peach} />
      <Path d="m121 132-14 19 7 18 18-6 11-18Z" fill={fur} />
    </G>
  );
}

function Sparkle({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <Path d="M0-16 4-4 16 0 4 4 0 16-4 4-16 0-4-4Z" fill={blue} transform={`translate(${x} ${y}) scale(${scale})`} />
  );
}

function LogoIllustration() {
  return (
    <G transform="translate(45 23) scale(1.55)">
      <CatHead />
    </G>
  );
}

function WelcomeIllustration() {
  return (
    <G>
      <Sparkle x={58} y={73} scale={0.8} />
      <Sparkle x={246} y={108} scale={0.6} />
      <Sparkle x={173} y={27} scale={0.45} />
      <G transform="translate(0 17)">
        <G transform="translate(85 16)">
          <CatBox happy />
        </G>
      </G>
    </G>
  );
}

function PrivacyIllustration() {
  return (
    <G>
      <G transform="translate(72 23) scale(1.14)">
        <Path d="M38 107q-17 28 0 62h77q17-34-1-62Z" fill="#FFFFFF" />
        <Path d="M48 155q-15 2-25 21h29Z" fill={fur} />
        <Path d="M103 155q15 2 25 21h-29Z" fill={fur} />
        <CatHead happy />
      </G>
      <Path d="m56 143 63-11 20 65-43 32-44-29Z" fill={lightBlue} />
      <Path d="m56 143 63-11 20 65-43 32Z" fill={blue} />
      <Path
        d="m72 177 17 16 29-37"
        fill="none"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={12}
      />
      <Path d="m222 153 19-28 30 9-5 62-37 17-23-34Z" fill={blue} />
      <Path d="m222 153 19-28 7 84-19 4-23-34Z" fill={lightBlue} />
      <Path
        d="m218 171 15 13 27-31"
        fill="none"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={8}
      />
    </G>
  );
}

function SlipsIllustration() {
  return (
    <G transform="translate(79 19) scale(1.12)">
      <Path d="M27 183q-15 12-42 12l30-11 23-24Z" fill={fur} />
      <Path d="M41 105q-17 26-12 58l23 30h48l23-30q4-34-14-58Z" fill="#FFFFFF" />
      <Path d="M54 175 76 160l23 15-13 18H65Z" fill={peach} />
      <Path d="M76 160v33h10l13-18Z" fill={fur} />
      <CatHead happy />
      <Path d="M41 135q-13 12-11 26l22 32h11l-21-34 16-17Z" fill="#FFFFFF" />
      <Path d="M111 134q15 13 11 29l-21 30H89l20-34-13-16Z" fill="#FFFFFF" />
    </G>
  );
}

function ChartSymbol() {
  return (
    <G transform="translate(12 26)">
      <Rect width={59} height={62} x={17} y={34} rx={3} fill={paleBlue} />
      <Rect width={30} height={45} x={24} y={0} rx={2} fill={lightBlue} />
      <Rect width={34} height={42} x={0} y={13} rx={2} fill="#FFFFFF" />
      <Path d="M8 24h17M8 31h17M30 11h16M30 18h16" stroke={blue} strokeWidth={3} />
      <Path d="M28 83V65m13 18V53m13 30V72" stroke="#7FACED" strokeWidth={8} />
      <Path d="M16 96h70" stroke={blue} strokeWidth={4} />
      <Path d="m61 53 11 0-6 10Z" fill="#31BF6B" />
    </G>
  );
}

function PlanSymbol() {
  return (
    <G transform="translate(229 31)">
      <Path d="m0 32 29-26 30 26v33H0Z" fill={paleBlue} />
      <Path d="M-5 33 29 0l34 33" fill="none" stroke={blue} strokeWidth={5} />
      <Rect width={66} height={35} x={0} y={52} rx={5} fill={lightBlue} />
      <Path d="m7 62 9-18h38l9 18" fill={blue} />
      <Circle cx={14} cy={87} r={8} fill="#4F8EDB" />
      <Circle cx={53} cy={87} r={8} fill="#4F8EDB" />
      <Rect width={17} height={35} x={67} y={18} rx={3} fill={paleBlue} />
      <Rect width={11} height={24} x={70} y={23} rx={2} fill="#7FACED" />
    </G>
  );
}

function SavingsSymbol() {
  return (
    <G transform="translate(8 151)">
      <Path d="M8 28q8-24 35-23 31 0 36 24l-10 8-4 17H26l-6-14L8 38Z" fill="#78A8F3" />
      <Path d="M12 10 27 20 9 29Z" fill="#78A8F3" />
      <Path d="M63 20h20l-5 8H66" fill="#78A8F3" />
      <Circle cx={41} cy={4} r={10} fill={boxFlap} />
      <Circle cx={41} cy={4} r={6} fill={box} />
      <Circle cx={28} cy={31} r={3} fill={blue} />
    </G>
  );
}

function WalletSymbol() {
  return (
    <G transform="translate(243 153)">
      <Rect width={64} height={50} y={17} rx={6} fill="#78A8F3" />
      <Path d="M12 21 21 0l43 17-7 18Z" fill={paleBlue} />
      <Path d="m36 19 26-12 5 14-17 11" fill={blue} />
      <Rect width={28} height={19} x={41} y={34} rx={3} fill="#4F8EDB" />
      <Circle cx={51} cy={43} r={3} fill={blue} />
    </G>
  );
}

function MoneySymbol() {
  return (
    <G transform="translate(27 210)">
      <Path d="M8 14h45l10 14-4 24H4L0 28Z" fill="#78A8F3" />
      <Path d="m10 14 5-12h32l5 12Z" fill="#4F8EDB" />
      <Path d="M19 31h25M31 20v24" stroke={blue} strokeWidth={5} />
    </G>
  );
}

function DebtSymbol() {
  return (
    <G transform="translate(246 217)">
      <Rect width={51} height={34} x={7} y={18} rx={4} fill="#78A8F3" />
      <Path d="m16 18 6-13h22l6 13" fill={paleBlue} />
      <Circle cx={46} cy={36} r={11} fill={boxFlap} />
      <Circle cx={46} cy={36} r={4} fill={box} />
      <Path d="M4 42h26" stroke={blue} strokeWidth={5} />
    </G>
  );
}

function RevealSymbol({ shown, children }: { shown: boolean; children: React.ReactNode }) {
  const [opacity] = useState(() => new Animated.Value(shown ? 1 : 0));

  useEffect(() => {
    const animation = Animated.timing(opacity, {
      toValue: shown ? 1 : 0,
      duration: 320,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [opacity, shown]);

  return <AnimatedGroup opacity={opacity}>{children}</AnimatedGroup>;
}

function ReasonsIllustration({ visible }: { visible: readonly boolean[] }) {
  return (
    <G>
      <G transform="translate(8 -11)">
        <G transform="translate(77 14)">
          <CatBox />
        </G>
      </G>
      <RevealSymbol shown={visible[0]}>
        <ChartSymbol />
      </RevealSymbol>
      <RevealSymbol shown={visible[1]}>
        <PlanSymbol />
      </RevealSymbol>
      <RevealSymbol shown={visible[2]}>
        <SavingsSymbol />
      </RevealSymbol>
      <RevealSymbol shown={visible[3]}>
        <WalletSymbol />
      </RevealSymbol>
      <RevealSymbol shown={visible[4]}>
        <MoneySymbol />
      </RevealSymbol>
      <RevealSymbol shown={visible[5]}>
        <DebtSymbol />
      </RevealSymbol>
    </G>
  );
}

function MotivationIllustration() {
  return (
    <G>
      <G transform="translate(94 10)">
        <CatBox happy />
        <Circle cx={75} cy={174} r={47} fill={paleBlue} />
        <Path d="M75 209 42 178q-15-15-3-28 12-12 25 0l11 11 11-11q13-12 25 0 12 13-3 28Z" fill={blue} />
        <Path d="m26 149 19 0 12 16-19 10-21-14Z" fill={peach} />
        <Path d="m104 165 12-16h20l9 12-21 14Z" fill={fur} />
      </G>
      <Sparkle x={55} y={97} scale={0.56} />
      <Sparkle x={273} y={112} scale={0.46} />
    </G>
  );
}

function FinalIllustration() {
  return (
    <G>
      <G transform="translate(104 55) scale(1.32)">
        <Path d="M39 108q-24 36 3 93h70q25-58-4-93Z" fill="#FFFFFF" />
        <CatHead happy />
        <Path d="m42 147-13 10 27 27 17-13Z" fill={peach} />
        <Path d="m111 145 18 7-12 33-23-12Z" fill={fur} />
      </G>
      <Path d="M20 148 80 126l30 22-2 74-70 26-28-37Z" fill="#FFFFFF" />
      <Path d="m10 211 28 37 70-26v-18l-70 24Z" fill={paleBlue} />
      <Circle cx={55} cy={169} r={22} fill={lightBlue} />
      <Path d="M55 147a22 22 0 0 1 18 34H55Z" fill={blue} />
      <Path d="m42 204 47-17m-42 27 38-14" stroke={lightBlue} strokeWidth={5} />
      <Path d="m96 154 40-99 15-14-7 78-26 20-7-25Z" fill={blue} />
      <Path d="m96 154 40-99 7-7-28 80Z" fill={lightBlue} />
      <Sparkle x={266} y={70} scale={0.55} />
    </G>
  );
}

const labels: Record<OnboardingIllustrationVariant, string> = {
  logo: "มาสคอตหมูจด",
  welcome: "หมูจดทักทาย",
  privacy: "หมูจดดูแลข้อมูลส่วนตัว",
  slips: "มาสคอตแมวกับรูปสลิป",
  reasons: "หมูจดกับเป้าหมายการจดรายจ่าย",
  motivation: "มาสคอตกำลังกอดหัวใจสีฟ้า",
  final: "หมูจดพร้อมเริ่มใช้งาน",
};

/** Transparent vector artwork for the first-run experience. */
export function OnboardingIllustration({
  variant,
  size = 280,
  progress = 0,
  selectedReasons,
}: OnboardingIllustrationProps) {
  const revealCount = Math.floor(Math.max(0, Math.min(1, progress)) * 6);
  const keys = ["reduce", "dream", "save", "mindful", "budget", "debt"];
  const visible = keys.map((key, index) => (selectedReasons ? selectedReasons.includes(key) : index < revealCount));

  return (
    <Svg width={size} height={(size * 260) / 320} viewBox="0 0 320 260" accessibilityLabel={labels[variant]}>
      {variant === "logo" ? <LogoIllustration /> : null}
      {variant === "welcome" ? <WelcomeIllustration /> : null}
      {variant === "privacy" ? <PrivacyIllustration /> : null}
      {variant === "slips" ? <SlipsIllustration /> : null}
      {variant === "reasons" ? <ReasonsIllustration visible={visible} /> : null}
      {variant === "motivation" ? <MotivationIllustration /> : null}
      {variant === "final" ? <FinalIllustration /> : null}
    </Svg>
  );
}
