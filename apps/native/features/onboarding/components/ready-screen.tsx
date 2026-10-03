import { useRef, useState } from "react";
import { View } from "react-native";

import { OnboardingIllustration } from "@/components/ui/onboarding-illustrations";
import { Text } from "@/components/ui/typography";
import { radius, raisedRing } from "@/constants/theme";
import { authClient } from "@/lib/auth-client";
import { useAppTheme } from "@/lib/use-app-theme";
import { client, orpc, queryClient } from "@/utils/orpc";

import { ONBOARDING_GOALS } from "../onboarding-flow";
import { useOnboarding } from "../onboarding-context";
import { photoRecap } from "../photo-step";
import { SAVE_FAILED, saveOnboarding } from "../save-onboarding";
import { IconDot, StepBody, StepButton, StepError, StepFooter } from "./step-parts";

function RecapRow({
  icon,
  label,
  children,
}: {
  icon: "flag-outline" | "receipt-text-outline";
  label: string;
  children: React.ReactNode;
}) {
  const theme = useAppTheme();
  return (
    <View
      style={{ paddingVertical: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "flex-start", gap: 12 }}
    >
      <IconDot icon={icon} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 17 }}>{label}</Text>
        {children}
      </View>
    </View>
  );
}

/**
 * The recap before Home: the goals picked and the photo access the device has now. "เริ่มใช้งานหมูจดเลย!" saves
 * setup; Home opens only after the setup check sees it complete. A failed save keeps every answer for another try.
 */
export function ReadyScreen() {
  const theme = useAppTheme();
  const { flow, update, forgetDraft, photo } = useOnboarding();
  const { data: session } = authClient.useSession();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sending = useRef(false);
  const goals = ONBOARDING_GOALS.filter((goal) => flow.goals.includes(goal.key));

  async function finish() {
    if (sending.current) return;
    sending.current = true;
    setSaving(true);
    setError(null);
    const result = await saveOnboarding(client.financePreferences, flow, {
      email: session?.user.email ?? "",
      now: new Date(),
    });
    if (result.status === "saved") {
      await forgetDraft();
      // The setup check now answers "complete", and the root guard swaps setup for Home.
      const setupCheck = orpc.financePreferences.hasCompletedOnboarding.queryKey();
      await queryClient.invalidateQueries({ queryKey: setupCheck });
      if (queryClient.getQueryData(setupCheck) === true) return;
    }
    sending.current = false;
    setSaving(false);
    if (result.status === "incomplete") update(() => result.flow);
    else setError(result.status === "failed" ? result.message : SAVE_FAILED);
  }

  return (
    <>
      <StepBody style={{ paddingTop: 0, alignItems: "stretch" }}>
        <OnboardingIllustration variant="final" height={230} />
        <Text
          accessibilityRole="header"
          style={{ marginTop: 8, color: theme.text, fontSize: 26, lineHeight: 36, textAlign: "center" }}
        >
          หมูจดพร้อมจดแล้ว!
        </Text>
        <Text style={{ marginTop: 6, color: theme.muted, fontSize: 15, lineHeight: 24, textAlign: "center" }}>
          เปิดแอปบ่อย ๆ เพื่อจดรายจ่ายได้ต่อเนื่องนะ
        </Text>
        <View
          style={[
            { marginTop: 18, borderRadius: radius.card, overflow: "hidden", backgroundColor: theme.surface },
            raisedRing(theme),
          ]}
        >
          {goals.length > 0 ? (
            <>
              <RecapRow icon="flag-outline" label="เป้าหมายของพี่มนุษย์">
                <View style={{ marginTop: 6, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {goals.map((goal) => (
                    <View
                      key={goal.key}
                      style={{
                        paddingVertical: 2,
                        paddingHorizontal: 10,
                        borderRadius: 12,
                        backgroundColor: theme.raised,
                      }}
                    >
                      <Text style={{ color: theme.text, fontSize: 13, lineHeight: 21 }}>{goal.label}</Text>
                    </View>
                  ))}
                </View>
              </RecapRow>
              <View style={{ height: 1, marginLeft: 58, backgroundColor: theme.raised }} />
            </>
          ) : null}
          <RecapRow icon="receipt-text-outline" label="สลิป">
            <Text style={{ marginTop: 2, color: theme.text, fontSize: 14, lineHeight: 22 }}>{photoRecap(photo)}</Text>
          </RecapRow>
        </View>
      </StepBody>
      <StepFooter>
        <StepError text={error} style={{ marginBottom: 8, alignItems: "center" }} />
        <StepButton
          label="เริ่มใช้งานหมูจดเลย!"
          busy={saving}
          busyLabel="กำลังบันทึก…"
          onPress={() => void finish()}
          testID="onboarding-finish"
        />
      </StepFooter>
    </>
  );
}
