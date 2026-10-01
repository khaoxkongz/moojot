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

/** A money figure: system font at 500 with tabular digits, and ฿ after it at about 55% size in the regular weight. */
export function Amount({
  value,
  size = 15,
  color,
  showBaht = true,
  style,
}: {
  /** Already formatted, such as "1,234.50" or "+120". */
  value: string;
  size?: number;
  color?: string;
  showBaht?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const theme = useAppTheme();
  return (
    <Text
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
      {showBaht ? (
        <Text style={{ fontSize: Math.round(size * 0.55), fontWeight: "400", letterSpacing: 0 }}> ฿</Text>
      ) : null}
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
 * While `busy` it shows `busyLabel` and ignores taps, so one tap saves once.
 */
export function PrimaryButton({
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
          opacity: pressed && !busy ? 0.82 : 1,
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
                paddingHorizontal: 8,
              },
              selected && { backgroundColor: theme.surface, ...shadow.segment },
            ]}
          >
            <Text style={{ color: selected ? theme.text : theme.muted, fontSize: 15, textAlign: "center" }}>
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
        {sub ? <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 17 }}>{sub}</Text> : null}
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

export function GroupedRow({
  title,
  sub,
  icon,
  emoji,
  value,
  onPress,
  chevron = Boolean(onPress),
  trailing,
}: {
  title: string;
  sub?: string;
  icon?: IconName;
  emoji?: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  trailing?: ReactNode;
}) {
  const theme = useAppTheme();
  const content = (
    <>
      {icon || emoji ? (
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
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: theme.text, fontSize: 15, lineHeight: 21 }}>{title}</Text>
        {sub ? <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 17 }}>{sub}</Text> : null}
      </View>
      {value ? <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 20 }}>{value}</Text> : null}
      {trailing}
      {chevron ? <MaterialCommunityIcons name="chevron-right" size={22} color={theme.muted} /> : null}
    </>
  );
  const rowStyle: ViewStyle = {
    minHeight: touch.row,
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
  const iconColor = tone === "danger" ? theme.danger : theme.accentText;
  return (
    <View
      accessibilityRole={tone === "danger" ? "alert" : undefined}
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
      <MaterialCommunityIcons name={icon} size={20} color={iconColor} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: tone === "danger" ? theme.danger : theme.text, fontSize: 14, lineHeight: 20 }}>
          {title}
        </Text>
        {body ? <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 19 }}>{body}</Text> : null}
        {action}
      </View>
    </View>
  );
}
