import { useQuery } from "@tanstack/react-query";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/lib/use-app-theme";
import { HomeIcon } from "@/components/ui/home-icon";
import { Text } from "@/components/ui/typography";
import { useAppData } from "@/context/app-data";
import { summaryMonthOffset } from "@/features/home/period";
import { homeQueryOptions } from "@/features/home/query-options";
import { planningQueryOptions } from "@/features/planning/query-options";
import { WalletFilterSheet } from "@/features/wallets/components/wallet-filter-sheet";
import { emptyWalletOptions, isAllWalletSources, selectAllWalletSources } from "@/features/wallets/filter";
import { walletsQueryOptions } from "@/features/wallets/query-options";
import type { CategoryBreakdownItem, PeriodSummary, TransactionKind, WalletFilterSelection } from "@/types/finance";
import { getPeriodBounds, getPeriodForDate, shiftPeriodKey } from "@/utils/dates";
import { formatBaht, formatMoney, isValidISODate, todayISO } from "@/utils/format";

type BreakdownMode = "category" | "tag";
const emptyRows: never[] = [];

const kindLabels: Record<TransactionKind, string> = {
  expense: "รายจ่าย",
  income: "รายรับ",
  transfer: "ย้ายเงิน",
};

function selectedPeriod(offset: number, startDay: number) {
  const currentKey = getPeriodForDate(todayISO(), startDay).periodKey;
  const periodKey = shiftPeriodKey(currentKey, offset);
  const [year, month] = periodKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  const { from, to } = getPeriodBounds(periodKey, startDay);
  return {
    from,
    to,
    label: date.toLocaleDateString("th-TH", { month: "short", year: "2-digit" }),
  };
}

function totalForKind(summary: PeriodSummary | null, kind: TransactionKind) {
  if (!summary) return 0;
  return kind === "expense" ? summary.expenseSatang : kind === "income" ? summary.incomeSatang : summary.transferSatang;
}

function Donut({
  size,
  kind,
  total,
  label,
  categories,
}: {
  size: number;
  kind: TransactionKind;
  total: number;
  label: string;
  categories: CategoryBreakdownItem[];
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const thickness = Math.round(size * 0.13);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const segments =
    kind === "transfer" && total > 0
      ? [{ id: "transfer", percentage: 100, color: theme.accentText }]
      : categories.map((item, index) => ({
          id: item.categoryId ?? "none-" + index,
          percentage: item.percentage,
          color: item.categoryId ? item.color : theme.muted,
        }));
  return (
    <View
      accessibilityLabel={"กราฟวงกลม" + kindLabels[kind] + " " + formatMoney(total)}
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
    >
      <Svg
        width={size}
        height={size}
        viewBox={"0 0 " + size + " " + size}
        style={{ transform: [{ rotate: "-90deg" }] }}
      >
        <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={theme.border} strokeWidth={thickness} />
        {segments.map((item, index) => {
          const arc = (circumference * Math.max(0, Math.min(100, item.percentage))) / 100;
          const preceding = segments
            .slice(0, index)
            .reduce(
              (sum, previous) => sum + (circumference * Math.max(0, Math.min(100, previous.percentage))) / 100,
              0
            );
          return (
            <Circle
              key={item.id}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={thickness}
              strokeDasharray={arc + " " + circumference}
              strokeDashoffset={-preceding}
            />
          );
        })}
      </Svg>
      <View pointerEvents="none" style={styles.donutCenter}>
        <Text style={styles.donutKind}>{kindLabels[kind]}</Text>
        <Text numberOfLines={1} style={styles.donutPeriod}>
          {label}
        </Text>
        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.donutAmount}>
          {formatBaht(total)} <Text style={styles.donutCurrency}>฿</Text>
        </Text>
      </View>
    </View>
  );
}

