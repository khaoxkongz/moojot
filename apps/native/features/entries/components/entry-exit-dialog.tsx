import { Image } from "expo-image";
import { Modal, Pressable, View } from "react-native";

import { IconButton } from "@/components/ui/controls";
import { Text } from "@/components/ui/typography";
import { radius, shadow } from "@/constants/theme";
import { useAppTheme } from "@/lib/use-app-theme";

/** Asked when the editor is closed with changes: “บันทึกรายการมั้ย?” with “ไม่บันทึก” and “บันทึก”. */
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
  const theme = useAppTheme();
  const button = {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  } as const;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ปิดหน้าต่างยืนยัน"
          onPress={onCancel}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: theme.shade }}
        />
        <View
          accessibilityViewIsModal
          style={{
            width: "100%",
            maxWidth: 360,
            borderRadius: 20,
            overflow: "hidden",
            backgroundColor: theme.surface,
            ...shadow.dialog,
          }}
        >
          <View style={{ height: 112, backgroundColor: theme.accent }}>
            <IconButton
              icon="close"
              size={24}
              color={theme.onAccent}
              label="ปิดหน้าต่างยืนยัน"
              onPress={onCancel}
              style={{ position: "absolute", top: 6, right: 6, zIndex: 1 }}
            />
            <Image
              source={require("../../../assets/generated/entry-delete-confirmation-pig.png")}
              contentFit="contain"
              accessibilityLabel="น้องหมูเตือนว่ามีรายการที่ยังไม่ได้บันทึก"
              style={{ position: "absolute", width: 180, height: 160, top: 24, alignSelf: "center" }}
            />
          </View>
          <View style={{ alignItems: "center", paddingHorizontal: 16, paddingTop: 76, paddingBottom: 18, gap: 6 }}>
            <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 17, lineHeight: 24 }}>
              บันทึกรายการมั้ย?
            </Text>
            <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 20, textAlign: "center" }}>{description}</Text>
            <View style={{ flexDirection: "row", gap: 10, width: "100%", marginTop: 14 }}>
              <Pressable
                accessibilityRole="button"
                onPress={onDiscard}
                style={({ pressed }) => [button, { backgroundColor: pressed ? theme.border : theme.raised }]}
              >
                <Text style={{ color: theme.text, fontSize: 16 }}>ไม่บันทึก</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onSave}
                style={({ pressed }) => [button, { backgroundColor: theme.accent, opacity: pressed ? 0.84 : 1 }]}
              >
                <Text style={{ color: theme.onAccent, fontSize: 16 }}>บันทึก</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
