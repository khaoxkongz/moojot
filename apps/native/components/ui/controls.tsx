/**
 * Shared controls from the design handoff ("Shared components" in
 * docs/design/native-redesign-2026-09-30/README.md). Screens move onto these as they are restyled;
 * the older `moo-ui` controls stay until their callers have moved.
 */
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { ComponentProps, ReactNode } from "react";
import { Fragment } from "react";
import { Pressable, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { Text } from "@/components/ui/typography";
import { accentRing, radius, raisedRing, shadow, touch } from "@/constants/theme";
import { useAppTheme } from "@/lib/use-app-theme";

export type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

/** Secondary line under a row or option title: 12 on `muted`. */
const subLine = { fontSize: 12, lineHeight: 17 } as const;

/** The ฿ sign sits after an amount at about 55% of the amount's size. */
export const bahtFontSize = (amountSize: number) => Math.round(amountSize * 0.55);

/** A money figure: system font at 500 with tabular digits, and ฿ after it in the regular weight. */
export function Amount({
  value,
  size = 15,
  color,
  showBaht = true,
  selectable,
  style,
}: {
  /** Already formatted, such as "1,234.50" or "+120". */
  value: string;
  size?: number;
  color?: string;
  showBaht?: boolean;
  selectable?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const theme = useAppTheme();
  return (
    <Text
      selectable={selectable}
      style={[
        {
          color: color ?? theme.text,
          fontSize: size,
          lineHeight: Math.round(size * (size >= 26 ? 1.15 : 1.4)),
          fontWeight: "500",
          fontVariant: ["tabular-nums"],
          letterSpacing: size >= 26 ? -0.3 : 0,
        },
        style,
      ]}
    >
      {value}
      {showBaht ? <Text style={{ fontSize: bahtFontSize(size), fontWeight: "400", letterSpacing: 0 }}> ฿</Text> : null}
    </Text>
  );
}

/** 44×44 round button. Give it a label: the icon alone says nothing to VoiceOver. */
export function IconButton({
  icon,
  label,
  onPress,
  size = 22,
  tone = "plain",
  color,
  style,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  size?: number;
  tone?: "plain" | "raised";
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: touch.min,
          height: touch.min,
          borderRadius: touch.min / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tone === "raised" || pressed ? theme.raised : "transparent",
        },
        style,
      ]}
    >
      <MaterialCommunityIcons name={icon} size={size} color={color ?? theme.text} />
    </Pressable>
  );
}

/**
 * The 52-tall pill button. It is never greyed out: with missing input the screen explains what to fix.
 * While `busy` it shows `busyLabel`, dims to 60% and ignores taps, so one tap saves once.
 */
export function PillButton({
  label,
  busyLabel,
  busy = false,
  onPress,
  variant = "primary",
  icon,
  style,
}: {
  label: string;
  busyLabel?: string;
  busy?: boolean;
  onPress: () => void;
  variant?: "primary" | "secondary";
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const color = variant === "primary" ? theme.onAccent : theme.text;
  const text = busy && busyLabel ? busyLabel : label;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityState={{ busy }}
      onPress={busy ? undefined : onPress}
      style={({ pressed }) => [
        {
          minHeight: touch.button,
          borderRadius: touch.button / 2,
          paddingHorizontal: 20,
          flexDirection: "row",
          gap: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: variant === "primary" ? theme.accent : theme.raised,
          opacity: busy ? 0.6 : pressed ? 0.84 : 1,
        },
        style,
      ]}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={20} color={color} /> : null}
      <Text style={{ color, fontSize: 16, lineHeight: 22, textAlign: "center" }}>{text}</Text>
    </Pressable>
  );
}

/** Pushed-screen header: 52 tall, back button on the left, centered 17 title, 44 spacer on the right. */
export function ScreenHeader({
  title,
  onBack,
  backLabel = "กลับ",
  backIcon = "chevron-left",
  right,
}: {
  title: string;
  onBack: () => void;
  backLabel?: string;
  backIcon?: IconName;
  right?: ReactNode;
}) {
  const theme = useAppTheme();
  return (
    <View style={{ minHeight: 52, flexDirection: "row", alignItems: "center", paddingHorizontal: 6 }}>
      <IconButton icon={backIcon} size={30} label={backLabel} onPress={onBack} />
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={{ flex: 1, color: theme.text, fontSize: 17, lineHeight: 24, textAlign: "center" }}
      >
        {title}
      </Text>
      {right ?? <View style={{ width: touch.min }} />}
    </View>
  );
}

