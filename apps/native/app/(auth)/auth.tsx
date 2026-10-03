import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, View, type TextInput as NativeTextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PillButton, SegmentedControl } from "@/components/ui/controls";
import { Text } from "@/components/ui/typography";
import { radius } from "@/constants/theme";
import {
  AUTH_MODES,
  PASSWORD_RULE,
  applyAuthOutcome,
  authSubmitter,
  editAuthField,
  followAuthNotice,
  passwordRuleMet,
  pendingAuthForm,
  startAuthForm,
  switchAuthMode,
  type AuthFieldName,
  type AuthForm,
} from "@/features/auth/auth-form";
import { AuthInput, PasswordRule, ShowPasswordButton } from "@/features/auth/components/auth-input";
import { authClient } from "@/lib/auth-client";
import { rememberedEmail } from "@/lib/device-remembered-email";
import { toast } from "@/lib/toast";
import { useAppTheme } from "@/lib/use-app-theme";

const MODE_TABS = (["signin", "signup"] as const).map((value) => ({ value, label: AUTH_MODES[value].label }));

const brandMascot = require("../../assets/generated/brand-mascot.png");

/**
 * Signup and sign-in on one screen (handoff “00 เข้าสู่ระบบ / สมัครสมาชิก”). A first start opens signup; after
 * sign-out it opens sign-in with the remembered email. Success needs no navigation: the root guard opens setup or Home.
 */
export default function AuthRoute() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<AuthForm>(() =>
    startAuthForm({ rememberedEmail: rememberedEmail.getSnapshot().email })
  );
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submit] = useState(() => authSubmitter(authClient));
  const emailRef = useRef<NativeTextInput>(null);
  const passwordRef = useRef<NativeTextInput>(null);
  const mode = AUTH_MODES[form.mode];

  const edit = (field: AuthFieldName) => (value: string) => setForm((current) => editAuthField(current, field, value));

  async function send() {
    const sent = form;
    setForm(pendingAuthForm);
    setBusy(true);
    const result = await submit(sent);
    setBusy(false);
    if (result.status === "signed-in") toast.show({ message: `ยินดีต้อนรับกลับ ${result.name}` });
    if (result.status === "invalid" || result.status === "refused") {
      setForm((current) => applyAuthOutcome(current, sent, result.form));
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 16 }}
        >
          <View style={{ alignItems: "center" }}>
            <Image
              source={brandMascot}
              accessibilityLabel="มาสคอตหมูน้อย"
              contentFit="contain"
              style={{ width: 96, height: 96 }}
            />
            <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 28, lineHeight: 38 }}>
              หมูจด
            </Text>
            <Text style={{ marginTop: 2, color: theme.muted, fontSize: 14, lineHeight: 21, textAlign: "center" }}>
              {mode.subtitle}
            </Text>
          </View>

          <View style={{ marginTop: 18 }}>
            <SegmentedControl
              options={MODE_TABS}
              value={form.mode}
              onChange={(mode) => setForm((current) => switchAuthMode(current, mode))}
              height={42}
              labelSize={15}
              accessibilityLabel="เลือกวิธีเข้าใช้"
              testID="auth-mode"
            />
          </View>

          {mode.asksName ? (
            <View style={{ marginTop: 16 }}>
              <AuthInput
                testID="auth-name"
                label="ชื่อ"
                value={form.name}
                onChangeText={edit("name")}
                error={form.errors.name}
                placeholder="ชื่อของคุณ"
                autoComplete="name"
                textContentType="name"
                maxLength={40}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </View>
          ) : null}

          <View style={{ marginTop: 14 }}>
            <AuthInput
              ref={emailRef}
              testID="auth-email"
              label="อีเมล"
              value={form.email}
              onChangeText={edit("email")}
              error={form.errors.email}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>

          <View style={{ marginTop: 14 }}>
            <AuthInput
              ref={passwordRef}
              testID="auth-password"
              label="รหัสผ่าน"
              value={form.password}
              onChangeText={edit("password")}
              error={form.errors.password}
              placeholder={PASSWORD_RULE}
              secureTextEntry={!showPassword}
              autoComplete={mode.passwordAutoComplete}
              textContentType={mode.passwordContentType}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              submitBehavior="blurAndSubmit"
              onSubmitEditing={() => void send()}
              trailing={<ShowPasswordButton shown={showPassword} onPress={() => setShowPassword((shown) => !shown)} />}
              below={
                mode.showsPasswordRule && !form.errors.password ? (
                  <PasswordRule met={passwordRuleMet(form.password)} />
                ) : null
              }
            />
          </View>

          {form.notice ? (
            <View
              accessibilityRole="alert"
              style={{
                marginTop: 14,
                paddingTop: 12,
                paddingHorizontal: 14,
                paddingBottom: form.notice.action ? 6 : 12,
                borderRadius: radius.input,
                backgroundColor: theme.raised,
              }}
            >
              <Text style={{ color: theme.text, fontSize: 14, lineHeight: 21 }}>{form.notice.text}</Text>
              {form.notice.action ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={form.notice.action.label}
                  onPress={() => {
                    const target = form.notice?.action?.mode;
                    setForm((current) => followAuthNotice(current));
                    // Sign-in has only the password left to check; signup still needs a name, which mounts empty.
                    if (target === "signin") passwordRef.current?.focus();
                  }}
                  style={({ pressed }) => ({
                    minHeight: 44,
                    alignSelf: "flex-start",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 2,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ color: theme.accentText, fontSize: 14, lineHeight: 20 }}>
                    {form.notice.action.label}
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={theme.accentText} />
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        <View
          style={{
            paddingTop: 10,
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 12,
            backgroundColor: theme.background,
            boxShadow: `0 -1px 0 ${theme.raised}`,
          }}
        >
          <PillButton
            testID="auth-submit"
            label={mode.label}
            busyLabel={mode.busyLabel}
            busy={busy}
            onPress={() => void send()}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
