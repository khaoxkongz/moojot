import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { ReactNode } from "react";
import { Pressable, ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton, type IconName } from "@/components/ui/controls";
import { Text } from "@/components/ui/typography";
import { touch } from "@/constants/theme";
import { useAppTheme } from "@/lib/use-app-theme";

import { onboardingProgress, type OnboardingScreen } from "../onboarding-flow";
import type { IconLine } from "../onboarding-copy";

/** The 52-tall bar above a step: back, four progress segments, and "N/4". The recap shows only back. */
export function StepHeader({ screen, onBack }: { screen: OnboardingScreen; onBack: () => void }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const progress = onboardingProgress(screen);
  return (
    <View style={{ paddingTop: insets.top }}>
      <View
        style={{ height: 52, paddingLeft: 4, paddingRight: 18, flexDirection: "row", alignItems: "center", gap: 8 }}
      >
        <IconButton icon="chevron-left" size={30} label="ย้อนกลับ" onPress={onBack} />
        {progress ? (
          <>
            <View
              role="progressbar"
              aria-label={progress.label}
              accessibilityValue={{ min: 1, max: progress.total, now: progress.number }}
              style={{ flex: 1, flexDirection: "row", gap: 6 }}
            >
              {Array.from({ length: progress.total }, (_, index) => (
                <View
                  key={index}
                  style={{
                    flex: 1,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: index < progress.number ? theme.accent : theme.border,
                  }}
                />
              ))}
            </View>
            <Text
              importantForAccessibility="no"
              accessibilityElementsHidden
              style={{
                minWidth: 30,
                color: theme.muted,
                fontSize: 13,
                lineHeight: 18,
                textAlign: "right",
                fontVariant: ["tabular-nums"],
                fontWeight: "400",
              }}
            >
              {progress.number}/{progress.total}
            </Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

/** A step's scrolling content, padded like the handoff (4 top, 20 sides, 16 bottom). */
export function StepBody({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[{ paddingTop: 4, paddingHorizontal: 20, paddingBottom: 16 }, style]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

/** The bar under a step: `background`, a 1px `raised` line on top, the home-indicator gap below. */
export function StepFooter({
  children,
  top = 10,
  bottom = 12,
}: {
  children: ReactNode;
  top?: number;
  bottom?: number;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: top,
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + bottom,
        backgroundColor: theme.background,
        boxShadow: `0 -1px 0 ${theme.raised}`,
      }}
    >
      {children}
    </View>
  );
}

/**
 * A step's 52-tall main button. `dimmed` shows a step whose answer is missing; it stays tappable so the step can say
 * what is missing. `busy` ignores taps, dims to 60% and shows `busyLabel`.
 */
export function StepButton({
  label,
  onPress,
  dimmed = false,
  busy = false,
  busyLabel,
  testID,
}: {
  label: string;
  onPress: () => void;
  dimmed?: boolean;
  busy?: boolean;
  busyLabel?: string;
  testID?: string;
}) {
  const theme = useAppTheme();
  const text = busy && busyLabel ? busyLabel : label;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityState={{ busy, disabled: busy }}
      onPress={busy ? undefined : onPress}
      style={({ pressed }) => ({
        height: touch.button,
        borderRadius: touch.button / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: dimmed ? theme.raised : theme.accent,
        opacity: busy ? 0.6 : pressed ? 0.84 : 1,
      })}
    >
      <Text style={{ color: dimmed ? theme.muted : theme.onAccent, fontSize: 16, lineHeight: 22 }}>{text}</Text>
    </Pressable>
  );
}

/** Title 22 and the muted line under it. */
export function StepTitle({ title, sub, center = false }: { title: string; sub?: string; center?: boolean }) {
  const theme = useAppTheme();
  const align = center ? ("center" as const) : ("left" as const);
  return (
    <>
      <Text
        accessibilityRole="header"
        style={{ marginTop: 8, color: theme.text, fontSize: 22, lineHeight: 32, textAlign: align }}
      >
        {title}
      </Text>
      {sub ? (
        <Text style={{ marginTop: center ? 6 : 2, color: theme.muted, fontSize: 14, lineHeight: 21, textAlign: align }}>
          {sub}
        </Text>
      ) : null}
    </>
  );
}

/** The 32 `raised` circle with an icon, as on the terms cards, the slip lines and the recap rows. */
export function IconDot({ icon }: { icon: IconName }) {
  const theme = useAppTheme();
  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.raised,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MaterialCommunityIcons name={icon} size={18} color={theme.text} />
    </View>
  );
}

export function IconLineRow({ line, textTop = 5 }: { line: IconLine; textTop?: number }) {
  const theme = useAppTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
      <IconDot icon={line.icon} />
      <Text style={{ flex: 1, paddingTop: textTop, color: theme.text, fontSize: 14, lineHeight: 22 }}>{line.text}</Text>
    </View>
  );
}

/** A 44-tall `accentText` link with a leading icon, such as "อ่านข้อตกลงฉบับเต็ม". */
export function InfoLink({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        marginTop: 6,
        minHeight: touch.min,
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <MaterialCommunityIcons name={icon} size={18} color={theme.accentText} />
      <Text style={{ color: theme.accentText, fontSize: 14, lineHeight: 20 }}>{label}</Text>
    </Pressable>
  );
}

/** The 1px `raised` line on top of a grouped row after the first, starting `left` from the row's edge. */
export function RowDivider({ left }: { left: number }) {
  const theme = useAppTheme();
  return <View style={{ position: "absolute", top: 0, left, right: 0, height: 1, backgroundColor: theme.raised }} />;
}

/** A field error under a control, announced when it appears. */
export function StepError({ text, style }: { text: string | null; style?: StyleProp<ViewStyle> }) {
  const theme = useAppTheme();
  if (!text) return null;
  return (
    <View style={style}>
      <Text accessibilityRole="alert" style={{ color: theme.danger, fontSize: 13, lineHeight: 19 }}>
        {text}
      </Text>
    </View>
  );
}
