import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { router, useIsFocused, useNavigation } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, Keyboard, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Chip,
  GroupedList,
  GroupedRow,
  IconButton,
  PillButton,
  RowIcon,
  SegmentedControl,
} from "@/components/ui/controls";
import { Text, TextInput } from "@/components/ui/typography";
import { menuShadow, radius, raisedRing, touch, type AppTheme } from "@/constants/theme";
import { categoriesMutationOptions } from "@/features/categories/mutation-options";
import { categoriesQueryOptions } from "@/features/categories/query-options";
import {
  finishCalculator,
  groupAmountDigits,
  openCalculator,
  pasteIntoCalculator,
  pressCalculator,
  type CalculatorKey,
  type CalculatorState,
} from "@/features/entries/calculator";
import { AmountKeypad } from "@/features/entries/components/amount-keypad";
import { CalendarSheet } from "@/features/entries/components/calendar-sheet";
import { CategoryTagSheet } from "@/features/entries/components/category-tag-sheet";
import { EntryExitDialog } from "@/features/entries/components/entry-exit-dialog";
import { SlipSourceCard } from "@/features/entries/components/slip-source-card";
import { dateLabel } from "@/features/entries/date";
import {
  changeEntryKind,
  checkEntryDraft,
  entrySourceChoices,
  entryTitlePlaceholder,
  hasEntryChanges,
  selectEntrySource,
  selectedEntrySource,
  type EntryDraft,
} from "@/features/entries/entry-draft";
import { useEntryActions } from "@/features/entries/use-entry-actions";
import { walletsQueryOptions } from "@/features/wallets/query-options";
import { toast } from "@/lib/toast";
import { useAppTheme } from "@/lib/use-app-theme";
import type { FinanceTransaction, TransactionKind } from "@/types/finance";
import { kindLabel, todayISO, toSatang } from "@/utils/format";

const emptyRows: never[] = [];
const kindOptions = (["expense", "income", "transfer"] as const).map((value) => ({ value, label: kindLabel(value) }));
const amountCaption: Record<TransactionKind, string> = {
  expense: "จำนวนเงินที่จ่าย",
  income: "จำนวนเงินที่ได้รับ",
  transfer: "จำนวนเงินที่ย้าย",
};
const sourceCaption: Record<TransactionKind, string> = {
  expense: "จ่ายจากบัญชี",
  income: "รับเข้าบัญชี",
  transfer: "ย้ายจากบัญชี",
};
/** Entry amount is 40, dropping to 32 above 10 characters and 26 above 14. */
const amountSize = (text: string) => (text.length > 14 ? 26 : text.length > 10 ? 32 : 40);
const KEYPAD_SPACE = 360;

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

export type EntryEditorProps =
  | { mode: "create"; initialDraft: EntryDraft }
  | { mode: "edit"; id: string; transaction: FinanceTransaction; initialDraft: EntryDraft };

/**
 * The full-screen entry editor for a new or an existing entry. Nothing is lost on a failed save: the draft stays and
 * can be saved again. Closing with changes asks to save or discard. Deleting is immediate with a “เอากลับคืน” toast.
 */
