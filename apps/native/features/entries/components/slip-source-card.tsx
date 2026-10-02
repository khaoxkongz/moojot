import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Line, Path } from "react-native-svg";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/lib/use-app-theme";
import { Text } from "@/components/ui/typography";
import type { FinanceTransaction } from "@/types/finance";
import { shortBuddhistYear } from "@/utils/dates";

const weekdays = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function slipDateLabel(occurredOn: string, createdAt: string) {
  const [year, month, day] = occurredOn.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return occurredOn;
  const when = new Date(createdAt);
  const time = Number.isNaN(when.getTime())
    ? ""
    : ` ${when.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })} น.`;
  return `${weekdays[date.getDay()]} ${day} ${months[month - 1]} ${shortBuddhistYear(year)}${time}`;
}

function BankIcon() {
  const theme = useAppTheme();
  const styles = useLocalStyles();
  return (
    <View style={styles.bankIcon}>
      <Svg
        width={20}
        height={20}
        viewBox="0 0 24 24"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Path
          d="M3 10h18M5 10v9m5-9v9m4-9v9m5-9v9M3 20h18M4 8l8-5 8 5H4Z"
          fill="none"
          stroke={theme.onAccent}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

function ShopIcon() {
  const styles = useLocalStyles();
  const theme = useAppTheme();
  return (
    <View style={styles.shopIcon}>
      <Svg
        width={20}
        height={20}
        viewBox="0 0 24 24"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Path
          d="M4 10 5.5 4h13L20 10M4 10v10h16V10M8 20v-6h8v6"
          fill="none"
          stroke={theme.muted}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M4 10c0 2 3 2 4 0 1 2 3 2 4 0 1 2 3 2 4 0 1 2 4 2 4 0"
          fill="none"
          stroke={theme.muted}
          strokeWidth={1.7}
        />
      </Svg>
    </View>
  );
}

function ReceiptIcon() {
  const theme = useAppTheme();
  return (
    <Svg
      width={30}
      height={34}
      viewBox="0 0 30 34"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path
        d="M5 2h20v30l-4-3-4 3-4-3-4 3-4-3V2Z"
        fill="none"
        stroke={theme.muted}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Line x1={9} y1={10} x2={21} y2={10} stroke={theme.muted} strokeWidth={2} />
      <Line x1={9} y1={16} x2={21} y2={16} stroke={theme.muted} strokeWidth={2} />
      <Line x1={9} y1={22} x2={17} y2={22} stroke={theme.muted} strokeWidth={2} />
    </Svg>
  );
}

export interface SlipImageViewerProps {
  visible: boolean;
  imageUri?: string | null;
  onClose: () => void;
}

export function SlipImageViewer({ visible, imageUri, onClose }: SlipImageViewerProps) {
  const styles = useLocalStyles();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const canDisplay = Boolean(imageUri) && imageUri !== failedUri;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.viewer, { paddingTop: insets.top, paddingBottom: insets.bottom + 18 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ปิดรูปสลิป"
          onPress={onClose}
          style={[styles.closeViewer, { top: insets.top + 17 }]}
        >
          <Text style={styles.closeViewerText}>×</Text>
        </Pressable>
        <View style={styles.viewerCenter}>
          {canDisplay ? (
            <Image
              source={{ uri: imageUri! }}
              contentFit="contain"
              accessibilityLabel="รูปสลิปจากอัลบั้มในเครื่อง"
              onError={() => setFailedUri(imageUri ?? null)}
              style={{ width: width - 24, height: Math.min(height * 0.74, (width - 24) * 1.75) }}
            />
          ) : (
            <View style={styles.unavailable}>
              <ReceiptIcon />
              <Text style={styles.unavailableTitle}>ไม่พบรูปสลิปในเครื่องนี้</Text>
              <Text style={styles.unavailableBody}>รายการยังอยู่ครบ แต่ไฟล์รูปต้นฉบับอาจถูกย้ายหรือลบจากอัลบั้ม</Text>
            </View>
          )}
        </View>
        <Text style={styles.viewerNotice}>รูปสลิปมาจากอัลบั้มในเครื่องนี้{"\n"}หมูจดไม่ได้เก็บภาพไว้นะ</Text>
      </View>
    </Modal>
  );
}

export interface SlipSourceCardProps {
  transaction: FinanceTransaction;
  imageUri?: string | null;
  payerName?: string;
  merchantName?: string;
}

export function SlipSourceCard({ transaction, imageUri, payerName = "บัญชีของฉัน", merchantName }: SlipSourceCardProps) {
  const styles = useLocalStyles();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [failedThumbnailUri, setFailedThumbnailUri] = useState<string | null>(null);
  const merchant = merchantName?.trim() || transaction.title.trim() || "ไม่ระบุปลายทาง";

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>ข้อมูลจากสลิป</Text>
        <View style={styles.mainRow}>
          <View style={styles.flow}>
            <View style={styles.flowRow}>
              <BankIcon />
              <Text numberOfLines={1} style={styles.flowText}>
                {payerName}
              </Text>
            </View>
            <Text style={styles.flowArrow}>↓</Text>
            <View style={styles.flowRow}>
              <ShopIcon />
              <Text numberOfLines={2} style={styles.flowText}>
                {merchant}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="แตะเพื่อดูสลิป"
            onPress={() => setViewerOpen(true)}
            style={styles.thumbnail}
          >
            {imageUri && imageUri !== failedThumbnailUri ? (
              <Image
                source={{ uri: imageUri }}
                contentFit="cover"
                accessibilityLabel="รูปสลิปขนาดย่อ"
                onError={() => setFailedThumbnailUri(imageUri)}
                style={styles.thumbnailImage}
              />
            ) : (
              <ReceiptIcon />
            )}
          </Pressable>
        </View>
        <View style={styles.footerRow}>
          <Text numberOfLines={1} style={styles.date}>
            {slipDateLabel(transaction.occurredOn, transaction.createdAt)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="แตะเพื่อดูสลิป"
            onPress={() => setViewerOpen(true)}
            style={styles.viewLinkHit}
          >
            <Text style={styles.viewLink}>แตะเพื่อดูสลิป</Text>
          </Pressable>
        </View>
      </View>
      <SlipImageViewer visible={viewerOpen} imageUri={imageUri} onClose={() => setViewerOpen(false)} />
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderRadius: 9,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 14,
      gap: 12,
    },
    cardTitle: { color: theme.text, fontSize: 15, lineHeight: 22, fontWeight: "700" },
    mainRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    flow: { flex: 1, minWidth: 0, gap: 1 },
    flowRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 27 },
    flowText: { color: theme.text, flex: 1, fontSize: 15, lineHeight: 21 },
    flowArrow: { color: theme.muted, fontSize: 15, lineHeight: 15, marginLeft: 12 },
    bankIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.accent,
      justifyContent: "center",
      alignItems: "center",
    },
    shopIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.muted,
      justifyContent: "center",
      alignItems: "center",
    },
    thumbnail: {
      width: 82,
      height: 78,
      borderRadius: 5,
      backgroundColor: theme.raised,
      overflow: "hidden",
      justifyContent: "center",
      alignItems: "center",
    },
    thumbnailImage: { width: "100%", height: "100%" },
    footerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      gap: 8,
    },
    date: { color: theme.muted, fontSize: 12, lineHeight: 18, flex: 1 },
    viewLinkHit: { paddingVertical: 3 },
    viewLink: { color: theme.accentText, fontSize: 15, fontWeight: "700" },
    viewer: {
      flex: 1,
      backgroundColor: theme.background,
      justifyContent: "space-between",
      alignItems: "center",
    },
    closeViewer: {
      position: "absolute",
      right: 16,
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    },
    closeViewerText: { color: theme.accentText, fontSize: 42, lineHeight: 45, fontWeight: "300" },
    viewerCenter: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      paddingTop: 50,
    },
    viewerNotice: {
      color: theme.text,
      fontSize: 16,
      lineHeight: 23,
      textAlign: "center",
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 24,
    },
    unavailable: {
      width: "86%",
      minHeight: 200,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      padding: 22,
      gap: 11,
    },
    unavailableTitle: { color: theme.text, fontSize: 18, fontWeight: "700", textAlign: "center" },
    unavailableBody: { color: theme.muted, fontSize: 14, lineHeight: 21, textAlign: "center" },
  });
}

function useLocalStyles() {
  const theme = useAppTheme();
  return useMemo(() => createStyles(theme), [theme]);
}
