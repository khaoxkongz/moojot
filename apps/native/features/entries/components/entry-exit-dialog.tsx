import { Image } from "expo-image";
import { Modal, Pressable, View } from "react-native";

import { Text } from "@/components/ui/typography";
import { styles } from "@/features/entries/entry-styles";

export function EntryExitDialog({
  visible,
  description,
  onCancel,
  onDiscard,
  onSave,
}: {
  visible: boolean;
  description: string;
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.exitOverlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ปิดหน้าต่างยืนยัน"
          onPress={onCancel}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <View style={styles.exitCard}>
          <View style={styles.exitHero}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="ปิดหน้าต่างยืนยัน"
              onPress={onCancel}
              style={styles.exitClose}
            >
              <Text style={styles.exitCloseText}>×</Text>
            </Pressable>
            <Image
              source={require("../../../assets/generated/entry-delete-confirmation-pig.png")}
              contentFit="contain"
              accessibilityLabel="น้องหมูเตือนว่ามีรายการที่ยังไม่ได้บันทึก"
              style={styles.exitPig}
            />
          </View>
          <View style={styles.exitBody}>
            <Text style={styles.exitTitle}>บันทึกรายการมั้ย?</Text>
            <Text style={styles.exitDescription}>{description}</Text>
            <View style={styles.exitActions}>
              <Pressable accessibilityRole="button" onPress={onDiscard} style={styles.exitSecondary}>
                <Text style={styles.exitSecondaryText}>ไม่บันทึก</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={onSave} style={styles.exitPrimary}>
                <Text style={styles.exitPrimaryText}>บันทึก</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
