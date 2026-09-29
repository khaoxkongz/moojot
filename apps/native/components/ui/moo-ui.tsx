import React from "react";
import { Pressable, View, type ViewStyle, type TextInputProps } from "react-native";
import { Text, TextInput } from "@/components/ui/typography";
import { radius, shadow } from "@/constants/theme";
import { useAppTheme } from "@/lib/use-app-theme";

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderRadius: radius.card,
          padding: 20,
          borderWidth: 1,
          borderColor: theme.border,
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
  const theme = useAppTheme();
  const backgroundColor = variant === "primary" ? theme.accent : variant === "soft" ? theme.raised : theme.surface;
  const color = variant === "primary" ? theme.onAccent : theme.accentText;
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
          borderColor: theme.accent,
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
  color,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  const theme = useAppTheme();
  const selectedColor = color ?? theme.accent;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: radius.pill,
        backgroundColor: selected ? selectedColor : theme.surface,
        borderWidth: 1,
        borderColor: selected ? selectedColor : theme.border,
      }}
    >
      <Text style={{ color: selected ? theme.onAccent : theme.muted, fontSize: 13, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const theme = useAppTheme();
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: theme.text, fontWeight: "700", fontSize: 14 }}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.muted}
        {...props}
        style={[
          {
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            borderRadius: radius.input,
            paddingHorizontal: 15,
            paddingVertical: 13,
            color: theme.text,
            fontSize: 16,
            minHeight: 50,
          },
          props.style,
        ]}
      />
      {hint ? <Text style={{ color: theme.muted, fontSize: 12 }}>{hint}</Text> : null}
    </View>
  );
}

export function SectionHeading({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  const theme = useAppTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={{ color: theme.text, fontWeight: "800", fontSize: 19 }}>{title}</Text>
      {action ? (
        <Pressable onPress={onPress}>
          <Text style={{ color: theme.accentText, fontWeight: "700", fontSize: 13 }}>{action} ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  const theme = useAppTheme();
  return (
    <View style={{ alignItems: "center", gap: 10, paddingVertical: 35, paddingHorizontal: 22 }}>
      <Text style={{ fontSize: 45 }}>{icon}</Text>
      <Text style={{ color: theme.text, fontSize: 17, fontWeight: "800", textAlign: "center" }}>{title}</Text>
      <Text style={{ color: theme.muted, fontSize: 13, textAlign: "center", lineHeight: 21 }}>{body}</Text>
    </View>
  );
}
