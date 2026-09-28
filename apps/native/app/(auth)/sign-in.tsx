import { useForm } from "@tanstack/react-form";
import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, View } from "react-native";
import { z } from "zod";

import { OnboardingIllustration } from "@/components/ui/onboarding-illustrations";
import { Text, TextInput } from "@/components/ui/typography";
import { Footer, Page } from "@/features/onboarding/components/onboarding-controls";
import { color } from "@/features/onboarding/theme";
import { authClient } from "@/lib/auth-client";
import { normalizeEmail } from "@/utils/email-identity";

const signInSchema = z.object({
  email: z.string().trim().min(1, "กรุณาใส่อีเมล").email("กรุณาใส่อีเมลให้ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
});

const inputStyle = { backgroundColor: color.dark, color: color.white, padding: 16 };

export default function SignInRoute() {
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: signInSchema },
    onSubmitInvalid: ({ value }) => {
      const result = signInSchema.safeParse(value);
      if (!result.success) setError(result.error.issues[0]?.message ?? "ตรวจสอบข้อมูลอีกครั้ง");
    },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const result = await authClient.signIn.email({
          email: normalizeEmail(value.email),
          password: value.password,
        });
        if (result.error) throw new Error(result.error.message || "เข้าสู่ระบบไม่สำเร็จ");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    },
  });

  return (
    <Page backgroundColor={color.navy}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 18 }}
        >
          <View style={{ alignItems: "center", paddingTop: 20, gap: 8 }}>
            <OnboardingIllustration variant="logo" size={130} />
            <Text style={{ color: color.white, fontSize: 32, fontWeight: "900" }}>หมูจด</Text>
            <Text style={{ color: color.muted, fontSize: 17 }}>เข้าสู่ระบบด้วยอีเมล</Text>
          </View>

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
                placeholderTextColor="#7890A5"
                style={inputStyle}
              />
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <TextInput
                accessibilityLabel="รหัสผ่าน"
                autoComplete="current-password"
                secureTextEntry
                textContentType="password"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChangeText={(value) => {
                  field.handleChange(value);
                  if (error) setError(null);
                }}
                onSubmitEditing={() => void form.handleSubmit()}
                placeholder="รหัสผ่านอย่างน้อย 8 ตัวอักษร"
                placeholderTextColor="#7890A5"
                style={inputStyle}
              />
            )}
          </form.Field>
          {error ? (
            <Text accessibilityRole="alert" selectable style={{ color: "#FFC4C4", fontSize: 15 }}>
              {error}
            </Text>
          ) : null}
          <Link href="/sign-up" replace asChild>
            <Pressable accessibilityRole="link" style={{ alignSelf: "center", padding: 12 }}>
              <Text style={{ color: "#79B9FF", fontSize: 16, fontWeight: "700" }}>ยังไม่มีบัญชี? สมัครสมาชิก</Text>
            </Pressable>
          </Link>
        </ScrollView>
        <form.Subscribe selector={(state) => ({ values: state.values, isSubmitting: state.isSubmitting })}>
          {({ values, isSubmitting }) => (
            <Footer
              label="เข้าสู่ระบบ"
              onPress={() => void form.handleSubmit()}
              disabled={!values.email.trim() || !values.password}
              busy={isSubmitting}
              white={false}
            />
          )}
        </form.Subscribe>
      </KeyboardAvoidingView>
    </Page>
  );
}
