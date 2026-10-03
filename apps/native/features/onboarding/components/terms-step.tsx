import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { OnboardingIllustration } from "@/components/ui/onboarding-illustrations";
import { Text } from "@/components/ui/typography";
import { radius, raisedRing } from "@/constants/theme";
import { useAppTheme } from "@/lib/use-app-theme";

import { TERM_POINTS, TERMS_FULL } from "../onboarding-copy";
import { goNext, stepAnswerError, toggleTerms } from "../onboarding-flow";
import { useOnboarding } from "../onboarding-context";
import { InfoSheet } from "./info-sheet";
import { IconLineRow, InfoLink, StepBody, StepButton, StepError, StepFooter, StepTitle } from "./step-parts";

/** Step 1: three summary points, the full terms in a sheet, and the acceptance box that the step requires. */
export function TermsStep() {
  const theme = useAppTheme();
  const { flow, update } = useOnboarding();
  const [sheetOpen, setSheetOpen] = useState(false);
  const accepted = flow.termsAccepted;
  return (
    <>
      <StepBody>
        <OnboardingIllustration variant="privacy" height={140} />
        <StepTitle title="ข้อตกลงและเงื่อนไข" sub="สรุปสั้น ๆ 3 ข้อ ก่อนเริ่มใช้" />
        <View style={{ marginTop: 14, gap: 8 }}>
          {TERM_POINTS.map((point) => (
            <View
              key={point.key}
              style={[
                {
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: radius.tile,
                  backgroundColor: theme.surface,
                },
                raisedRing(theme),
              ]}
            >
              <IconLineRow line={point} textTop={4} />
            </View>
          ))}
        </View>
        <InfoLink icon="file-document-outline" label="อ่านข้อตกลงฉบับเต็ม" onPress={() => setSheetOpen(true)} />
      </StepBody>
      <StepFooter top={8}>
        <Pressable
          testID="onboarding-terms-accept"
          role="checkbox"
          aria-checked={accepted}
          accessibilityLabel="ฉันได้อ่านและยอมรับข้อตกลงข้างต้น"
          onPress={() => update(toggleTerms)}
          style={{ minHeight: 48, paddingHorizontal: 2, flexDirection: "row", alignItems: "center", gap: 12 }}
        >
          {accepted ? (
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 7,
                backgroundColor: theme.accent,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons name="check" size={18} color={theme.onAccent} />
            </View>
          ) : (
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 7,
                borderWidth: 1.5,
                borderColor: flow.termsError ? theme.danger : theme.muted,
              }}
            />
          )}
          <Text style={{ flex: 1, color: theme.text, fontSize: 15, lineHeight: 22 }}>ฉันได้อ่านและยอมรับข้อตกลงข้างต้น</Text>
        </Pressable>
        <StepError text={flow.termsError} style={{ marginLeft: 38, marginBottom: 4 }} />
        <View style={{ marginTop: 6 }}>
          <StepButton
            label="ต่อไป"
            dimmed={stepAnswerError(flow, "terms") !== null}
            onPress={() => update(goNext)}
            testID="onboarding-next"
          />
        </View>
      </StepFooter>
      <InfoSheet title="ข้อตกลงฉบับเต็ม" sections={TERMS_FULL} visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
