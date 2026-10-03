import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, Stack, useIsFocused, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type TextInput as NativeTextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MessageCard } from "@/components/ui/controls";
import { HomeIcon } from "@/components/ui/home-icon";
import { Text, TextInput } from "@/components/ui/typography";
import { radius, raisedRing, touch, type AppTheme } from "@/constants/theme";
import { categoriesQueryOptions } from "@/features/categories/query-options";
import { entriesMutationOptions } from "@/features/entries/mutation-options";
import { entriesQueryOptions } from "@/features/entries/query-options";
import {
  searchCardFromParams,
  searchResults,
  type SearchDay,
  type SearchRow,
  type TextPart,
} from "@/features/search/search";
import { walletCardLabel } from "@/features/wallets/cards";
import { toast } from "@/lib/toast";
import { useAppTheme } from "@/lib/use-app-theme";
import type { WalletCard } from "@/types/finance";
import { todayISO } from "@/utils/format";

const EXAMPLES = ["Grab", "อาหาร", "เงินเดือน"];
/** Wait for typing to pause before asking the Ledger. */
const DEBOUNCE_MS = 200;
/** Focus once the push has finished (prototype: 320 ms). */
const FOCUS_DELAY_MS = 320;

function closeSearch() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

function Highlighted({ parts, styles }: { parts: TextPart[]; styles: SearchStyles }) {
  return parts.map((part, index) =>
    part.hit ? (
      <Text key={index} style={styles.hit}>
        {part.text}
      </Text>
    ) : (
      part.text
    )
  );
}

