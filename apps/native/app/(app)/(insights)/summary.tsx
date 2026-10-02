import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useQuery } from "@tanstack/react-query";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HomeIcon } from "@/components/ui/home-icon";
import { Text } from "@/components/ui/typography";
import { accentRing, radius, raisedRing, shadow, touch, type AppTheme } from "@/constants/theme";
import { useAppData } from "@/context/app-data";
import { summaryMonthOffset } from "@/features/home/period";
import { homeQueryOptions } from "@/features/home/query-options";
import { planningQueryOptions } from "@/features/planning/query-options";
import {
  kindTotal,
  planRowSubtitle,
  summaryEmpty,
  summaryMonth,
  summaryOverview,
  summaryQuestion,
  summaryRows,
  summaryTrend,
  type SummaryMode,
  type SummaryRow,
} from "@/features/summary/summary";
import { WalletFilterSheet } from "@/features/wallets/components/wallet-filter-sheet";
import { emptyWalletOptions, isAllWalletSources, selectAllWalletSources } from "@/features/wallets/filter";
import { walletsQueryOptions } from "@/features/wallets/query-options";
import { useAppTheme } from "@/lib/use-app-theme";
import type { TransactionKind, WalletFilterSelection } from "@/types/finance";
import { formatBaht, isValidISODate, todayISO } from "@/utils/format";

const emptyRows: never[] = [];
const kinds: Array<[TransactionKind, string]> = [
  ["expense", "รายจ่าย"],
  ["income", "รายรับ"],
  ["transfer", "ย้ายเงิน"],
];
const modes: Array<[SummaryMode, string]> = [
  ["category", "ตามหมวด"],
  ["tag", "ตามแท็ก"],
];

type Retry = { message: string; onRetry: () => void };

function InlineError({ message, onRetry }: Retry) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.inlineError}>
      <Text style={styles.inlineErrorText}>{message}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}>
        <Text style={styles.retryText}>ลองอีกครั้ง</Text>
      </Pressable>
    </View>
  );
}

function BarRow({ row, divider }: { row: SummaryRow; divider: boolean }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const body = (
    <>
      {divider ? <View style={styles.rowDivider} /> : null}
      {row.pending ? (
        <View style={styles.pendingIcon}>
          <HomeIcon name="edit" size={16} color={theme.accentText} />
        </View>
      ) : (
        <View style={styles.rowIcon}>
          <Text style={styles.rowEmoji}>{row.icon}</Text>
        </View>
      )}
      <View style={styles.rowCopy}>
        <View style={styles.rowTop}>
          <Text numberOfLines={1} style={[styles.rowName, row.pending && { color: theme.accentText }]}>
            {row.name}
          </Text>
          <Text style={styles.rowAmount}>{row.amount}</Text>
        </View>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${Math.min(100, row.bar)}%`, backgroundColor: row.pending ? theme.border : theme.accent },
            ]}
          />
        </View>
        <Text style={[styles.rowMeta, row.pending && { color: theme.accentText }]}>{row.meta}</Text>
      </View>
      {row.pending ? <MaterialCommunityIcons name="chevron-right" size={22} color={theme.muted} /> : null}
    </>
  );
  if (!row.pending) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.name} ${row.amount} บาท ${row.meta}`}
      onPress={() =>
        router.push({ pathname: "/pending-categories", params: { ids: (row.pendingIds ?? []).join(",") } })
      }
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.72 }]}
    >
      {body}
    </Pressable>
  );
}

