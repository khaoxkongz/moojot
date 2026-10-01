import { useMutation, useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Amount, bahtFontSize } from "@/components/ui/controls";
import { HomeIcon } from "@/components/ui/home-icon";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { SpinningCounter } from "@/components/ui/spinning-counter";
import { Text } from "@/components/ui/typography";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/lib/use-app-theme";
import { useAppData } from "@/context/app-data";
import { authClient } from "@/lib/auth-client";
import { categoriesQueryOptions } from "@/features/categories/query-options";
import { entriesMutationOptions } from "@/features/entries/mutation-options";
import { entriesQueryOptions } from "@/features/entries/query-options";
import { PigMascot } from "@/features/home/components/pig-mascot";
import { SlipFlowCards } from "@/features/home/components/slip-flow-cards";
import { TimelineSkeletonRow } from "@/features/home/components/timeline-skeleton";
import { selectedHomePeriod, weekStartForDate, type CalendarPeriod } from "@/features/home/period";
import { homeQueryOptions } from "@/features/home/query-options";
import { planningQueryOptions } from "@/features/planning/query-options";
import { settingsQueryOptions } from "@/features/settings/query-options";
import { homeScan, useHomeScanDisplay } from "@/features/slips/auto-import";
import { photoAccessPrompt } from "@/features/slips/auto-import/photo-access";
import { requestPhotoAccess } from "@/features/slips/library-scan";
import { streakQueryOptions } from "@/features/streak/query-options";
import { computeStreakStats } from "@/features/streak/streak";
import type { StreakSettings } from "@/features/streak/types";
import { WalletFilterSheet } from "@/features/wallets/components/wallet-filter-sheet";
import { emptyWalletOptions, isAllWalletSources, selectAllWalletSources } from "@/features/wallets/filter";
import { walletsQueryOptions } from "@/features/wallets/query-options";
import type { Category, FinanceTransaction, WalletFilterSelection } from "@/types/finance";
import { formatBaht, isValidISODate, kindLabel, thaiDate, todayISO } from "@/utils/format";

const emptyRows: never[] = [];

function subscribeAppState(listener: () => void) {
  const subscription = AppState.addEventListener("change", listener);
  return () => subscription.remove();
}
// `inactive` covers the app switcher, system sheets and the moment the screen locks.
const isAppActive = () => AppState.currentState !== "background" && AppState.currentState !== "inactive";

const defaultStreakSettings: StreakSettings = { mode: "recorded", enabled: true, resetAfter: "" };

function amountLabel(satang: number) {
  return formatBaht(satang, satang % 100 === 0 ? 0 : 2);
}

function latestJotLabel(rows: FinanceTransaction[]) {
  if (!rows.length) return "ยังไม่มีรายการที่จด";
  const latest = rows.reduce((current, row) => (row.createdAt > current ? row.createdAt : current), rows[0].createdAt);
  const date = new Date(latest);
  if (Number.isNaN(date.getTime())) return "มีรายการใหม่แล้ว";
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const when = iso === todayISO() ? "วันนี้" : thaiDate(iso, { day: "numeric", month: "short" });
  return `จดล่าสุด${when} ${date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

function TimelineRow({ item, category }: { item: FinanceTransaction; category?: Category }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const needsCategory = item.kind !== "transfer" && !item.categoryId;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${kindLabel(item.kind)} ${item.title} ${amountLabel(item.amountSatang)} บาท`}
      onPress={() => router.push({ pathname: "/entry/[id]", params: { id: item.id } })}
      style={({ pressed }) => [styles.transaction, { opacity: pressed ? 0.72 : 1 }]}
    >
      {needsCategory ? <View style={styles.uncategorizedCorner} /> : null}
      <View style={styles.categoryCircle}>
        {category ? (
          <Text style={styles.categoryEmoji}>{category.icon}</Text>
        ) : (
          <HomeIcon name="edit" size={22} color={theme.text} />
        )}
      </View>
      <View style={styles.transactionCopy}>
        <Text numberOfLines={1} style={styles.transactionKind}>
          {kindLabel(item.kind)}
        </Text>
        <Text numberOfLines={1} style={styles.transactionTitle}>
          {item.title}
        </Text>
      </View>
      <Amount
        selectable
        showBaht={false}
        size={15}
        value={(item.kind === "income" ? "+" : "") + amountLabel(item.amountSatang)}
        color={item.kind === "income" ? theme.success : theme.text}
      />
    </Pressable>
  );
}

