import { useMutation, useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, Stack, useFocusEffect, useIsFocused } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/typography";
import { useAppTheme } from "@/lib/use-app-theme";
import { settingsQueryOptions } from "@/features/settings/query-options";
import { CarrotIcon } from "@/features/streak/components/carrot-icon";
import { streakMutationOptions } from "@/features/streak/mutation-options";
import { streakQueryOptions } from "@/features/streak/query-options";
import { computeStreakStats, isRecordedDay } from "@/features/streak/streak";
import { computeStreakHighlights, type StreakRun } from "@/features/streak/streak-highlights";
import type { DailyActivity, StreakCountMode } from "@/features/streak/types";
import { thaiDate, todayISO, errorMessage } from "@/utils/format";

const emptyRows: never[] = [];

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

function CarrotReward({ size, opacity = 1 }: { size: number; opacity?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        opacity,
      }}
    >
      <Image
        source={require("../../../assets/generated/carrot-reward.png")}
        contentFit="contain"
        accessibilityLabel="รางวัลแครอต"
        style={{ width: size * 1.9, height: size * 1.9 }}
      />
    </View>
  );
}

function WeekDay({
  date,
  today,
  activity,
  mode,
  enabled,
  resetAfter,
}: {
  date: string;
  today: string;
  activity: DailyActivity | undefined;
  mode: StreakCountMode;
  enabled: boolean;
  resetAfter: string;
}) {
  const theme = useAppTheme();
  const recorded = isRecordedDay(activity);
  const active = enabled && date > resetAfter && isRecordedDay(activity, mode);
  const pending = recorded && (activity?.pendingCategoryCount ?? 0) > 0;
  const name = date === today ? "วันนี้" : thaiDate(date, { weekday: "short" });
  const state = !enabled
    ? "ปิดการนับ"
    : date <= resetAfter
      ? "ก่อนเริ่มนับใหม่"
      : active
        ? "นับต่อเนื่อง"
        : pending
          ? "จดแล้วแต่ยังเลือกหมวดไม่ครบ"
          : recorded
            ? "จดแล้ว"
            : "ยังไม่ได้จด";
  return (
    <View
      accessible
      accessibilityLabel={name + ": " + state}
      style={{ flex: 1, minWidth: 0, alignItems: "center", gap: 6 }}
    >
      <Text
        numberOfLines={1}
        style={{
          color: date === today ? theme.accentText : theme.muted,
          fontSize: 12,
          fontWeight: date === today ? "800" : "500",
        }}
      >
        {name}
      </Text>
      <View style={{ width: 45, height: 45, alignItems: "center", justifyContent: "center" }}>
        <CarrotReward size={45} opacity={active ? 1 : recorded ? 0.55 : 0.26} />
        {pending ? (
          <View
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: theme.accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: theme.onAccent, fontSize: 10, fontWeight: "900", lineHeight: 13 }}>!</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function StreakRow({
  title,
  subtitle,
  days,
  pending,
  onPress,
}: {
  title: string;
  subtitle: string;
  days: number;
  pending?: boolean;
  onPress?: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={title + " " + days + " วันต่อเนื่อง " + subtitle}
      onPress={onPress}
      disabled={!onPress}
      style={{
        minHeight: 69,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        paddingVertical: 9,
      }}
    >
      <CarrotReward size={48} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text numberOfLines={1} style={{ color: theme.text, fontSize: 17, fontWeight: "700" }}>
          {title}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: pending ? theme.accentText : theme.muted,
            fontSize: 13,
            fontWeight: pending ? "700" : "400",
          }}
        >
          {subtitle}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
        <Text
          selectable
          style={{
            color: theme.text,
            fontSize: 30,
            lineHeight: 34,
            fontWeight: "900",
            fontVariant: ["tabular-nums"],
          }}
        >
          {days}
        </Text>
        <Text style={{ color: theme.muted, fontSize: 12 }}>วัน</Text>
      </View>
    </Pressable>
  );
}

function formatRunDate(run: StreakRun | null) {
  return run ? "เมื่อ " + thaiDate(run.endDate, { day: "numeric", month: "short", year: "numeric" }) : "ยังไม่มีสถิติ";
}