export default function SummaryScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const { appliedWalletFilter, setAppliedWalletFilter } = useAppData();

  // Home's “ดูสรุป” passes a day of the period it shows, so Summary opens on that month; the arrows take over after.
  const params = useLocalSearchParams<{ date?: string }>();
  const [chosenOffset, setOffset] = useState<number | null>(null);
  const [kind, setKind] = useState<TransactionKind>("expense");
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftWalletFilter, setDraftWalletFilter] = useState<WalletFilterSelection>(() =>
    selectAllWalletSources(emptyWalletOptions)
  );
  const [breakdownMode, setBreakdownMode] = useState<BreakdownMode>("category");
  const [showCompare, setShowCompare] = useState(false);
  const [metricsHeight, setMetricsHeight] = useState(220);
  const [kindSwitchHeight, setKindSwitchHeight] = useState(55);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [tabsHeight, setTabsHeight] = useState(0);
  const [tailHeight, setTailHeight] = useState(0);
  const [metricsHidden, setMetricsHidden] = useState(false);

  const startDayQuery = useQuery({ ...planningQueryOptions.monthStartDay(), enabled: isFocused });

  const openedAt = params.date && isValidISODate(params.date) ? params.date : null;
  const offset = chosenOffset ?? (openedAt ? summaryMonthOffset(todayISO(), openedAt, startDayQuery.data ?? 1) : 0);
  const period = selectedPeriod(offset, startDayQuery.data ?? 1);
  const prior = selectedPeriod(offset - 1, startDayQuery.data ?? 1);
  const periodReady = startDayQuery.data !== undefined;

  const summaryQuery = useQuery({
    ...homeQueryOptions.periodSummary(period.from, period.to, appliedWalletFilter ?? undefined),
    enabled: isFocused && periodReady,
  });
  const previousQuery = useQuery({
    ...homeQueryOptions.periodSummary(prior.from, prior.to, appliedWalletFilter ?? undefined),
    enabled: isFocused && periodReady,
  });
  const categoriesQuery = useQuery({
    ...homeQueryOptions.categoryBreakdown(
      period.from,
      period.to,
      kind === "transfer" ? "expense" : kind,
      appliedWalletFilter ?? undefined
    ),
    enabled: isFocused && periodReady && kind !== "transfer",
  });
  const tagsQuery = useQuery({
    ...homeQueryOptions.tagBreakdown(
      period.from,
      period.to,
      kind === "transfer" ? "expense" : kind,
      appliedWalletFilter ?? undefined
    ),
    enabled: isFocused && periodReady && kind !== "transfer",
  });
  const trendQuery = useQuery({
    ...homeQueryOptions.monthlyTrend(6, period.from, appliedWalletFilter ?? undefined),
    enabled: isFocused && periodReady,
  });
  const walletOptionsQuery = useQuery({
    ...walletsQueryOptions.filterOptions(),
    enabled: isFocused,
  });

  const requiredQueries = [
    startDayQuery,
    summaryQuery,
    previousQuery,
    trendQuery,
    walletOptionsQuery,
    ...(kind === "transfer" ? [] : [categoriesQuery, tagsQuery]),
  ];
  const error = requiredQueries.find((query) => query.data === undefined && query.error)?.error?.message ?? null;
  const loading = !error && requiredQueries.some((query) => query.data === undefined);
  const refreshError = requiredQueries.find((query) => query.data !== undefined && query.error)?.error;
  const summary = summaryQuery.data ?? null;
  const previous = previousQuery.data ?? null;
  const categories = categoriesQuery.data ?? emptyRows;
  const tags = tagsQuery.data ?? emptyRows;
  const trend = trendQuery.data ?? emptyRows;
  const walletOptions = walletOptionsQuery.data ?? emptyWalletOptions;
  const periodLabel = period.label;

  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.set(Math.max(0, event.contentOffset.y));
    },
  });

  const kindSwitchAnimatedStyle = useAnimatedStyle(() => {
    const fadeStart = Math.max(0, metricsHeight - kindSwitchHeight - 80);
    const fadeEnd = Math.max(fadeStart + 1, metricsHeight * 0.95);
    return {
      opacity: interpolate(scrollY.get(), [fadeStart, fadeEnd], [1, 0], Extrapolation.CLAMP),
    };
  });

  useAnimatedReaction(
    () => scrollY.get() >= metricsHeight * 0.95,
    (hidden, previous) => {
      if (hidden !== previous) scheduleOnRN(setMetricsHidden, hidden);
    },
    [metricsHeight]
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

  const total = totalForKind(summary, kind);
  const previousTotal = totalForKind(previous, kind);
  const difference = total - previousTotal;
  const differencePercent = previousTotal > 0 ? Math.round((Math.abs(difference) / previousTotal) * 100) : 0;
  const categorized =
    total > 0 && kind !== "transfer"
      ? Math.round(
          (categories.filter((item) => item.categoryId).reduce((sum, item) => sum + item.totalSatang, 0) / total) * 100
        )
      : 0;
  const trendMax = useMemo(
    () => Math.max(1, ...trend.flatMap((item) => [item.incomeSatang, item.expenseSatang])),
    [trend]
  );
  const hasTrend = trend.some((item) => item.incomeSatang > 0 || item.expenseSatang > 0);
  const donutSize = Math.min(280, Math.max(215, width - 100));
  const showBreakdownTabs = !loading && !error && kind !== "transfer";
  const baseBottomPadding = Math.max(insets.bottom, 18) + 34;
  const bottomPadding =
    showBreakdownTabs && viewportHeight > 0 && tabsHeight > 0 && tailHeight > 0
      ? Math.max(baseBottomPadding, viewportHeight - tabsHeight - tailHeight)
      : baseBottomPadding;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 10 }]}>
        <View style={styles.headerInner}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="กลับหน้าแรก"
            onPress={() => router.replace("/")}
            style={styles.headerSide}
          >
            <HomeIcon name="chevronLeft" color={theme.onAccent} size={29} strokeWidth={2.5} />
          </Pressable>
          <View style={styles.monthNav}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="ช่วงก่อนหน้า"
              onPress={() => setOffset(offset - 1)}
              style={styles.navArrow}
            >
              <HomeIcon name="chevronLeft" color={theme.onAccent} size={23} />
            </Pressable>
            <HomeIcon name="calendar" color={theme.onAccent} size={21} />
            <Text numberOfLines={1} style={styles.monthLabel}>
              {periodLabel}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="ช่วงถัดไป"
              disabled={offset >= 0}
              onPress={() => setOffset(offset + 1)}
              style={[styles.navArrow, offset >= 0 && { opacity: 0.35 }]}
            >
              <HomeIcon name="chevronRight" color={theme.onAccent} size={23} />
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="กรองรายการ"
            accessibilityState={{ selected: Boolean(appliedWalletFilter) }}
            onPress={() => {
              void openWalletFilter();
            }}
            style={[styles.headerSide, appliedWalletFilter && styles.headerSideFiltered]}
          >
            <HomeIcon name="wallet" color={theme.onAccent} size={27} />
          </Pressable>
        </View>
      </View>
      <Animated.ScrollView
        contentInsetAdjustmentBehavior="never"
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        stickyHeaderIndices={showBreakdownTabs ? [2] : undefined}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onLayout={(event) => {
          const height = Math.ceil(event.nativeEvent.layout.height);
          setViewportHeight((current) => (current === height ? current : height));
        }}
      >
        <View
          style={styles.metricsPanel}
          accessibilityElementsHidden={metricsHidden}
          importantForAccessibility={metricsHidden ? "no-hide-descendants" : "auto"}
          pointerEvents={metricsHidden ? "none" : "auto"}
          onLayout={(event) => {
            const height = event.nativeEvent.layout.height;
            setMetricsHeight((current) => (current === height ? current : height));
          }}
        >
          <View style={styles.metricsInner}>
            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>↓ รายรับ</Text>
                <Text selectable style={[styles.metricValue, { color: theme.success }]}>
                  {formatBaht(summary?.incomeSatang ?? 0)}
                </Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={[styles.metric, { alignItems: "flex-end" }]}>
                <Text style={styles.metricLabel}>↑ รายจ่าย</Text>
                <Text selectable style={styles.metricValue}>
                  {formatBaht(summary?.expenseSatang ?? 0)}
                </Text>
              </View>
            </View>
            <View style={styles.netRow}>
              <Text style={styles.netLabel}>คงเหลือ </Text>
              <Text selectable style={styles.netValue}>
                {formatBaht(summary?.netSatang ?? 0)} ฿
              </Text>
            </View>
            <Animated.View
              style={[styles.kindSwitch, kindSwitchAnimatedStyle]}
              onLayout={(event) => {
                const height = event.nativeEvent.layout.height;
                setKindSwitchHeight((current) => (current === height ? current : height));
              }}
            >
              {(["expense", "income", "transfer"] as const).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: kind === value }}
                  onPress={() => {
                    setKind(value);
                    if (value === "transfer") setBreakdownMode("category");
                  }}
                  style={[styles.kindButton, kind === value && styles.kindButtonActive]}
                >
                  <Text style={[styles.kindArrow, kind === value && { color: theme.text }]}>
                    {value === "expense" ? "↑" : value === "income" ? "↓" : "⇄"}
                  </Text>
                  <Text style={[styles.kindText, kind === value && { color: theme.text }]}>{kindLabels[value]}</Text>
                </Pressable>
              ))}
            </Animated.View>
          </View>
        </View>

        <View style={[styles.body, showBreakdownTabs && styles.bodyBeforeTabs]}>
          <View style={styles.bodyInner}>
            {refreshError ? (
              <Text selectable style={styles.errorText}>
                {refreshError.message}
              </Text>
            ) : null}
            {loading ? (
              <ActivityIndicator color={theme.accentText} style={{ marginTop: 50 }} />
            ) : error ? (
              <View style={styles.errorBox}>
                <Text selectable style={styles.errorText}>
                  {error}
                </Text>
                <Pressable
                  onPress={() => {
                    for (const query of requiredQueries) if (query.isEnabled) void query.refetch();
                  }}
                >
                  <Text style={styles.errorText}>ลองอีกครั้ง</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.donutWrap}>
                  <Donut size={donutSize} kind={kind} total={total} label={periodLabel} categories={categories} />
                  <Text style={styles.donutCaption}>
                    {total === 0
                      ? "ยังไม่มี" + kindLabels[kind] + "ในช่วงนี้"
                      : kind === "transfer"
                        ? "ยอดย้ายเงินในช่วงนี้"
                        : "เลือกหมวดแล้ว " + categorized + "%"}
                  </Text>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: showCompare }}
                    onPress={() => setShowCompare((value) => !value)}
                    style={styles.action}
                  >
                    <Text style={styles.actionIcon}>▥</Text>
                    <Text style={styles.actionText}>เปรียบเทียบ</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => router.push("/plan")} style={styles.action}>
                    <Text style={styles.actionIcon}>◉</Text>
                    <Text style={styles.actionText}>ตั้งงบ</Text>
                  </Pressable>
                </View>
                {showCompare ? (
                  <View style={styles.compareBox}>
                    <Text style={styles.compareTitle}>เทียบกับเดือนก่อน</Text>
                    <View style={styles.compareRow}>
                      <Text style={styles.compareMuted}>ช่วงก่อน</Text>
                      <Text style={styles.compareValue}>{formatMoney(previousTotal)}</Text>
                    </View>
                    <View style={styles.compareRow}>
                      <Text style={styles.compareMuted}>ช่วงนี้</Text>
                      <Text style={styles.compareValue}>{formatMoney(total)}</Text>
                    </View>
                    <Text style={styles.compareResult}>
                      {previousTotal === 0
                        ? "ช่วงก่อนยังไม่มีรายการให้เปรียบเทียบ"
                        : difference === 0
                          ? "ยอดเท่ากับช่วงก่อน"
                          : (difference > 0 ? "เพิ่มขึ้น " : "ลดลง ") +
                            formatMoney(Math.abs(difference)) +
                            " (" +
                            differencePercent +
                            "%)"}
                    </Text>
                  </View>
                ) : null}
              </>
            )}
          </View>
        </View>

        <View
          style={styles.breakdownSticky}
          onLayout={(event) => {
            const height = Math.ceil(event.nativeEvent.layout.height);
            setTabsHeight((current) => (current === height ? current : height));
          }}
        >
          {showBreakdownTabs ? (
            <View style={styles.breakdownTabs}>
              {(["category", "tag"] as const).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: breakdownMode === value }}
                  onPress={() => setBreakdownMode(value)}
                  style={[styles.breakdownTab, breakdownMode === value && styles.breakdownTabActive]}
                >
                  <Text style={styles.breakdownTabIcon}>{value === "category" ? "▦" : "#"}</Text>
                  <Text style={[styles.breakdownTabText, breakdownMode === value && { color: theme.text }]}>
                    {value === "category" ? "หมวดหมู่" : "แท็ก"}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View
          style={styles.body}
          onLayout={(event) => {
            const height = Math.ceil(event.nativeEvent.layout.height);
            setTailHeight((current) => (current === height ? current : height));
          }}
        >
          <View style={styles.bodyInner}>
            {!loading && !error ? (
              <>
                {kind === "transfer" ? (
                  <View style={styles.transferSection}>
                    <Text style={styles.sectionHeading}>⇄ ย้ายเงินระหว่างบัญชี</Text>
                    <View style={styles.breakdownRow}>
                      <View style={[styles.dot, { backgroundColor: theme.accentText }]} />
                      <Text style={styles.breakdownName}>ยอดย้ายเงินรวม</Text>
                      <Text selectable style={styles.breakdownAmount}>
                        {formatMoney(total)}
                      </Text>
                    </View>
                    <Text style={styles.transferHint}>ยอดย้ายเงินไม่รวมในรายรับและรายจ่าย</Text>
                  </View>
                ) : (
                  <>
                    {breakdownMode === "category" ? (
                      categories.length === 0 ? (
                        <View style={styles.emptyBox}>
                          <Text style={styles.emptyTitle}>ยังไม่มีข้อมูลหมวดหมู่</Text>
                          <Text style={styles.emptyBody}>จดรายการในช่วงนี้ แล้วหมูจะสรุปให้</Text>
                        </View>
                      ) : (
                        categories.map((item, index) => (
                          <View key={item.categoryId ?? "none-" + index} style={styles.breakdownRow}>
                            <View
                              style={[
                                styles.categoryIcon,
                                { backgroundColor: item.categoryId ? item.color : theme.raised },
                              ]}
                            >
                              <Text style={styles.categoryEmoji}>{item.categoryId ? item.icon : "✎"}</Text>
                            </View>
                            <View style={styles.breakdownCopy}>
                              <Text numberOfLines={1} style={styles.breakdownName}>
                                {item.categoryName}
                              </Text>
                              <Text style={styles.breakdownMeta}>
                                {item.transactionCount} รายการ · {Math.round(item.percentage)}%
                              </Text>
                            </View>
                            <Text selectable style={styles.breakdownAmount}>
                              {formatMoney(item.totalSatang)}
                            </Text>
                          </View>
                        ))
                      )
                    ) : tags.length === 0 ? (
                      <View style={styles.emptyBox}>
                        <Text style={styles.emptyTitle}>ยังไม่มีแท็ก</Text>
                        <Text style={styles.emptyBody}>เพิ่มแท็กให้รายการ แล้วหมูจะช่วยรวมยอดให้</Text>
                      </View>
                    ) : (
                      tags.map((item, index) => (
                        <View key={item.tagId ?? "none-" + index} style={styles.breakdownRow}>
                          <View style={[styles.categoryIcon, { backgroundColor: item.color }]}>
                            <Text style={styles.categoryEmoji}>#</Text>
                          </View>
                          <View style={styles.breakdownCopy}>
                            <Text numberOfLines={1} style={styles.breakdownName}>
                              {item.tagName}
                            </Text>
                            <Text style={styles.breakdownMeta}>{item.transactionCount} รายการ</Text>
                          </View>
                          <Text selectable style={styles.breakdownAmount}>
                            {formatMoney(item.totalSatang)}
                          </Text>
                        </View>
                      ))
                    )}
                  </>
                )}
                <View style={styles.trendSection}>
                  <Text style={styles.trendHeading}>แนวโน้มรายเดือน</Text>
                  <View style={styles.trendLegend}>
                    <Text style={[styles.trendLegendText, { color: theme.success }]}>● รายรับ</Text>
                    <Text style={[styles.trendLegendText, { color: theme.accentText }]}>● รายจ่าย</Text>
                  </View>
                  {hasTrend ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.trendContent}
                    >
                      {trend.map((item) => (
                        <View key={item.periodKey} style={styles.trendGroup}>
                          <View style={styles.trendBars}>
                            <View
                              style={[
                                styles.trendBar,
                                {
                                  backgroundColor: theme.successFill,
                                  height: Math.max(3, Math.round((item.incomeSatang / trendMax) * 84)),
                                  opacity: item.incomeSatang ? 1 : 0.22,
                                },
                              ]}
                            />
                            <View
                              style={[
                                styles.trendBar,
                                {
                                  backgroundColor: theme.accent,
                                  height: Math.max(3, Math.round((item.expenseSatang / trendMax) * 84)),
                                  opacity: item.expenseSatang ? 1 : 0.22,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.trendLabel}>{item.label}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  ) : (
                    <Text style={styles.trendEmpty}>เมื่อมีรายการรายรับรายจ่าย กราฟจะปรากฏที่นี่</Text>
                  )}
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Animated.ScrollView>
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
    header: { backgroundColor: theme.accent, paddingBottom: 22 },
    headerInner: {
      width: "100%",
      maxWidth: 680,
      alignSelf: "center",
      minHeight: 52,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerSide: { width: 40, height: 42, alignItems: "center", justifyContent: "center" },
    headerSideFiltered: { borderWidth: 2, borderColor: theme.onAccent, borderRadius: 21 },
    monthNav: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    navArrow: { width: 29, height: 40, alignItems: "center", justifyContent: "center" },
    monthLabel: {
      color: theme.onAccent,
      fontSize: 20,
      fontWeight: "900",
      minWidth: 76,
      maxWidth: 160,
      textAlign: "center",
    },
    metricsPanel: {
      backgroundColor: theme.surface,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
    },
    metricsInner: {
      width: "100%",
      maxWidth: 680,
      alignSelf: "center",
      paddingHorizontal: 24,
      paddingTop: 25,
    },
    metricsRow: { flexDirection: "row", alignItems: "center", minHeight: 66 },
    metric: { flex: 1, gap: 4 },
    metricLabel: { color: theme.muted, fontSize: 15 },
    metricValue: { color: theme.text, fontSize: 19, fontWeight: "800", fontVariant: ["tabular-nums"] },
    metricDivider: { width: 1.5, height: 32, backgroundColor: theme.border, marginHorizontal: 18 },
    netRow: {
      marginTop: 11,
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "center",
      flexWrap: "wrap",
    },
    netLabel: { color: theme.muted, fontSize: 17 },
    netValue: { color: theme.text, fontSize: 22, fontWeight: "900", fontVariant: ["tabular-nums"] },
    kindSwitch: {
      marginTop: 19,
      flexDirection: "row",
      alignSelf: "center",
      backgroundColor: theme.raised,
      borderTopLeftRadius: 14,
      borderTopRightRadius: 14,
      overflow: "hidden",
    },
    kindButton: {
      minWidth: 87,
      paddingVertical: 8,
      paddingHorizontal: 9,
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
    },
    kindButtonActive: { backgroundColor: theme.surface, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
    kindArrow: { color: theme.text, fontSize: 26, lineHeight: 26 },
    kindText: { color: theme.text, fontSize: 13, fontWeight: "800" },
    body: { backgroundColor: theme.background },
    bodyBeforeTabs: { paddingBottom: 37 },
    bodyInner: { width: "100%", maxWidth: 680, alignSelf: "center", paddingHorizontal: 20 },
    donutWrap: { alignItems: "center", marginTop: 40 },
    donutCenter: {
      position: "absolute",
      left: 35,
      right: 35,
      top: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
    },
    donutKind: { color: theme.text, fontSize: 15 },
    donutPeriod: { color: theme.muted, fontSize: 15 },
    donutAmount: {
      color: theme.text,
      fontSize: 28,
      fontWeight: "900",
      fontVariant: ["tabular-nums"],
      marginTop: 8,
      textAlign: "center",
    },
    donutCurrency: { fontSize: 19, fontWeight: "500" },
    donutCaption: { color: theme.muted, fontSize: 14, marginTop: 15 },
    actions: { flexDirection: "row", gap: 8, marginTop: 25, marginHorizontal: 13 },
    action: {
      flex: 1,
      height: 48,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.raised,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
    },
    actionIcon: { color: theme.text, fontSize: 23, lineHeight: 25 },
    actionText: { color: theme.text, fontSize: 15, fontWeight: "800" },
    compareBox: {
      marginTop: 14,
      marginHorizontal: 13,
      padding: 16,
      borderRadius: 18,
      backgroundColor: theme.raised,
      gap: 7,
    },
    compareTitle: { color: theme.text, fontWeight: "900", fontSize: 15, marginBottom: 4 },
    compareRow: { flexDirection: "row", justifyContent: "space-between" },
    compareMuted: { color: theme.muted, fontSize: 13 },
    compareValue: { color: theme.text, fontSize: 13, fontWeight: "800" },
    compareResult: { color: theme.accentText, fontSize: 13, marginTop: 4, fontWeight: "800" },
    breakdownSticky: { backgroundColor: theme.background, zIndex: 2 },
    breakdownTabs: {
      width: "100%",
      maxWidth: 680,
      alignSelf: "center",
      paddingHorizontal: 20,
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    breakdownTab: {
      flex: 1,
      minHeight: 53,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    breakdownTabActive: { borderBottomWidth: 2, borderBottomColor: theme.accent },
    breakdownTabIcon: { color: theme.text, fontSize: 23 },
    breakdownTabText: { color: theme.muted, fontSize: 17, fontWeight: "800" },
    breakdownRow: {
      minHeight: 76,
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    categoryIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
    },
    categoryEmoji: { fontSize: 20, color: theme.text },
    dot: { width: 19, height: 19, borderRadius: 10 },
    breakdownCopy: { flex: 1, minWidth: 0, gap: 3 },
    breakdownName: { color: theme.text, fontSize: 15, fontWeight: "800" },
    breakdownMeta: { color: theme.muted, fontSize: 12 },
    breakdownAmount: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
      flexShrink: 0,
    },
    emptyBox: { alignItems: "center", paddingVertical: 28, gap: 6 },
    emptyTitle: { color: theme.text, fontSize: 15, fontWeight: "800" },
    emptyBody: { color: theme.muted, fontSize: 13, textAlign: "center" },
    transferSection: { marginTop: 42 },
    sectionHeading: { color: theme.text, fontSize: 17, fontWeight: "800", marginBottom: 10 },
    transferHint: { color: theme.muted, fontSize: 12, marginTop: 12 },
    trendSection: {
      marginTop: 38,
      padding: 17,
      borderRadius: 20,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    trendHeading: { color: theme.text, fontSize: 17, fontWeight: "900" },
    trendLegend: { flexDirection: "row", gap: 15, marginTop: 9 },
    trendLegendText: { fontSize: 12, fontWeight: "700" },
    trendContent: { flexGrow: 1, justifyContent: "space-around", gap: 10, paddingTop: 17 },
    trendGroup: { width: 48, alignItems: "center", gap: 7 },
    trendBars: { height: 90, flexDirection: "row", alignItems: "flex-end", gap: 3 },
    trendBar: { width: 14, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    trendLabel: { color: theme.muted, fontSize: 10, textAlign: "center" },
    trendEmpty: { color: theme.muted, fontSize: 12, marginTop: 17 },
    errorBox: { marginTop: 30, backgroundColor: theme.raised, borderRadius: 16, padding: 18 },
    errorText: { color: theme.danger, fontSize: 13 },
  });
}
