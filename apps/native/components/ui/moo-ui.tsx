import React from "react";
import { Pressable, View, type ViewStyle, type TextInputProps } from "react-native";
import { Text, TextInput } from "@/components/ui/typography";
import { palette, radius, shadow } from "@/constants/moo-theme";

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          backgroundColor: palette.surface,
          borderRadius: radius.card,
          padding: 20,
          borderWidth: 1,
          borderColor: palette.line,
          ...shadow.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "soft";
  disabled?: boolean;
  icon?: string;
  style?: ViewStyle;
}) {
  const backgroundColor = variant === "primary" ? palette.pink : variant === "soft" ? palette.pinkPale : "#FFFFFF";
  const color = variant === "primary" ? "#FFFFFF" : palette.pinkDark;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor,
          borderRadius: radius.input,
          minHeight: 50,
          paddingHorizontal: 17,
          flexDirection: "row",
          gap: 8,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: variant === "outline" ? 1 : 0,
          borderColor: palette.pink,
          opacity: disabled ? 0.45 : pressed ? 0.78 : 1,
        },
        style,
      ]}
    >
      {icon ? <Text style={{ color, fontSize: 19, fontWeight: "700" }}>{icon}</Text> : null}
      <Text style={{ color, fontSize: 15, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}

export function Pill({
  label,
  selected,
  onPress,
  color = palette.pink,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: radius.pill,
        backgroundColor: selected ? color : palette.surface,
        borderWidth: 1,
        borderColor: selected ? color : palette.line,
      }}
    >
      <Text style={{ color: selected ? "#FFFFFF" : palette.muted, fontSize: 13, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: palette.ink, fontWeight: "700", fontSize: 14 }}>{label}</Text>
      <TextInput
        placeholderTextColor="#AFA5A8"
        {...props}
        style={[
          {
            borderWidth: 1,
            borderColor: palette.line,
            backgroundColor: palette.surface,
            borderRadius: radius.input,
            paddingHorizontal: 15,
            paddingVertical: 13,
            color: palette.ink,
            fontSize: 16,
            minHeight: 50,
          },
          props.style,
        ]}
      />
      {hint ? <Text style={{ color: palette.muted, fontSize: 12 }}>{hint}</Text> : null}
    </View>
  );
}

export function SectionHeading({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={{ color: palette.ink, fontWeight: "800", fontSize: 19 }}>{title}</Text>
      {action ? (
        <Pressable onPress={onPress}>
          <Text style={{ color: palette.pinkDark, fontWeight: "700", fontSize: 13 }}>{action} ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <View style={{ alignItems: "center", gap: 10, paddingVertical: 35, paddingHorizontal: 22 }}>
      <Text style={{ fontSize: 45 }}>{icon}</Text>
      <Text style={{ color: palette.ink, fontSize: 17, fontWeight: "800", textAlign: "center" }}>{title}</Text>
      <Text style={{ color: palette.muted, fontSize: 13, textAlign: "center", lineHeight: 21 }}>{body}</Text>
    </View>
  );
}
