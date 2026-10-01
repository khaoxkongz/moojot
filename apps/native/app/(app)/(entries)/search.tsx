import { useMutation, useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, Stack, useIsFocused } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/lib/use-app-theme";
import { CategoryGlyph } from "@/components/ui/category-glyph";
import { HomeIcon } from "@/components/ui/home-icon";
import { Text, TextInput } from "@/components/ui/typography";
import { categoriesQueryOptions } from "@/features/categories/query-options";
import { entriesMutationOptions } from "@/features/entries/mutation-options";
import { entriesQueryOptions } from "@/features/entries/query-options";
import type { Category, FinanceTransaction } from "@/types/finance";
import { formatBaht, kindLabel, thaiDate, todayISO } from "@/utils/format";

function dateISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function periodForOffset(offset: number) {
  const [year, month] = todayISO().split("-").map(Number);
  const endMonth = new Date(year, month - 1 + offset * 2, 1);
  const from = dateISO(new Date(endMonth.getFullYear(), endMonth.getMonth() - 1, 1));
  const to = dateISO(new Date(endMonth.getFullYear(), endMonth.getMonth() + 1, 0));
  const label =
    offset === 0
      ? "2 เดือนล่าสุด"
      : `${thaiDate(from, { month: "short" })} – ${thaiDate(to, { month: "short", year: "2-digit" })}`;
  return { from, to, label };
}

function closeSearch() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

function HighlightedText({ value, query }: { value: string; query: string }) {
  const styles = useSearchStyles();
  const term = query.trim();
  if (!term) return <Text>{value}</Text>;
  const lower = value.toLocaleLowerCase();
  const needle = term.toLocaleLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let match = lower.indexOf(needle);
  while (match >= 0) {
    if (match > cursor) parts.push(value.slice(cursor, match));
    parts.push(
      <Text key={`${match}-${parts.length}`} style={styles.highlight}>
        {value.slice(match, match + term.length)}
      </Text>
    );
    cursor = match + term.length;
    match = lower.indexOf(needle, cursor);
  }
  if (cursor < value.length) parts.push(value.slice(cursor));
  return <Text>{parts}</Text>;
}

function MatchingDetail({ item, query }: { item: FinanceTransaction; query: string }) {
  const styles = useSearchStyles();
  const term = query.toLocaleLowerCase();
  const detail =
    [item.title, item.note, item.bank, item.cardName, item.cardLast4].find((value) =>
      Boolean(value?.toLocaleLowerCase().includes(term))
    ) ?? item.title;
  return (
    <Text numberOfLines={2} style={styles.resultDetail}>
      <HighlightedText value={detail} query={query} />
    </Text>
  );
}