export function EntryEditor(props: EntryEditorProps) {
  const { mode, initialDraft } = props;
  const editing = props.mode === "edit" ? props : null;
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const navigation = useNavigation();
  const actions = useEntryActions();

  const [draft, setDraft] = useState(initialDraft);
  const [keypadOpen, setKeypadOpen] = useState(mode === "create");
  const [calc, setCalc] = useState<CalculatorState>(() => openCalculator(initialDraft.amount));
  const [amountError, setAmountError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [allowExit, setAllowExit] = useState(false);
  const busyRef = useRef(false);
  const guided = useRef(mode === "create");
  const pendingExit = useRef<(() => void) | null>(null);

  const createTagMutation = useMutation(categoriesMutationOptions.createTag());
  const categoriesQuery = useQuery({ ...categoriesQueryOptions.list(), enabled: isFocused });
  const tagsQuery = useQuery({ ...categoriesQueryOptions.tags(), enabled: isFocused });
  const banksQuery = useQuery({ ...walletsQueryOptions.banks(), enabled: isFocused });
  const cardsQuery = useQuery({ ...walletsQueryOptions.cards(), enabled: isFocused });
  const categories = categoriesQuery.data ?? emptyRows;
  const tags = tagsQuery.data ?? emptyRows;
  const cards = cardsQuery.data ?? emptyRows;

  const fromSlip = editing?.transaction.source === "slip";
  const category = categories.find((item) => item.id === draft.categoryId) ?? null;
  const selectedTags = tags.filter((tag) => draft.tagIds.includes(tag.id));
  const sourceChoices = useMemo(
    () => entrySourceChoices({ banks: banksQuery.data ?? emptyRows, cards }, draft),
    [banksQuery.data, cards, draft]
  );
  const selectedSource = selectedEntrySource(sourceChoices, draft);
  const loadError = [categoriesQuery, tagsQuery].find((query) => query.data === undefined && query.error)?.error;
  const hasUnsavedChanges = hasEntryChanges(draft, initialDraft);

  const update = (next: EntryDraft) => {
    setDraft(next);
    setError(null);
  };
  const withAmount = (base: EntryDraft, amount: string | undefined) =>
    amount === undefined ? base : { ...base, amount: amount === "0" ? "" : amount };

  /** The draft with any open calculation finished, or null when the calculation cannot be used. */
  const committedDraft = (): EntryDraft | null => {
    if (!keypadOpen) return draft;
    const finished = finishCalculator(calc);
    setCalc(finished.state);
    if (finished.amount === null) return null;
    const next = withAmount(draft, finished.amount);
    setDraft(next);
    setKeypadOpen(false);
    return next;
  };

  const openKeypad = () => {
    Keyboard.dismiss();
    setMenuOpen(false);
    setAmountError(null);
    if (keypadOpen) return;
    setCalc(openCalculator(draft.amount));
    setKeypadOpen(true);
  };

  const pressKey = (key: CalculatorKey) => {
    const step = pressCalculator(calc, key);
    setCalc(step.state);
    if (step.amount !== undefined) update(withAmount(draft, step.amount));
  };

  const finishKeypad = () => {
    const next = committedDraft();
    if (!next) return;
    if (guided.current && next.kind !== "transfer" && !next.categoryId && toSatang(next.amount)) setPickerOpen(true);
    guided.current = false;
  };

  const paste = async () => {
    let text = "";
    try {
      text = await Clipboard.getStringAsync();
    } catch {
      setCalc((state) => ({ ...state, error: "ไม่สามารถวางจำนวนเงินได้" }));
      return;
    }
    const step = pasteIntoCalculator(calc, text);
    setCalc(step.state);
    if (step.amount !== undefined) update(withAmount(draft, step.amount));
  };

  const save = async () => {
    if (busyRef.current) return;
    setMenuOpen(false);
    const next = committedDraft();
    if (!next) return;
    const checked = checkEntryDraft(next, { categoryName: category?.name });
    if (!checked.ok) {
      pendingExit.current = null;
      if (checked.field === "amount") {
        setAmountError(checked.message);
        setCalc(openCalculator(next.amount));
        setKeypadOpen(true);
      } else setError(checked.message);
      return;
    }
    busyRef.current = true;
    setBusy("save");
    setError(null);
    try {
      await actions.save({ id: editing?.id, input: checked.input });
      pendingExit.current ??= goBack;
      setAllowExit(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      pendingExit.current = null;
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!editing || busyRef.current) return;
    setMenuOpen(false);
    busyRef.current = true;
    setBusy("delete");
    setError(null);
    try {
      await actions.remove(editing.id);
      const id = editing.id;
      toast.show({
        message: "ลบรายการแล้ว",
        action: { label: "เอากลับคืน", busyLabel: "กำลังเอากลับคืน…", run: () => actions.restore(id) },
      });
      pendingExit.current = goBack;
      setAllowExit(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  const requestClose = () => {
    setMenuOpen(false);
    const next = keypadOpen ? (committedDraft() ?? draft) : draft;
    if (hasEntryChanges(next, initialDraft)) {
      pendingExit.current = goBack;
      setExitDialogOpen(true);
    } else goBack();
  };

  usePreventRemove(hasUnsavedChanges && !allowExit, ({ data }) => {
    pendingExit.current = () => navigation.dispatch(data.action);
    setExitDialogOpen(true);
  });

  useEffect(() => {
    if (!allowExit) return;
    const exit = pendingExit.current ?? goBack;
    pendingExit.current = null;
    exit();
  }, [allowExit]);

  const beginRecurring = () => {
    const next = committedDraft() ?? draft;
    router.push({
      pathname: "/recurring-form",
      params: {
        kind: next.kind,
        amount: next.amount,
        title: next.title.trim() || next.note.trim() || category?.name || kindLabel(next.kind),
        note: next.note,
        occurredOn: next.occurredOn,
        categoryId: next.categoryId ?? "",
        tagIds: next.tagIds.join(","),
        bank: next.bank,
        cardName: next.cardName,
        cardLast4: next.cardLast4,
      },
    });
  };

  const amountText = keypadOpen
    ? groupAmountDigits(calc.expression)
    : toSatang(draft.amount)
      ? groupAmountDigits(draft.amount)
      : "0";
  const size = amountSize(amountText);
  const today = todayISO();

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
      enabled={!keypadOpen}
    >
      <View style={{ paddingTop: insets.top }}>
        <View style={styles.header}>
          <IconButton icon="close" size={26} label="ปิดหน้าจดรายการ" onPress={requestClose} />
          <Text accessibilityRole="header" numberOfLines={1} style={styles.headerTitle}>
            {mode === "create" ? "จดรายการ" : "แก้ไขรายการ"}
          </Text>
          {editing ? (
            <IconButton
              icon="dots-vertical"
              size={24}
              label="ตัวเลือกเพิ่มเติม"
              onPress={() => {
                if (keypadOpen) committedDraft();
                setMenuOpen((open) => !open);
              }}
            />
          ) : (
            <View style={{ width: touch.min }} />
          )}
        </View>
        <View style={styles.segment}>
          <SegmentedControl
            options={kindOptions}
            value={draft.kind}
            onChange={(kind) => {
              update(changeEntryKind(draft, kind));
            }}
          />
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: (keypadOpen ? KEYPAD_SPACE : 98) + insets.bottom }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${amountCaption[draft.kind]} ${amountText} บาท`}
          accessibilityHint="แตะเพื่อใส่จำนวนเงิน"
          onPress={openKeypad}
          style={[
            styles.amountCard,
            keypadOpen
              ? { boxShadow: `inset 0 0 0 1.5px ${theme.accent}` }
              : amountError
                ? { boxShadow: `inset 0 0 0 1.5px ${theme.danger}` }
                : raisedRing(theme),
          ]}
        >
          <Text style={styles.caption13}>{amountCaption[draft.kind]}</Text>
          {keypadOpen && calc.history ? <Text style={styles.history}>{groupAmountDigits(calc.history)}</Text> : null}
          <View style={styles.amountRow}>
            <Text
              numberOfLines={1}
              style={[
                styles.amount,
                {
                  fontSize: size,
                  lineHeight: Math.round(size * 1.2),
                  color: amountText === "0" ? theme.muted : draft.kind === "income" ? theme.success : theme.text,
                },
              ]}
            >
              {amountText}
            </Text>
            {keypadOpen ? <Caret height={Math.round(size * 0.82)} /> : null}
            <Text style={styles.baht}>฿</Text>
          </View>
          {amountError ? (
            <Text accessibilityRole="alert" style={styles.amountError}>
              {amountError}
            </Text>
          ) : null}
        </Pressable>

        <GroupedList style={styles.group}>
          {draft.kind !== "transfer" ? (
            <DetailRow
              label="หมวด"
              onPress={() => {
                committedDraft();
                guided.current = false;
                setPickerOpen(true);
              }}
              icon={
                category ? (
                  <RowIcon emoji={category.icon} />
                ) : (
                  <View style={styles.iconPending}>
                    <MaterialCommunityIcons name="shape-outline" size={18} color={theme.accentText} />
                  </View>
                )
              }
            >
              <Text numberOfLines={2} style={[styles.value, !category && { color: theme.accentText }]}>
                {category?.name ?? "เลือกหมวด"}
              </Text>
              {selectedTags.length > 0 ? (
                <Text numberOfLines={1} style={styles.caption12}>
                  {selectedTags.map((tag) => "#" + tag.name).join(" ")}
                </Text>
              ) : null}
            </DetailRow>
          ) : null}
          <DetailRow
            label="วันที่"
            onPress={() => {
              committedDraft();
              setCalendarOpen(true);
            }}
            icon={<RowIcon icon="calendar-blank-outline" />}
          >
            <Text style={styles.value}>
              {(draft.occurredOn === today ? "วันนี้ · " : "") + dateLabel(draft.occurredOn)}
            </Text>
          </DetailRow>
          <DetailRow label="ชื่อรายการ" icon={<RowIcon icon="pencil-outline" />}>
            <TextInput
              accessibilityLabel="ชื่อรายการ"
              value={draft.title}
              onChangeText={(title) => update({ ...draft, title })}
              onFocus={() => committedDraft()}
              placeholder={editing ? "ใส่ชื่อรายการ" : entryTitlePlaceholder(draft, category?.name)}
              placeholderTextColor={theme.muted}
              selectionColor={theme.accent}
              maxLength={60}
              returnKeyType="next"
              style={styles.input}
            />
          </DetailRow>
          <DetailRow label="โน้ต" icon={<RowIcon icon="note-text-outline" />}>
            <TextInput
              accessibilityLabel="โน้ต"
              value={draft.note}
              onChangeText={(note) => update({ ...draft, note })}
              onFocus={() => committedDraft()}
              placeholder="ไม่ใส่ก็ได้"
              placeholderTextColor={theme.muted}
              selectionColor={theme.accent}
              maxLength={120}
              returnKeyType="done"
              style={styles.input}
            />
          </DetailRow>
        </GroupedList>

        {fromSlip && editing ? (
          <View style={{ marginTop: 10 }}>
            <SlipSourceCard transaction={editing.transaction} imageUri={editing.transaction.slipImageUri} />
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>{sourceCaption[draft.kind]}</Text>
            <View accessibilityRole="radiogroup" style={styles.chips}>
              {sourceChoices.map((choice) => (
                <Chip
                  key={choice.key}
                  label={choice.label}
                  selected={selectedSource?.key === choice.key}
                  onPress={() => update(selectEntrySource(draft, choice))}
                />
              ))}
              {cardsQuery.data && cards.length === 0 ? (
                <Pressable
                  accessibilityRole="button"
                  hitSlop={2}
                  onPress={() => {
                    committedDraft();
                    // Adding a card is ticket 11. Until then the cards screen goes back to this editor and its draft
                    // instead of opening a second editor on top.
                    router.push({ pathname: "/settings/cards", params: { from: "entry" } });
                  }}
                  style={({ pressed }) => [styles.addChip, pressed && { backgroundColor: theme.raised }]}
                >
                  <MaterialCommunityIcons name="plus" size={17} color={theme.accentText} />
                  <Text style={styles.addChipText}>เพิ่มบัตร</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        )}

        {draft.kind === "transfer" ? (
          <Text style={styles.transferHint}>
            รายการย้ายเงิน ไม่นับเป็นรายจ่าย/รายรับ{"\n"}ใช้จัดการย้ายเงินข้ามบัญชี เติมเงินวอลเล็ต จ่ายหนี้
          </Text>
        ) : !fromSlip ? (
          <>
            <Text style={styles.sectionLabel}>เพิ่มเติม</Text>
            <GroupedList>
              <GroupedRow
                title="จดซ้ำล่วงหน้า"
                sub="ตั้งครั้งเดียว จดให้ทุกเดือน"
                icon="repeat"
                minHeight={touch.formRow}
                onPress={beginRecurring}
              />
            </GroupedList>
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {error || loadError ? (
          <Text
            accessibilityRole="alert"
            onPress={
              !error && loadError
                ? () => {
                    void categoriesQuery.refetch();
                    void tagsQuery.refetch();
                  }
                : undefined
            }
            style={styles.error}
          >
            {error ?? `โหลดหมวดและแท็กไม่สำเร็จ · แตะเพื่อลองอีกครั้ง`}
          </Text>
        ) : null}
        <PillButton
          label="บันทึก"
          busy={busy !== null}
          busyLabel={busy === "delete" ? "กำลังลบ…" : "กำลังบันทึก…"}
          onPress={() => void save()}
        />
      </View>

      {menuOpen ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ปิดเมนูตัวเลือก"
            onPress={() => setMenuOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.menu, { top: insets.top + 48 }]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => void remove()}
              style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: theme.raised }]}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={21} color={theme.danger} />
              <Text style={{ color: theme.danger, fontSize: 15 }}>ลบรายการ</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {keypadOpen ? (
        <AmountKeypad state={calc} onKey={pressKey} onDone={finishKeypad} onPaste={() => void paste()} />
      ) : null}

      <CategoryTagSheet
        visible={pickerOpen}
        kind={draft.kind === "income" ? "income" : "expense"}
        categories={categories}
        tags={tags}
        categoryId={draft.categoryId}
        tagIds={draft.tagIds}
        onCategoryChange={(categoryId) => setDraft((current) => ({ ...current, categoryId }))}
        onTagIdsChange={(tagIds) => setDraft((current) => ({ ...current, tagIds }))}
        onCreateTag={(name) => createTagMutation.mutateAsync({ name, color: theme.accent })}
        onManageCategories={() => router.push("/categories")}
        onClose={() => setPickerOpen(false)}
      />
      <CalendarSheet
        visible={calendarOpen}
        value={draft.occurredOn}
        onSelect={(occurredOn) => update({ ...draft, occurredOn })}
        onClose={() => setCalendarOpen(false)}
      />
      <EntryExitDialog
        visible={exitDialogOpen}
        description={editing ? "พี่มนุษย์แก้ไขรายการ แต่ยังไม่ได้บันทึกนะ" : "พี่มนุษย์เริ่มจดรายการ แต่ยังไม่ได้บันทึกนะ"}
        onCancel={() => {
          pendingExit.current = null;
          setExitDialogOpen(false);
        }}
        onDiscard={() => {
          setExitDialogOpen(false);
          setAllowExit(true);
        }}
        onSave={() => {
          setExitDialogOpen(false);
          void save();
        }}
      />
    </KeyboardAvoidingView>
  );
}

/** A grouped row with a small label above its value, which can be a text field. */
function DetailRow({
  label,
  icon,
  onPress,
  children,
}: {
  label: string;
  icon: ReactNode;
  onPress?: () => void;
  children: ReactNode;
}) {
  const theme = useAppTheme();
  const content = (
    <>
      {icon}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 17 }}>{label}</Text>
        {children}
      </View>
      {onPress ? <MaterialCommunityIcons name="chevron-right" size={22} color={theme.muted} /> : null}
    </>
  );
  const style = {
    minHeight: touch.formRow,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  } as const;
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [style, pressed && { backgroundColor: theme.raised }]}
    >
      {content}
    </Pressable>
  );
}

/** The accent caret that blinks every 1.05 s while the keypad is open. */
function Caret({ height }: { height: number }) {
  const theme = useAppTheme();
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 1, delay: 525, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 1, delay: 525, useNativeDriver: true }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, [opacity]);
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: 2, height, alignSelf: "center", borderRadius: 1, backgroundColor: theme.accent, opacity }}
    />
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    header: { height: 52, paddingHorizontal: 6, flexDirection: "row", alignItems: "center" },
    headerTitle: { flex: 1, color: theme.text, fontSize: 17, lineHeight: 24, textAlign: "center" },
    segment: { marginTop: 2, marginHorizontal: 16 },
    content: { width: "100%", maxWidth: 680, alignSelf: "center", paddingHorizontal: 16, paddingTop: 14 },
    amountCard: {
      minHeight: 112,
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderRadius: radius.card,
      backgroundColor: theme.surface,
      justifyContent: "center",
      gap: 2,
    },
    caption13: { color: theme.muted, fontSize: 13, lineHeight: 18 },
    caption12: { color: theme.muted, fontSize: 12, lineHeight: 17 },
    history: { color: theme.muted, fontSize: 15, lineHeight: 20, fontVariant: ["tabular-nums"], fontWeight: "400" },
    amountRow: { flexDirection: "row", alignItems: "baseline", gap: 4, maxWidth: "100%" },
    amount: { flexShrink: 1, fontWeight: "500", fontVariant: ["tabular-nums"], letterSpacing: -0.3 },
    baht: { color: theme.muted, marginLeft: 2, fontSize: 20, lineHeight: 24 },
    amountError: { color: theme.danger, fontSize: 13, lineHeight: 18 },
    group: { marginTop: 10 },
    iconPending: {
      width: 36,
      height: 36,
      borderRadius: radius.pill,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: theme.accent,
    },
    value: { color: theme.text, fontSize: 15, lineHeight: 21 },
    input: { color: theme.text, fontSize: 15, lineHeight: 21, paddingVertical: 0, minHeight: 21 },
    sectionLabel: {
      marginTop: 18,
      marginBottom: 8,
      marginHorizontal: 4,
      color: theme.muted,
      fontSize: 13,
      lineHeight: 18,
    },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    addChip: {
      minHeight: 40,
      paddingLeft: 10,
      paddingRight: 14,
      borderWidth: 1.2,
      borderStyle: "dashed",
      borderColor: theme.accent,
      borderRadius: radius.chip,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    addChipText: { color: theme.accentText, fontSize: 14, lineHeight: 20 },
    transferHint: {
      marginTop: 22,
      paddingHorizontal: 16,
      color: theme.muted,
      fontSize: 14,
      lineHeight: 22,
      textAlign: "center",
    },
    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: 10,
      paddingHorizontal: 16,
      backgroundColor: theme.background,
    },
    error: { marginBottom: 8, color: theme.danger, fontSize: 13, lineHeight: 19, textAlign: "center" },
    menu: {
      position: "absolute",
      right: 12,
      minWidth: 200,
      paddingVertical: 5,
      borderRadius: radius.tile,
      backgroundColor: theme.surface,
      ...menuShadow(theme),
    },
    menuItem: { minHeight: 48, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  });
}