export default function StreakStatsScreen() {
  const theme = useAppTheme();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  const { width, height } = useWindowDimensions();

  const feedCarrotForDateMutation = useMutation(streakMutationOptions.feedCarrot());

  const [today, setToday] = useState(todayISO());

  const activityQuery = useQuery({
    ...streakQueryOptions.dailyActivity(today),
    enabled: isFocused,
  });
  const settingsQuery = useQuery({ ...streakQueryOptions.settings(), enabled: isFocused });
  const carrotsQuery = useQuery({
    ...settingsQueryOptions.value("carrot_count"),
    enabled: isFocused,
  });
  const lastFedQuery = useQuery({
    ...settingsQueryOptions.value("last_fed_on"),
    enabled: isFocused,
  });

  const queries = [activityQuery, settingsQuery, carrotsQuery, lastFedQuery];
  const loadError = queries.find((query) => query.data === undefined && query.error)?.error?.message;
  const loading = !loadError && queries.some((query) => query.data === undefined);
  const refreshError = queries.find((query) => query.data !== undefined && query.error)?.error;
  const activity = activityQuery.data ?? emptyRows;
  const settings = settingsQuery.data ?? null;
  const parsedCarrots = Number(carrotsQuery.data ?? 0);
  const carrots = Number.isSafeInteger(parsedCarrots) && parsedCarrots >= 0 ? parsedCarrots : 0;
  const lastFedOn = lastFedQuery.data ?? "";

  const [feedError, setFeedError] = useState<string | null>(null);
  const [feeding, setFeeding] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHighest, setShowHighest] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const currentDate = todayISO();
      if (today !== currentDate) setToday(currentDate);
      const clock = setInterval(() => setToday(todayISO()), 60_000);
      return () => {
        clearInterval(clock);
      };
    }, [today])
  );

  const stats = useMemo(() => computeStreakStats(activity, today, settings ?? {}), [activity, today, settings]);
  const eligibleActivity = useMemo(
    () => (settings?.enabled ? activity.filter((day) => day.date > settings.resetAfter) : []),
    [activity, settings]
  );
  const highlights = useMemo(() => computeStreakHighlights(eligibleActivity, today), [eligibleActivity, today]);

  const todayActivity = stats.today;
  const todayCount = todayActivity?.transactionCount ?? 0;
  const pendingCount = todayActivity?.pendingCategoryCount ?? 0;
  const pendingRecentDays = settings?.enabled
    ? stats.recentDates.filter(
        (date) => date > settings.resetAfter && (stats.byDate.get(date)?.pendingCategoryCount ?? 0) > 0
      ).length
    : 0;
  const status = !settings?.enabled
    ? "off"
    : todayCount === 0
      ? "empty"
      : lastFedOn === today
        ? "fed"
        : settings.mode === "categorized" && pendingCount > 0
          ? "pending"
          : "ready";
  const heroHeight = Math.max(365, Math.min(height * 0.45, 440));
  const heroImageWidth = Math.min(width * 1.06, 480);
  const dialogWidth = Math.min(width - 30, 460);

  const feed = async () => {
    if (status !== "ready" || feeding) return;
    try {
      setFeeding(true);
      setFeedError(null);
      await feedCarrotForDateMutation.mutateAsync({ date: today });
    } catch (cause) {
      setFeedError(errorMessage(cause));
    } finally {
      setFeeding(false);
    }
  };

  const actToday = () => {
    if (status === "off") router.push("/streak-settings");
    else if (status === "empty") router.push("/entry");
    else if (status === "pending") router.push("/pending-categories");
    else if (status === "ready") void feed();
  };

  const actionLabel =
    status === "off"
      ? "เปิดการนับ"
      : status === "empty"
        ? "จดรายการ"
        : status === "pending"
          ? "เลือกหมวด"
          : status === "ready"
            ? "ให้แครอต"
            : "ให้แล้ววันนี้";
  const todayLabel =
    status === "off"
      ? "ปิดการนับความต่อเนื่องอยู่"
      : status === "empty"
        ? "วันนี้ยังไม่ได้จดรายการ"
        : status === "pending"
          ? "วันนี้ยังเลือกหมวดไม่ครบ"
          : status === "ready"
            ? "วันนี้จดแล้ว แครอตพร้อม!"
            : "น้องหมูอิ่มแล้ววันนี้";

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}
      >
        <View
          style={{
            height: heroHeight,
            paddingTop: insets.top,
            backgroundColor: theme.accent,
            zIndex: 1,
          }}
        >
          <View
            style={{
              height: 65,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 17,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="กลับหน้าแรก"
              onPress={goBack}
              hitSlop={10}
              style={{
                position: "absolute",
                left: 15,
                top: 0,
                bottom: 0,
                width: 43,
                justifyContent: "center",
              }}
            >
              <Text style={{ color: theme.onAccent, fontSize: 40, lineHeight: 45 }}>‹</Text>
            </Pressable>
            <Text numberOfLines={1} style={{ color: theme.onAccent, fontSize: 20, fontWeight: "900" }}>
              ให้อาหารน้องหมู
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="เมนูสถิติ"
              onPress={() => setMenuOpen(true)}
              hitSlop={10}
              style={{
                position: "absolute",
                right: 15,
                top: 0,
                bottom: 0,
                width: 43,
                alignItems: "flex-end",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: theme.onAccent, fontSize: 32, lineHeight: 40, fontWeight: "900" }}>⋮</Text>
            </Pressable>
          </View>
          <Image
            source={require("../../../assets/generated/streak-hero.png")}
            contentFit="contain"
            accessibilityLabel="น้องหมูกับแครอตและชั้นรางวัล"
            style={{
              position: "absolute",
              left: (width - heroImageWidth) / 2,
              width: heroImageWidth,
              height: Math.min(heroHeight * 0.71, 325),
              bottom: -22,
            }}
          />
        </View>

        <View
          style={{
            width: "100%",
            maxWidth: 680,
            alignSelf: "center",
            paddingHorizontal: 17,
            paddingTop: 36,
          }}
        >
          {loading ? (
            <View style={{ minHeight: 230, justifyContent: "center", alignItems: "center", gap: 13 }}>
              <ActivityIndicator color={theme.accentText} size="large" />
              <Text style={{ color: theme.muted }}>กำลังดูสถิติ…</Text>
            </View>
          ) : loadError ? (
            <View style={{ padding: 20, borderRadius: 18, backgroundColor: theme.raised, gap: 11 }}>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}>โหลดสถิติไม่สำเร็จ</Text>
              <Text selectable style={{ color: theme.muted }}>
                {loadError}
              </Text>
              <Pressable
                onPress={() => {
                  for (const query of queries) void query.refetch();
                }}
              >
                <Text style={{ color: theme.accentText, fontWeight: "800" }}>ลองอีกครั้ง</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={goBack}>
                <Text style={{ color: theme.accentText, fontWeight: "800" }}>กลับหน้าแรก</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {refreshError ? (
                <Text selectable style={{ color: theme.danger, padding: 12 }}>
                  {refreshError.message}
                </Text>
              ) : null}
              <View
                style={{
                  minHeight: 49,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 9,
                  paddingHorizontal: 12,
                  borderRadius: 13,
                  backgroundColor: theme.raised,
                }}
              >
                <CarrotIcon size={25} />
                <Text numberOfLines={1} style={{ flex: 1, color: theme.text, fontSize: 13, fontWeight: "700" }}>
                  {todayLabel}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={actionLabel}
                  disabled={status === "fed" || feeding}
                  onPress={actToday}
                  style={({ pressed }) => ({
                    minHeight: 33,
                    minWidth: 87,
                    paddingHorizontal: 9,
                    borderRadius: 17,
                    backgroundColor: status === "fed" ? theme.raised : theme.accent,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed || feeding ? 0.72 : 1,
                  })}
                >
                  <Text
                    style={{ color: status === "fed" ? theme.text : theme.onAccent, fontSize: 12, fontWeight: "900" }}
                  >
                    {feeding ? "กำลังให้…" : actionLabel}
                  </Text>
                </Pressable>
              </View>
              {feedError ? (
                <Text selectable style={{ color: theme.danger, fontSize: 12, paddingTop: 6 }}>
                  {feedError}
                </Text>
              ) : null}
              <View style={{ paddingTop: 28 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 2 }}>
                  {stats.recentDates.map((date) => (
                    <WeekDay
                      key={date}
                      date={date}
                      today={today}
                      activity={stats.byDate.get(date)}
                      mode={settings?.mode ?? "recorded"}
                      enabled={settings?.enabled ?? false}
                      resetAfter={settings?.resetAfter ?? ""}
                    />
                  ))}
                </View>
                <Text selectable style={{ paddingTop: 10, color: theme.accentText, fontSize: 15, textAlign: "right" }}>
                  {thaiDate(today, { day: "numeric", month: "short" })}
                </Text>
              </View>
              <View style={{ paddingTop: 16 }}>
                <StreakRow
                  title="เลือกหมวดครบถ้วน"
                  subtitle={pendingRecentDays > 0 ? "ยังเลือกไม่ครบ " + pendingRecentDays + " วัน  ›" : "สรุปครบทุกหมวด"}
                  days={highlights.categorized.current}
                  pending={pendingRecentDays > 0}
                  onPress={pendingCount > 0 ? () => router.push("/pending-categories") : undefined}
                />
                <StreakRow title="จดรายรับรายจ่าย" subtitle="จดอย่างน้อยวันละ 1 รายการ" days={highlights.recorded.current} />
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: 16,
                }}
              >
                <Text style={{ color: theme.muted, fontSize: 12 }}>แครอตสะสม {carrots}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={"สถิติสูงสุด " + stats.longest + " วัน ดูรายละเอียด"}
                  onPress={() => setShowHighest(true)}
                  style={({ pressed }) => ({
                    minHeight: 43,
                    minWidth: 184,
                    paddingHorizontal: 15,
                    borderRadius: 23,
                    backgroundColor: theme.raised,
                    borderWidth: 1,
                    borderColor: theme.border,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <CarrotReward size={27} />
                  <Text style={{ color: theme.text, fontSize: 15, fontWeight: "800" }}>สถิติสูงสุด: {stats.longest} ›</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {menuOpen ? (
        <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 10 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ปิดเมนูสถิติ"
            onPress={() => setMenuOpen(false)}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          />
          <View
            style={{
              position: "absolute",
              top: insets.top + 65,
              right: 5,
              width: Math.min(width - 35, 270),
              backgroundColor: theme.surface,
              borderRadius: 17,
              borderWidth: 1,
              borderColor: theme.border,
              overflow: "hidden",
              boxShadow: "0 3px 7px rgba(0,0,0,.18)",
            }}
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setMenuOpen(false);
                router.push("/streak-settings");
              }}
              style={{
                minHeight: 57,
                flexDirection: "row",
                alignItems: "center",
                gap: 11,
                paddingHorizontal: 18,
              }}
            >
              <Text style={{ color: theme.accentText, fontSize: 22 }}>⚙</Text>
              <Text style={{ color: theme.accentText, fontSize: 16, fontWeight: "800" }}>ปรับวิธีนับความต่อเนื่อง</Text>
            </Pressable>
            <View style={{ height: 1, backgroundColor: theme.border }} />
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setMenuOpen(false);
                router.push("/streak-tutorial");
              }}
              style={{
                minHeight: 57,
                flexDirection: "row",
                alignItems: "center",
                gap: 11,
                paddingHorizontal: 18,
              }}
            >
              <Text style={{ color: theme.accentText, fontSize: 22 }}>ⓘ</Text>
              <Text style={{ color: theme.accentText, fontSize: 16, fontWeight: "800" }}>เรียนรู้เพิ่มเติม</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {showHighest ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 11,
            backgroundColor: "rgba(0,0,0,.66)",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 15,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ปิดหน้าต่างสถิติสูงสุด"
            onPress={() => setShowHighest(false)}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          />
          <View
            accessible
            accessibilityLabel="สถิติสูงสุดของพี่มนุษย์"
            style={{
              width: dialogWidth,
              borderRadius: 25,
              overflow: "hidden",
              backgroundColor: theme.raised,
            }}
          >
            <View style={{ height: 165, backgroundColor: theme.accent }}>
              <Image
                source={require("../../../assets/generated/streak-record.png")}
                contentFit="contain"
                accessibilityLabel="น้องหมูดีใจกับรางวัลแครอต"
                style={{ width: "100%", height: 195, position: "absolute", bottom: -15 }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="ปิด"
                onPress={() => setShowHighest(false)}
                hitSlop={10}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 11,
                  width: 40,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: theme.onAccent, fontSize: 31, lineHeight: 36 }}>×</Text>
              </Pressable>
            </View>
            <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 22, gap: 22 }}>
              <Text
                style={{
                  color: theme.text,
                  fontSize: 21,
                  fontWeight: "900",
                  textAlign: "center",
                }}
              >
                สถิติสูงสุดของพี่มนุษย์
              </Text>
              <View style={{ flexDirection: "row", gap: 14 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: theme.muted, fontSize: 14 }}>เลือกหมวดครบ</Text>
                  <Text selectable style={{ color: theme.text, fontSize: 24, fontWeight: "900" }}>
                    {highlights.categorized.longest?.days ?? 0} วัน
                  </Text>
                  <Text style={{ color: theme.muted, fontSize: 12 }}>
                    {formatRunDate(highlights.categorized.longest)}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: theme.muted, fontSize: 14 }}>จดรายรับรายจ่าย</Text>
                  <Text selectable style={{ color: theme.text, fontSize: 24, fontWeight: "900" }}>
                    {highlights.recorded.longest?.days ?? 0} วัน
                  </Text>
                  <Text style={{ color: theme.muted, fontSize: 12 }}>{formatRunDate(highlights.recorded.longest)}</Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowHighest(false)}
                style={{
                  minHeight: 47,
                  borderRadius: 24,
                  backgroundColor: theme.accent,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: theme.onAccent, fontSize: 16, fontWeight: "900" }}>โอเคหมูจด</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
