import { Modal, ScrollView, View } from "react-native";

import { SheetBackdrop, SheetPanel } from "@/components/ui/bottom-sheet";
import { PillButton } from "@/components/ui/controls";
import { Text } from "@/components/ui/typography";
import { useAppTheme } from "@/lib/use-app-theme";

import type { InfoSection } from "../onboarding-copy";

/** A reading sheet in setup: the full terms, or what slip reading covers. "เข้าใจแล้ว" closes it. */
export function InfoSheet({
  title,
  sections,
  visible,
  onClose,
}: {
  title: string;
  sections: InfoSection[];
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <SheetBackdrop label="ปิด" onPress={onClose} />
        <SheetPanel title={title} onClose={onClose} maxHeightRatio={0.86} bottomGap={14}>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 8 }}>
            {sections.map((section) => (
              <View key={section.key}>
                <Text style={{ marginTop: 12, color: theme.text, fontSize: 15, lineHeight: 22 }}>{section.title}</Text>
                {section.paras.map((para) => (
                  <Text key={para} style={{ marginTop: 6, color: theme.muted, fontSize: 14, lineHeight: 23 }}>
                    {para}
                  </Text>
                ))}
              </View>
            ))}
          </ScrollView>
          <PillButton label="เข้าใจแล้ว" onPress={onClose} style={{ marginTop: 12, minHeight: 50, borderRadius: 25 }} />
        </SheetPanel>
      </View>
    </Modal>
  );
}
