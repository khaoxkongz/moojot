import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useMemo } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/ui/controls";
import { Text } from "@/components/ui/typography";
import { radius, type AppTheme } from "@/constants/theme";
import {
  hasNoWalletSource,
  isAllWalletSources,
  toggleAllWalletSources,
  toggleWalletRow,
  walletFilterSections,
  type WalletFilterSection,
} from "@/features/wallets/filter";
import { useAppTheme } from "@/lib/use-app-theme";
import type { WalletFilterOptions, WalletFilterSelection } from "@/types/finance";

export type WalletFilterSheetProps = {
  visible: boolean;
  options: WalletFilterOptions;
  value: WalletFilterSelection;
  onChange: (next: WalletFilterSelection) => void;
  onApply: () => void;
  onClose: () => void;
};

const sectionIcon: Record<WalletFilterSection["icon"], "bank-outline" | "credit-card-outline" | "wallet-outline"> = {
  bank: "bank-outline",
  card: "credit-card-outline",
  other: "wallet-outline",
};

function CheckBox({ checked }: { checked: boolean }) {
  const theme = useAppTheme();
  const styles = useStyles();
  return checked ? (
    <View style={[styles.check, styles.checkOn]}>
      <MaterialCommunityIcons name="check" size={18} color={theme.onAccent} />
    </View>
  ) : (
    <View style={[styles.check, styles.checkOff]} />
  );
}

/**
 * “เลือกบัญชีและบัตร”: the user's own banks (one row per bank), cards (name and last four) and entries with no bank or
 * card. Shared by Home and Summary; the parent holds the draft and applies it.
 */
export function WalletFilterSheet({ visible, options, value, onChange, onApply, onClose }: WalletFilterSheetProps) {
  const theme = useAppTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const sections = useMemo(() => walletFilterSections(options, value), [options, value]);
  const all = isAllWalletSources(value, options);
  const none = hasNoWalletSource(value);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ปิดตัวกรองรายการ"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { maxHeight: height * 0.88, paddingBottom: insets.bottom + 16 }]}
        >
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text accessibilityRole="header" style={styles.title}>
                เลือกบัญชีและบัตร
              </Text>
              <IconButton icon="close" size={24} label="ปิด" onPress={onClose} style={{ marginRight: -10 }} />
            </View>
            <Text style={styles.subtitle}>หน้าแรกจะแสดงเฉพาะรายการจากบัญชีและบัตรที่เลือก</Text>

            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel="เลือกทั้งหมด"
              accessibilityState={{ checked: all }}
              onPress={() => onChange(toggleAllWalletSources(value, options))}
              style={styles.allRow}
            >
              <Text style={styles.rowLabel}>เลือกทั้งหมด</Text>
              <CheckBox checked={all} />
            </Pressable>

            {sections.map((section) => (
              <View key={section.title}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={styles.group}>
                  {section.rows.map((row, index) => (
                    <Pressable
                      key={row.key}
                      accessibilityRole="checkbox"
                      accessibilityLabel={row.label}
                      accessibilityState={{ checked: row.selected }}
                      onPress={() => onChange(toggleWalletRow(value, row))}
                      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.border }]}
                    >
                      {index > 0 ? <View style={styles.divider} /> : null}
                      <MaterialCommunityIcons name={sectionIcon[section.icon]} size={22} color={theme.muted} />
                      <Text numberOfLines={1} style={styles.rowLabel}>
                        {row.label}
                      </Text>
                      <CheckBox checked={row.selected} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}

            {none ? (
              <Text accessibilityRole="alert" style={styles.notice}>
                เลือกอย่างน้อย 1 รายการ
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: none }}
              disabled={none}
              onPress={onApply}
              style={({ pressed }) => [styles.apply, { opacity: none ? 0.45 : pressed ? 0.84 : 1 }]}
            >
              <Text style={styles.applyText}>แสดงรายการ</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, justifyContent: "flex-end" },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: theme.shade },
    sheet: {
      width: "100%",
      maxWidth: 680,
      alignSelf: "center",
      backgroundColor: theme.surface,
      borderTopLeftRadius: radius.sheet,
      borderTopRightRadius: radius.sheet,
      paddingTop: 10,
      paddingHorizontal: 16,
    },
    handle: {
      alignSelf: "center",
      width: 36,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.border,
      marginBottom: 6,
    },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    title: { color: theme.text, fontSize: 17, lineHeight: 24 },
    subtitle: { color: theme.muted, fontSize: 13, lineHeight: 20 },
    allRow: {
      marginTop: 8,
      minHeight: 52,
      paddingHorizontal: 2,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    sectionTitle: { marginTop: 12, color: theme.muted, fontSize: 12, lineHeight: 17 },
    group: { marginTop: 6, borderRadius: 14, backgroundColor: theme.raised, overflow: "hidden" },
    row: { minHeight: 56, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12 },
    divider: { position: "absolute", top: 0, left: 48, right: 0, height: 1, backgroundColor: theme.surface },
    rowLabel: { flex: 1, color: theme.text, fontSize: 15, lineHeight: 21 },
    check: { width: 24, height: 24, borderRadius: 7, alignItems: "center", justifyContent: "center" },
    checkOn: { backgroundColor: theme.accent },
    checkOff: { borderWidth: 1.5, borderColor: theme.border },
    notice: { marginTop: 12, color: theme.accentText, fontSize: 13, lineHeight: 20, textAlign: "center" },
    apply: {
      marginTop: 14,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    applyText: { color: theme.onAccent, fontSize: 16, lineHeight: 22 },
  });
}

function useStyles() {
  const theme = useAppTheme();
  return useMemo(() => createStyles(theme), [theme]);
}
