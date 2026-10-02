import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { SheetBackdrop, SheetPanel } from "@/components/ui/bottom-sheet";
import { Amount } from "@/components/ui/controls";
import { Text } from "@/components/ui/typography";
import { radius, type AppTheme } from "@/constants/theme";
import { categoriesQueryOptions } from "@/features/categories/query-options";
import {
  canSkipInQueue,
  currentInQueue,
  nextInQueue,
  openCategoryQueue,
  queueDoneMessage,
  queueEmptiedMessage,
  queueEntryMeta,
  queueProgress,
  type CategoryQueue,
} from "@/features/entries/category-queue";
import { entriesQueryOptions } from "@/features/entries/query-options";
import { useEntryActions } from "@/features/entries/use-entry-actions";
import { toast } from "@/lib/toast";
import { useAppTheme } from "@/lib/use-app-theme";
import type { FinanceTransaction } from "@/types/finance";
import { formatBaht, todayISO } from "@/utils/format";
import { queryClient } from "@/utils/orpc";

const amountLabel = (satang: number) => formatBaht(satang, satang % 100 === 0 ? 0 : 2);

/**
 * “เลือกหมวด” queue sheet. It opens over the screen that asked for it, for one scope: `ids` (comma separated, in
 * order: Home's pending link for the period and filter it shows, one Home row, a Summary group) or, by default,
 * today's entries that wait for a category (streak).
 */