function ResultRow({ row, divider, onOpen }: { row: SearchRow; divider: boolean; onOpen: (row: SearchRow) => void }) {
  const theme = useAppTheme();
  const styles = useSearchStyles();
  const title = row.title.map((part) => part.text).join("");
  const meta = row.meta.map((part) => part.text).join("");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title} ${row.amount} บาท ${meta}`}
      accessibilityHint={row.pending ? "เลือกหมวดของรายการนี้" : "แก้ไขรายการนี้"}
      onPress={() => onOpen(row)}
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
        <Text numberOfLines={1} style={styles.rowTitle}>
          <Highlighted parts={row.title} styles={styles} />
        </Text>
        <Text numberOfLines={1} style={[styles.rowMeta, row.pending && { color: theme.accentText }]}>
          <Highlighted parts={row.meta} styles={styles} />
        </Text>
      </View>
      <Text
        selectable
        style={[styles.rowAmount, row.amountHit ? styles.amountHit : row.income ? { color: theme.success } : null]}
      >
        {row.amount}
      </Text>
    </Pressable>
  );
}

function ResultDay({ day, onOpen }: { day: SearchDay; onOpen: (row: SearchRow) => void }) {
  const styles = useSearchStyles();
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
        <Text style={styles.dayMuted}>{day.countLabel}</Text>
      </View>
      <View style={styles.dayCard}>
        {day.rows.map((row, index) => (
          <ResultRow key={row.id} row={row} divider={index > 0} onOpen={onOpen} />
        ))}
      </View>
    </View>
  );
}

function SearchPig() {
  const styles = useSearchStyles();
  return (
    <Image
      source={require("../../../assets/generated/search-empty-pig.png")}
      contentFit="contain"
      accessibilityLabel="น้องหมูถือแว่นขยายกับปฏิทิน"
      style={styles.pig}
    />
  );
}

export default function SearchScreen() {
  const theme = useAppTheme();
  const styles = useSearchStyles();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string; cardName?: string; cardLast4?: string }>();
  const inputRef = useRef<NativeTextInput>(null);

  const prefilled = typeof params.q === "string" ? params.q : "";
  const [query, setQuery] = useState(prefilled);
  const [settledTerm, setSettledTerm] = useState(prefilled.trim());
  // A card's “ดูทั้งหมด” opens search on that card only (name and last four), until the user lets it go.
  const [card, setCard] = useState<WalletCard | null>(() => searchCardFromParams(params));

  const addRecent = useMutation(entriesMutationOptions.addRecentSearch());
  const removeRecent = useMutation(entriesMutationOptions.removeRecentSearch());
  const recentQuery = useQuery({ ...entriesQueryOptions.recentSearches(), enabled: isFocused });
  const categoriesQuery = useQuery({ ...categoriesQueryOptions.list(), enabled: isFocused });
  const resultsQuery = useQuery({
    ...entriesQueryOptions.search(settledTerm, card),
    // Not paused under the editor or queue: a save, delete or category pick there refreshes the results right away, so
    // coming back never shows the entry as it was.
    enabled: Boolean(settledTerm),
  });

  const term = query.trim();
  const recent = recentQuery.data ?? [];
  // Results shown always belong to the term on screen: while typing settles, or its answer is on its way, wait.
  const settled = term === settledTerm;
  const results = useMemo(
    () =>
      settled && resultsQuery.data
        ? searchResults(resultsQuery.data, { term, today: todayISO(), categories: categoriesQuery.data ?? [] })
        : null,
    [settled, resultsQuery.data, term, categoriesQuery.data]
  );

  useEffect(() => {
    if (term === settledTerm) return;
    const timer = setTimeout(() => setSettledTerm(term), term ? DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [term, settledTerm]);

  useEffect(() => {
    if (prefilled) return;
    const timer = setTimeout(() => inputRef.current?.focus(), FOCUS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [prefilled]);

  const remember = (value = query) => {
    const text = value.trim();
    if (!text) return;
    addRecent.mutate({ term: text });
  };

  const forget = (value: string) => {
    removeRecent.mutate({ term: value }, { onError: () => toast.show({ message: "ลบคำค้นไม่สำเร็จ ลองอีกครั้ง" }) });
  };

  const openRow = (row: SearchRow) => {
    remember();
    if (row.pending) router.push({ pathname: "/pending-categories", params: { ids: row.id } });
    else router.push({ pathname: "/entry/[id]", params: { id: row.id } });
  };

  const clearQuery = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  const header = (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="กลับหน้าแรก"
          onPress={closeSearch}
          style={({ pressed }) => [styles.back, pressed && { backgroundColor: theme.raised }]}
        >
          <MaterialCommunityIcons name="chevron-left" size={30} color={theme.text} />
        </Pressable>
        <View style={styles.field}>
          <HomeIcon name="search" size={20} color={theme.muted} />
          <TextInput
            ref={inputRef}
            accessibilityLabel="ค้นหารายการ"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => remember()}
            placeholder="ค้นหารายการ"
            placeholderTextColor={theme.muted}
            returnKeyType="search"
            maxLength={60}
            autoCorrect={false}
            selectionColor={theme.accentText}
            style={styles.input}
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="ล้างคำค้น"
              onPress={clearQuery}
              style={styles.clear}
            >
              <MaterialCommunityIcons name="close-circle" size={20} color={theme.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>
      {card ? (
        <View style={styles.scope}>
          <MaterialCommunityIcons name="credit-card-outline" size={16} color={theme.accentText} />
          <Text numberOfLines={1} style={styles.scopeText}>
            ค้นเฉพาะ{walletCardLabel(card)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ค้นทุกบัญชี"
            onPress={() => setCard(null)}
            style={styles.scopeClear}
          >
            <Text style={styles.scopeClearText}>ค้นทุกบัญชี</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  const bottom = { paddingBottom: insets.bottom + 24 };

  let body: React.ReactNode;
  if (!term) {
    body = (
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={bottom}>
        {recent.length ? (
          <>
            <Text style={styles.sectionTitle}>ค้นหาล่าสุด</Text>
            <View style={styles.card}>
              {recent.map((value, index) => (
                <View key={value} style={styles.recentRow}>
                  {index > 0 ? <View style={styles.recentDivider} /> : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`ค้นหา ${value}`}
                    onPress={() => {
                      setQuery(value);
                      remember(value);
                    }}
                    style={({ pressed }) => [styles.recentPick, pressed && { backgroundColor: theme.raised }]}
                  >
                    <MaterialCommunityIcons name="history" size={20} color={theme.muted} />
                    <Text numberOfLines={1} style={styles.recentText}>
                      {value}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`ลบคำค้น ${value}`}
                    onPress={() => forget(value)}
                    style={styles.recentRemove}
                  >
                    <MaterialCommunityIcons name="close" size={20} color={theme.muted} />
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        ) : null}
        <View style={styles.hint}>
          <SearchPig />
          <Text style={styles.hintTitle}>พิมพ์ชื่อร้าน ชื่อผู้รับ โน้ต{"\n"}หรือจำนวนเงินก็ได้</Text>
          <Text style={styles.hintBody}>หมูค้นให้ทุกเดือน</Text>
          <View style={styles.examples}>
            {EXAMPLES.map((example) => (
              <Pressable
                key={example}
                accessibilityRole="button"
                onPress={() => setQuery(example)}
                style={({ pressed }) => [styles.example, pressed && { backgroundColor: theme.raised }]}
              >
                <Text style={styles.exampleText}>{example}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  } else if (results?.days.length) {
    body = (
      <FlatList
        data={results.days}
        keyExtractor={(day) => day.date}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={bottom}
        ListHeaderComponent={<Text style={styles.summary}>{results.summary}</Text>}
        renderItem={({ item }) => <ResultDay day={item} onOpen={openRow} />}
        initialNumToRender={6}
      />
    );
  } else if (results) {
    body = (
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={bottom}>
        <View style={[styles.hint, styles.noResults]}>
          <SearchPig />
          <Text style={styles.hintTitle}>ไม่พบ “{term}”</Text>
          <Text style={[styles.hintBody, styles.noResultsBody]}>ลองพิมพ์คำอื่น เช่น ชื่อร้าน หรือจำนวนเงิน</Text>
        </View>
      </ScrollView>
    );
  } else if (settled && resultsQuery.error && !resultsQuery.isFetching) {
    body = (
      // Keeps taps while the keyboard is up, like the other states, so ลองอีกครั้ง needs one tap. The term stays as typed.
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={bottom}>
        <MessageCard
          align="start"
          title="ค้นหาไม่สำเร็จ"
          body="เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง"
          onRetry={() => void resultsQuery.refetch()}
          retryLabel="ลองค้นหาอีกครั้ง"
          style={styles.messageCard}
        />
      </ScrollView>
    );
  } else {
    body = <ActivityIndicator accessibilityLabel="กำลังค้นหา" color={theme.accentText} style={styles.loading} />;
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      {header}
      <View style={styles.body}>{body}</View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    header: { paddingLeft: 4, paddingRight: 16, paddingBottom: 6, backgroundColor: theme.background },
    headerRow: { height: 60, flexDirection: "row", alignItems: "center", gap: 4 },
    back: {
      width: touch.min,
      height: touch.min,
      borderRadius: touch.min / 2,
      alignItems: "center",
      justifyContent: "center",
    },
    field: {
      flex: 1,
      minWidth: 0,
      height: 48,
      borderRadius: 24,
      paddingLeft: 14,
      paddingRight: 6,
      backgroundColor: theme.raised,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    input: { flex: 1, minWidth: 0, height: "100%", paddingVertical: 0, color: theme.text, fontSize: 16 },
    clear: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    scope: { marginLeft: 12, flexDirection: "row", alignItems: "center", gap: 7 },
    scopeText: { flex: 1, color: theme.text, fontSize: 13, lineHeight: 19 },
    scopeClear: { minHeight: touch.min, paddingHorizontal: 6, justifyContent: "center" },
    scopeClearText: { color: theme.accentText, fontSize: 13, lineHeight: 19 },
    body: { flex: 1 },
    sectionTitle: {
      paddingTop: 10,
      paddingHorizontal: 20,
      paddingBottom: 8,
      color: theme.muted,
      fontSize: 13,
      lineHeight: 18,
    },
    card: {
      marginHorizontal: 16,
      borderRadius: radius.card,
      overflow: "hidden",
      backgroundColor: theme.surface,
      ...raisedRing(theme),
    },
    recentRow: { flexDirection: "row", alignItems: "center" },
    recentDivider: { position: "absolute", top: 0, left: 46, right: 0, height: 1, backgroundColor: theme.raised },
    recentPick: {
      flex: 1,
      minWidth: 0,
      minHeight: 52,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    recentText: { flexShrink: 1, color: theme.text, fontSize: 15, lineHeight: 21 },
    recentRemove: {
      width: touch.min,
      height: touch.min,
      marginRight: 4,
      borderRadius: touch.min / 2,
      alignItems: "center",
      justifyContent: "center",
    },
    hint: { paddingTop: 26, paddingHorizontal: 24, alignItems: "center" },
    noResults: { paddingTop: 40 },
    pig: { width: 150, height: 150 },
    hintTitle: { marginTop: 8, color: theme.text, fontSize: 15, lineHeight: 23, textAlign: "center" },
    hintBody: { marginTop: 4, color: theme.muted, fontSize: 13, lineHeight: 20, textAlign: "center" },
    noResultsBody: { marginTop: 2 },
    examples: { marginTop: 14, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
    example: {
      minHeight: 40,
      paddingHorizontal: 14,
      borderRadius: radius.chip,
      borderWidth: 1.2,
      borderColor: theme.border,
      justifyContent: "center",
    },
    exampleText: { color: theme.text, fontSize: 14, lineHeight: 20 },
    summary: { paddingTop: 6, paddingHorizontal: 20, color: theme.muted, fontSize: 13, lineHeight: 20 },
    dayHeader: {
      paddingTop: 16,
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
    dayCard: {
      marginHorizontal: 16,
      borderRadius: radius.card,
      overflow: "hidden",
      backgroundColor: theme.surface,
      ...raisedRing(theme),
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
    rowTitle: { color: theme.text, fontSize: 15, lineHeight: 21 },
    rowMeta: { color: theme.muted, fontSize: 12, lineHeight: 17 },
    hit: { borderRadius: 3, backgroundColor: theme.accent, color: theme.onAccent },
    rowAmount: { color: theme.text, fontSize: 15, lineHeight: 21, fontWeight: "500", fontVariant: ["tabular-nums"] },
    amountHit: {
      paddingHorizontal: 3,
      borderRadius: 4,
      overflow: "hidden",
      backgroundColor: theme.accent,
      color: theme.onAccent,
    },
    loading: { marginTop: 40 },
    messageCard: { marginTop: 8, marginHorizontal: 16 },
  });
}

type SearchStyles = ReturnType<typeof createStyles>;

function useSearchStyles() {
  const theme = useAppTheme();
  return useMemo(() => createStyles(theme), [theme]);
}
