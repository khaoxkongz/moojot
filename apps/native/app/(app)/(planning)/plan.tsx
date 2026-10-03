import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useQuery } from "@tanstack/react-query";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GroupedList, IconButton, MessageCard } from "@/components/ui/controls";
import { Text } from "@/components/ui/typography";
import { radius, touch, type AppTheme } from "@/constants/theme";
import { categoriesQueryOptions } from "@/features/categories/query-options";
import { planBudgets, type BudgetRow, type BudgetTarget } from "@/features/planning/plan";
import { planningQueryOptions } from "@/features/planning/query-options";
import { summaryMonth } from "@/features/summary/summary";
import { useAppTheme } from "@/lib/use-app-theme";
import type { PeriodKey, RecurringRule } from "@/types/finance";
import { getPeriodForDate, nextMonthOffset, periodKeyOffset } from "@/utils/dates";
import { amountLabel, todayISO } from "@/utils/format";
import { queryState } from "@/utils/query-state";

const emptyList: never[] = [];

const openBudgetForm = (params: { periodKey: PeriodKey; target?: BudgetTarget; id?: string }) =>
  router.push({ pathname: "/budget-form", params });

function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.addButton, pressed && { backgroundColor: theme.border }]}
    >
      <MaterialCommunityIcons name="plus" size={19} color={theme.accentText} />
      <Text style={styles.addText}>{label}</Text>
    </Pressable>
  );
}

