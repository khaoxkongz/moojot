import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

import { Button, Card, EmptyState, SectionHeading } from "@/components/ui/moo-ui";
import { Text } from "@/components/ui/typography";
import { useAppTheme } from "@/lib/use-app-theme";
import { categoriesQueryOptions } from "@/features/categories/query-options";
import { planningQueryOptions } from "@/features/planning/query-options";
import { getPeriodForDate, periodKeyOffset, shiftPeriodKey } from "@/utils/dates";
import { formatMoney, kindLabel, todayISO } from "@/utils/format";
import { orpc, queryClient } from "@/utils/orpc";

export default function PlanScreen() {
  const theme = useAppTheme();
  const isFocused = useIsFocused();

  // Summary's วางแผนงบ passes the month it shows, so the plan opens on that month; the arrows take over after.
  const params = useLocalSearchParams<{ periodKey?: string }>();
  const [chosenOffset, setOffset] = useState<number | null>(null);

  const startDayQuery = useQuery({ ...planningQueryOptions.monthStartDay(), enabled: isFocused });
  const currentKey = getPeriodForDate(todayISO(), startDayQuery.data ?? 1).periodKey;
  const offset = chosenOffset ?? (params.periodKey ? periodKeyOffset(currentKey, params.periodKey) : 0);
  const periodKey = shiftPeriodKey(currentKey, offset);
  const [year, month] = periodKey.split("-").map(Number);
  const periodLabel = new Date(year, month - 1, 1).toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
  });
  const budgetsQuery = useQuery({
    ...planningQueryOptions.budgetStatuses(periodKey),
    enabled: isFocused && startDayQuery.data !== undefined,
  });
  const rulesQuery = useQuery({ ...planningQueryOptions.recurringRules(), enabled: isFocused });
  const categoriesQuery = useQuery({ ...categoriesQueryOptions.list(), enabled: isFocused });
  const tagsQuery = useQuery({ ...categoriesQueryOptions.tags(), enabled: isFocused });

  const budgets = budgetsQuery.data ?? [];
  const rules = rulesQuery.data ?? [];
  const error = [
    startDayQuery.error,
    budgetsQuery.error,
    rulesQuery.error,
    categoriesQuery.error,
    tagsQuery.error,
  ].find((cause) => cause != null);
  const loading =
    !error &&
    [startDayQuery, budgetsQuery, rulesQuery, categoriesQuery, tagsQuery].some((query) => query.data === undefined);

  const categoryById = useMemo(
    () => new Map((categoriesQuery.data ?? []).map((item) => [item.id, item])),
    [categoriesQuery.data]
  );
  const tagById = useMemo(() => new Map((tagsQuery.data ?? []).map((item) => [item.id, item])), [tagsQuery.data]);

  const overCount = budgets.filter((item) => item.isOverLimit).length;
  const nearCount = budgets.filter((item) => item.isNearLimit && !item.isOverLimit).length;
  const overallBudget = budgets.find((item) => !item.budget.categoryId && !item.budget.tagId);

  return (
    <ScrollView
      bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{
        alignItems: "center",
        paddingHorizontal: 18,
        paddingTop: 14,
        paddingBottom: 110,
      }}
    >
      <View style={{ width: "100%", maxWidth: 680, gap: 20 }}>
        <Text style={{ color: theme.muted, fontSize: 13, fontWeight: "700" }}>วางแผนเงินให้สบายใจขึ้นอีกนิด 🐷</Text>
        <LinearGradient
          colors={[theme.accent, theme.accentSoft]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 22, borderRadius: 27, overflow: "hidden", gap: 9 }}
        >
          <View
            style={{
              position: "absolute",
              width: 160,
              height: 160,
              borderRadius: 90,
              right: -35,
              top: -60,
              backgroundColor: "rgba(255,255,255,.16)",
            }}
          />
          <Text style={{ color: theme.onAccent, fontSize: 13, fontWeight: "700" }}>แผนการเงินของฉัน</Text>
          <Text style={{ color: theme.onAccent, fontSize: 27, fontWeight: "900" }}>{budgets.length} งบประมาณ</Text>
          <Text style={{ color: theme.onAccent, fontSize: 13, fontWeight: "700", opacity: 0.95 }}>
            {overCount
              ? `${overCount} งบเกินวงเงิน`
              : nearCount
                ? `${nearCount} งบใกล้ถึงวงเงิน`
                : budgets.length
                  ? "ทุกงบยังอยู่ในแผน"
                  : "เริ่มตั้งงบที่เหมาะกับเรา"}
          </Text>
          {overallBudget ? (
            <View
              style={{
                backgroundColor: "rgba(255,255,255,.22)",
                borderRadius: 15,
                padding: 12,
                gap: 5,
                marginTop: 5,
              }}
            >
              <Text style={{ color: theme.onAccent, fontSize: 11 }}>งบรวมเดือนนี้</Text>
              <Text
                selectable
                style={{
                  color: theme.onAccent,
                  fontSize: 19,
                  fontWeight: "900",
                  fontVariant: ["tabular-nums"],
                }}
              >
                {formatMoney(overallBudget.spentSatang, 0)} / {formatMoney(overallBudget.budget.limitSatang, 0)}
              </Text>
            </View>
          ) : null}
        </LinearGradient>

        <View style={{ gap: 13 }}>
          <SectionHeading
            title="งบประมาณ"
            action="เพิ่มงบ"
            onPress={() => router.push({ pathname: "/budget-form", params: { periodKey } })}
          />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="เดือนก่อนหน้า"
              onPress={() => setOffset(offset - 1)}
              style={{
                width: 42,
                height: 42,
                borderRadius: 15,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ color: theme.text, fontSize: 28, lineHeight: 32 }}>‹</Text>
            </Pressable>
            <Text selectable style={{ color: theme.text, fontSize: 16, fontWeight: "800" }}>
              {periodLabel}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="เดือนถัดไป"
              disabled={offset >= 0}
              onPress={() => setOffset(Math.min(0, offset + 1))}
              style={{
                width: 42,
                height: 42,
                borderRadius: 15,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                opacity: offset >= 0 ? 0.35 : 1,
              }}
            >
              <Text style={{ color: theme.text, fontSize: 28, lineHeight: 32 }}>›</Text>
            </Pressable>
          </View>
          {error ? (
            <Card style={{ gap: 10 }}>
              <Text selectable style={{ color: theme.danger }}>
                {error.message}
              </Text>
              <Button
                label="ลองอีกครั้ง"
                variant="soft"
                onPress={() =>
                  void queryClient
                    .invalidateQueries({ queryKey: orpc.ledger.listTransactions.queryKey() })
                    .catch(() => {})
                }
              />
            </Card>
          ) : null}
          {loading ? (
            <ActivityIndicator color={theme.accentText} style={{ paddingVertical: 25 }} />
          ) : budgetsQuery.data === undefined ? null : budgets.length === 0 ? (
            <Card style={{ gap: 4 }}>
              <EmptyState
                icon="🎯"
                title="ยังไม่ได้ตั้งงบเดือนนี้"
                body="ตั้งวงเงินรวม หรือแยกตามหมวดหมู่และแท็ก เพื่อเห็นว่าใช้ไปเท่าไรแล้ว"
              />
              <Button
                label="ตั้งงบแรก"
                onPress={() => router.push({ pathname: "/budget-form", params: { periodKey } })}
              />
            </Card>
          ) : (
            budgets.map((status) => {
              const category = categoryById.get(status.budget.categoryId ?? "");
              const tag = tagById.get(status.budget.tagId ?? "");
              const name = category ? `${category.icon} ${category.name}` : tag ? `# ${tag.name}` : "💰 งบรวม";
              const color = status.isOverLimit ? theme.danger : status.isNearLimit ? theme.accent : theme.success;
              return (
                <Pressable
                  key={status.budget.id}
                  accessibilityRole="button"
                  accessibilityLabel={`แก้ไขงบ ${name}`}
                  onPress={() =>
                    router.push({
                      pathname: "/budget-form",
                      params: { id: status.budget.id, periodKey: status.budget.periodKey },
                    })
                  }
                >
                  <Card style={{ gap: 13 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Text style={{ flex: 1, color: theme.text, fontSize: 15, fontWeight: "800" }}>{name}</Text>
                      <Text style={{ color, fontSize: 12, fontWeight: "800" }}>
                        {status.isOverLimit ? "เกินงบ" : status.isNearLimit ? "ใกล้เต็ม" : "ตามแผน"}
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 10,
                        borderRadius: 99,
                        backgroundColor: theme.border,
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.min(100, Math.max(0, status.percentUsed))}%`,
                          height: 10,
                          borderRadius: 99,
                          backgroundColor: color,
                        }}
                      />
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        selectable
                        style={{
                          color: theme.text,
                          fontSize: 14,
                          fontWeight: "800",
                          fontVariant: ["tabular-nums"],
                        }}
                      >
                        {formatMoney(status.spentSatang, 0)}{" "}
                        <Text style={{ color: theme.muted, fontWeight: "600" }}>
                          / {formatMoney(status.budget.limitSatang, 0)}
                        </Text>
                      </Text>
                      <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "700" }}>
                        {Math.round(status.percentUsed)}%
                      </Text>
                    </View>
                    <Text
                      selectable
                      style={{
                        color: status.isOverLimit ? theme.danger : theme.muted,
                        fontSize: 12,
                      }}
                    >
                      {status.isOverLimit
                        ? `เกินไป ${formatMoney(-status.remainingSatang, 0)}`
                        : `เหลือ ${formatMoney(status.remainingSatang, 0)}`}
                    </Text>
                  </Card>
                </Pressable>
              );
            })
          )}
        </View>

        <View style={{ gap: 13 }}>
          <SectionHeading title="รายการจดซ้ำ" action="เพิ่มรายการ" onPress={() => router.push("/recurring-form")} />
          {rulesQuery.data !== undefined && rules.length === 0 ? (
            <Card style={{ gap: 4 }}>
              <EmptyState
                icon="🗓️"
                title="ยังไม่มีรายการจดซ้ำ"
                body="เงินเดือน ค่าเช่า หรือค่าบริการประจำ ตั้งครั้งเดียวแล้วหมูจะจดตามวันที่กำหนด"
              />
              <Button label="สร้างรายการจดซ้ำ" variant="soft" onPress={() => router.push("/recurring-form")} />
            </Card>
          ) : (
            rules.map((rule) => (
              <Pressable
                key={rule.id}
                accessibilityRole="button"
                accessibilityLabel={`แก้ไขรายการจดซ้ำ ${rule.title}`}
                onPress={() => router.push({ pathname: "/recurring-form", params: { id: rule.id } })}
              >
                <Card
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    opacity: rule.isActive ? 1 : 0.55,
                  }}
                >
                  <View
                    style={{
                      width: 43,
                      height: 43,
                      borderRadius: 15,
                      backgroundColor: rule.kind === "income" ? theme.raised : theme.raised,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>
                      {rule.kind === "income" ? "↗" : rule.kind === "expense" ? "↘" : "🔄"}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text style={{ color: theme.text, fontSize: 14, fontWeight: "800" }} numberOfLines={1}>
                      {rule.title}
                    </Text>
                    <Text style={{ color: theme.muted, fontSize: 11 }}>
                      ทุกวันที่ {rule.dayOfMonth} · {kindLabel(rule.kind)}
                      {rule.isActive ? "" : " · หยุดชั่วคราว"}
                    </Text>
                  </View>
                  <Text
                    selectable
                    style={{
                      color: rule.kind === "income" ? theme.success : theme.text,
                      fontSize: 14,
                      fontWeight: "800",
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {formatMoney(rule.amountSatang, 0)}
                  </Text>
                </Card>
              </Pressable>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}