function DayGroup({
  date,
  items,
  categories,
  showSkeleton = false,
}: {
  date: string;
  items: FinanceTransaction[];
  categories: Map<string, Category>;
  showSkeleton?: boolean;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const today = date === todayISO();
  const expense = items.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amountSatang, 0);
  const income = items.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amountSatang, 0);
  const total = expense > 0 ? expense : income > 0 ? income : items.reduce((sum, row) => sum + row.amountSatang, 0);
  return (
    <View style={styles.dayGroup}>
      <View style={styles.dayRail}>
        <View style={[styles.dayAccent, { backgroundColor: today ? theme.accent : theme.text }]} />
        <Text style={[styles.dayName, today && { color: theme.accentText }]}>
          {today ? "วันนี้" : thaiDate(date, { weekday: "short" })}
        </Text>
        <Text style={[styles.dayNumber, today && { color: theme.accentText }]}>{Number(date.slice(-2))}</Text>
      </View>
      <View style={styles.dayContents}>
        <View style={styles.daySubtotal}>
          <Text style={styles.daySubtotalTitle}>{expense > 0 ? "รายจ่าย" : income > 0 ? "รายรับ" : "ย้ายเงิน"}</Text>
          <Amount showBaht={false} size={17} value={amountLabel(total)} />
        </View>
        {showSkeleton ? (
          <SkeletonReveal loading={showSkeleton} skeleton={<TimelineSkeletonRow />}>
            {items[0] ? (
              <TimelineRow key={items[0].id} item={items[0]} category={categories.get(items[0].categoryId ?? "")} />
            ) : (
              <TimelineSkeletonRow />
            )}
          </SkeletonReveal>
        ) : null}
        {(showSkeleton && items.length > 0 ? items.slice(1) : items).map((item) => (
          <TimelineRow key={item.id} item={item} category={categories.get(item.categoryId ?? "")} />
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { deletedId } = useLocalSearchParams<{ deletedId?: string }>();

  const { appliedWalletFilter, setAppliedWalletFilter } = useAppData();
  const { data: session } = authClient.useSession();
  const accountId = session?.user.id ?? null;
  const sessionId = session?.session.id ?? null;
  const slipScan = useHomeScanDisplay();
  const appActive = useSyncExternalStore(subscribeAppState, isAppActive);

  const handledUndoId = useRef<string | null>(null);

  const [undoId, setUndoId] = useState<string | null>(null);
  const [undoBusy, setUndoBusy] = useState(false);
  const [undoError, setUndoError] = useState<string | null>(null);
  const [dayKey, setDayKey] = useState(todayISO());
  const [periodSelection, setPeriodSelection] = useState<{
    signature: string | null;
    offset: number;
  }>({
    signature: null,
    offset: 0,
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftWalletFilter, setDraftWalletFilter] = useState<WalletFilterSelection>(() =>
    selectAllWalletSources(emptyWalletOptions)
  );
  const [addOpen, setAddOpen] = useState(false);

  const restoreTransactionMutation = useMutation(entriesMutationOptions.restore());

  const monthStartQuery = useQuery({ ...planningQueryOptions.monthStartDay(), enabled: isFocused });
  const modeQuery = useQuery({
    ...settingsQueryOptions.value("calendar_open_period"),
    enabled: isFocused,
  });
  const weekStartQuery = useQuery({
    ...settingsQueryOptions.value("calendar_week_start"),
    enabled: isFocused,
  });
  const anchorQuery = useQuery({
    ...settingsQueryOptions.value("calendar_fortnight_anchor"),
    enabled: isFocused,
  });

  const calendarReady = [monthStartQuery, modeQuery, weekStartQuery, anchorQuery].every(
    (query) => query.data !== undefined
  );
  const periodMode: CalendarPeriod =
    modeQuery.data === "week" || modeQuery.data === "fortnight" ? modeQuery.data : "month";
  const parsedWeekStart = Number(weekStartQuery.data);
  const weekStart =
    weekStartQuery.data !== null && Number.isInteger(parsedWeekStart) && parsedWeekStart >= 0 && parsedWeekStart <= 6
      ? parsedWeekStart
      : 0;
  const fortnightAnchor =
    anchorQuery.data && isValidISODate(anchorQuery.data) ? anchorQuery.data : weekStartForDate(dayKey, weekStart);
  const signature =
    periodMode === "month"
      ? `${periodMode}:${monthStartQuery.data}`
      : periodMode === "week"
        ? `${periodMode}:${weekStart}`
        : `${periodMode}:${fortnightAnchor}`;
  if (calendarReady && periodSelection.signature !== signature) {
    setPeriodSelection({ signature, offset: 0 });
  }
  const offset = periodSelection.signature === signature ? periodSelection.offset : 0;
  const period = selectedHomePeriod(dayKey, offset, periodMode, monthStartQuery.data ?? 1, weekStart, fortnightAnchor);
  const periodLabel = period.label;

  const transactionsQuery = useQuery({
    ...entriesQueryOptions.list({
      from: period.from,
      to: period.to,
      limit: 1000,
      walletFilter: appliedWalletFilter ?? undefined,
    }),
    enabled: isFocused && calendarReady,
  });
  const categoriesQuery = useQuery({ ...categoriesQueryOptions.list(), enabled: isFocused });
  const summaryQuery = useQuery({
    ...homeQueryOptions.periodSummary(period.from, period.to, appliedWalletFilter ?? undefined),
    enabled: isFocused && calendarReady,
  });
  const todayQuery = useQuery({
    ...entriesQueryOptions.list({ from: dayKey, to: dayKey, limit: 1000 }),
    enabled: isFocused,
  });
  const recentQuery = useQuery({
    ...entriesQueryOptions.list({ limit: 1000 }),
    enabled: isFocused,
  });
  const activityQuery = useQuery({
    ...streakQueryOptions.dailyActivity(dayKey),
    enabled: isFocused,
  });
  const streakSettingsQuery = useQuery({ ...streakQueryOptions.settings(), enabled: isFocused });
  const walletOptionsQuery = useQuery({
    ...walletsQueryOptions.filterOptions(),
    enabled: isFocused,
  });

  const dataQueries = [
    monthStartQuery,
    modeQuery,
    weekStartQuery,
    anchorQuery,
    transactionsQuery,
    categoriesQuery,
    summaryQuery,
    todayQuery,
    recentQuery,
    activityQuery,
    streakSettingsQuery,
    walletOptionsQuery,
  ];
  const firstError = dataQueries.find((query) => query.data === undefined && query.error)?.error;
  const error = firstError?.message ?? null;
  const loading = !error && dataQueries.some((query) => query.data === undefined);
  const refreshError = dataQueries.find((query) => query.data !== undefined && query.error)?.error;
  const transactions = transactionsQuery.data ?? emptyRows;
  const categories = categoriesQuery.data ?? emptyRows;
  const summary = summaryQuery.data;
  const todayTransactions = todayQuery.data ?? emptyRows;
  const recentTransactions = recentQuery.data ?? emptyRows;
  const dailyActivity = activityQuery.data ?? emptyRows;
  const streakSettings = streakSettingsQuery.data ?? defaultStreakSettings;
  const walletOptions = walletOptionsQuery.data ?? emptyWalletOptions;

  useEffect(() => {
    if (!deletedId) {
      handledUndoId.current = null;
      return;
    }
    if (deletedId !== handledUndoId.current) {
      setUndoId(deletedId);
      setUndoError(null);
    }
  }, [deletedId]);

  const undoDelete = async () => {
    if (!undoId || undoBusy) return;
    setUndoBusy(true);
    setUndoError(null);
    try {
      const restored = await restoreTransactionMutation.mutateAsync({ id: undoId });
      if (!restored) throw new Error("ไม่พบรายการที่ลบ");
      handledUndoId.current = undoId;
      setUndoId(null);
      router.setParams({ deletedId: undefined });
    } catch (cause) {
      setUndoError(cause instanceof Error ? cause.message : "นำรายการกลับมาไม่ได้");
    } finally {
      setUndoBusy(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setDayKey(todayISO()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Reads while Home is in front of the active app, including after returning from a bank app, Settings or the lock
  // screen, and pauses otherwise. Each round checks the photo permission again.
  useEffect(() => {
    void homeScan.update({ accountId, sessionId, focused: isFocused, appActive });
  }, [accountId, sessionId, isFocused, appActive]);
  useEffect(() => () => homeScan.leave(), []);

  const photoPrompt = photoAccessPrompt(slipScan.access);
  const allowPhotoAccess = async () => {
    try {
      if (photoPrompt?.action === "settings") {
        await Linking.openSettings();
        return;
      }
      const access = await requestPhotoAccess();
      const round = await homeScan.recheck();
      // The prompt's return to the app can start a round before the answer is recorded; read again with the answer.
      if (access === "all" && round?.status === "no-access") void homeScan.recheck();
    } catch (cause) {
      console.warn("[photo-access]", cause instanceof Error ? cause.name : typeof cause);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, FinanceTransaction[]>();
    for (const item of transactions) map.set(item.occurredOn, [...(map.get(item.occurredOn) ?? []), item]);
    return [...map.entries()];
  }, [transactions]);
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const todayActivity = dailyActivity.find((day) => day.date === dayKey);
  const autoToday = todayTransactions.filter((item) => item.source === "slip" || item.source === "statement").length;
  const pendingToday = todayActivity?.pendingCategoryCount ?? 0;
  const streak = useMemo(
    () => computeStreakStats(dailyActivity, dayKey, streakSettings).current,
    [dailyActivity, dayKey, streakSettings]
  );

  const openWalletFilter = async () => {
    setAddOpen(false);
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

  const refetchHome = () => {
    for (const query of dataQueries) if (query.isEnabled) void query.refetch();
  };
  // Only a released pull refreshes. iOS reports the refresh point while the finger is still down, so the drag events
  // tell a held pull from a released one there; Android reports it on release.
  const onRefresh = () => {
    if (homeScan.pullReady()) refetchHome();
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={process.env.EXPO_OS === "ios" ? () => homeScan.pullStart() : undefined}
        onScrollEndDrag={
          process.env.EXPO_OS === "ios"
            ? (event) => {
                if (homeScan.pullEnd(-event.nativeEvent.contentOffset.y)) refetchHome();
              }
            : undefined
        }
        refreshControl={
          // Home shows reading and the pull itself; the native indicator never stays open.
          <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor="transparent" colors={["transparent"]} />
        }
        contentContainerStyle={{ paddingTop: Math.max(insets.top + 12, 28), paddingBottom: 145 }}
      >
        <View style={styles.content}>
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={streakSettings.enabled ? `ดูสถิติแครอตสตรีค ${streak} วัน` : "ดูสถิติแครอตสตรีคที่ปิดอยู่"}
              onPress={() => router.push("/streak-stats")}
              style={styles.streakPill}
            >
              <Image
                source={require("../../../assets/generated/carrot-reward.png")}
                contentFit="contain"
                accessibilityLabel="แครอตของน้องหมู"
                style={{ width: 27, height: 27 }}
              />
              <Text style={styles.streakText}>{streakSettings.enabled ? `${streak} วัน` : "ปิดการนับ"}</Text>
            </Pressable>
            <View style={styles.topActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="ค้นหารายการ"
                onPress={() => router.push("/search")}
                style={styles.topAction}
              >
                <HomeIcon name="search" color={theme.text} size={25} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="กรองรายการ"
                onPress={() => {
                  void openWalletFilter();
                }}
                style={[styles.topAction, (filterOpen || appliedWalletFilter) && styles.topActionFiltered]}
              >
                <HomeIcon name="wallet" color={theme.text} size={25} />
              </Pressable>
            </View>
          </View>
          {appliedWalletFilter ? (
            <View style={styles.activeFilter}>
              <HomeIcon name="filter" size={16} color={theme.accentText} />
              <Text style={styles.activeFilterText}>กำลังแสดง {transactions.length} รายการจากตัวกรอง</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="ล้างตัวกรอง"
                onPress={() => setAppliedWalletFilter(null)}
              >
                <Text style={styles.clearFilter}>ล้าง</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.speechBubble}>
            {slipScan.reading ? (
              <>
                <Text style={styles.speechTitle}>หมูกำลังอ่านสลิปใหม่</Text>
                <Text style={styles.speechBody}>เปิดแอปไว้ก่อนน้า</Text>
              </>
            ) : (
              <>
                <Text style={styles.speechTitle}>
                  {autoToday > 0 ? `วันนี้หมูจดให้ ${autoToday} รายการ` : "วันนี้หมูพร้อมช่วยจด"}
                </Text>
                <Text style={styles.speechBody}>
                  {photoPrompt
                    ? photoPrompt.message
                    : pendingToday > 0
                      ? `มี ${pendingToday} รายการรอเลือกหมวด`
                      : (todayActivity?.transactionCount ?? 0) > 0
                        ? "วันนี้เลือกหมวดครบแล้ว"
                        : slipScan.access === "unsupported"
                          ? "แตะ “จดเพิ่ม” เพื่อจดรายการเอง"
                          : "หมูอ่านสลิปใหม่ให้อัตโนมัติ"}
                </Text>
                {photoPrompt ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityHint={photoPrompt.hint}
                    onPress={() => void allowPhotoAccess()}
                    style={styles.speechLink}
                  >
                    <Text style={styles.speechLinkText}>{photoPrompt.label}</Text>
                    <HomeIcon name="chevronRight" size={17} color={theme.accentText} />
                  </Pressable>
                ) : null}
                {pendingToday > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push("/pending-categories")}
                    style={styles.speechLink}
                  >
                    <Text style={styles.speechLinkText}>เลือกหมวดต่อเนื่อง</Text>
                    <HomeIcon name="chevronRight" size={17} color={theme.accentText} />
                  </Pressable>
                ) : null}
              </>
            )}
            <View style={styles.speechTail} />
          </View>

          {slipScan.animating ? (
            <View style={styles.flowCardSlot}>
              <SlipFlowCards />
            </View>
          ) : (
            <View style={styles.latestRow}>
              <HomeIcon name="clock" size={17} color={theme.muted} />
              <Text style={styles.latestText}>{latestJotLabel(recentTransactions)}</Text>
            </View>
          )}
          <View style={styles.monthCard}>
            <View style={styles.mascot}>
              <PigMascot size={96} />
            </View>
            <View style={styles.monthNav}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  periodMode === "month" ? "เดือนก่อน" : periodMode === "week" ? "สัปดาห์ก่อน" : "ช่วง 2 สัปดาห์ก่อน"
                }
                onPress={() => setPeriodSelection({ signature, offset: offset - 1 })}
                style={styles.monthArrow}
              >
                <HomeIcon name="chevronLeft" color={theme.accentText} size={30} strokeWidth={2.7} />
              </Pressable>
              <HomeIcon name="calendar" color={theme.accentText} size={22} />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[styles.monthLabel, periodMode !== "month" && styles.rangeMonthLabel]}
              >
                {periodLabel}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  periodMode === "month" ? "เดือนถัดไป" : periodMode === "week" ? "สัปดาห์ถัดไป" : "ช่วง 2 สัปดาห์ถัดไป"
                }
                disabled={offset >= 0}
                onPress={() => setPeriodSelection({ signature, offset: offset + 1 })}
                style={[styles.monthArrow, offset >= 0 && { opacity: 0.35 }]}
              >
                <HomeIcon name="chevronRight" color={theme.accentText} size={30} strokeWidth={2.7} />
              </Pressable>
            </View>
            <View style={styles.monthBottom}>
              <View style={{ flex: 1 }}>
                <Text style={styles.monthCaption}>ยอดใช้จ่าย</Text>
                <View style={styles.monthAmountRow}>
                  <SpinningCounter
                    value={formatBaht(summary?.expenseSatang ?? 0)}
                    style={styles.monthAmount}
                    cellHeight={42}
                  />
                  <Text style={styles.monthBaht}> ฿</Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/summary")}
                style={styles.summaryButton}
              >
                <HomeIcon name="chart" color={theme.text} size={22} />
                <Text style={styles.summaryButtonText}>ดูสรุป</Text>
              </Pressable>
            </View>
          </View>

          {refreshError ? (
            <Text selectable style={styles.errorText}>
              {refreshError.message}
            </Text>
          ) : null}
          {loading ? (
            <ActivityIndicator color={theme.accentText} style={styles.loading} />
          ) : error ? (
            <View style={styles.messagePanel}>
              <Text selectable style={styles.errorText}>
                {error}
              </Text>
              <Pressable
                onPress={() => {
                  for (const query of dataQueries) if (query.isEnabled) void query.refetch();
                }}
              >
                <Text style={styles.errorText}>ลองอีกครั้ง</Text>
              </Pressable>
            </View>
          ) : slipScan.reading && grouped.length === 0 ? (
            <View style={styles.dayGroup}>
              <View style={styles.dayRail}>
                <View style={[styles.dayAccent, { backgroundColor: theme.accent }]} />
                <Text style={[styles.dayName, { color: theme.accentText }]}>วันนี้</Text>
                <Text style={[styles.dayNumber, { color: theme.accentText }]}>{new Date().getDate()}</Text>
              </View>
              <View style={styles.dayContents}>
                <TimelineSkeletonRow />
              </View>
            </View>
          ) : grouped.length === 0 ? (
            <View style={styles.messagePanel}>
              <Text style={styles.emptyTitle}>
                {appliedWalletFilter
                  ? "ไม่พบรายการจากตัวกรองนี้"
                  : periodMode === "month"
                    ? "ยังไม่มีรายการในเดือนนี้"
                    : periodMode === "week"
                      ? offset === 0
                        ? "ยังไม่มีรายการในสัปดาห์นี้"
                        : "ยังไม่มีรายการในสัปดาห์ที่เลือก"
                      : offset === 0
                        ? "ยังไม่มีรายการในช่วง 2 สัปดาห์นี้"
                        : "ยังไม่มีรายการในช่วง 2 สัปดาห์ที่เลือก"}
              </Text>
              <Text style={styles.emptyBody}>
                {appliedWalletFilter ? "ลองเลือกบัญชี บัตร หรือรายการอื่นเพิ่มเติม" : "แตะ “จดเพิ่ม” เพื่อเริ่มบันทึกรายรับรายจ่าย"}
              </Text>
            </View>
          ) : (
            grouped.map(([date, items], index) => (
              <DayGroup
                key={date}
                date={date}
                items={items}
                categories={categoryById}
                showSkeleton={slipScan.reading && index === 0}
              />
            ))
          )}
        </View>
      </ScrollView>
      <WalletFilterSheet
        visible={filterOpen}
        options={walletOptions}
        value={draftWalletFilter}
        onChange={setDraftWalletFilter}
        onApply={applyWalletFilter}
        onClose={() => setFilterOpen(false)}
      />
      {undoId ? (
        <View accessibilityLiveRegion="polite" style={[styles.undoToast, addOpen && styles.undoToastRaised]}>
          <Text style={styles.undoToastText}>{undoError ?? "ลบรายการแล้ว"}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="เอารายการที่ลบกลับมา"
            disabled={undoBusy}
            onPress={() => {
              void undoDelete();
            }}
            hitSlop={12}
            style={styles.undoAction}
          >
            <Text style={styles.undoActionText}>{undoBusy ? "กำลังกู้คืน…" : "เอากลับมา"}</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.floatingWrap}>
        {addOpen ? (
          <View style={styles.addMenu}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setAddOpen(false);
                router.push("/entry");
              }}
              style={styles.addOption}
            >
              <HomeIcon name="edit" color={theme.accentText} size={20} />
              <Text style={styles.addOptionText}>จดรายการเอง</Text>
            </Pressable>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={addOpen ? "ปิดเมนูจดเพิ่ม" : "จดเพิ่ม"}
          onPress={() => setAddOpen((value) => !value)}
          style={({ pressed }) => [styles.addButton, { opacity: pressed ? 0.84 : 1 }]}
        >
          <HomeIcon name={addOpen ? "chevronUp" : "plus"} color={theme.onAccent} size={26} strokeWidth={2.8} />
          <Text style={styles.addButtonText}>{addOpen ? "ปิดเมนู" : "จดเพิ่ม"}</Text>
          <View style={styles.addDivider} />
          <HomeIcon name="chevronUp" color={theme.onAccent} size={23} strokeWidth={2.8} />
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    content: { width: "100%", maxWidth: 680, alignSelf: "center" },
    topBar: {
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    streakPill: {
      height: 43,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: theme.raised,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    streakEmoji: { fontSize: 24 },
    streakText: { color: theme.text, fontSize: 17, fontWeight: "800" },
    topActions: { flexDirection: "row", gap: 9 },
    topAction: {
      width: 43,
      height: 43,
      borderRadius: 24,
      backgroundColor: theme.raised,
      alignItems: "center",
      justifyContent: "center",
    },
    topActionFiltered: { borderWidth: 2, borderColor: theme.accent },
    activeFilter: {
      marginHorizontal: 16,
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    activeFilterText: { color: theme.text, flex: 1, fontSize: 12 },
    clearFilter: { color: theme.accentText, fontSize: 12, fontWeight: "800" },
    speechBubble: {
      marginTop: 23,
      marginLeft: 58,
      marginRight: 16,
      paddingHorizontal: 17,
      paddingVertical: 17,
      minHeight: 108,
      borderRadius: 19,
      backgroundColor: theme.raised,
    },
    speechTitle: { color: theme.text, fontSize: 18, fontWeight: "900" },
    speechBody: { color: theme.accentText, fontSize: 14, marginTop: 4, fontWeight: "600" },
    speechLink: {
      alignSelf: "flex-start",
      marginTop: 11,
      flexDirection: "row",
      gap: 3,
      alignItems: "center",
    },
    speechLinkText: { color: theme.accentText, fontSize: 14, fontWeight: "800" },
    speechTail: {
      position: "absolute",
      right: 60,
      bottom: -13,
      width: 0,
      height: 0,
      borderLeftWidth: 13,
      borderLeftColor: "transparent",
      borderTopWidth: 14,
      borderTopColor: theme.raised,
    },
    flowCardSlot: {
      marginLeft: 58,
      marginRight: 16,
      marginTop: 10,
      marginBottom: 8,
      height: 70,
      justifyContent: "center",
      alignItems: "center",
    },
    latestRow: {
      marginLeft: 58,
      marginRight: 16,
      marginTop: 68,
      marginBottom: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    latestText: { color: theme.muted, fontSize: 12 },
    monthCard: {
      marginLeft: 58,
      minHeight: 156,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      backgroundColor: theme.accent,
      paddingHorizontal: 17,
      paddingTop: 13,
      paddingBottom: 17,
    },
    mascot: { position: "absolute", right: 18, top: -65, zIndex: 2 },
    monthNav: { flexDirection: "row", alignItems: "center", gap: 9, paddingRight: 6 },
    monthArrow: { width: 24, height: 34, justifyContent: "center" },
    monthLabel: { color: theme.onAccent, fontSize: 17, fontWeight: "900", flexShrink: 1 },
    rangeMonthLabel: { fontSize: 13 },
    monthBottom: { marginTop: 19, flexDirection: "row", alignItems: "flex-end", gap: 8 },
    monthCaption: { color: theme.onAccent, fontSize: 13 },
    monthAmountRow: { flexDirection: "row", alignItems: "flex-end" },
    monthBaht: {
      color: theme.onAccent,
      fontSize: bahtFontSize(36),
      fontWeight: "400",
      fontVariant: ["tabular-nums"],
      marginBottom: 5,
    },
    monthAmount: {
      color: theme.onAccent,
      fontSize: 36,
      fontWeight: "500",
      letterSpacing: -0.3,
      fontVariant: ["tabular-nums"],
    },
    summaryButton: {
      paddingHorizontal: 13,
      height: 42,
      borderRadius: 25,
      backgroundColor: theme.accent,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    summaryButtonText: { color: theme.onAccent, fontSize: 14, fontWeight: "900" },
    dayGroup: { flexDirection: "row", backgroundColor: theme.background, marginBottom: 8 },
    dayRail: { width: 58, paddingTop: 17, alignItems: "center", backgroundColor: theme.background },
    dayAccent: { position: "absolute", top: 0, left: 0, width: 4, height: 76 },
    dayName: { color: theme.text, fontSize: 13 },
    dayNumber: { color: theme.text, fontSize: 21, fontWeight: "800", marginTop: 2 },
    dayContents: { flex: 1 },
    daySubtotal: {
      height: 76,
      backgroundColor: theme.raised,
      alignItems: "flex-end",
      justifyContent: "center",
      paddingRight: 17,
    },
    daySubtotalTitle: { color: theme.muted, fontSize: 13 },
    transaction: {
      minHeight: 86,
      backgroundColor: theme.surface,
      paddingLeft: 18,
      paddingRight: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      overflow: "hidden",
    },
    uncategorizedCorner: {
      position: "absolute",
      top: 0,
      left: 0,
      width: 0,
      height: 0,
      borderTopWidth: 15,
      borderRightWidth: 15,
      borderTopColor: theme.accentText,
      borderRightColor: "transparent",
    },
    categoryCircle: {
      width: 37,
      height: 37,
      borderRadius: 21,
      backgroundColor: theme.raised,
      alignItems: "center",
      justifyContent: "center",
    },
    categoryEmoji: { fontSize: 19 },
    transactionCopy: { flex: 1, minWidth: 0, gap: 2 },
    transactionKind: { color: theme.text, fontSize: 16, fontWeight: "900" },
    transactionTitle: { color: theme.text, fontSize: 14 },
    loading: { marginTop: 35 },
    messagePanel: {
      marginLeft: 58,
      marginTop: 8,
      marginRight: 16,
      padding: 21,
      borderRadius: 15,
      backgroundColor: theme.raised,
      gap: 4,
    },
    errorText: { color: theme.danger, fontSize: 13 },
    emptyTitle: { color: theme.text, fontSize: 16, fontWeight: "800" },
    emptyBody: { color: theme.muted, fontSize: 12, lineHeight: 18 },
    floatingWrap: { position: "absolute", bottom: 17, right: 16, alignItems: "flex-end", gap: 9 },
    addMenu: {
      backgroundColor: theme.text,
      borderRadius: 17,
      paddingVertical: 5,
      minWidth: 190,
      shadowColor: theme.text,
      shadowOpacity: 0.18,
      shadowRadius: 18,
      elevation: 8,
    },
    addOption: {
      minHeight: 46,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    addOptionText: { color: theme.background, fontSize: 14, fontWeight: "800" },
    addButton: {
      backgroundColor: theme.accent,
      borderRadius: 32,
      minWidth: 158,
      height: 55,
      paddingHorizontal: 17,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
      shadowColor: theme.text,
      shadowOpacity: 0.22,
      shadowRadius: 12,
      elevation: 8,
    },
    addButtonText: { color: theme.onAccent, fontSize: 19, fontWeight: "900" },
    addDivider: {
      width: 1,
      height: 25,
      backgroundColor: theme.onAccent,
      opacity: 0.4,
      marginHorizontal: 1,
    },
    undoToast: {
      position: "absolute",
      bottom: 84,
      left: 16,
      right: 16,
      minHeight: 54,
      maxWidth: 648,
      alignSelf: "center",
      borderRadius: 11,
      borderWidth: 1,
      borderColor: theme.muted,
      backgroundColor: theme.raised,
      paddingHorizontal: 17,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      zIndex: 5,
      shadowColor: theme.text,
      shadowOpacity: 0.17,
      shadowRadius: 8,
      elevation: 7,
    },
    undoToastRaised: { bottom: 236 },
    undoToastText: { color: theme.text, fontSize: 15, flex: 1 },
    undoAction: { paddingVertical: 10, paddingLeft: 8 },
    undoActionText: { color: theme.accentText, fontSize: 15, fontWeight: "800" },
  });
}
