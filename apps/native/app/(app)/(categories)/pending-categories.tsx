import { useQuery } from "@tanstack/react-query";
import { entriesQueryOptions } from "@/features/entries/query-options";
import { Text } from "@/components/ui/typography";
import { router, Stack, useIsFocused } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, SectionList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { FinanceTransaction } from "@/types/finance";
import { formatBaht, kindLabel, thaiDate, todayISO } from "@/utils/format";

const colors = {
  navy: "#0b243b",
  deepNavy: "#071d30",
  slate: "#20384e",
  yellow: "#ffda60",
  blue: "#2876ee",
  white: "#ffffff",
  muted: "#a6b7c9",
};

type PendingSection = {
  title: string;
  date: string;
  data: FinanceTransaction[];
};
const emptyRows: never[] = [];

function dayLabel(iso: string) {
  if (iso === todayISO()) return "วันนี้";
  return thaiDate(iso, { weekday: "short" });
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

function PendingRow({ item }: { item: FinanceTransaction }) {
  const amount = formatBaht(item.amountSatang, item.amountSatang % 100 === 0 ? 0 : 2);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`เลือกหมวด ${item.title} ${amount} บาท`}
      onPress={() => router.push({ pathname: "/entry/[id]", params: { id: item.id } })}
      style={({ pressed }) => ({
        flexDirection: "row",
        backgroundColor: colors.navy,
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <View style={{ width: 64 }} />
      <View
        style={{
          flex: 1,
          minHeight: 91,
          flexDirection: "row",
          alignItems: "center",
          gap: 13,
          paddingLeft: 18,
          paddingRight: 18,
          backgroundColor: colors.deepNavy,
          borderBottomWidth: 1,
          borderBottomColor: "#112e46",
        }}
      >
        <View
          style={{
            width: 39,
            height: 39,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "#435b6c",
            backgroundColor: "#294257",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: colors.white, fontSize: 25, lineHeight: 30 }}>✎</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text style={{ color: colors.white, fontSize: 17, fontWeight: "800" }}>{kindLabel(item.kind)}</Text>
          <Text numberOfLines={1} style={{ color: colors.white, fontSize: 14, letterSpacing: 0.2 }}>
            {item.title}
          </Text>
        </View>
        <Text
          selectable
          style={{
            color: colors.white,
            fontSize: 17,
            fontWeight: "700",
            fontVariant: ["tabular-nums"],
          }}
        >
          {amount}
        </Text>
      </View>
    </Pressable>
  );
}

export default function PendingCategoriesScreen() {
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const pendingQuery = useQuery({ ...entriesQueryOptions.pendingCategories(), enabled: isFocused });
  const transactions = pendingQuery.data ?? emptyRows;
  const error = pendingQuery.data === undefined ? pendingQuery.error?.message : null;
  const loading = pendingQuery.data === undefined && !error;

  const sections = useMemo<PendingSection[]>(() => {
    const byDate = new Map<string, FinanceTransaction[]>();
    for (const item of transactions) byDate.set(item.occurredOn, [...(byDate.get(item.occurredOn) ?? []), item]);
    return [...byDate].map(([date, data]) => ({
      date,
      title: thaiDate(date, { weekday: "long", day: "numeric", month: "long" }),
      data,
    }));
  }, [transactions]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.navy }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ backgroundColor: colors.yellow, paddingTop: insets.top }}>
        <View
          style={{
            minHeight: 66,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 16,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="กลับหน้าแรก"
            onPress={goBack}
            hitSlop={12}
            style={{
              position: "absolute",
              left: 16,
              top: 0,
              bottom: 0,
              width: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.deepNavy, fontSize: 38, lineHeight: 43 }}>‹</Text>
          </Pressable>
          <Text style={{ color: colors.deepNavy, fontSize: 21, fontWeight: "800" }}>เลือกหมวดต่อเนื่อง</Text>
        </View>
      </View>
      {pendingQuery.data !== undefined && pendingQuery.error ? (
        <Text selectable style={{ color: "#FFD0C8", padding: 14 }}>
          {pendingQuery.error.message}
        </Text>
      ) : null}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
          <ActivityIndicator color={colors.yellow} size="large" />
          <Text style={{ color: colors.muted }}>กำลังดูรายการที่รอเลือกหมวด…</Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 28, gap: 14 }}>
          <Text style={{ color: colors.white, fontSize: 18, fontWeight: "700" }}>โหลดรายการไม่สำเร็จ</Text>
          <Text selectable style={{ color: colors.muted, textAlign: "center" }}>
            {error}
          </Text>
          <Pressable
            onPress={() => {
              void pendingQuery.refetch();
            }}
          >
            <Text style={{ color: colors.yellow, fontWeight: "800" }}>ลองอีกครั้ง</Text>
          </Pressable>
          <Pressable
            onPress={goBack}
            style={{
              backgroundColor: colors.blue,
              borderRadius: 18,
              paddingHorizontal: 22,
              paddingVertical: 11,
            }}
          >
            <Text style={{ color: colors.white, fontWeight: "800" }}>กลับหน้าแรก</Text>
          </Pressable>
        </View>
      ) : sections.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 12 }}>
          <Text style={{ fontSize: 55 }}>🐷</Text>
          <Text style={{ color: colors.white, fontSize: 21, fontWeight: "800" }}>เลือกหมวดครบแล้ว!</Text>
          <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 21 }}>
            รายการที่ยังไม่ระบุหมวดจะปรากฏที่นี่
          </Text>
          <Pressable
            onPress={goBack}
            style={{
              marginTop: 9,
              backgroundColor: colors.blue,
              borderRadius: 20,
              paddingHorizontal: 24,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: colors.white, fontWeight: "800" }}>กลับหน้าแรก</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{
            paddingTop: 17,
            paddingBottom: Math.max(insets.bottom, 20) + 30,
          }}
          renderSectionHeader={({ section }) => (
            <View
              accessibilityLabel={section.title}
              style={{ flexDirection: "row", minHeight: 75, backgroundColor: colors.navy }}
            >
              <View
                style={{
                  width: 64,
                  borderLeftWidth: section.date === todayISO() ? 4 : 0,
                  borderLeftColor: colors.yellow,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: section.date === todayISO() ? colors.yellow : colors.muted,
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  {dayLabel(section.date)}
                </Text>
                <Text
                  style={{
                    color: section.date === todayISO() ? colors.yellow : colors.white,
                    fontSize: 23,
                    fontWeight: "800",
                  }}
                >
                  {Number(section.date.slice(-2))}
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  paddingHorizontal: 18,
                  backgroundColor: colors.slate,
                }}
              >
                <Text style={{ color: colors.muted, fontSize: 13 }}>{section.title}</Text>
                <Text style={{ color: colors.white, fontSize: 14, fontWeight: "700" }}>
                  {section.data.length} รายการรอเลือกหมวด
                </Text>
              </View>
            </View>
          )}
          renderItem={({ item }) => <PendingRow item={item} />}
        />
      )}
    </View>
  );
}