function TransferIcon() {
  const theme = useAppTheme();
  return (
    <Svg
      width={34}
      height={34}
      viewBox="0 0 34 34"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path
        d="M3 12h25l-6-6M31 22H6l6 6"
        fill="none"
        stroke={theme.accentText}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ResultIcon({ item, category }: { item: FinanceTransaction; category?: Category }) {
  const styles = useSearchStyles();
  const theme = useAppTheme();
  if (item.kind === "transfer")
    return (
      <View style={styles.resultGlyph}>
        <TransferIcon />
      </View>
    );
  if (category)
    return (
      <View style={styles.resultGlyph}>
        {category.isSystem ? (
          <CategoryGlyph id={category.id} icon={category.icon} />
        ) : (
          <Text style={styles.customCategoryIcon}>{category.icon}</Text>
        )}
      </View>
    );
  return (
    <View style={styles.resultIconFallback}>
      <HomeIcon name="edit" size={22} color={theme.text} />
    </View>
  );
}

function ResultRow({
  item,
  category,
  query,
  onOpen,
}: {
  item: FinanceTransaction;
  category?: Category;
  query: string;
  onOpen: () => void;
}) {
  const styles = useSearchStyles();
  const theme = useAppTheme();
  const amount = formatBaht(item.amountSatang, item.amountSatang % 100 === 0 ? 0 : 2);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${category?.name ?? kindLabel(item.kind)} ${item.title} ${amount} บาท`}
      onPress={onOpen}
      style={({ pressed }) => [styles.resultRow, pressed && { opacity: 0.7 }]}
    >
      <ResultIcon item={item} category={category} />
      <View style={styles.resultCopy}>
        <Text numberOfLines={1} style={styles.resultTitle}>
          <HighlightedText value={category?.name ?? kindLabel(item.kind)} query={query} />
        </Text>
        <MatchingDetail item={item} query={query} />
      </View>
      <Text selectable style={[styles.resultAmount, item.kind === "income" && { color: theme.success }]}>
        {item.kind === "income" ? "+" : ""}
        {amount}
      </Text>
    </Pressable>
  );
}

function ResultDay({
  date,
  items,
  categoryById,
  query,
  onOpen,
}: {
  date: string;
  items: FinanceTransaction[];
  categoryById: Map<string, Category>;
  query: string;
  onOpen: (id: string) => void;
}) {
  const styles = useSearchStyles();
  const theme = useAppTheme();
  const today = date === todayISO();
  return (
    <View style={styles.dayGroup}>
      <View style={styles.dayRail}>
        <View style={[styles.dayAccent, { backgroundColor: today ? theme.accent : theme.text }]} />
        <Text style={[styles.dayName, today && styles.dayToday]}>
          {today ? "วันนี้" : thaiDate(date, { weekday: "short" })}
        </Text>
        <Text style={[styles.dayNumber, today && styles.dayToday]}>{Number(date.slice(-2))}</Text>
        <Text style={[styles.dayMonth, today && styles.dayToday]}>
          {thaiDate(date, { month: "short", year: "2-digit" })}
        </Text>
      </View>
      <View style={styles.dayRows}>
        <View style={styles.dayTop} />
        {items.map((item) => (
          <ResultRow
            key={item.id}
            item={item}
            category={categoryById.get(item.categoryId ?? "")}
            query={query}
            onOpen={() => onOpen(item.id)}
          />
        ))}
      </View>
    </View>
  );
}

export default function SearchScreen() {
  const styles = useSearchStyles();
  const theme = useAppTheme();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [offset, setOffset] = useState(0);

  const period = useMemo(() => periodForOffset(offset), [offset]);

  const addRecentSearchMutation = useMutation(entriesMutationOptions.addRecentSearch());
  const removeRecentSearchMutation = useMutation(entriesMutationOptions.removeRecentSearch());

  const recentQuery = useQuery({ ...entriesQueryOptions.recentSearches(), enabled: isFocused });
  const categoriesQuery = useQuery({ ...categoriesQueryOptions.list(), enabled: isFocused });
  const resultsQuery = useQuery({
    ...entriesQueryOptions.list({
      from: period.from,
      to: period.to,
      search: debouncedTerm,
      limit: 1000,
    }),
    enabled: isFocused && Boolean(debouncedTerm),
  });

  const term = query.trim();
  const recent = recentQuery.data ?? [];
  const loading = Boolean(term) && (debouncedTerm !== term || resultsQuery.isPending);
  const error = resultsQuery.error?.message;

  const categoryById = useMemo(
    () => new Map((categoriesQuery.data ?? []).map((category) => [category.id, category])),
    [categoriesQuery.data]
  );
  const groups = useMemo(() => {
    const grouped = new Map<string, FinanceTransaction[]>();
    for (const item of resultsQuery.data ?? [])
      grouped.set(item.occurredOn, [...(grouped.get(item.occurredOn) ?? []), item]);
    return [...grouped.entries()];
  }, [resultsQuery.data]);

  useEffect(() => {
    if (!term) return;
    const timer = setTimeout(() => setDebouncedTerm(term), 160);
    return () => clearTimeout(timer);
  }, [term]);

  const remember = () => {
    const term = query.trim();
    if (!term) return;
    void addRecentSearchMutation.mutateAsync({ term }).catch(() => {});
  };

  const openResult = (id: string) => {
    remember();
    router.push({ pathname: "/entry/[id]", params: { id } });
  };

  const changeQuery = (value: string) => {
    setQuery(value);
    if (!value.trim()) setDebouncedTerm("");
  };

  const changeOffset = (change: number) => {
    setOffset((value) => Math.min(0, value + change));
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerInner}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="กลับหน้าหลัก"
            onPress={closeSearch}
            style={styles.backButton}
          >
            <HomeIcon name="chevronLeft" size={30} color={theme.onAccent} strokeWidth={2.5} />
          </Pressable>
          <View style={styles.searchField}>
            <HomeIcon name="search" size={25} color={theme.muted} strokeWidth={2.1} />
            <TextInput
              accessibilityLabel="ค้นหารายการ"
              value={query}
              onChangeText={changeQuery}
              onSubmitEditing={remember}
              placeholder="ค้นหารายการ"
              placeholderTextColor={theme.muted}
              returnKeyType="search"
              selectionColor={theme.accentText}
              style={styles.input}
            />
            {query ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="ล้างคำค้น"
                onPress={() => changeQuery("")}
                hitSlop={10}
                style={styles.clearButton}
              >
                <Text style={styles.clearText}>×</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.periodBar}>
        <View style={styles.periodInner}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ช่วง 2 เดือนก่อนหน้า"
            onPress={() => changeOffset(-1)}
            style={styles.periodArrow}
          >
            <HomeIcon name="chevronLeft" size={29} color={theme.accentText} strokeWidth={2.4} />
          </Pressable>
          <View style={styles.periodTitle}>
            <HomeIcon name="calendar" size={22} color={theme.accentText} strokeWidth={2} />
            <Text numberOfLines={1} style={styles.periodText}>
              {period.label}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ช่วง 2 เดือนถัดไป"
            disabled={offset >= 0}
            onPress={() => changeOffset(1)}
            style={[styles.periodArrow, offset >= 0 && styles.periodArrowDisabled]}
          >
            <HomeIcon name="chevronRight" size={29} color={theme.accentText} strokeWidth={2.4} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(28, insets.bottom + 18) }]}
        showsVerticalScrollIndicator={false}
      >
        {!query.trim() ? (
          recent.length ? (
            <View style={styles.history}>
              <Text style={styles.historyTitle}>ล่าสุด</Text>
              {recent.map((term) => (
                <View key={term} style={styles.historyRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`ค้นหา ${term}`}
                    onPress={() => {
                      changeQuery(term);
                      void addRecentSearchMutation.mutateAsync({ term }).catch(() => {});
                    }}
                    style={styles.historyTerm}
                  >
                    <Text numberOfLines={1} style={styles.historyText}>
                      {term}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`ลบคำค้น ${term}`}
                    onPress={() => {
                      void removeRecentSearchMutation.mutateAsync({ term }).catch(() => {});
                    }}
                    style={styles.historyRemove}
                  >
                    <Text style={styles.historyRemoveText}>×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyArtFrame}>
                <Image
                  source={require("../../../assets/generated/search-empty-pig.png")}
                  contentFit="contain"
                  accessibilityLabel="น้องหมูถือแว่นขยายกับปฏิทิน"
                  style={styles.emptyArt}
                />
              </View>
              <Text style={styles.emptyText}>ค้นหารายการ{"\n"}จากชื่อผู้รับและโน้ตที่จดไว้</Text>
            </View>
          )
        ) : loading ? (
          <ActivityIndicator color={theme.accentText} style={styles.loading} />
        ) : error && resultsQuery.data === undefined ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : groups.length ? (
          <View style={styles.results}>
            {error ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            ) : null}
            {groups.map(([date, items]) => (
              <ResultDay
                key={date}
                date={date}
                items={items}
                categoryById={categoryById}
                query={query}
                onOpen={openResult}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyArtFrame}>
              <Image
                source={require("../../../assets/generated/search-empty-pig.png")}
                contentFit="contain"
                accessibilityLabel="น้องหมูถือแว่นขยายกับปฏิทิน"
                style={styles.emptyArt}
              />
            </View>
            <Text style={styles.emptyText}>ไม่พบรายการที่ค้นหา{"\n"}ลองใช้ชื่อผู้รับหรือข้อความในโน้ต</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    header: { height: 104, backgroundColor: theme.accent, justifyContent: "flex-end" },
    headerInner: {
      width: "100%",
      maxWidth: 680,
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      paddingBottom: 5,
      paddingRight: 24,
      gap: 0,
    },
    backButton: { width: 56, height: 51, alignItems: "center", justifyContent: "center" },
    searchField: {
      flex: 1,
      height: 49,
      borderRadius: 30,
      backgroundColor: theme.raised,
      flexDirection: "row",
      alignItems: "center",
      paddingLeft: 19,
      paddingRight: 13,
      gap: 8,
    },
    input: {
      flex: 1,
      height: "100%",
      minWidth: 0,
      color: theme.text,
      fontSize: 19,
      lineHeight: 25,
      paddingVertical: 0,
      outlineStyle: "solid",
      outlineColor: "transparent",
      outlineWidth: 0,
    },
    clearButton: { width: 31, height: 39, alignItems: "center", justifyContent: "center" },
    clearText: { color: theme.text, fontSize: 35, lineHeight: 40, fontWeight: "300" },
    periodBar: {
      height: 60,
      backgroundColor: theme.surface,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
      justifyContent: "center",
    },
    periodInner: {
      width: "100%",
      maxWidth: 680,
      alignSelf: "center",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    periodArrow: { width: 58, height: 54, alignItems: "center", justifyContent: "center" },
    periodArrowDisabled: { opacity: 0.65 },
    periodTitle: {
      minWidth: 170,
      maxWidth: 260,
      flexDirection: "row",
      gap: 7,
      alignItems: "center",
      justifyContent: "center",
    },
    periodText: { color: theme.accentText, fontSize: 19, fontWeight: "800" },
    content: { flexGrow: 1, width: "100%", maxWidth: 680, alignSelf: "center" },
    emptyState: { alignItems: "center", paddingTop: 84, paddingHorizontal: 22 },
    emptyArtFrame: { width: 220, height: 220 },
    emptyArt: { width: 220, height: 220 },
    emptyText: {
      color: theme.muted,
      fontSize: 19,
      lineHeight: 28,
      textAlign: "center",
      marginTop: 16,
    },
    loading: { marginTop: 80 },
    error: { color: theme.danger, fontSize: 15, margin: 22, textAlign: "center" },
    history: { paddingTop: 0 },
    historyTitle: {
      color: theme.text,
      fontSize: 20,
      fontWeight: "800",
      height: 58,
      textAlignVertical: "center",
      paddingHorizontal: 17,
      paddingTop: 15,
    },
    historyRow: {
      minHeight: 64,
      backgroundColor: theme.surface,
      flexDirection: "row",
      alignItems: "center",
      paddingLeft: 17,
      paddingRight: 13,
    },
    historyTerm: { flex: 1, minHeight: 64, justifyContent: "center" },
    historyText: { color: theme.muted, fontSize: 19 },
    historyRemove: { width: 41, height: 50, alignItems: "center", justifyContent: "center" },
    historyRemoveText: { color: theme.muted, fontSize: 35, lineHeight: 41, fontWeight: "300" },
    results: { paddingTop: 5 },
    dayGroup: { flexDirection: "row", marginBottom: 9, backgroundColor: theme.background },
    dayRail: { width: 59, paddingTop: 17, alignItems: "center", position: "relative" },
    dayAccent: { position: "absolute", top: 0, left: 0, width: 4, height: 76 },
    dayName: { color: theme.text, fontSize: 15, lineHeight: 19 },
    dayToday: { color: theme.accentText },
    dayNumber: { color: theme.text, fontSize: 24, lineHeight: 28, fontWeight: "800" },
    dayMonth: { color: theme.text, fontSize: 12, lineHeight: 17, textAlign: "center" },
    dayRows: { flex: 1, minWidth: 0 },
    dayTop: { height: 75, backgroundColor: theme.raised },
    resultRow: {
      minHeight: 87,
      backgroundColor: theme.surface,
      flexDirection: "row",
      alignItems: "center",
      paddingLeft: 18,
      paddingRight: 15,
      gap: 11,
    },
    resultGlyph: { width: 39, height: 42, alignItems: "center", justifyContent: "center" },
    customCategoryIcon: { fontSize: 28 },
    resultIconFallback: {
      width: 39,
      height: 39,
      borderRadius: 20,
      backgroundColor: theme.raised,
      alignItems: "center",
      justifyContent: "center",
    },
    resultCopy: { flex: 1, minWidth: 0, justifyContent: "center", gap: 2 },
    resultTitle: { color: theme.text, fontSize: 17, fontWeight: "800" },
    resultDetail: { color: theme.text, fontSize: 15, lineHeight: 22 },
    highlight: { color: theme.onAccent, backgroundColor: theme.accent },
    resultAmount: {
      color: theme.text,
      fontSize: 17,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
  });
}

function useSearchStyles() {
  const theme = useAppTheme();
  return useMemo(() => createStyles(theme), [theme]);
}