/** รายจ่าย / รายรับ / ย้ายเงิน style switch: `raised` track, selected segment on `surface`. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  height = 40,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  height?: number;
}) {
  const theme = useAppTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: "row", gap: 3, padding: 3, borderRadius: 12, backgroundColor: theme.raised }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              {
                flex: 1,
                minHeight: height,
                borderRadius: 9,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 4,
              },
              selected && { backgroundColor: theme.surface, ...shadow.segment },
            ]}
          >
            <Text
              style={{ color: selected ? theme.text : theme.muted, fontSize: 14, lineHeight: 20, textAlign: "center" }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** At least 40 tall, radius 20. Selected chips fill with `accent`; multi-select chips also show a check. */
export function Chip({
  label,
  selected = false,
  onPress,
  multiSelect = false,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  multiSelect?: boolean;
  icon?: IconName;
}) {
  const theme = useAppTheme();
  const color = selected ? theme.onAccent : theme.text;
  return (
    <Pressable
      accessibilityRole={multiSelect ? "checkbox" : "button"}
      accessibilityState={multiSelect ? { checked: selected } : { selected }}
      onPress={onPress}
      hitSlop={2}
      style={{
        minHeight: 40,
        borderRadius: radius.chip,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: selected ? theme.accent : "transparent",
        borderWidth: 1.2,
        borderColor: selected ? theme.accent : theme.border,
      }}
    >
      {selected && multiSelect ? <MaterialCommunityIcons name="check" size={16} color={color} /> : null}
      {icon && !(selected && multiSelect) ? <MaterialCommunityIcons name={icon} size={16} color={color} /> : null}
      <Text style={{ color, fontSize: 14, lineHeight: 20 }}>{label}</Text>
    </Pressable>
  );
}

/** One option in a single-choice list: a 22px circle with a 10px dot, label 15 and an optional sub line. */
export function RadioCard({
  label,
  sub,
  selected,
  onPress,
  trailing,
}: {
  label: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
  trailing?: ReactNode;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 58,
          borderRadius: radius.tile,
          paddingHorizontal: 14,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          backgroundColor: pressed ? theme.raised : theme.surface,
        },
        selected ? accentRing(theme) : raisedRing(theme),
      ]}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: selected ? theme.accent : theme.border,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.accent }} /> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: theme.text, fontSize: 15, lineHeight: 21 }}>{label}</Text>
        {sub ? <Text style={[subLine, { color: theme.muted }]}>{sub}</Text> : null}
      </View>
      {trailing}
    </Pressable>
  );
}

/** `surface` card, radius 16, inset `raised` ring; rows divided by 1px `raised` lines indented to 62. */
export function GroupedList({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useAppTheme();
  const rows = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <View
      style={[
        { backgroundColor: theme.surface, borderRadius: radius.card, overflow: "hidden" },
        raisedRing(theme),
        style,
      ]}
    >
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 ? <View style={{ height: 1, marginLeft: 62, backgroundColor: theme.raised }} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

/** The 36px `raised` circle at the start of a grouped row, with an icon or an emoji. */
export function RowIcon({ icon, emoji }: { icon?: IconName; emoji?: string }) {
  const theme = useAppTheme();
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.raised,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {emoji ? <Text style={{ fontSize: 18 }}>{emoji}</Text> : null}
      {!emoji && icon ? <MaterialCommunityIcons name={icon} size={19} color={theme.text} /> : null}
    </View>
  );
}

export function GroupedRow({
  title,
  sub,
  icon,
  emoji,
  value,
  onPress,
  chevron = Boolean(onPress),
  trailing,
  minHeight = touch.row,
}: {
  title: string;
  sub?: string;
  icon?: IconName;
  emoji?: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  trailing?: ReactNode;
  /** `touch.row` (60) by default; forms use `touch.formRow` (64). */
  minHeight?: number;
}) {
  const theme = useAppTheme();
  const content = (
    <>
      {icon || emoji ? <RowIcon icon={icon} emoji={emoji} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: theme.text, fontSize: 15, lineHeight: 21 }}>{title}</Text>
        {sub ? <Text style={[subLine, { color: theme.muted }]}>{sub}</Text> : null}
      </View>
      {value ? <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 20 }}>{value}</Text> : null}
      {trailing}
      {chevron ? <MaterialCommunityIcons name="chevron-right" size={22} color={theme.muted} /> : null}
    </>
  );
  const rowStyle: ViewStyle = {
    minHeight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  };
  if (!onPress) return <View style={rowStyle}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [rowStyle, pressed && { backgroundColor: theme.raised }]}
    >
      {content}
    </Pressable>
  );
}

