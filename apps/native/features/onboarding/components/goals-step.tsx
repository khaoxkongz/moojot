import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, View } from "react-native";

import { OnboardingIllustration } from "@/components/ui/onboarding-illustrations";
import { Text } from "@/components/ui/typography";
import { touch } from "@/constants/theme";
import { useAppTheme } from "@/lib/use-app-theme";

import { ONBOARDING_GOALS, goNext, toggleGoal } from "../onboarding-flow";
import { useOnboarding } from "../onboarding-context";
import { StepBody, StepButton, StepError, StepFooter, StepTitle } from "./step-parts";

/** Step 3: why the person records spending. Several answers are fine; at least one is required. */
export function GoalsStep() {
  const theme = useAppTheme();
  const { flow, update } = useOnboarding();
  return (
    <>
      <StepBody>
        <OnboardingIllustration variant="reasons" height={190} />
        <StepTitle center title={"พี่มนุษย์อยากจดรายจ่าย\nเพราะอะไรเหรอ?"} sub="เลือกได้หลายคำตอบ" />
        <View
          role="group"
          aria-label="เหตุผลที่อยากจดรายจ่าย"
          style={{ marginTop: 18, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 }}
        >
          {ONBOARDING_GOALS.map((goal) => {
            const on = flow.goals.includes(goal.key);
            return (
              <Pressable
                key={goal.key}
                role="checkbox"
                aria-checked={on}
                accessibilityLabel={goal.label}
                onPress={() => update((current) => toggleGoal(current, goal.key))}
                style={({ pressed }) => ({
                  minHeight: touch.min,
                  paddingLeft: on ? 10 : 16,
                  paddingRight: 16,
                  borderRadius: 22,
                  borderWidth: 1.5,
                  borderColor: on ? theme.accent : theme.border,
                  backgroundColor: on ? theme.accent : theme.surface,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  opacity: pressed ? 0.84 : 1,
                })}
              >
                {on ? <MaterialCommunityIcons name="check" size={18} color={theme.onAccent} /> : null}
                <Text style={{ color: on ? theme.onAccent : theme.text, fontSize: 15, lineHeight: 21 }}>
                  {goal.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </StepBody>
      <StepFooter>
        <StepError text={flow.goalsError} style={{ marginBottom: 8, alignItems: "center" }} />
        <StepButton
          label="ต่อไป"
          dimmed={flow.goals.length === 0}
          onPress={() => update(goNext)}
          testID="onboarding-next"
        />
      </StepFooter>
    </>
  );
}