export default function SummaryScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { appliedWalletFilter, setAppliedWalletFilter } = useAppData();
  const walletFilter = appliedWalletFilter ?? undefined;

  // Home's “ดูสรุป” passes a day of the period it shows, so Summary opens on that month; the arrows take over after.
  const params = useLocalSearchParams<{ date?: string }>();
  const [chosenOffset, setOffset] = useState<number | null>(null);
  const [kind, setKind] = useState<TransactionKind>("expense");
  const [mode, setMode] = useState<SummaryMode>("category");
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftWalletFilter, setDraftWalletFilter] = useState<WalletFilterSelection>(() =>
    selectAllWalletSources(emptyWalletOptions)
  );

  const startDayQuery = useQuery({ ...planningQueryOptions.monthStartDay(), enabled: isFocused });
  const startDay = startDayQuery.data ?? 1;
  const today = todayISO();
  const openedAt = params.date && isValidISODate(params.date) ? params.date : null;
  const offset = chosenOffset ?? (openedAt ? summaryMonthOffset(today, openedAt, startDay) : 0);
  const month = summaryMonth(today, offset, startDay);
  const ready = isFocused && startDayQuery.data !== undefined;

  const summaryQuery = useQuery({
    ...homeQueryOptions.periodSummary(month.from, month.to, walletFilter),
    enabled: ready,
  });
  const categoriesQuery = useQuery({
    ...homeQueryOptions.categoryBreakdown(month.from, month.to, kind === "income" ? "income" : "expense", walletFilter),
    enabled: ready && kind !== "transfer" && mode === "category",
  });
  const tagsQuery = useQuery({
    ...homeQueryOptions.tagBreakdown(month.from, month.to, kind === "income" ? "income" : "expense", walletFilter),
    enabled: ready && kind !== "transfer" && mode === "tag",
  });
  // Six months ending at this one, by the user's month start (the server reads it too).
  const trendQuery = useQuery({ ...homeQueryOptions.monthlyTrend(6, month.from, walletFilter), enabled: ready });
  // Budgets keep their own scope: never narrowed to the wallet filter.
  const budgetsQuery = useQuery({ ...planningQueryOptions.budgetStatuses(month.periodKey), enabled: ready });
  const walletOptionsQuery = useQuery({ ...walletsQueryOptions.filterOptions(), enabled: isFocused });
  const walletOptions = walletOptionsQuery.data ?? emptyWalletOptions;

  const summary = summaryQuery.data;
  const overview = summary ? summaryOverview(summary) : null;
  const total = summary ? kindTotal(summary, kind) : 0;
  const barsQuery = kind === "transfer" ? summaryQuery : mode === "category" ? categoriesQuery : tagsQuery;
  const rows = summary
    ? summaryRows({
        kind,
        mode,
        kindTotalSatang: total,
        transferCount: summary.transferCount,
        categories: categoriesQuery.data ?? emptyRows,
        tags: tagsQuery.data ?? emptyRows,
      })
    : emptyRows;
  const empty = summaryEmpty(kind, total);
  const trend = trendQuery.data ? summaryTrend(trendQuery.data, kind) : null;
  // While budgets load or cannot load, the row still opens the plan.
  const planSub = budgetsQuery.data ? planRowSubtitle(budgetsQuery.data) : "ดูงบของเดือนนี้";

  const pageError = !summary && (startDayQuery.error ?? summaryQuery.error);
  const refreshError = summary && summaryQuery.error;
  const retryAll = () => {
    for (const query of [startDayQuery, summaryQuery, categoriesQuery, tagsQuery, trendQuery, budgetsQuery]) {
      if (query.isEnabled) void query.refetch();
    }
  };

  const openWalletFilter = async () => {
    let options = walletOptions;
    try {
      options = (await walletOptionsQuery.refetch()).data ?? options;
    } catch {
      // Keep the last loaded options if the database is temporarily unavailable.
    }
    setDraftWalletFilter(appliedWalletFilter ?? selectAllWalletSources(options));
    setFilterOpen(true);
  };

  const applyWalletFilter = () => {
    setAppliedWalletFilter(isAllWalletSources(draftWalletFilter, walletOptions) ? null : draftWalletFilter);
    setFilterOpen(false);
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <View style={styles.screen}>
      <View style={{ paddingTop: insets.top }}>
        <View style={styles.titleBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="กลับหน้าแรก"
            onPress={goBack}
            style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: theme.raised }]}
          >
            <MaterialCommunityIcons name="chevron-left" size={30} color={theme.text} />
          </Pressable>
          <Text style={styles.title}>สรุป</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="กรองรายการ"
            accessibilityState={{ selected: Boolean(appliedWalletFilter) }}
            onPress={() => void openWalletFilter()}
            style={({ pressed }) => [
              styles.iconButton,
              styles.walletButton,
              (filterOpen || appliedWalletFilter) && accentRing(theme),
              pressed && { opacity: 0.72 },
            ]}
          >
            <HomeIcon name="wallet" color={theme.text} size={21} />
          </Pressable>
        </View>
        <View style={styles.monthNav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="เดือนก่อน"
            onPress={() => setOffset(offset - 1)}
            style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: theme.raised }]}
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color={theme.accentText} />
          </Pressable>
          <Text style={styles.monthTitle}>{month.title}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="เดือนถัดไป"
            accessibilityState={{ disabled: month.isCurrent }}
            disabled={month.isCurrent}
            onPress={() => setOffset(Math.min(0, offset + 1))}
            style={({ pressed }) => [
              styles.iconButton,
              { opacity: month.isCurrent ? 0.35 : 1 },
              pressed && { backgroundColor: theme.raised },
            ]}
          >
            <MaterialCommunityIcons name="chevron-right" size={26} color={theme.accentText} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
      >
        {appliedWalletFilter ? (
          <View style={styles.filterNotice}>
            <HomeIcon name="filter" size={16} color={theme.accentText} />
            <Text style={styles.filterNoticeText}>สรุปเฉพาะบัญชีและบัตรที่เลือก</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="ล้างตัวกรอง"
              onPress={() => setAppliedWalletFilter(null)}
              style={styles.clearFilter}
            >
              <Text style={styles.clearFilterText}>ล้าง</Text>
            </Pressable>
          </View>
        ) : null}

        {refreshError ? (
          <Pressable accessibilityRole="button" onPress={retryAll} style={styles.refreshErrorRow}>
            <Text style={styles.refreshError}>
              อัปเดตข้อมูลไม่สำเร็จ แสดงข้อมูลที่โหลดไว้ล่าสุด <Text style={styles.retryText}>ลองอีกครั้ง</Text>
            </Text>
          </Pressable>
        ) : null}

        {pageError ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageTitle}>โหลดสรุปไม่สำเร็จ</Text>
            <Text style={styles.messageBody}>เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง</Text>
            <Pressable accessibilityRole="button" onPress={retryAll} style={styles.retry}>
              <Text style={styles.retryText}>ลองอีกครั้ง</Text>
            </Pressable>
          </View>
        ) : !overview ? (
          <ActivityIndicator color={theme.accentText} style={styles.loading} />
        ) : (
          <>
            <View style={styles.overview}>
              <Text style={styles.overviewTitle}>{month.overviewTitle}</Text>
              <View style={[styles.overviewLine, { marginTop: 12 }]}>
                <Text style={styles.overviewLabel}>ได้รับ</Text>
                <Text style={styles.overviewAmount}>{overview.income}</Text>
              </View>
              <View style={[styles.overviewLine, { marginTop: 6 }]}>
                <Text style={styles.overviewLabel}>ใช้ไป</Text>
                <Text style={styles.overviewAmount}>− {overview.expense}</Text>
              </View>
              <View style={styles.overviewRule} />
              <View style={styles.netLine}>
                <View>
                  <Text style={styles.netLabel}>{overview.netLabel}</Text>
                  <Text style={styles.netHint}>ได้รับ − ใช้ไป</Text>
                </View>
                <View
                  accessible
                  accessibilityLabel={`${overview.netLabel} ${overview.net} บาท`}
                  style={styles.netAmountRow}
                >
                  <Text numberOfLines={1} adjustsFontSizeToFit style={styles.netAmount}>
                    {overview.net}
                  </Text>
                  <Text style={styles.netBaht}>฿</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <View accessibilityRole="tablist" accessibilityLabel="ดูสรุปของ" style={styles.segment}>
                {kinds.map(([value, label]) => {
                  const selected = kind === value;
                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      onPress={() => setKind(value)}
                      style={[styles.segmentItem, selected && styles.segmentItemOn]}
                    >
                      <Text style={[styles.segmentText, selected && { color: theme.text }]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.questionLine}>
                <Text style={styles.question}>{summaryQuestion(kind)}</Text>
                <Text style={styles.kindTotal}>{formatBaht(total, total % 100 === 0 ? 0 : 2)} ฿</Text>
              </View>
              {kind !== "transfer" ? (
                <View style={styles.modes}>
                  {modes.map(([value, label]) => {
                    const selected = mode === value;
                    return (
                      <Pressable
                        key={value}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => setMode(value)}
                        style={styles.modeTouch}
                      >
                        <View style={[styles.modeChip, selected && styles.modeChipOn]}>
                          <Text style={[styles.modeText, selected && { color: theme.onInverse }]}>{label}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
              {barsQuery.data === undefined && barsQuery.error ? (
                <InlineError message="โหลดยอดตามกลุ่มไม่สำเร็จ" onRetry={() => void barsQuery.refetch()} />
              ) : barsQuery.data === undefined ? (
                <ActivityIndicator color={theme.accentText} style={styles.cardLoading} />
              ) : rows.length ? (
                <View style={{ marginTop: 4 }}>
                  {rows.map((row, index) => (
                    <BarRow key={row.key} row={row} divider={index > 0} />
                  ))}
                </View>
              ) : (
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>{empty.title}</Text>
                  <Text style={styles.emptyBody}>{empty.body}</Text>
                </View>
              )}
              {kind === "transfer" && rows.length ? (
                <Text style={styles.transferNote}>ยอดย้ายเงินไม่รวมในรายรับและรายจ่าย</Text>
              ) : null}
            </View>

            <View style={[styles.card, styles.trendCard]}>
              <Text style={styles.trendTitle}>{trend?.title ?? summaryTrend([], kind).title}</Text>
              {trend ? (
                <>
                  <View style={styles.compareLine}>
                    <MaterialCommunityIcons
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                      name={trend.compare.icon}
                      size={18}
                      color={theme.text}
                    />
                    <Text style={styles.compareText}>{trend.compare.text}</Text>
                  </View>
                  <View
                    accessible
                    accessibilityLabel={trend.bars
                      .map((bar) => `${bar.label} ${bar.value === "–" ? "ไม่มีรายการ" : `${bar.value} บาท`}`)
                      .join(", ")}
                    style={styles.chart}
                  >
                    {trend.bars.map((bar) => (
                      <View key={bar.key} style={styles.chartColumn}>
                        <Text style={[styles.chartValue, { color: bar.current ? theme.text : theme.muted }]}>
                          {bar.value}
                        </Text>
                        <View
                          style={[
                            styles.chartBar,
                            { height: bar.height, backgroundColor: bar.current ? theme.accent : theme.border },
                          ]}
                        />
                        <Text style={[styles.chartLabel, { color: bar.current ? theme.accentText : theme.muted }]}>
                          {bar.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : trendQuery.error ? (
                <InlineError message="โหลดแนวโน้มไม่สำเร็จ" onRetry={() => void trendQuery.refetch()} />
              ) : (
                <ActivityIndicator color={theme.accentText} style={styles.cardLoading} />
              )}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`วางแผนงบ ${planSub}`}
              onPress={() => router.push({ pathname: "/plan", params: { periodKey: month.periodKey } })}
              style={({ pressed }) => [styles.planRow, pressed && { backgroundColor: theme.raised }]}
            >
              <View style={styles.rowIcon}>
                <MaterialCommunityIcons name="target" size={19} color={theme.text} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.planTitle}>วางแผนงบ</Text>
                <Text style={styles.planSub}>{planSub}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={theme.muted} />
            </Pressable>
          </>
        )}
      </ScrollView>

      <WalletFilterSheet
        visible={filterOpen}
        options={walletOptions}
        value={draftWalletFilter}
        onChange={setDraftWalletFilter}
        onApply={applyWalletFilter}
        onClose={() => setFilterOpen(false)}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    titleBar: { height: 52, paddingLeft: 4, paddingRight: 6, flexDirection: "row", alignItems: "center" },
    iconButton: {
      width: touch.min,
      height: touch.min,
      borderRadius: touch.min / 2,
      alignItems: "center",
      justifyContent: "center",
    },
    walletButton: { backgroundColor: theme.raised },
    title: { flex: 1, minWidth: 0, color: theme.text, fontSize: 17, lineHeight: 24, textAlign: "center" },
    monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
    monthTitle: { minWidth: 140, flexShrink: 1, color: theme.text, fontSize: 15, lineHeight: 21, textAlign: "center" },
    content: { width: "100%", maxWidth: 680, alignSelf: "center", paddingTop: 4, paddingHorizontal: 16 },
    filterNotice: { marginBottom: 6, paddingLeft: 4, flexDirection: "row", alignItems: "center", gap: 7 },
    filterNoticeText: { flex: 1, color: theme.text, fontSize: 13, lineHeight: 19 },
    clearFilter: { minHeight: touch.min, paddingHorizontal: 6, justifyContent: "center" },
    clearFilterText: { color: theme.accentText, fontSize: 13, lineHeight: 19 },
    refreshErrorRow: { minHeight: touch.min, paddingHorizontal: 4, justifyContent: "center" },
    refreshError: { color: theme.danger, fontSize: 12, lineHeight: 17 },
    loading: { marginTop: 40 },
    messageCard: {
      marginTop: 8,
      padding: 20,
      borderRadius: radius.card,
      backgroundColor: theme.surface,
      ...raisedRing(theme),
    },
    messageTitle: { color: theme.text, fontSize: 15, lineHeight: 21 },
    messageBody: { marginTop: 4, color: theme.muted, fontSize: 13, lineHeight: 20 },
    retry: { alignSelf: "flex-start", minHeight: touch.min, justifyContent: "center" },
    retryText: { color: theme.accentText, fontSize: 14, lineHeight: 20 },
    overview: {
      paddingTop: 16,
      paddingHorizontal: 18,
      paddingBottom: 18,
      borderRadius: radius.hero,
      backgroundColor: theme.accent,
    },
    overviewTitle: { color: theme.onAccent, fontSize: 15, lineHeight: 21 },
    overviewLine: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 },
    overviewLabel: { color: theme.onAccent, fontSize: 14, lineHeight: 20 },
    overviewAmount: {
      color: theme.onAccent,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: "400",
      fontVariant: ["tabular-nums"],
    },
    overviewRule: { marginTop: 12, marginBottom: 10, height: 1, backgroundColor: theme.onAccent, opacity: 0.3 },
    netLine: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
    netLabel: { color: theme.onAccent, fontSize: 15, lineHeight: 21 },
    netHint: { color: theme.onAccent, fontSize: 12, lineHeight: 17 },
    netAmountRow: { flexShrink: 1, flexDirection: "row", alignItems: "baseline", gap: 5 },
    netAmount: {
      flexShrink: 1,
      color: theme.onAccent,
      fontSize: 32,
      lineHeight: 37,
      fontWeight: "500",
      letterSpacing: -0.3,
      fontVariant: ["tabular-nums"],
    },
    netBaht: { color: theme.onAccent, fontSize: 18, lineHeight: 22, fontWeight: "400", fontVariant: ["tabular-nums"] },
    card: {
      marginTop: 12,
      paddingTop: 14,
      paddingHorizontal: 16,
      paddingBottom: 6,
      borderRadius: radius.hero,
      backgroundColor: theme.surface,
      ...raisedRing(theme),
    },
    segment: { padding: 3, borderRadius: 12, backgroundColor: theme.raised, flexDirection: "row", gap: 3 },
    segmentItem: {
      flex: 1,
      minHeight: 40,
      paddingHorizontal: 4,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
    },
    segmentItemOn: { backgroundColor: theme.surface, ...shadow.segment },
    segmentText: { color: theme.muted, fontSize: 14, lineHeight: 20 },
    questionLine: {
      marginTop: 14,
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 12,
    },
    question: { flexShrink: 1, color: theme.text, fontSize: 16, lineHeight: 22 },
    kindTotal: { color: theme.text, fontSize: 16, lineHeight: 22, fontWeight: "400", fontVariant: ["tabular-nums"] },
    modes: { marginTop: 10, flexDirection: "row", gap: 6 },
    // 34-tall chip in a 44-tall touch area.
    modeTouch: { minHeight: touch.min, justifyContent: "center", marginVertical: -5 },
    modeChip: {
      minHeight: 34,
      paddingHorizontal: 14,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: theme.border,
      justifyContent: "center",
    },
    modeChipOn: { borderColor: theme.inverse, backgroundColor: theme.inverse },
    modeText: { color: theme.text, fontSize: 13, lineHeight: 18 },
    cardLoading: { marginVertical: 24 },
    row: { paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 },
    rowDivider: { position: "absolute", top: 0, left: 48, right: 0, height: 1, backgroundColor: theme.raised },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.raised,
      alignItems: "center",
      justifyContent: "center",
    },
    pendingIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: theme.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    rowEmoji: { fontSize: 18, lineHeight: 23 },
    rowCopy: { flex: 1, minWidth: 0 },
    rowTop: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10 },
    rowName: { flexShrink: 1, color: theme.text, fontSize: 15, lineHeight: 21 },
    rowAmount: { color: theme.text, fontSize: 15, lineHeight: 21, fontWeight: "500", fontVariant: ["tabular-nums"] },
    barTrack: { marginTop: 6, height: 6, borderRadius: 3, backgroundColor: theme.raised, overflow: "hidden" },
    barFill: { height: "100%", borderRadius: 3 },
    rowMeta: { marginTop: 5, color: theme.muted, fontSize: 12, lineHeight: 17 },
    empty: { paddingTop: 24, paddingHorizontal: 8, paddingBottom: 22, alignItems: "center" },
    emptyTitle: { color: theme.text, fontSize: 15, lineHeight: 21, textAlign: "center" },
    emptyBody: { marginTop: 4, color: theme.muted, fontSize: 13, lineHeight: 20, textAlign: "center" },
    transferNote: { paddingBottom: 12, color: theme.muted, fontSize: 12, lineHeight: 18 },
    inlineError: { paddingVertical: 16, alignItems: "flex-start" },
    inlineErrorText: { color: theme.danger, fontSize: 13, lineHeight: 19 },
    trendCard: { padding: 16, paddingTop: 16, paddingBottom: 16 },
    trendTitle: { color: theme.text, fontSize: 16, lineHeight: 22 },
    compareLine: { marginTop: 4, flexDirection: "row", alignItems: "flex-start", gap: 6 },
    compareText: { flex: 1, color: theme.muted, fontSize: 14, lineHeight: 20 },
    chart: { marginTop: 14, height: 150, flexDirection: "row", alignItems: "flex-end", gap: 6 },
    chartColumn: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end", gap: 4 },
    chartValue: { fontSize: 11, lineHeight: 13, fontWeight: "400", fontVariant: ["tabular-nums"] },
    chartBar: {
      width: "100%",
      maxWidth: 32,
      borderTopLeftRadius: 6,
      borderTopRightRadius: 6,
      borderBottomLeftRadius: 2,
      borderBottomRightRadius: 2,
    },
    chartLabel: { fontSize: 12, lineHeight: 17 },
    planRow: {
      marginTop: 12,
      minHeight: 64,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: radius.card,
      backgroundColor: theme.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      ...raisedRing(theme),
    },
    planTitle: { color: theme.text, fontSize: 15, lineHeight: 21 },
    planSub: { color: theme.muted, fontSize: 12, lineHeight: 17 },
  });
}
