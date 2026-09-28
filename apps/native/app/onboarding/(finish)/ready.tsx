import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, useWindowDimensions } from "react-native";

import { OnboardingIllustration } from "@/components/ui/onboarding-illustrations";
import { Text } from "@/components/ui/typography";
import { FloatingBack, Footer, Page } from "@/features/onboarding/components/onboarding-controls";
import { dateKey } from "@/features/onboarding/date";
import { useOnboardingFlow } from "@/features/onboarding/flow-context";
import { useAppTheme } from "@/lib/use-app-theme";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

export default function OnboardingReadyRoute() {
  const theme = useAppTheme();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { birthDate, acceptedTerms, personalization, updates, reasons } = useOnboardingFlow();
  const { data: session } = authClient.useSession();
  const email = session?.user.email || "";
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setOnboardingMutation = useMutation(orpc.financePreferences.setSetting.mutationOptions());

  async function finish() {
    if (saving) return;
    if (!acceptedTerms) {
      setError("กรุณายอมรับข้อตกลงการใช้งานก่อนเริ่มใช้งาน");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      if (!email) throw new Error("กรุณาเข้าสู่ระบบก่อนใช้งาน");
      await setOnboardingMutation.mutateAsync({ key: "onboarding_in_progress_v1", value: "true" });

      const settings = {
        profile_email: email,
        profile_birth_date: birthDate ? dateKey(birthDate) : "",
        profile_birth_month: birthDate ? String(birthDate.getMonth() + 1) : "",
        onboarding_personalization: personalization ?? "no",
        onboarding_updates: updates ?? "no",
        onboarding_reasons: JSON.stringify(reasons),
        onboarding_terms_accepted_v1: new Date().toISOString(),
      };

      await Promise.all(
        Object.entries(settings).map(([key, value]) => setOnboardingMutation.mutateAsync({ key, value }))
      );
      await setOnboardingMutation.mutateAsync({ key: "onboarding_complete_v1", value: "true" });
      await queryClient.invalidateQueries({ queryKey: orpc.financePreferences.hasCompletedOnboarding.queryKey() });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "บันทึกไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page>
      <FloatingBack onBack={() => router.back()} />
      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 22,
          paddingTop: 45,
          paddingBottom: 25,
        }}
      >
        <Text style={{ color: theme.text, fontSize: 31, fontWeight: "900", textAlign: "center" }}>หมูจดพร้อมจดแล้ว!</Text>
        <Text
          style={{
            color: theme.text,
            fontSize: 19,
            lineHeight: 28,
            textAlign: "center",
            marginTop: 15,
          }}
        >
          เปิดแอปบ่อย ๆ เพื่อจดรายจ่ายได้ต่อเนื่องนะ
        </Text>
        <OnboardingIllustration variant="final" size={Math.min(width * 0.82, height * 0.37, 320)} />
      </ScrollView>
      {error ? (
        <Text
          accessibilityRole="alert"
          style={{ color: theme.dangerText, textAlign: "center", paddingHorizontal: 18, paddingBottom: 8 }}
        >
          {error}
        </Text>
      ) : null}
      <Footer
        label="เริ่มใช้งานหมูจดเลย!"
        onPress={() => {
          void finish();
        }}
        busy={saving}
      />
    </Page>
  );
}
