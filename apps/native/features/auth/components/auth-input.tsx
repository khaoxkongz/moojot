import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { forwardRef, useState, type ReactNode } from "react";
import { Pressable, View, type TextInput as NativeTextInput, type TextInputProps } from "react-native";

import { Text, TextInput } from "@/components/ui/typography";
import { radius, touch } from "@/constants/theme";
import { PASSWORD_RULE } from "@/features/auth/auth-form";
import { useAppTheme } from "@/lib/use-app-theme";

/**
 * One labelled auth field from the handoff: 13 `muted` label, 52-tall `surface` input with radius 14 and a 1px `border`
 * ring, 2px `accent` while focused, 1.5px `danger` with its error under it. `below` holds extra lines such as the rule.
 */
export const AuthInput = forwardRef<
  NativeTextInput,
  Omit<TextInputProps, "style"> & { label: string; error?: string; trailing?: ReactNode; below?: ReactNode }
>(function AuthInput({ label, error, trailing, below, onFocus, onBlur, ...input }, ref) {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);
  const ring = focused
    ? `inset 0 0 0 2px ${theme.accent}`
    : error
      ? `inset 0 0 0 1.5px ${theme.danger}`
      : `inset 0 0 0 1px ${theme.border}`;
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ paddingHorizontal: 4, color: theme.muted, fontSize: 13, lineHeight: 18 }}>{label}</Text>
      <View>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error}
          placeholderTextColor={theme.muted}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={{
            height: touch.button,
            paddingLeft: 14,
            paddingRight: trailing ? 84 : 14,
            borderRadius: radius.input,
            backgroundColor: theme.surface,
            boxShadow: ring,
            color: theme.text,
            fontSize: 16,
          }}
          {...input}
        />
        {trailing ? <View style={{ position: "absolute", top: 4, right: 4 }}>{trailing}</View> : null}
      </View>
      {error ? (
        <Text
          accessibilityRole="alert"
          style={{ paddingHorizontal: 4, color: theme.danger, fontSize: 13, lineHeight: 19 }}
        >
          {error}
        </Text>
      ) : null}
      {below}
    </View>
  );
});

/** “แสดง / ซ่อน” inside the password field: 44 tall, at least 72 wide, `accentText` eye icon 18 and text 14. */
export function ShowPasswordButton({ shown, onPress }: { shown: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={shown ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
      onPress={onPress}
      style={({ pressed }) => ({
        height: touch.min,
        minWidth: 72,
        paddingHorizontal: 10,
        borderRadius: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <MaterialCommunityIcons name={shown ? "eye-off-outline" : "eye-outline"} size={18} color={theme.accentText} />
      <Text style={{ color: theme.accentText, fontSize: 14, lineHeight: 20 }}>{shown ? "ซ่อน" : "แสดง"}</Text>
    </Pressable>
  );
}

/** The live signup rule under the password: a `success` check once met, a `muted` circle before. */
export function PasswordRule({ met }: { met: boolean }) {
  const theme = useAppTheme();
  const color = met ? theme.success : theme.muted;
  return (
    <View
      accessible
      accessibilityLabel={`${PASSWORD_RULE} ${met ? "ครบแล้ว" : "ยังไม่ครบ"}`}
      style={{ paddingHorizontal: 4, flexDirection: "row", alignItems: "center", gap: 6 }}
    >
      <MaterialCommunityIcons name={met ? "check-circle" : "circle-outline"} size={16} color={color} />
      <Text style={{ color, fontSize: 13, lineHeight: 19 }}>{PASSWORD_RULE}</Text>
    </View>
  );
}
