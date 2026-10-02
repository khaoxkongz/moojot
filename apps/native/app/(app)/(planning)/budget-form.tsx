import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useQuery } from "@tanstack/react-query";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Chip, IconButton, MessageCard, PillButton, SegmentedControl } from "@/components/ui/controls";
import { Text, TextInput } from "@/components/ui/typography";
import { accentRing, radius, raisedRing, touch, type AppTheme } from "@/constants/theme";
import { categoriesQueryOptions } from "@/features/categories/query-options";
import {
  budgetPeriodLine,
  budgetTarget,
  replaceNote,
  WARNING_OPTIONS,
  warningLine,
  type BudgetTarget,
} from "@/features/planning/plan";
import { planningQueryOptions } from "@/features/planning/query-options";
import { useBudgetActions } from "@/features/planning/use-budget-actions";
import { toast } from "@/lib/toast";
import { useAppTheme } from "@/lib/use-app-theme";
import type { Budget } from "@/types/finance";
import { getPeriodForDate } from "@/utils/dates";
import { amountLabel, errorMessage, toSatang, todayISO, typedAmount } from "@/utils/format";
import { queryState } from "@/utils/query-state";

const targets: Array<{ value: BudgetTarget; label: string }> = [
  { value: "all", label: "รวมทุกหมวด" },
  { value: "category", label: "เลือกหมวด" },
  { value: "tag", label: "เลือกแท็ก" },
];

type Draft = {
  target: BudgetTarget;
  categoryId: string | null;
  tagId: string | null;
  amount: string;
  warn: number;
};

const draftOf = (budget: Budget): Draft => ({
  target: budgetTarget(budget),
  categoryId: budget.categoryId,
  tagId: budget.tagId,
  amount: typedAmount(amountLabel(budget.limitSatang)),
  warn: budget.warningThresholdPercent,
});

/** Why the draft cannot be saved yet, in the prototype's words. */
function draftError(draft: Draft) {
  if (draft.target === "category" && !draft.categoryId) return "กรุณาเลือกหมวด";
  if (draft.target === "tag" && !draft.tagId) return "กรุณาเลือกแท็ก";
  if (!toSatang(draft.amount)) return "กรุณาใส่งบที่มากกว่า 0 บาท";
  return null;
}

