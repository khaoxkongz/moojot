import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { router, useIsFocused, useLocalSearchParams, useNavigation } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { Text } from "@/components/ui/typography";
import { categoriesMutationOptions } from "@/features/categories/mutation-options";
import { categoriesQueryOptions } from "@/features/categories/query-options";
import { AmountCalculatorSheet } from "@/features/entries/components/amount-calculator-sheet";
import { CalendarSheet } from "@/features/entries/components/calendar-sheet";
import { CategoryTagSheet } from "@/features/entries/components/category-tag-sheet";
import {
  EntryAmountCard,
  EntryCategoryRow,
  EntryDateRow,
  EntryKindTabs,
  EntryNoteCard,
  EntryRecurringRow,
  EntrySaveButton,
  EntryTransferHint,
} from "@/features/entries/components/entry-controls";
import { EntryExitDialog } from "@/features/entries/components/entry-exit-dialog";
import { SlipSourceCard } from "@/features/entries/components/slip-source-card";
import {
  draftFromTransaction,
  entryDraftError,
  entryInputFromDraft,
  hasEntryChanges,
} from "@/features/entries/entry-draft";
import { useEntryStyles } from "@/features/entries/entry-styles";
import { useAppTheme } from "@/lib/use-app-theme";
import { entriesMutationOptions } from "@/features/entries/mutation-options";
import { entriesQueryOptions } from "@/features/entries/query-options";
import { authClient } from "@/lib/auth-client";
import { setLocalSlipImage, withLocalSlipImage } from "@/lib/local-slip-assets";
import type { FinanceTransaction } from "@/types/finance";
import { kindLabel } from "@/utils/format";

const emptyRows: never[] = [];

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

