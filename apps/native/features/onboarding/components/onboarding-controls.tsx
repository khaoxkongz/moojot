import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type React from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/typography";

import { useAppTheme } from "@/lib/use-app-theme";

export type Choice = "yes" | "no" | null;

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  busy = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        borderRadius: 999,
        backgroundColor: disabled ? theme.raised : theme.accent,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
        opacity: pressed ? 0.8 : 1,
        boxShadow: disabled ? undefined : "0 3px 4px rgba(0, 0, 0, .13)",
      })}
    >
      <Text
        style={{ color: disabled ? theme.muted : theme.onAccent, fontSize: 19, fontWeight: "800", textAlign: "center" }}
      >
        {busy ? "กำลังบันทึก…" : label}
      </Text>
    </Pressable>
  );
}

export function Footer({
  label,
  onPress,
  disabled,
  busy,
  white = true,
  extra,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  white?: boolean;
  extra?: React.ReactNode;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: white ? theme.surface : "transparent",
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: Math.max(insets.bottom, 16),
        gap: 13,
      }}
    >
      {extra}
      <View style={{ width: "100%", maxWidth: 360, alignSelf: "center" }}>
        <PrimaryButton label={label} onPress={onPress} disabled={disabled} busy={busy} />
      </View>
    </View>
  );
}

export function Header({ title, onBack, info }: { title: string; onBack: () => void; info?: () => void }) {
  const theme = useAppTheme();
  return (
    <View
      style={{
        height: 64,
        backgroundColor: theme.accent,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="ย้อนกลับ"
        onPress={onBack}
        hitSlop={10}
        style={{ position: "absolute", left: 14, padding: 7 }}
      >
        <MaterialCommunityIcons name="chevron-left" size={34} color={theme.onAccent} />
      </Pressable>
      <Text style={{ color: theme.onAccent, fontSize: 20, fontWeight: "800" }}>{title}</Text>
      {info ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ข้อมูลเพิ่มเติม"
          onPress={info}
          hitSlop={10}
          style={{ position: "absolute", right: 19, padding: 7 }}
        >
          <MaterialCommunityIcons name="information-outline" size={25} color={theme.onAccent} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function FloatingBack({ onBack }: { onBack: () => void }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="ย้อนกลับ"
      onPress={onBack}
      hitSlop={10}
      style={{ position: "absolute", zIndex: 2, left: 13, top: insets.top + 6, padding: 8 }}
    >
      <MaterialCommunityIcons name="chevron-left" size={32} color={theme.text} />
    </Pressable>
  );
}

export function Page({ children, backgroundColor }: { children: React.ReactNode; backgroundColor?: string }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: backgroundColor ?? theme.background,
        paddingTop: insets.top,
      }}
    >
      {children}
    </View>
  );
}

export function ConsentChoice({ value, onChange }: { value: Choice; onChange: (choice: Choice) => void }) {
  const theme = useAppTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-around", gap: 12 }}>
      {(["yes", "no"] as const).map((option) => (
        <Pressable
          key={option}
          accessibilityRole="radio"
          accessibilityLabel={option === "yes" ? "ยินยอม" : "ไม่ยินยอม"}
          accessibilityState={{ checked: value === option }}
          onPress={() => onChange(option)}
          style={{ flexDirection: "row", alignItems: "center", padding: 9, gap: 10 }}
        >
          <View
            style={{
              width: 23,
              height: 23,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: value === option ? theme.accent : theme.text,
              backgroundColor: value === option ? theme.accent : theme.surface,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {value === option ? (
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: theme.onAccent }} />
            ) : null}
          </View>
          <Text style={{ fontSize: 17, color: theme.text }}>{option === "yes" ? "ยินยอม" : "ไม่ยินยอม"}</Text>
        </Pressable>
      ))}
    </View>
  );
}