export default function PendingCategoriesSheet() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { height } = useWindowDimensions();
  const params = useLocalSearchParams<{ ids?: string }>();
  const actions = useEntryActions();

  const pendingQuery = useQuery(entriesQueryOptions.pendingCategories());
  const categoriesQuery = useQuery(categoriesQueryOptions.list());
  const [today] = useState(todayISO);
  const [queue, setQueue] = useState<CategoryQueue | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  /** Three equal columns with 8 between them, as the prototype's grid. */
  const tileWidth = gridWidth > 0 ? (gridWidth - 2 * 8) / 3 : undefined;
  const savingRef = useRef(false);

  // The queue's members are fixed when it opens; later reads only tell which of them still wait.
  const pending = pendingQuery.data;
  if (queue === undefined && pending) {
    const ids = params.ids?.split(",").filter(Boolean);
    const byId = new Map(pending.map((entry) => [entry.id, entry]));
    const scope = ids
      ? ids.map((id) => byId.get(id)).filter((entry): entry is FinanceTransaction => Boolean(entry))
      : pending.filter((entry) => entry.occurredOn === today);
    setQueue(openCategoryQueue(scope));
  }
  const pendingById = useMemo(() => new Map((pending ?? []).map((entry) => [entry.id, entry])), [pending]);
  const current = queue ? currentInQueue(queue, (id) => pendingById.has(id)) : null;
  const entry = current ? pendingById.get(current.id) : undefined;

  const [shown] = useState(() => new Animated.Value(0));
  const closingRef = useRef(false);
  useEffect(() => {
    Animated.timing(shown, {
      toValue: 1,
      duration: 320,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [shown]);
  const close = (message?: string) => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.timing(shown, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
      if (router.canGoBack()) router.back();
      else router.replace("/");
      if (message) toast.show({ message });
    });
  };

  // Nothing (left) to choose: everything in scope got a category, here or in the editor.
  const nothingLeft = queue === null || (queue !== undefined && pending !== undefined && !current);
  const closeWhenEmpty = useEffectEvent(() => {
    // A pick in flight closes the sheet itself, with its toast, once the refreshed list is in.
    if (!savingRef.current) close(queueEmptiedMessage(queue ?? null, pending?.length ?? 0));
  });
  useEffect(() => {
    if (nothingLeft) closeWhenEmpty();
  }, [nothingLeft]);

  const pick = async (categoryId: string) => {
    if (!current || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      await actions.setCategory(current.id, categoryId);
      // The pick refreshed the pending list: move on only if a later entry still waits, else end with the done toast.
      const left = queryClient.getQueryData(entriesQueryOptions.pendingCategories().queryKey) ?? [];
      const stillPending = new Set(left.map((row) => row.id));
      const next = nextInQueue(current.queue);
      if (next && currentInQueue(next, (id) => stillPending.has(id))) setQueue(next);
      else close(queueDoneMessage(left.length));
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const skip = () => {
    if (!current) return;
    setSaveError(null);
    const next = nextInQueue(current.queue);
    if (next) setQueue(next);
    else close();
  };

  const categories = (categoriesQuery.data ?? []).filter(
    (category) => category.kind === (entry?.kind === "income" ? "income" : "expense")
  );
  const loadError =
    (pendingQuery.data === undefined && pendingQuery.error) ||
    (categoriesQuery.data === undefined && categoriesQuery.error);
  const progress = current ? queueProgress(current.queue) : null;
  const translateY = shown.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: shown }]}>
        <SheetBackdrop label="ปิดแผงเลือกหมวด" onPress={() => close()} />
      </Animated.View>
      <SheetPanel
        title="เลือกหมวด"
        accessory={progress ? <Text style={styles.progress}>{progress}</Text> : null}
        onClose={() => close()}
        maxHeightRatio={0.9}
        bottomGap={12}
        style={{ transform: [{ translateY }] }}
      >
        {loadError ? (
          <View style={styles.message}>
            <Text style={styles.messageTitle}>โหลดรายการไม่สำเร็จ</Text>
            <Text style={styles.messageBody}>เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void pendingQuery.refetch();
                void categoriesQuery.refetch();
              }}
              style={styles.textButton}
            >
              <Text style={styles.skipText}>ลองอีกครั้ง</Text>
            </Pressable>
          </View>
        ) : !entry || categoriesQuery.data === undefined ? (
          <ActivityIndicator color={theme.accentText} style={{ marginVertical: 40 }} />
        ) : (
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text numberOfLines={2} style={styles.cardTitle}>
                  {entry.title}
                </Text>
                {/* The prototype sets ฿ at the amount's own size here. */}
                <Amount
                  value={`${amountLabel(entry.amountSatang)} ฿`}
                  showBaht={false}
                  size={20}
                  color={entry.kind === "income" ? theme.success : theme.text}
                />
              </View>
              <Text style={styles.cardMeta}>{queueEntryMeta(entry, today)}</Text>
            </View>
            <View style={styles.grid} onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}>
              {categories.map((category) => (
                <Pressable
                  key={category.id}
                  accessibilityRole="button"
                  accessibilityLabel={`หมวด ${category.name}`}
                  accessibilityState={{ busy: saving }}
                  onPress={() => void pick(category.id)}
                  style={({ pressed }) => [
                    styles.tile,
                    tileWidth !== undefined && { width: tileWidth },
                    pressed && { backgroundColor: theme.border },
                    saving && { opacity: 0.6 },
                  ]}
                >
                  <Text style={styles.tileIcon}>{category.icon}</Text>
                  <Text numberOfLines={2} style={styles.tileName}>
                    {category.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            {saveError ? (
              <Text accessibilityRole="alert" selectable style={styles.error}>
                {saveError}
              </Text>
            ) : null}
            {current && canSkipInQueue(current.queue) ? (
              <Pressable accessibilityRole="button" onPress={skip} style={styles.skipButton}>
                <Text style={styles.skipText}>ข้ามไปก่อน</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="แก้ไขรายการนี้"
              onPress={() => router.push({ pathname: "/entry/[id]", params: { id: entry.id } })}
              style={styles.editButton}
            >
              <MaterialCommunityIcons name="pencil-outline" size={18} color={theme.muted} />
              <Text style={styles.editText}>แก้ไขรายการนี้</Text>
            </Pressable>
          </ScrollView>
        )}
      </SheetPanel>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, justifyContent: "flex-end" },
    progress: { color: theme.muted, fontSize: 13, lineHeight: 18 },
    card: { marginTop: 4, padding: 14, borderRadius: radius.card, backgroundColor: theme.raised },
    cardTop: { flexDirection: "row", alignItems: "baseline", gap: 12 },
    cardTitle: { flex: 1, minWidth: 0, color: theme.text, fontSize: 15, lineHeight: 21 },
    cardMeta: { marginTop: 2, color: theme.muted, fontSize: 12, lineHeight: 17 },
    grid: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
    tile: {
      width: "31.5%",
      minHeight: 78,
      paddingVertical: 10,
      paddingHorizontal: 6,
      borderRadius: radius.tile,
      backgroundColor: theme.raised,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    tileIcon: { fontSize: 22, lineHeight: 27 },
    tileName: { color: theme.text, fontSize: 12, lineHeight: 16, textAlign: "center" },
    error: { marginTop: 12, color: theme.danger, fontSize: 13, lineHeight: 19, textAlign: "center" },
    skipButton: { marginTop: 6, minHeight: 48, alignItems: "center", justifyContent: "center" },
    skipText: { color: theme.accentText, fontSize: 15, lineHeight: 21 },
    editButton: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
    editText: { color: theme.muted, fontSize: 14, lineHeight: 20 },
    message: { paddingVertical: 24, alignItems: "center", gap: 6 },
    messageTitle: { color: theme.text, fontSize: 15, lineHeight: 21 },
    messageBody: { color: theme.muted, fontSize: 13, lineHeight: 19, textAlign: "center" },
    textButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12 },
  });
}