export default function BudgetFormScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const actions = useBudgetActions();

  // The plan opens a new budget with its month and target, or an existing budget with its ID.
  const params = useLocalSearchParams<{ id?: string; periodKey?: string; target?: BudgetTarget }>();
  const startDayQuery = useQuery({ ...planningQueryOptions.monthStartDay(), enabled: isFocused });
  const startDay = startDayQuery.data ?? 1;
  const periodKey = params.periodKey ?? getPeriodForDate(todayISO(), startDay).periodKey;
  const budgetsQuery = useQuery({ ...planningQueryOptions.budgets(periodKey), enabled: isFocused });
  const categoriesQuery = useQuery({ ...categoriesQueryOptions.list("expense"), enabled: isFocused });
  const tagsQuery = useQuery({ ...categoriesQueryOptions.tags(), enabled: isFocused });
  const {
    ready: loaded,
    pageError: loadError,
    retry,
  } = queryState([startDayQuery, budgetsQuery, categoriesQuery, tagsQuery]);

  const budgets = budgetsQuery.data ?? [];
  const editing = params.id ? (budgets.find((budget) => budget.id === params.id) ?? null) : null;
  const missing = Boolean(params.id && budgetsQuery.data && !editing);

  // The draft starts from the budget being edited once it has loaded, and is the user's from the first change on.
  const [changed, setChanged] = useState<Draft | null>(null);
  const draft: Draft = changed ??
    (editing ? draftOf(editing) : null) ?? {
      target: params.target ?? "all",
      categoryId: null,
      tagId: null,
      amount: "",
      warn: 80,
    };
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const busyRef = useRef(false);

  const patch = (next: Partial<Draft>) => {
    setChanged({ ...draft, ...next });
    setError(null);
  };
  // Picking a choice closes the number pad (it has no return key), so the choice and the save button show.
  const pick = (next: Partial<Draft>) => {
    Keyboard.dismiss();
    patch(next);
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace("/plan"));

  /** One save or delete at a time: shows it busy, and on failure keeps the form open with the reason above the button. */
  const run = async (kind: "save" | "delete", work: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(kind);
    setError(null);
    try {
      await work();
      close();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  const save = () => {
    const invalid = draftError(draft);
    if (invalid) return setError(invalid);
    return run("save", async () => {
      await actions.save({
        id: editing?.id,
        periodKey,
        categoryId: draft.target === "category" ? draft.categoryId : null,
        tagId: draft.target === "tag" ? draft.tagId : null,
        limitSatang: toSatang(draft.amount)!,
        warningThresholdPercent: draft.warn,
      });
      toast.show({ message: editing ? "บันทึกงบแล้ว" : "ตั้งงบแล้ว หมูจะช่วยดูให้" });
    });
  };

  const remove = () => {
    if (!editing) return;
    return run("delete", async () => {
      const deletionId = await actions.remove(editing.id);
      toast.show({
        message: "ลบงบแล้ว",
        action: { label: "เอากลับคืน", busyLabel: "กำลังเอากลับคืน…", run: () => actions.restore(deletionId) },
      });
    });
  };

  const note = replaceNote(budgets, { id: editing?.id, ...draft });
  const limitSatang = toSatang(draft.amount);
  const categories = categoriesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}>
      <View style={{ paddingTop: insets.top }}>
        <View style={styles.header}>
          <IconButton icon="close" size={26} label="ปิด" onPress={close} />
          <Text accessibilityRole="header" numberOfLines={1} style={styles.headerTitle}>
            {params.id ? "แก้ไขงบ" : "ตั้งงบใหม่"}
          </Text>
          <View style={{ width: touch.min }} />
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: 24 }]}
      >
        {loadError ? (
          <MessageCard title="โหลดงบไม่สำเร็จ" body="เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง" onRetry={retry} />
        ) : !loaded ? (
          <ActivityIndicator color={theme.accentText} style={{ paddingVertical: 40 }} />
        ) : missing ? (
          <MessageCard title="ไม่พบงบนี้แล้ว" body="งบนี้อาจถูกลบไปแล้ว กลับไปเลือกจากหน้าวางแผนอีกครั้ง" />
        ) : (
          <>
            <Text style={styles.periodLine}>{budgetPeriodLine(periodKey, startDay)}</Text>

            <Text style={[styles.label, { marginTop: 16 }]}>งบนี้ใช้กับ</Text>
            <SegmentedControl options={targets} value={draft.target} onChange={(target) => pick({ target })} />
            {draft.target === "category" ? (
              <View style={styles.tiles}>
                {categories.map((category) => {
                  const selected = draft.categoryId === category.id;
                  return (
                    <Pressable
                      key={category.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={category.name}
                      onPress={() => pick({ categoryId: category.id })}
                      style={({ pressed }) => [
                        styles.tile,
                        pressed && !selected && { backgroundColor: theme.border },
                        selected && accentRing(theme),
                      ]}
                    >
                      <Text style={styles.tileIcon}>{category.icon}</Text>
                      <Text style={styles.tileName}>{category.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            {draft.target === "tag" ? (
              tags.length ? (
                <View style={styles.chips}>
                  {tags.map((tag) => (
                    <Chip
                      key={tag.id}
                      label={`# ${tag.name}`}
                      selected={draft.tagId === tag.id}
                      onPress={() => pick({ tagId: tag.id })}
                    />
                  ))}
                </View>
              ) : (
                <Text style={[styles.hint, { marginTop: 10 }]}>ยังไม่มีแท็ก เพิ่มแท็กได้ตอนจดรายการ</Text>
              )
            ) : null}

            <Text style={[styles.label, { marginTop: 18 }]}>ใช้ได้เดือนละ</Text>
            <View style={styles.amountBox}>
              <TextInput
                value={draft.amount}
                onChangeText={(text) => patch({ amount: typedAmount(text) })}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={theme.muted}
                accessibilityLabel="วงเงินต่อเดือน (บาท)"
                autoFocus={!params.id}
                style={styles.amountInput}
              />
              <Text style={styles.amountBaht}>฿</Text>
            </View>
            {note ? <Text style={[styles.hint, { marginTop: 8, color: theme.accentText }]}>{note}</Text> : null}

            <Text style={[styles.label, { marginTop: 18 }]}>ให้หมูเตือนเมื่อใช้ไป</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="ให้หมูเตือนเมื่อใช้ไป" style={styles.warns}>
              {WARNING_OPTIONS.map((percent) => {
                const selected = draft.warn === percent;
                return (
                  <Pressable
                    key={percent}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => pick({ warn: percent })}
                    style={({ pressed }) => [
                      styles.warn,
                      selected && { backgroundColor: theme.accent },
                      pressed && !selected && { backgroundColor: theme.border },
                    ]}
                  >
                    <Text style={[styles.warnText, selected && { color: theme.onAccent }]}>{percent}%</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.hint, { marginTop: 8 }]}>{warningLine(limitSatang, draft.warn)}</Text>

            {editing ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={busy === "delete" ? "กำลังลบ…" : "ลบงบนี้"}
                accessibilityState={{ busy: busy === "delete" }}
                onPress={() => void remove()}
                style={({ pressed }) => [styles.delete, pressed && { opacity: 0.7 }]}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={20} color={theme.danger} />
                <Text style={styles.deleteText}>{busy === "delete" ? "กำลังลบ…" : "ลบงบนี้"}</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>

      {loaded && !missing ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
          <PillButton
            label={editing ? "บันทึก" : "ตั้งงบนี้"}
            busy={busy !== null}
            busyLabel={busy === "delete" ? "กำลังลบ…" : "กำลังบันทึก…"}
            onPress={() => void save()}
          />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    header: { height: 52, paddingHorizontal: 6, flexDirection: "row", alignItems: "center" },
    headerTitle: { flex: 1, color: theme.text, fontSize: 17, lineHeight: 24, textAlign: "center" },
    content: { paddingTop: 4, paddingHorizontal: 16 },
    periodLine: { color: theme.muted, fontSize: 13, lineHeight: 19, textAlign: "center" },
    label: { marginHorizontal: 4, marginBottom: 8, color: theme.muted, fontSize: 13, lineHeight: 18 },
    hint: { paddingHorizontal: 4, color: theme.muted, fontSize: 13, lineHeight: 19 },
    tiles: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
    tile: {
      // Three to a row: (100% - two 8 gaps) / 3.
      width: "31.6%",
      flexGrow: 1,
      maxWidth: "33.3%",
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
    chips: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
    amountBox: {
      minHeight: 72,
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: radius.card,
      backgroundColor: theme.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      ...raisedRing(theme),
    },
    amountInput: {
      flex: 1,
      minWidth: 0,
      padding: 0,
      color: theme.text,
      fontSize: 32,
      lineHeight: 38,
      fontWeight: "500",
      fontVariant: ["tabular-nums"],
    },
    amountBaht: { color: theme.muted, fontSize: 20, lineHeight: 26 },
    warns: { flexDirection: "row", gap: 8 },
    warn: {
      flex: 1,
      minHeight: touch.min,
      borderRadius: 12,
      backgroundColor: theme.raised,
      alignItems: "center",
      justifyContent: "center",
    },
    warnText: { color: theme.text, fontSize: 16, lineHeight: 22, fontVariant: ["tabular-nums"] },
    delete: {
      marginTop: 22,
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    deleteText: { color: theme.danger, fontSize: 15, lineHeight: 21 },
    // In the flow under the scroll view, so the keyboard pushes it up instead of covering it.
    footer: {
      paddingTop: 10,
      paddingHorizontal: 16,
      backgroundColor: theme.background,
    },
    error: { marginBottom: 8, color: theme.danger, fontSize: 13, lineHeight: 19, textAlign: "center" },
  });
}
