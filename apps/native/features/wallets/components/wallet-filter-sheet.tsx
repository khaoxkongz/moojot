import { Text } from "@/components/ui/typography";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/lib/use-app-theme";
import { HomeIcon } from "@/components/ui/home-icon";
import { bankFilterGroups, type BankFilterGroup } from "@/features/wallets/banks";
import { walletCardKey as cardKey } from "@/features/wallets/cards";
import { FilterSourceIcon } from "@/features/wallets/components/filter-source-icon";
import type { WalletCard, WalletFilterOptions, WalletFilterSelection } from "@/types/finance";

type FilterTab = "account" | "card" | "other";

export type WalletFilterSheetProps = {
  visible: boolean;
  options: WalletFilterOptions;
  value: WalletFilterSelection;
  onChange: (next: WalletFilterSelection) => void;
  onApply: () => void;
  onClose: () => void;
};

function TabIcon({ tab, color }: { tab: FilterTab; color: string }) {
  if (tab === "account") return <HomeIcon name="wallet" size={21} color={color} strokeWidth={1.8} />;
  if (tab === "card")
    return (
      <Svg width={21} height={21} viewBox="0 0 24 24" accessible={false}>
        <Rect x="2.5" y="5" width="19" height="14" rx="2.2" fill="none" stroke={color} strokeWidth="1.8" />
        <Path d="M3 10h18M6 15.5h4" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </Svg>
    );
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" accessible={false}>
      <Circle cx="5" cy="12" r="1.8" fill={color} />
      <Circle cx="12" cy="12" r="1.8" fill={color} />
      <Circle cx="19" cy="12" r="1.8" fill={color} />
    </Svg>
  );
}

function CheckMark({ checked }: { checked: boolean }) {
  const styles = useWalletStyles();
  const theme = useAppTheme();
  return (
    <View style={[styles.checkBox, checked && styles.checkBoxChecked]}>
      {checked ? (
        <Svg width={17} height={17} viewBox="0 0 20 20" accessible={false}>
          <Path
            d="m2.4 10.2 5.1 5.1L17.7 5"
            fill="none"
            stroke={theme.onAccent}
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ) : null}
    </View>
  );
}

function SourceRow({
  label,
  selected,
  kind,
  bankName,
  onPress,
  iconSize = 48,
  disabled = false,
  subtitle,
}: {
  label: string;
  selected: boolean;
  kind: "wallet" | "card" | "other" | "removed-card" | "bank";
  bankName?: string;
  onPress: () => void;
  iconSize?: number;
  disabled?: boolean;
  subtitle?: string;
}) {
  const styles = useWalletStyles();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityHint={subtitle}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.sourceRow, pressed && styles.rowPressed]}
    >
      <FilterSourceIcon kind={kind} bankName={bankName} size={iconSize} />
      <View style={styles.sourceCopy}>
        <Text style={styles.sourceLabel}>{label}</Text>
        {subtitle ? <Text style={styles.sourceSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={disabled && styles.disabledCheck}>
        <CheckMark checked={selected} />
      </View>
    </Pressable>
  );
}

