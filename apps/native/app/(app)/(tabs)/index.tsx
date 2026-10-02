import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, useIsFocused } from "expo-router";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
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

import { bahtFontSize } from "@/components/ui/controls";
import { HomeIcon } from "@/components/ui/home-icon";
import { SpinningCounter } from "@/components/ui/spinning-counter";
import { Text } from "@/components/ui/typography";
import { accentRing, radius, shadow, touch, type AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/lib/use-app-theme";
import { useAppData } from "@/context/app-data";
import { authClient } from "@/lib/auth-client";
import { categoriesQueryOptions } from "@/features/categories/query-options";
import { entriesQueryOptions } from "@/features/entries/query-options";
import { PigMascot } from "@/features/home/components/pig-mascot";
import { SlipFlowCards } from "@/features/home/components/slip-flow-cards";
import { TimelineSkeletonRow } from "@/features/home/components/timeline-skeleton";
import { needsCategory } from "@/features/entries/category-queue";
import {
  dayLabel,
  homeDays,
  homeSpeech,
  latestJotLabel,
  sumOf,
  type HomeDay,
  type HomeRow,
} from "@/features/home/home-days";
import { selectedHomePeriod, weekStartForDate, type CalendarPeriod } from "@/features/home/period";
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
import type { WalletFilterSelection } from "@/types/finance";
import { formatBaht, isValidISODate, todayISO } from "@/utils/format";

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

function DayRow({ row, divider }: { row: HomeRow; divider: boolean }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const income = row.entry.kind === "income";
  const amount = (income ? "+" : "") + amountLabel(row.entry.amountSatang);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.title} ${amount} บาท ${row.meta}${row.isNew ? " ใหม่" : ""}`}
      accessibilityHint={row.pending ? "เลือกหมวดของรายการนี้" : "แก้ไขรายการนี้"}
      onPress={() =>
        row.pending
          ? router.push({ pathname: "/pending-categories", params: { ids: row.id } })
          : router.push({ pathname: "/entry/[id]", params: { id: row.id } })
      }
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.raised }]}
    >
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
        <View style={styles.rowTitleLine}>
          <Text numberOfLines={1} style={styles.rowTitle}>
            {row.title}
          </Text>
          {row.isNew ? (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>ใหม่</Text>
            </View>
          ) : null}
        </View>
        <Text numberOfLines={1} style={[styles.rowMeta, row.pending && { color: theme.accentText }]}>
          {row.meta}
        </Text>
      </View>
      <Text selectable style={[styles.rowAmount, income && { color: theme.success }]}>
        {amount}
      </Text>
    </Pressable>
  );
}

function DayGroup({ day, reading }: { day: HomeDay; reading: boolean }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const skeleton = reading && day.isToday;
  return (
    <View>
      <View style={styles.dayHeader}>
        {day.isToday ? (
          <View style={styles.dayToday}>
            <Text style={styles.todayLabel}>วันนี้</Text>
            <Text style={styles.dayMuted}>{day.label}</Text>
          </View>
        ) : (
          <Text style={styles.dayLabel}>{day.label}</Text>
        )}
        <Text style={styles.dayMuted}>
          {day.totalLabel} <Text style={styles.dayNumber}>{amountLabel(day.totalSatang)}</Text>
        </Text>
      </View>
      <View style={styles.dayCard}>
        {skeleton ? <TimelineSkeletonRow /> : null}
        {day.rows.map((row, index) => (
          <DayRow key={row.id} row={row} divider={index > 0 || skeleton} />
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

  const { appliedWalletFilter, setAppliedWalletFilter } = useAppData();
  const { data: session } = authClient.useSession();
  const accountId = session?.user.id ?? null;
  const sessionId = session?.session.id ?? null;
  const slipScan = useHomeScanDisplay();
  const appActive = useSyncExternalStore(subscribeAppState, isAppActive);

  const [dayKey, setDayKey] = useState(todayISO());
  const [periodSelection, setPeriodSelection] = useState<{ signature: string | null; offset: number }>({
    signature: null,
    offset: 0,
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftWalletFilter, setDraftWalletFilter] = useState<WalletFilterSelection>(() =>
    selectAllWalletSources(emptyWalletOptions)
  );

  const monthStartQuery = useQuery({ ...planningQueryOptions.monthStartDay(), enabled: isFocused });
  const modeQuery = useQuery({ ...settingsQueryOptions.value("calendar_open_period"), enabled: isFocused });
  const weekStartQuery = useQuery({ ...settingsQueryOptions.value("calendar_week_start"), enabled: isFocused });
  const anchorQuery = useQuery({ ...settingsQueryOptions.value("calendar_fortnight_anchor"), enabled: isFocused });

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
  // A changed calendar setting starts again from the current period.
  if (calendarReady && periodSelection.signature !== signature) {
    setPeriodSelection({ signature, offset: 0 });
  }
  const offset = periodSelection.signature === signature ? periodSelection.offset : 0;
  const period = selectedHomePeriod(dayKey, offset, periodMode, {
    monthStartDay: monthStartQuery.data ?? 1,
    weekStart,
    fortnightAnchor,
  });

  // Every entry of the period, all pages: day totals, the hero and the filter count are never cut at one page.
  const periodQuery = useQuery({
    ...entriesQueryOptions.all({ from: period.from, to: period.to, walletFilter: appliedWalletFilter ?? undefined }),
    enabled: isFocused && calendarReady,
  });
  const todayQuery = useQuery({ ...entriesQueryOptions.all({ from: dayKey, to: dayKey }), enabled: isFocused });
  const latestQuery = useQuery({ ...entriesQueryOptions.list({ sort: "recorded", limit: 1 }), enabled: isFocused });
  const categoriesQuery = useQuery({ ...categoriesQueryOptions.list(), enabled: isFocused });
  const activityQuery = useQuery({ ...streakQueryOptions.dailyActivity(dayKey), enabled: isFocused });
  const streakSettingsQuery = useQuery({ ...streakQueryOptions.settings(), enabled: isFocused });
  const walletOptionsQuery = useQuery({ ...walletsQueryOptions.filterOptions(), enabled: isFocused });

  const dataQueries = [
    monthStartQuery,
    modeQuery,
    weekStartQuery,
    anchorQuery,
    periodQuery,
    todayQuery,
    latestQuery,
    categoriesQuery,
    activityQuery,
    streakSettingsQuery,
    walletOptionsQuery,
  ];
  const error = dataQueries.find((query) => query.data === undefined && query.error)?.error ?? null;
  const loading = !error && dataQueries.some((query) => query.data === undefined);
  const refreshError = dataQueries.find((query) => query.data !== undefined && query.error)?.error;
  const entries = periodQuery.data ?? emptyRows;
  const todayEntries = todayQuery.data ?? emptyRows;
  const categories = categoriesQuery.data ?? emptyRows;
  const dailyActivity = activityQuery.data ?? emptyRows;
  const streakSettings = streakSettingsQuery.data ?? defaultStreakSettings;
  const walletOptions = walletOptionsQuery.data ?? emptyWalletOptions;

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

  const days = useMemo(() => {
    const grouped = homeDays(entries, { today: dayKey, categories });
    // While a slip is read, today's card shows a placeholder row even before today has entries.
    const todayInPeriod = dayKey >= period.from && dayKey <= period.to;
    if (!slipScan.reading || !todayInPeriod || grouped.some((day) => day.isToday)) return grouped;
    const today: HomeDay = {
      date: dayKey,
      isToday: true,
      label: dayLabel(dayKey),
      rows: [],
      totalLabel: "รายจ่าย",
      totalSatang: 0,
    };
    return [today, ...grouped];
  }, [entries, dayKey, categories, slipScan.reading, period.from, period.to]);
  const expenseSatang = sumOf(entries, "expense");
  // The link and its queue cover what Home shows: every pending entry of the viewed period under the applied filter.
  const pendingIds = useMemo(() => entries.filter(needsCategory).map((row) => row.id), [entries]);
  const speech = homeSpeech({
    reading: slipScan.reading,
    photoMessage: photoPrompt?.message ?? null,
    autoToday: todayEntries.filter((row) => row.source === "slip" || row.source === "statement").length,
    pendingInView: pendingIds.length,
    pendingToday: todayEntries.filter(needsCategory).length,
    todayCount: todayEntries.length,
    canRead: slipScan.access !== "unsupported",
  });
  const streak = useMemo(
    () => computeStreakStats(dailyActivity, dayKey, streakSettings).current,
    [dailyActivity, dayKey, streakSettings]
  );

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

  const refetchHome = () => {
    for (const query of dataQueries) if (query.isEnabled) void query.refetch();
  };
  // Only a released pull refreshes. iOS reports the refresh point while the finger is still down, so the drag events
  // tell a held pull from a released one there; Android reports it on release.
  const onRefresh = () => {
    if (homeScan.pullReady()) refetchHome();
  };

  const emptyTitle = appliedWalletFilter
    ? "ไม่พบรายการจากตัวกรองนี้"
    : periodMode === "month"
      ? offset === 0
        ? "ยังไม่มีรายการในเดือนนี้"
        : "ยังไม่มีรายการในเดือนที่เลือก"
      : periodMode === "week"
        ? offset === 0
          ? "ยังไม่มีรายการในสัปดาห์นี้"
          : "ยังไม่มีรายการในสัปดาห์ที่เลือก"
        : offset === 0
          ? "ยังไม่มีรายการในช่วง 2 สัปดาห์นี้"
          : "ยังไม่มีรายการในช่วง 2 สัปดาห์ที่เลือก";

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
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 110 }}
      >
        <View style={styles.content}>
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={streakSettings.enabled ? `ดูสถิติแครอตสตรีค ${streak} วัน` : "ดูสถิติแครอตสตรีคที่ปิดอยู่"}
              onPress={() => router.push("/streak-stats")}
              style={({ pressed }) => [styles.streakChip, pressed && { opacity: 0.72 }]}
            >
              <Image
                source={require("../../../assets/generated/carrot-reward.png")}
                contentFit="contain"
                accessible={false}
                style={{ width: 26, height: 26 }}
              />
              <Text style={styles.streakText}>{streakSettings.enabled ? `${streak} วัน` : "ปิดอยู่"}</Text>
            </Pressable>
            <View style={styles.topActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="ค้นหารายการ"
                onPress={() => router.push("/search")}
                style={({ pressed }) => [styles.topAction, pressed && { opacity: 0.72 }]}
              >
                <HomeIcon name="search" color={theme.text} size={21} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="กรองรายการ"
                accessibilityState={{ selected: Boolean(appliedWalletFilter) }}
                onPress={() => void openWalletFilter()}
                style={({ pressed }) => [
                  styles.topAction,
                  (filterOpen || appliedWalletFilter) && accentRing(theme),
                  pressed && { opacity: 0.72 },
                ]}
              >
                <HomeIcon name="wallet" color={theme.text} size={21} />
              </Pressable>
            </View>
          </View>
          {appliedWalletFilter ? (
            <View style={styles.filterNotice}>
              <HomeIcon name="filter" size={16} color={theme.accentText} />
              <Text style={styles.filterNoticeText}>
                {periodQuery.data ? `กำลังแสดง ${entries.length} รายการจากตัวกรอง` : "กำลังกรองรายการ"}
              </Text>
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

          <View style={styles.speech}>
            <PigMascot size={72} />
            <View style={styles.speechCopy}>
              <Text style={styles.speechTitle}>{speech.title}</Text>
              {speech.body ? <Text style={styles.speechBody}>{speech.body}</Text> : null}
              {!slipScan.reading && photoPrompt ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityHint={photoPrompt.hint}
                  onPress={() => void allowPhotoAccess()}
                  style={styles.speechLink}
                >
                  <Text style={styles.speechLinkText}>{photoPrompt.label}</Text>
                  <HomeIcon name="chevronRight" size={15} strokeWidth={2.2} color={theme.accentText} />
                </Pressable>
              ) : null}
              {!slipScan.reading && pendingIds.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({ pathname: "/pending-categories", params: { ids: pendingIds.join(",") } })
                  }
                  style={styles.speechLink}
                >
                  <Text style={styles.speechLinkText}>มี {pendingIds.length} รายการรอเลือกหมวด</Text>
                  <HomeIcon name="chevronRight" size={15} strokeWidth={2.2} color={theme.accentText} />
                </Pressable>
              ) : null}
            </View>
          </View>

          {slipScan.animating ? (
            <View style={styles.flowCards}>
              <SlipFlowCards />
            </View>
          ) : null}

          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <View style={styles.periodNav}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={period.previousLabel}
                  onPress={() => setPeriodSelection({ signature, offset: offset - 1 })}
                  style={({ pressed }) => [styles.periodArrow, pressed && { opacity: 0.6 }]}
                >
                  <HomeIcon name="chevronLeft" color={theme.onAccent} size={20} strokeWidth={2.2} />
                </Pressable>
                <Text numberOfLines={1} style={styles.periodLabel}>
                  {period.label}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={period.nextLabel}
                  accessibilityState={{ disabled: period.isCurrent }}
                  disabled={period.isCurrent}
                  onPress={() => setPeriodSelection({ signature, offset: Math.min(0, offset + 1) })}
                  style={({ pressed }) => [
                    styles.periodArrow,
                    { opacity: period.isCurrent ? 0.35 : pressed ? 0.6 : 1 },
                  ]}
                >
                  <HomeIcon name="chevronRight" color={theme.onAccent} size={20} strokeWidth={2.2} />
                </Pressable>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="ดูสรุป"
                onPress={() => router.push({ pathname: "/summary", params: { date: period.summaryDate } })}
                style={({ pressed }) => [styles.summaryButton, pressed && { opacity: 0.72 }]}
              >
                <View style={styles.summaryPill}>
                  <HomeIcon name="chart" color={theme.onAccent} size={16} />
                  <Text style={styles.summaryText}>ดูสรุป</Text>
                </View>
              </Pressable>
            </View>
            <Text style={styles.heroCaption}>{period.caption}</Text>
            {/* Until the period's entries are read the total is unknown, not 0. */}
            <View
              accessible
              accessibilityLabel={
                periodQuery.data ? `${period.caption} ${formatBaht(expenseSatang)} บาท` : `${period.caption} ยังไม่ทราบ`
              }
              style={styles.heroAmountRow}
            >
              {periodQuery.data ? (
                <SpinningCounter value={formatBaht(expenseSatang)} style={styles.heroAmount} cellHeight={42} />
              ) : (
                <Text style={styles.heroAmount}>–</Text>
              )}
              <Text style={styles.heroBaht}>฿</Text>
            </View>
          </View>

          <View style={styles.latestRow}>
            <HomeIcon name="clock" size={14} color={theme.muted} />
            <Text style={styles.latestText}>{latestJotLabel(latestQuery.data?.[0]?.createdAt ?? null, dayKey)}</Text>
          </View>

          {refreshError && !error ? (
            <Pressable accessibilityRole="button" onPress={refetchHome} style={styles.refreshErrorRow}>
              <Text style={styles.refreshError}>
                อัปเดตข้อมูลไม่สำเร็จ แสดงข้อมูลที่โหลดไว้ล่าสุด <Text style={styles.retryText}>ลองอีกครั้ง</Text>
              </Text>
            </Pressable>
          ) : null}
          {loading ? (
            <ActivityIndicator accessibilityLabel="กำลังโหลดรายการ" color={theme.accentText} style={styles.loading} />
          ) : error ? (
            <View style={styles.messageCard}>
              <Text style={styles.messageTitle}>โหลดรายการไม่สำเร็จ</Text>
              <Text style={styles.messageBody}>เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง</Text>
              <Pressable accessibilityRole="button" onPress={refetchHome} style={styles.retry}>
                <Text style={styles.retryText}>ลองอีกครั้ง</Text>
              </Pressable>
            </View>
          ) : days.length === 0 ? (
            <View style={styles.messageCard}>
              <Text style={styles.messageTitle}>{emptyTitle}</Text>
              <Text style={styles.messageBody}>
                {appliedWalletFilter ? "ลองเลือกบัญชี บัตร หรือรายการอื่นเพิ่มเติม" : "แตะ “จดเพิ่ม” เพื่อเริ่มบันทึกรายรับรายจ่าย"}
              </Text>
            </View>
          ) : (
            days.map((day) => <DayGroup key={day.date} day={day} reading={slipScan.reading} />)
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
      <View style={styles.floatingWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="จดเพิ่ม"
          onPress={() => router.push("/entry")}
          style={({ pressed }) => [styles.addButton, { opacity: pressed ? 0.84 : 1 }]}
        >
          <HomeIcon name="plus" color={theme.onAccent} size={20} strokeWidth={2.4} />
          <Text style={styles.addButtonText}>จดเพิ่ม</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    content: { width: "100%", maxWidth: 680, alignSelf: "center" },
    topBar: { paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    streakChip: {
      height: touch.min,
      paddingLeft: 10,
      paddingRight: 14,
      borderRadius: 12,
      backgroundColor: theme.raised,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    streakText: { color: theme.text, fontSize: 14, lineHeight: 20 },
    topActions: { flexDirection: "row", gap: 8 },
    topAction: {
      width: touch.min,
      height: touch.min,
      borderRadius: touch.min / 2,
      backgroundColor: theme.raised,
      alignItems: "center",
      justifyContent: "center",
    },
    filterNotice: {
      marginTop: 6,
      marginHorizontal: 16,
      paddingLeft: 4,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    filterNoticeText: { flex: 1, color: theme.text, fontSize: 13, lineHeight: 19 },
    clearFilter: { minHeight: touch.min, paddingHorizontal: 6, justifyContent: "center" },
    clearFilterText: { color: theme.accentText, fontSize: 13, lineHeight: 19 },
    speech: { marginTop: 16, marginHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 },
    speechCopy: { flex: 1, minWidth: 0 },
    speechTitle: { color: theme.text, fontSize: 16, lineHeight: 22 },
    speechBody: { marginTop: 2, color: theme.muted, fontSize: 14, lineHeight: 20 },
    speechLink: {
      minHeight: touch.min,
      marginTop: -4,
      marginBottom: -8,
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    speechLinkText: { color: theme.accentText, fontSize: 14, lineHeight: 20 },
    flowCards: { marginTop: 6, marginHorizontal: 16, height: 70 },
    hero: {
      marginTop: 14,
      marginHorizontal: 16,
      paddingTop: 6,
      paddingHorizontal: 16,
      paddingBottom: 18,
      borderRadius: radius.hero,
      backgroundColor: theme.accent,
    },
    heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    periodNav: { marginLeft: -12, flexDirection: "row", alignItems: "center", flexShrink: 1 },
    periodArrow: { width: touch.min, height: touch.min, alignItems: "center", justifyContent: "center" },
    periodLabel: {
      minWidth: 52,
      flexShrink: 1,
      color: theme.onAccent,
      fontSize: 15,
      lineHeight: 20,
      textAlign: "center",
    },
    summaryButton: { height: touch.min, marginRight: -4, justifyContent: "center" },
    summaryPill: {
      height: 34,
      paddingHorizontal: 12,
      borderRadius: 17,
      backgroundColor: "rgba(30,27,25,0.1)",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    summaryText: { color: theme.onAccent, fontSize: 13, lineHeight: 18 },
    heroCaption: { marginTop: 6, color: theme.onAccent, fontSize: 13, lineHeight: 18 },
    heroAmountRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
    heroAmount: {
      color: theme.onAccent,
      fontSize: 36,
      fontWeight: "500",
      letterSpacing: -0.3,
      fontVariant: ["tabular-nums"],
    },
    heroBaht: { color: theme.onAccent, fontSize: bahtFontSize(36), lineHeight: 28, marginBottom: 4 },
    latestRow: { marginTop: 10, marginHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 6 },
    latestText: { color: theme.muted, fontSize: 12, lineHeight: 17 },
    refreshErrorRow: { marginTop: 4, marginHorizontal: 20, minHeight: touch.min, justifyContent: "center" },
    refreshError: { color: theme.danger, fontSize: 12, lineHeight: 17 },
    loading: { marginTop: 40 },
    messageCard: {
      marginTop: 22,
      marginHorizontal: 16,
      padding: 20,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: theme.raised,
      backgroundColor: theme.surface,
    },
    messageTitle: { color: theme.text, fontSize: 15, lineHeight: 21 },
    messageBody: { marginTop: 4, color: theme.muted, fontSize: 13, lineHeight: 20 },
    retry: { alignSelf: "flex-start", minHeight: touch.min, justifyContent: "center", marginTop: 4 },
    retryText: { color: theme.accentText, fontSize: 14, lineHeight: 20 },
    dayHeader: {
      paddingTop: 22,
      paddingHorizontal: 20,
      paddingBottom: 8,
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 12,
    },
    dayToday: { flexDirection: "row", alignItems: "baseline", gap: 6 },
    todayLabel: { color: theme.accentText, fontSize: 14, lineHeight: 20 },
    dayLabel: { color: theme.text, fontSize: 14, lineHeight: 20 },
    dayMuted: { color: theme.muted, fontSize: 13, lineHeight: 18 },
    dayNumber: { fontWeight: "500", fontVariant: ["tabular-nums"] },
    dayCard: {
      marginHorizontal: 16,
      borderRadius: radius.card,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.raised,
      backgroundColor: theme.surface,
    },
    row: {
      minHeight: 62,
      paddingVertical: 10,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    rowDivider: { position: "absolute", top: 0, left: 60, right: 0, height: 1, backgroundColor: theme.raised },
    pendingIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: theme.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    rowIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.raised,
      alignItems: "center",
      justifyContent: "center",
    },
    rowEmoji: { fontSize: 17, lineHeight: 22 },
    rowCopy: { flex: 1, minWidth: 0 },
    rowTitleLine: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 0 },
    rowTitle: { flexShrink: 1, color: theme.text, fontSize: 15, lineHeight: 21 },
    newBadge: { paddingHorizontal: 7, borderRadius: 6, backgroundColor: theme.accent },
    newBadgeText: { color: theme.onAccent, fontSize: 11, lineHeight: 18 },
    rowMeta: { color: theme.muted, fontSize: 12, lineHeight: 17 },
    rowAmount: { color: theme.text, fontSize: 15, lineHeight: 21, fontWeight: "500", fontVariant: ["tabular-nums"] },
    floatingWrap: { position: "absolute", bottom: 16, right: 16 },
    addButton: {
      backgroundColor: theme.accent,
      borderRadius: radius.pill,
      height: touch.button,
      paddingLeft: 16,
      paddingRight: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      ...shadow.float,
    },
    addButtonText: { color: theme.onAccent, fontSize: 16, lineHeight: 22 },
  });
}