export default function EditEntryRoute() {
  const styles = useEntryStyles();
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const entryId = Array.isArray(id) ? id[0] : id;
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const transactionQuery = useQuery({
    ...entriesQueryOptions.detail(entryId ?? ""),
    enabled: isFocused && Boolean(entryId),
  });
  const transaction = transactionQuery.data ?? null;

  if (!entryId || !transaction) {
    const transactionError = !entryId
      ? "ไม่พบรายการที่ต้องการแก้ไข"
      : (transactionQuery.error?.message ??
        (transactionQuery.data === null && !transactionQuery.isFetching ? "ไม่พบรายการที่ต้องการแก้ไข" : null));
    return (
      <View style={[styles.screen, styles.unavailableScreen, { paddingTop: insets.top }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ปิดหน้าจดรายการ"
          onPress={goBack}
          style={[styles.unavailableClose, { top: insets.top + 12 }]}
        >
          <Text style={styles.unavailableCloseText}>×</Text>
        </Pressable>
        {transactionError ? (
          <>
            <Text accessibilityRole="alert" style={styles.unavailableText}>
              {transactionError}
            </Text>
            {transactionQuery.error ? (
              <Pressable accessibilityRole="button" onPress={() => void transactionQuery.refetch()}>
                <Text style={styles.unavailableRetry}>ลองอีกครั้ง</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <ActivityIndicator color={theme.accentText} />
        )}
      </View>
    );
  }

  return (
    <EditEntryScreen
      key={entryId}
      id={entryId}
      transaction={transaction}
      transactionError={transactionQuery.error?.message ?? null}
      onRetryTransaction={() => void transactionQuery.refetch()}
    />
  );
}

function EditEntryScreen({
  id,
  transaction,
  transactionError,
  onRetryTransaction,
}: {
  id: string;
  transaction: FinanceTransaction;
  transactionError: string | null;
  onRetryTransaction: () => void;
}) {
  const styles = useEntryStyles();
  const theme = useAppTheme();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [defaultValues] = useState(() => draftFromTransaction(transaction));
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorExpression, setCalculatorExpression] = useState("");
  const [calculatorHistory, setCalculatorHistory] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [noteFocused, setNoteFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowExit, setAllowExit] = useState(false);
  const pendingExit = useRef<(() => void) | null>(null);

  const { data: session } = authClient.useSession();
  const createTagMutation = useMutation(categoriesMutationOptions.createTag());
  const updateTransactionMutation = useMutation(entriesMutationOptions.update());
  const deleteTransactionMutation = useMutation(entriesMutationOptions.delete());
  const categoriesQuery = useQuery({ ...categoriesQueryOptions.list(), enabled: isFocused });
  const tagsQuery = useQuery({ ...categoriesQueryOptions.tags(), enabled: isFocused });
  const categories = categoriesQuery.data ?? emptyRows;
  const tags = tagsQuery.data ?? emptyRows;
  const currentTransaction = transaction;

  const form = useForm({
    defaultValues,
    validators: { onSubmit: ({ value }) => entryDraftError(value) },
    onSubmitInvalid: ({ value }) => {
      setError(entryDraftError(value) ?? "ตรวจสอบข้อมูลอีกครั้ง");
      pendingExit.current = null;
    },
    onSubmit: async ({ value }) => {
      setError(null);
      const categoryName = categories.find((item) => item.id === value.categoryId)?.name;
      const input = entryInputFromDraft(value, categoryName);
      const updated = await updateTransactionMutation.mutateAsync({ id, patch: input });
      if (updated.source !== "slip") await setLocalSlipImage(session?.user.id || "", id, null);
      await withLocalSlipImage(session?.user.id || "", updated);
      pendingExit.current ??= goBack;
      setAllowExit(true);
    },
  });
  const draft = useStore(form.store, (state) => state.values);
  const formSubmitting = useStore(form.store, (state) => state.isSubmitting);
  const saving = formSubmitting || deleteTransactionMutation.isPending;
  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === draft.categoryId) ?? null,
    [categories, draft.categoryId]
  );
  const selectedTags = useMemo(() => tags.filter((tag) => draft.tagIds.includes(tag.id)), [tags, draft.tagIds]);
  const loadError = [categoriesQuery, tagsQuery].find((query) => query.data === undefined && query.error)?.error
    ?.message;
  const displayError =
    error ?? loadError ?? categoriesQuery.error?.message ?? tagsQuery.error?.message ?? transactionError;
  const hasUnsavedChanges = hasEntryChanges(draft, defaultValues);

  useEffect(() => {
    form.reset(defaultValues);
  }, [form, defaultValues]);

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

  const requestClose = () => {
    setMenuOpen(false);
    if (hasUnsavedChanges) {
      pendingExit.current = goBack;
      setExitDialogOpen(true);
    } else goBack();
  };

  const submit = () => {
    if (saving) return;
    void form.handleSubmit().catch((cause) => {
      setError(cause instanceof Error ? cause.message : String(cause));
      pendingExit.current = null;
    });
  };

  const remove = async () => {
    if (saving || !currentTransaction) return;
    try {
      setMenuOpen(false);
      const deleted = await deleteTransactionMutation.mutateAsync({ id });
      if (!deleted) throw new Error("ไม่พบรายการที่ต้องการลบ");
      pendingExit.current = () => router.replace({ pathname: "/", params: { deletedId: id } });
      setAllowExit(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const beginRecurring = () => {
    router.push({
      pathname: "/recurring-form",
      params: {
        kind: draft.kind,
        amount: draft.amount,
        title: draft.title.trim() || draft.note.trim() || selectedCategory?.name || kindLabel(draft.kind),
        note: draft.note,
        occurredOn: draft.occurredOn,
        categoryId: draft.categoryId ?? "",
        tagIds: draft.tagIds.join(","),
        bank: draft.bank,
      },
    });
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ปิดหน้าจดรายการ"
          onPress={requestClose}
          style={styles.closeButton}
        >
          <Text style={styles.closeText}>×</Text>
        </Pressable>
        <EntryKindTabs
          kind={draft.kind}
          onChange={(kind) => {
            form.setFieldValue("kind", kind);
            form.setFieldValue("categoryId", null);
            if (kind === "transfer") form.setFieldValue("tagIds", []);
            setError(null);
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ตัวเลือกเพิ่มเติม"
          accessibilityState={{ expanded: menuOpen }}
          onPress={() => setMenuOpen((open) => !open)}
          style={styles.moreButton}
        >
          <Text style={styles.moreText}>⋮</Text>
        </Pressable>
      </View>

      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(152, insets.bottom + 118) }]}
        showsVerticalScrollIndicator={false}
      >
        <EntryDateRow value={draft.occurredOn} onPress={() => setCalendarOpen(true)} />
        <EntryAmountCard
          kind={draft.kind}
          amount={draft.amount}
          active={calculatorOpen}
          expression={calculatorExpression}
          history={calculatorHistory}
          onPress={() => {
            setError(null);
            setCalculatorExpression(draft.amount || "0");
            setCalculatorHistory(null);
            setCalculatorOpen(true);
          }}
        />
        {draft.kind !== "transfer" ? (
          <EntryCategoryRow category={selectedCategory} tags={selectedTags} onPress={() => setPickerOpen(true)} />
        ) : null}
        <form.Field name="note">
          {(field) => (
            <EntryNoteCard
              value={field.state.value}
              focused={noteFocused}
              onChange={field.handleChange}
              onFocus={() => setNoteFocused(true)}
              onBlur={() => {
                field.handleBlur();
                setNoteFocused(false);
              }}
            />
          )}
        </form.Field>
        {currentTransaction.source === "slip" ? (
          <View style={styles.slipCardWrap}>
            <SlipSourceCard transaction={currentTransaction} imageUri={currentTransaction.slipImageUri} />
          </View>
        ) : draft.kind === "transfer" ? (
          <EntryTransferHint />
        ) : (
          <EntryRecurringRow onPress={beginRecurring} />
        )}
      </ScrollView>

      {menuOpen ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ปิดเมนูตัวเลือก"
            onPress={() => setMenuOpen(false)}
            style={styles.menuDismiss}
          />
          <View style={styles.menuCard}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="ลบรายการ"
              disabled={saving}
              onPress={() => void remove()}
              style={styles.menuDelete}
            >
              <Svg
                width={23}
                height={23}
                viewBox="0 0 24 24"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Path
                  d="M4 6h16M9 6V4h6v2m-9 0 1 15h10l1-15M10 10v8m4-8v8"
                  fill="none"
                  stroke={theme.dangerText}
                  strokeWidth={1.9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={styles.menuDeleteText}>ลบรายการ</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {displayError ? (
        <Text
          accessibilityRole="alert"
          onPress={
            loadError
              ? () => {
                  void categoriesQuery.refetch();
                  void tagsQuery.refetch();
                  onRetryTransaction();
                }
              : undefined
          }
          style={[styles.error, { bottom: Math.max(105, insets.bottom + 96) }]}
        >
          {displayError}
          {loadError ? " · ลองอีกครั้ง" : ""}
        </Text>
      ) : null}
      <EntrySaveButton
        saving={saving}
        disabled={saving || !currentTransaction}
        bottom={Math.max(44, insets.bottom + 28)}
        onPress={submit}
      />

      <AmountCalculatorSheet
        visible={calculatorOpen}
        value={draft.amount}
        onChange={(amount) => form.setFieldValue("amount", amount)}
        onExpressionChange={(expression, history, active) => {
          setCalculatorExpression(active ? expression : "");
          setCalculatorHistory(active ? history : null);
        }}
        onDone={() => setCalculatorOpen(false)}
        onClose={() => setCalculatorOpen(false)}
        readClipboard={Clipboard.getStringAsync}
      />
      <CategoryTagSheet
        visible={pickerOpen}
        kind={draft.kind === "income" ? "income" : "expense"}
        categories={categories}
        tags={tags}
        categoryId={draft.categoryId}
        tagIds={draft.tagIds}
        onCategoryChange={(categoryId) => form.setFieldValue("categoryId", categoryId)}
        onTagIdsChange={(tagIds) => form.setFieldValue("tagIds", tagIds)}
        onCreateTag={(name) => createTagMutation.mutateAsync({ name, color: theme.accent })}
        onManageCategories={() => router.push("/categories")}
        onClose={() => setPickerOpen(false)}
      />
      <CalendarSheet
        visible={calendarOpen}
        value={draft.occurredOn}
        onSelect={(occurredOn) => form.setFieldValue("occurredOn", occurredOn)}
        onClose={() => setCalendarOpen(false)}
      />
      <EntryExitDialog
        visible={exitDialogOpen}
        description="พี่มนุษย์แก้ไขรายการ แต่ยังไม่ได้บันทึกนะ"
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
          submit();
        }}
      />
    </View>
  );
}