/** Status in words plus an icon, never color alone. `danger` boxes are announced as alerts. */
export function InfoBox({
  icon = "information-outline",
  title,
  body,
  tone = "info",
  action,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  tone?: "info" | "danger";
  action?: ReactNode;
}) {
  const theme = useAppTheme();
  const look = {
    info: { icon: theme.accentText, title: theme.text, role: undefined },
    danger: { icon: theme.danger, title: theme.danger, role: "alert" as const },
  }[tone];
  return (
    <View
      accessibilityRole={look.role}
      style={{
        backgroundColor: theme.raised,
        borderRadius: radius.tile,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: "row",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <MaterialCommunityIcons name={icon} size={20} color={look.icon} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: look.title, fontSize: 14, lineHeight: 20 }}>{title}</Text>
        {body ? <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 19 }}>{body}</Text> : null}
        {action}
      </View>
    </View>
  );
}

/** The "ลองอีกครั้ง" (try again) link text: 14 on `accentText`. Inside a line of text it runs on in that line. */
export function RetryLinkText() {
  const theme = useAppTheme();
  return <Text style={{ color: theme.accentText, fontSize: 14, lineHeight: 20 }}>ลองอีกครั้ง</Text>;
}

/** Where a `RetryLink` sits in its parent. */
type RetryLinkPlacement = Pick<ViewStyle, "alignSelf" | "paddingHorizontal">;

/** A "ลองอีกครั้ง" (try again) link on its own line, at the minimum touch height. */
export function RetryLink({
  onPress,
  accessibilityLabel,
  placement,
}: {
  onPress: () => void;
  /** Spoken name, when "ลองอีกครั้ง" alone does not say what it tries again. */
  accessibilityLabel?: string;
  placement?: RetryLinkPlacement;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[{ minHeight: touch.min, justifyContent: "center" }, placement]}
    >
      <RetryLinkText />
    </Pressable>
  );
}

/** Outer margins of a `MessageCard`: where a screen places it among its own content. */
export type MessageCardMargins = Pick<ViewStyle, "marginTop" | "marginBottom" | "marginHorizontal">;

const messageCardLayouts = {
  // On its own (Plan, the budget form).
  center: {
    card: { marginTop: 12, padding: 18, alignItems: "center" },
    body: { lineHeight: 19, textAlign: "center" },
    retry: { paddingHorizontal: 12 },
  },
  // Flush left among a screen's content (Home, Summary, Search). The screen sets the margins.
  start: {
    card: { padding: 20, alignItems: "stretch" },
    body: { lineHeight: 20, textAlign: "auto" },
    retry: { alignSelf: "flex-start" },
  },
} as const satisfies Record<string, { card: ViewStyle; body: TextStyle; retry: RetryLinkPlacement }>;

/**
 * A screen that could not load, a record that is gone, or an empty list: a card with a title, a line of body and, when
 * the load can be tried again, a "ลองอีกครั้ง" link. Centered on its own by default; `align="start"` sets it flush
 * left among a screen's content, and `margins` places it there.
 */
export function MessageCard({
  title,
  body,
  onRetry,
  retryLabel,
  align = "center",
  margins,
}: {
  title: string;
  body: string;
  onRetry?: () => void;
  /** Spoken name of the retry link, when "ลองอีกครั้ง" alone does not say what it tries again. */
  retryLabel?: string;
  align?: keyof typeof messageCardLayouts;
  margins?: MessageCardMargins;
}) {
  const theme = useAppTheme();
  const layout = messageCardLayouts[align];
  return (
    <View
      style={[
        { borderRadius: radius.card, backgroundColor: theme.surface, gap: 4, ...raisedRing(theme) },
        layout.card,
        margins,
      ]}
    >
      <Text style={{ color: theme.text, fontSize: 15, lineHeight: 21 }}>{title}</Text>
      <Text style={[{ color: theme.muted, fontSize: 13 }, layout.body]}>{body}</Text>
      {onRetry ? <RetryLink onPress={onRetry} accessibilityLabel={retryLabel} placement={layout.retry} /> : null}
    </View>
  );
}
