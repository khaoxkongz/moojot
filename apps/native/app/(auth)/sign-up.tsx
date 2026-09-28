import { useForm } from "@tanstack/react-form";
import { Link, router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, View } from "react-native";
import { z } from "zod";

import { OnboardingIllustration } from "@/components/ui/onboarding-illustrations";
import { Text, TextInput } from "@/components/ui/typography";
import { Footer, Page } from "@/features/onboarding/components/onboarding-controls";
import { useAppTheme } from "@/lib/use-app-theme";
import { authClient } from "@/lib/auth-client";
import { normalizeEmail } from "@/utils/email-identity";

const signUpSchema = z.object({
  name: z.string().trim().min(2, "กรุณาใส่ชื่ออย่างน้อย 2 ตัวอักษร"),
  email: z.string().trim().min(1, "กรุณาใส่อีเมล").email("กรุณาใส่อีเมลให้ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
});

export default function SignUpRoute() {
  const theme = useAppTheme();
  const inputStyle = { backgroundColor: theme.surface, color: theme.text, padding: 16 };
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  const form = useForm({
    defaultValues: { name: "", email: "", password: "" },
    validators: { onSubmit: signUpSchema },
    onSubmitInvalid: ({ value }) => {
      if (registered) return;
      const result = signUpSchema.safeParse(value);
      if (!result.success) setError(result.error.issues[0]?.message ?? "ตรวจสอบข้อมูลอีกครั้ง");
    },
    onSubmit: async ({ value, formApi }) => {
      if (registered) return;
      setError(null);
      setNotice(null);
      try {
        const result = await authClient.signUp.email({
          name: value.name.trim(),
          email: normalizeEmail(value.email),
          password: value.password,
        });
        if (result.error) throw new Error(result.error.message || "สมัครสมาชิกไม่สำเร็จ");
        formApi.reset();
        setNotice("สมัครสมาชิกแล้ว หากแอปยังไม่เปิดต่อ กรุณาเข้าสู่ระบบ");
        setRegistered(true);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    },
  });

  return (
    <Page backgroundColor={theme.background}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 18 }}
        >
          <View style={{ alignItems: "center", paddingTop: 20, gap: 8 }}>
            <OnboardingIllustration variant="logo" size={130} />
            <Text style={{ color: theme.text, fontSize: 32, fontWeight: "900" }}>หมูจด</Text>
            <Text style={{ color: theme.muted, fontSize: 17 }}>สมัครสมาชิกด้วยอีเมล</Text>
          </View>

          <form.Field name="name">
            {(field) => (
              <TextInput
                accessibilityLabel="ชื่อ"
                autoComplete="name"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChangeText={(value) => {
                  field.handleChange(value);
                  if (error) setError(null);
                }}
                placeholder="ชื่อของคุณ"
                placeholderTextColor={theme.muted}
                style={inputStyle}
              />
            )}
          </form.Field>
          <form.Field name="email">
            {(field) => (
              <TextInput
                accessibilityLabel="อีเมล"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoCorrect={false}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChangeText={(value) => {
                  field.handleChange(value);
                  if (error) setError(null);
                }}
                placeholder="name@example.com"
                placeholderTextColor={theme.muted}
                style={inputStyle}
              />
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <TextInput
                accessibilityLabel="รหัสผ่าน"
                autoComplete="new-password"
                secureTextEntry
                textContentType="newPassword"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChangeText={(value) => {
                  field.handleChange(value);
                  if (error) setError(null);
                }}
                onSubmitEditing={() => {
                  if (!registered) void form.handleSubmit();
                }}
                placeholder="รหัสผ่านอย่างน้อย 8 ตัวอักษร"
                placeholderTextColor={theme.muted}
                style={inputStyle}
              />
            )}
          </form.Field>
          {error ? (
            <Text accessibilityRole="alert" selectable style={{ color: theme.dangerText, fontSize: 15 }}>
              {error}
            </Text>
          ) : null}
          {notice ? (
            <Text selectable style={{ color: theme.text }}>
              {notice}
            </Text>
          ) : null}
          <Link href="/sign-in" replace asChild>
            <Pressable accessibilityRole="link" style={{ alignSelf: "center", padding: 12 }}>
              <Text style={{ color: theme.accentText, fontSize: 16, fontWeight: "700" }}>มีบัญชีแล้ว? เข้าสู่ระบบ</Text>
            </Pressable>
          </Link>
        </ScrollView>
        <form.Subscribe selector={(state) => ({ values: state.values, isSubmitting: state.isSubmitting })}>
          {({ values, isSubmitting }) => (
            <Footer
              label={registered ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
              onPress={registered ? () => router.replace("/sign-in") : () => void form.handleSubmit()}
              disabled={!registered && (!values.name.trim() || !values.email.trim() || !values.password)}
              busy={isSubmitting}
              white={false}
            />
          )}
        </form.Subscribe>
      </KeyboardAvoidingView>
    </Page>
  );
}