function BudgetLine({ row, periodKey }: { row: BudgetRow; periodKey: PeriodKey }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const tone = { over: theme.danger, near: theme.accentText, ok: theme.success }[row.tone];
  const fill = { over: theme.danger, near: theme.accent, ok: theme.success }[row.tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`แก้ไขงบ ${row.name}, ${row.statusLabel}, ใช้ไป ${row.spent} จาก ${row.limit} บาท, ${row.leftLabel}`}
      onPress={() => openBudgetForm({ periodKey, id: row.id })}
      style={({ pressed }) => [styles.budgetRow, pressed && { backgroundColor: theme.raised }]}
    >
      <View style={styles.rowIcon}>
        <Text style={styles.rowEmoji}>{row.icon}</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text numberOfLines={1} style={styles.rowName}>
            {row.name}
          </Text>
          <View style={styles.status}>
            <MaterialCommunityIcons name={row.statusIcon} size={15} color={tone} />
            <Text style={[styles.statusText, { color: tone }]}>{row.statusLabel}</Text>
          </View>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${row.bar}%`, backgroundColor: fill }]} />
        </View>
        <View style={styles.rowBottom}>
          <Text style={styles.rowMeta}>
            ใช้ไป <Text style={styles.rowSpent}>{row.spent}</Text> จาก {row.limit} ฿
          </Text>
          <Text style={[styles.rowMeta, row.tone === "over" && { color: theme.danger }]}>{row.leftLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function OverallCard({ row, periodKey }: { row: BudgetRow | null; periodKey: PeriodKey }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  if (!row) {
    return (
      <View style={styles.overall}>
        <Text style={styles.overallTitle}>ยังไม่ได้ตั้งงบรวม</Text>
        <Text style={styles.overallBody}>ตั้งว่าเดือนนี้ใช้ได้ทั้งหมดเท่าไหร่ ใกล้ครบเมื่อไหร่หมูจะบอก</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ตั้งงบรวม"
          onPress={() => openBudgetForm({ periodKey, target: "all" })}
          style={({ pressed }) => [styles.overallAdd, pressed && { opacity: 0.8 }]}
        >
          <MaterialCommunityIcons name="plus" size={18} color={theme.onAccent} />
          <Text style={styles.overallAddText}>ตั้งงบรวม</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`แก้ไขงบรวม, ${row.statusLabel}, ใช้ไป ${row.spent} จาก ${row.limit} บาท, ${row.leftLabel}`}
      onPress={() => openBudgetForm({ periodKey, id: row.id })}
      style={({ pressed }) => [styles.overall, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.overallTop}>
        <Text style={[styles.overallTitle, { flex: 1 }]}>งบรวมทุกหมวด</Text>
        <MaterialCommunityIcons name={row.statusIcon} size={17} color={theme.onAccent} />
        <Text style={styles.overallSmall}>{row.statusLabel}</Text>
      </View>
      <Text style={[styles.overallSmall, { marginTop: 10 }]}>ใช้ไป</Text>
      <View style={styles.overallAmounts}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.overallSpent}>
          {row.spent}
        </Text>
        <Text style={styles.overallLimit}>จาก {row.limit} ฿</Text>
      </View>
      <View style={styles.overallTrack}>
        <View style={[styles.overallFill, { width: `${row.bar}%` }]} />
      </View>
      <View style={styles.overallBottom}>
        <Text style={styles.overallSmall}>{row.leftLabel}</Text>
        <View style={styles.status}>
          <MaterialCommunityIcons name="pencil-outline" size={16} color={theme.onAccent} />
          <Text style={styles.overallSmall}>แก้ไข</Text>
        </View>
      </View>
    </Pressable>
  );
}

function RuleLine({ rule, icon }: { rule: RecurringRule; icon: string }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`แก้ไขรายการจดซ้ำ ${rule.title}`}
      onPress={() => router.push({ pathname: "/recurring-form", params: { id: rule.id } })}
      style={({ pressed }) => [styles.ruleRow, pressed && { backgroundColor: theme.raised }]}
    >
      <View style={styles.rowIcon}>
        <Text style={styles.rowEmoji}>{icon}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text numberOfLines={1} style={styles.rowName}>
          {rule.title}
        </Text>
        {rule.isActive ? (
          <Text style={styles.rowMeta}>ทุกวันที่ {rule.dayOfMonth}</Text>
        ) : (
          <View style={styles.status}>
            <MaterialCommunityIcons name="pause-circle-outline" size={14} color={theme.accentText} />
            <Text style={[styles.rowMeta, { color: theme.accentText }]}>หยุดไว้ · หมูยังไม่จดให้</Text>
          </View>
        )}
      </View>
      <Text style={[styles.ruleAmount, rule.kind === "income" && { color: theme.success }]}>
        {rule.kind === "income" ? "+" : ""}
        {amountLabel(rule.amountSatang)}
      </Text>
    </Pressable>
  );
}

export default function PlanScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  // Summary's วางแผนงบ passes the month it shows, so the plan opens on that month; the arrows take over after.
  const params = useLocalSearchParams<{ periodKey?: string }>();
  const [chosenOffset, setOffset] = useState<number | null>(null);

  const startDayQuery = useQuery({ ...planningQueryOptions.monthStartDay(), enabled: isFocused });
  const startDay = startDayQuery.data ?? 1;
  const today = todayISO();
  const currentKey = getPeriodForDate(today, startDay).periodKey;
  const offset = chosenOffset ?? (params.periodKey ? periodKeyOffset(currentKey, params.periodKey) : 0);
  const month = summaryMonth(today, offset, startDay);
  // Budgets are read for the month once the month start is known, so the month on screen is the month counted.
  const budgetsQuery = useQuery({
    ...planningQueryOptions.budgetStatuses(month.periodKey),
    enabled: isFocused && startDayQuery.data !== undefined,
  });
  const rulesQuery = useQuery({ ...planningQueryOptions.recurringRules(), enabled: isFocused });
  const categoriesQuery = useQuery({ ...categoriesQueryOptions.list(), enabled: isFocused });
  const tagsQuery = useQuery({ ...categoriesQueryOptions.tags(), enabled: isFocused });

  const categories = categoriesQuery.data ?? emptyList;
  const plan = useMemo(
    () => planBudgets(budgetsQuery.data ?? emptyList, { categories, tags: tagsQuery.data ?? emptyList }),
    [budgetsQuery.data, categories, tagsQuery.data]
  );
  const rules = rulesQuery.data ?? emptyList;
  const queries = [startDayQuery, budgetsQuery, rulesQuery, categoriesQuery, tagsQuery];
  const { ready, pageError, refreshError, retry: retryAll } = queryState(queries);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <View style={styles.screen}>
      <View style={{ paddingTop: insets.top }}>
        <View style={styles.titleBar}>
          <IconButton icon="chevron-left" size={30} label="ย้อนกลับ" onPress={goBack} />
          <Text accessibilityRole="header" style={styles.title}>
            วางแผน
          </Text>
          <View style={{ width: touch.min }} />
        </View>
        <View style={styles.monthNav}>
          <IconButton
            icon="chevron-left"
            size={26}
            color={theme.accentText}
            label="เดือนก่อน"
            onPress={() => setOffset(offset - 1)}
          />
          <Text style={styles.monthTitle}>{month.title}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="เดือนถัดไป"
            accessibilityState={{ disabled: month.isCurrent }}
            disabled={month.isCurrent}
            onPress={() => setOffset(nextMonthOffset(offset))}
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
        {refreshError ? (
          <Pressable accessibilityRole="button" onPress={retryAll} style={styles.refreshErrorRow}>
            <Text style={styles.refreshError}>
              อัปเดตข้อมูลไม่สำเร็จ แสดงข้อมูลที่โหลดไว้ล่าสุด <Text style={styles.refreshRetry}>ลองอีกครั้ง</Text>
            </Text>
          </Pressable>
        ) : null}

        {pageError ? (
          <MessageCard title="โหลดแผนไม่สำเร็จ" body="เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง" onRetry={retryAll} />
        ) : !ready ? (
          <ActivityIndicator color={theme.accentText} style={{ paddingVertical: 40 }} />
        ) : (
          <>
            <OverallCard row={plan.overall} periodKey={month.periodKey} />

            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>งบแยกหมวด</Text>
              <Text style={styles.sectionCount}>{plan.countLabel}</Text>
            </View>
            {plan.rows.length ? (
              <GroupedList>
                {plan.rows.map((row) => (
                  <BudgetLine key={row.id} row={row} periodKey={month.periodKey} />
                ))}
              </GroupedList>
            ) : (
              <Text style={styles.hint}>เช่น ค่าอาหารเดือนละ 3,000 บาท ใกล้ครบเมื่อไหร่หมูจะบอก</Text>
            )}
            <AddButton
              label="ตั้งงบแยกหมวด"
              onPress={() => openBudgetForm({ periodKey: month.periodKey, target: "category" })}
            />

            <View style={[styles.sectionHead, { paddingTop: 26, marginBottom: 0 }]}>
              <Text style={styles.sectionTitle}>รายการจดซ้ำ</Text>
              <Text style={styles.sectionCount}>{rules.length ? `${rules.length} รายการ` : ""}</Text>
            </View>
            <Text style={[styles.hint, { marginBottom: 8 }]}>หมูจดให้อัตโนมัติทุกเดือน ตามวันที่ตั้งไว้</Text>
            {rules.length ? (
              <GroupedList>
                {rules.map((rule) => (
                  <RuleLine
                    key={rule.id}
                    rule={rule}
                    icon={
                      categories.find((category) => category.id === rule.categoryId)?.icon ??
                      (rule.kind === "transfer" ? "⇄" : "🔁")
                    }
                  />
                ))}
              </GroupedList>
            ) : (
              <Text style={styles.hint}>เช่น เงินเดือน ค่าเช่า หรือค่าบริการรายเดือน</Text>
            )}
            <AddButton label="เพิ่มรายการจดซ้ำ" onPress={() => router.push("/recurring-form")} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    titleBar: { height: 52, flexDirection: "row", alignItems: "center", paddingLeft: 4, paddingRight: 6 },
    title: { flex: 1, color: theme.text, fontSize: 17, lineHeight: 24, textAlign: "center" },
    monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
    monthTitle: { minWidth: 140, color: theme.text, fontSize: 15, lineHeight: 21, textAlign: "center" },
    iconButton: {
      width: touch.min,
      height: touch.min,
      borderRadius: touch.min / 2,
      alignItems: "center",
      justifyContent: "center",
    },
    content: { paddingTop: 4, paddingHorizontal: 16 },
    overall: {
      paddingTop: 16,
      paddingHorizontal: 18,
      paddingBottom: 14,
      borderRadius: radius.hero,
      backgroundColor: theme.accent,
    },
    overallTop: { flexDirection: "row", alignItems: "center", gap: 4 },
    overallTitle: { color: theme.onAccent, fontSize: 15, lineHeight: 21 },
    overallBody: { marginTop: 2, color: theme.onAccent, fontSize: 13, lineHeight: 19 },
    overallSmall: { color: theme.onAccent, fontSize: 13, lineHeight: 18 },
    overallAmounts: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", columnGap: 8 },
    overallSpent: {
      maxWidth: "100%",
      color: theme.onAccent,
      fontSize: 32,
      lineHeight: 37,
      fontWeight: "500",
      letterSpacing: -0.3,
      fontVariant: ["tabular-nums"],
    },
    overallLimit: { color: theme.onAccent, fontSize: 15, lineHeight: 21, fontVariant: ["tabular-nums"] },
    overallTrack: {
      marginTop: 12,
      height: 10,
      borderRadius: 5,
      backgroundColor: "rgba(30,27,25,0.16)",
      overflow: "hidden",
    },
    overallFill: { height: "100%", borderRadius: 5, backgroundColor: theme.onAccent },
    overallBottom: {
      marginTop: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    overallAdd: {
      marginTop: 12,
      alignSelf: "flex-start",
      minHeight: touch.min,
      paddingLeft: 12,
      paddingRight: 16,
      borderRadius: touch.min / 2,
      backgroundColor: "rgba(30,27,25,0.12)",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    overallAddText: { color: theme.onAccent, fontSize: 14, lineHeight: 20 },
    sectionHead: {
      paddingTop: 22,
      paddingHorizontal: 4,
      marginBottom: 8,
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 12,
    },
    sectionTitle: { color: theme.text, fontSize: 15, lineHeight: 21 },
    sectionCount: { color: theme.muted, fontSize: 13, lineHeight: 18 },
    hint: { paddingHorizontal: 4, color: theme.muted, fontSize: 13, lineHeight: 19 },
    addButton: {
      marginTop: 10,
      minHeight: 48,
      borderRadius: 24,
      backgroundColor: theme.raised,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    addText: { color: theme.accentText, fontSize: 15, lineHeight: 21 },
    budgetRow: { paddingVertical: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12 },
    ruleRow: {
      minHeight: 64,
      paddingVertical: 10,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.raised,
      alignItems: "center",
      justifyContent: "center",
    },
    rowEmoji: { fontSize: 18, lineHeight: 24, color: theme.text },
    rowBody: { flex: 1, minWidth: 0 },
    rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    rowName: { flexShrink: 1, color: theme.text, fontSize: 15, lineHeight: 21 },
    status: { flexDirection: "row", alignItems: "center", gap: 3 },
    statusText: { fontSize: 12, lineHeight: 17 },
    track: { marginTop: 7, height: 8, borderRadius: 4, backgroundColor: theme.raised, overflow: "hidden" },
    fill: { height: "100%", borderRadius: 4 },
    rowBottom: {
      marginTop: 6,
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 10,
    },
    rowMeta: { color: theme.muted, fontSize: 12, lineHeight: 17 },
    rowSpent: { color: theme.text, fontVariant: ["tabular-nums"] },
    ruleAmount: { color: theme.text, fontSize: 15, fontWeight: "500", fontVariant: ["tabular-nums"] },
    refreshErrorRow: { paddingHorizontal: 4, paddingBottom: 10 },
    refreshError: { color: theme.muted, fontSize: 13, lineHeight: 19 },
    refreshRetry: { color: theme.accentText, fontSize: 14, lineHeight: 20 },
  });
}