/** The wallet icon's three source filters. Selection is controlled by the parent. */
export function WalletFilterSheet({ visible, options, value, onChange, onApply, onClose }: WalletFilterSheetProps) {
  const styles = useWalletStyles();
  const theme = useAppTheme();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<FilterTab>("account");

  const selectedBanks = useMemo(() => new Set(value.banks), [value.banks]);
  const bankGroups = useMemo(() => bankFilterGroups(options.banks), [options.banks]);
  const groupSelected = (group: BankFilterGroup) => group.banks.every((bank) => selectedBanks.has(bank));
  const selectedCards = useMemo(() => new Set(value.cards.map(cardKey)), [value.cards]);
  const allBanksSelected = options.banks.every((bank) => selectedBanks.has(bank));
  const allCardsSelected = options.cards.every((card) => selectedCards.has(cardKey(card))) && value.includeDeletedCards;

  const reset = () =>
    onChange({
      banks: [...options.banks],
      cards: options.cards.map((card) => ({ ...card })),
      includeOther: true,
      includeDeletedCards: true,
    });

  /** Every spelling of the bank is selected or cleared together. */
  const toggleBank = (group: BankFilterGroup) =>
    onChange({
      ...value,
      banks: groupSelected(group)
        ? value.banks.filter((name) => !group.banks.includes(name))
        : [...new Set([...value.banks, ...group.banks])],
    });

  const toggleCard = (card: WalletCard) =>
    onChange({
      ...value,
      cards: selectedCards.has(cardKey(card))
        ? value.cards.filter((selected) => cardKey(selected) !== cardKey(card))
        : [...value.cards, card],
    });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        setTab("account");
        onClose();
      }}
      onShow={() => setTab("account")}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ปิดตัวกรองรายการ"
          onPress={() => {
            setTab("account");
            onClose();
          }}
          style={styles.backdrop}
        />
        <View style={[styles.sheet, { height: height * 0.85 }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>กรองรายการ</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="รีเซ็ตตัวกรอง"
              onPress={reset}
              hitSlop={8}
              style={styles.resetButton}
            >
              <Text style={styles.resetText}>รีเซ็ต</Text>
            </Pressable>
          </View>

          <ScrollView
            bounces={false}
            alwaysBounceVertical={false}
            overScrollMode="never"
            style={styles.scroll}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tabs} accessibilityRole="tablist">
              {(
                [
                  ["account", "ทุกบัญชี"],
                  ["card", "ทุกบัตร"],
                  ["other", "อื่นๆ"],
                ] as const
              ).map(([name, label]) => {
                const selected = tab === name;
                const color = selected ? theme.onAccent : theme.accentText;
                return (
                  <Pressable
                    key={name}
                    accessibilityRole="tab"
                    accessibilityLabel={label}
                    accessibilityState={{ selected }}
                    onPress={() => setTab(name)}
                    style={({ pressed }) => [styles.tab, selected && styles.tabSelected, pressed && styles.tabPressed]}
                  >
                    <TabIcon tab={name} color={color} />
                    <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {tab === "account" ? (
              <>
                <View style={styles.firstRow}>
                  <SourceRow
                    label="บัญชีทั้งหมด"
                    kind="wallet"
                    iconSize={44}
                    selected={options.banks.length > 0 && allBanksSelected}
                    disabled={options.banks.length === 0}
                    subtitle={options.banks.length === 0 ? "ยังไม่มีบัญชีในรายการที่บันทึก" : undefined}
                    onPress={() => onChange({ ...value, banks: allBanksSelected ? [] : [...options.banks] })}
                  />
                </View>
                <View style={styles.divider} />
                <Text style={styles.sectionTitle}>เลือกดูรายการจากบัญชี...</Text>
                <View style={styles.bankRows}>
                  {bankGroups.map((group) => (
                    <SourceRow
                      key={group.id}
                      label={group.label}
                      kind="bank"
                      bankName={group.id}
                      selected={groupSelected(group)}
                      onPress={() => toggleBank(group)}
                    />
                  ))}
                  {options.banks.length === 0 ? (
                    <Text style={styles.emptySources}>บัญชีจากรายการที่บันทึกจะแสดงที่นี่</Text>
                  ) : null}
                </View>
              </>
            ) : null}

            {tab === "card" ? (
              <>
                <View style={styles.firstRow}>
                  <SourceRow
                    label="บัตรเครดิตทั้งหมด"
                    kind="card"
                    iconSize={44}
                    selected={allCardsSelected}
                    onPress={() =>
                      onChange({
                        ...value,
                        cards: allCardsSelected ? [] : options.cards.map((card) => ({ ...card })),
                        includeDeletedCards: !allCardsSelected,
                      })
                    }
                  />
                </View>
                <View style={styles.divider} />
                <View style={styles.cardRows}>
                  <SourceRow
                    label="บัตรที่ลบไปแล้ว"
                    kind="removed-card"
                    selected={value.includeDeletedCards}
                    disabled={!options.canIdentifyDeletedCards}
                    subtitle={!options.canIdentifyDeletedCards ? "ยังไม่มีข้อมูลบัตรที่ลบ" : undefined}
                    onPress={() => onChange({ ...value, includeDeletedCards: !value.includeDeletedCards })}
                  />
                  {options.cards.map((card) => (
                    <SourceRow
                      key={cardKey(card)}
                      label={card.cardLast4 ? `${card.cardName} •••• ${card.cardLast4}` : card.cardName}
                      kind="card"
                      selected={selectedCards.has(cardKey(card))}
                      onPress={() => toggleCard(card)}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {tab === "other" ? (
              <View style={styles.firstRow}>
                <SourceRow
                  label="จดเอง / ไม่ระบุธนาคารและบัตร"
                  kind="other"
                  iconSize={44}
                  selected={value.includeOther}
                  onPress={() => onChange({ ...value, includeOther: !value.includeOther })}
                />
              </View>
            ) : null}
          </ScrollView>

          <LinearGradient
            colors={["rgba(255,255,255,0)", theme.surface, theme.surface]}
            locations={[0, 0.3, 1]}
            style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 40, 68) }]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="ดูรายการที่กรอง"
              onPress={() => {
                setTab("account");
                onApply();
              }}
              style={({ pressed }) => [
                styles.applyButton,
                { width: Math.min(width - 64, 240) },
                pressed && styles.applyPressed,
              ]}
            >
              <Text style={styles.applyText}>ดูรายการ</Text>
            </Pressable>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    modalRoot: { flex: 1, justifyContent: "flex-end" },
    backdrop: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: "rgba(0, 15, 30, 0.28)",
    },
    sheet: {
      width: "100%",
      maxWidth: 520,
      alignSelf: "center",
      backgroundColor: theme.surface,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      overflow: "hidden",
    },
    header: {
      height: 54,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.raised,
    },
    headerTitle: { color: theme.text, fontSize: 19, fontWeight: "800" },
    resetButton: { minHeight: 44, justifyContent: "center" },
    resetText: { color: theme.accentText, fontSize: 19, fontWeight: "800" },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 158 },
    tabs: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    tab: {
      height: 40,
      flexShrink: 1,
      flexDirection: "row",
      gap: 5,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 9,
      borderWidth: 1,
      borderColor: theme.accentText,
      borderRadius: 24,
      backgroundColor: theme.surface,
    },
    tabSelected: { backgroundColor: theme.accent, borderColor: theme.accent },
    tabPressed: { opacity: 0.75 },
    tabText: { color: theme.accentText, fontSize: 17, fontWeight: "700" },
    tabTextSelected: { color: theme.onAccent },
    firstRow: { paddingTop: 15 },
    sourceRow: {
      minHeight: 60,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    rowPressed: { backgroundColor: theme.raised },
    sourceCopy: { flex: 1 },
    sourceLabel: { color: theme.text, fontSize: 17, lineHeight: 26 },
    sourceSubtitle: { color: theme.muted, fontSize: 11, lineHeight: 15 },
    disabledCheck: { opacity: 0.55 },
    checkBox: {
      width: 18,
      height: 18,
      marginRight: 3,
      borderWidth: 1.5,
      borderRadius: 2,
      borderColor: theme.accentText,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surface,
    },
    checkBoxChecked: { backgroundColor: theme.accent },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginHorizontal: 16,
      marginTop: 14,
      marginBottom: 15,
    },
    sectionTitle: {
      color: theme.text,
      fontSize: 17,
      lineHeight: 27,
      fontWeight: "700",
      paddingHorizontal: 16,
    },
    bankRows: { paddingTop: 6 },
    emptySources: {
      color: theme.muted,
      fontSize: 13,
      lineHeight: 20,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    cardRows: { paddingTop: 13 },
    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: 24,
      alignItems: "center",
    },
    applyButton: {
      height: 48,
      borderRadius: 30,
      backgroundColor: theme.accent,
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 2px 5px rgba(45, 45, 43, 0.18)",
    },
    applyPressed: { opacity: 0.8 },
    applyText: { color: theme.onAccent, fontSize: 18, fontWeight: "800" },
  });
}

function useWalletStyles() {
  const theme = useAppTheme();
  return useMemo(() => createStyles(theme), [theme]);
}
