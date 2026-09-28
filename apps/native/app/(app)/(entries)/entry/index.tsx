import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { Redirect, router, useIsFocused, useLocalSearchParams, useNavigation } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
import { blankEntryDraft, entryDraftError, entryInputFromDraft, hasEntryChanges } from "@/features/entries/entry-draft";
import { colors, styles } from "@/features/entries/entry-styles";
import { entriesMutationOptions } from "@/features/entries/mutation-options";
import { authClient } from "@/lib/auth-client";
import { withLocalSlipImage } from "@/lib/local-slip-assets";
import { kindLabel } from "@/utils/format";

const emptyRows: never[] = [];

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

export default function CreateEntryRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const legacyId = Array.isArray(id) ? id[0] : id;
  if (legacyId) return <Redirect href={{ pathname: "/entry/[id]", params: { id: legacyId } }} />;
  return <CreateEntryScreen />;
}

function CreateEntryScreen() {
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const defaultValues = useMemo(() => blankEntryDraft(), []);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorExpression, setCalculatorExpression] = useState("");
  const [calculatorHistory, setCalculatorHistory] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [noteFocused, setNoteFocused] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowExit, setAllowExit] = useState(false);
  const pendingExit = useRef<(() => void) | null>(null);

  const { data: session } = authClient.useSession();
  const createTagMutation = useMutation(categoriesMutationOptions.createTag());
  const createTransactionMutation = useMutation(entriesMutationOptions.create());
  const categoriesQuery = useQuery({ ...categoriesQueryOptions.list(), enabled: isFocused });
  const tagsQuery = useQuery({ ...categoriesQueryOptions.tags(), enabled: isFocused });
  const categories = categoriesQuery.data ?? emptyRows;
  const tags = tagsQuery.data ?? emptyRows;

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
      const created = await createTransactionMutation.mutateAsync({ ...input, source: "manual" });
      await withLocalSlipImage(session?.user.id || "", created);
      pendingExit.current ??= goBack;
      setAllowExit(true);
    },
  });
  const draft = useStore(form.store, (state) => state.values);
  const saving = useStore(form.store, (state) => state.isSubmitting);
  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === draft.categoryId) ?? null,
    [categories, draft.categoryId]
  );
  const selectedTags = useMemo(() => tags.filter((tag) => draft.tagIds.includes(tag.id)), [tags, draft.tagIds]);
  const loadError = [categoriesQuery, tagsQuery].find((query) => query.data === undefined && query.error)?.error
    ?.message;
  const displayError = error ?? loadError ?? categoriesQuery.error?.message ?? tagsQuery.error?.message;
  const hasUnsavedChanges = hasEntryChanges(draft, defaultValues);

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
    if (hasUnsavedChanges) {
      pendingExit.current = goBack;
      setExitDialogOpen(true);
    } else goBack();
  };

  const submit = () => {
    if (form.state.isSubmitting) return;
    void form.handleSubmit().catch((cause) => {
      setError(cause instanceof Error ? cause.message : String(cause));
      pendingExit.current = null;
    });
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
        {draft.kind === "transfer" ? <EntryTransferHint /> : <EntryRecurringRow onPress={beginRecurring} />}
      </ScrollView>

      {displayError ? (
        <Text
          accessibilityRole="alert"
          onPress={
            loadError
              ? () => {
                  void categoriesQuery.refetch();
                  void tagsQuery.refetch();
                }
              : undefined
          }
          style={[styles.error, { bottom: Math.max(105, insets.bottom + 96) }]}
        >
          {displayError}
          {loadError ? " · ลองอีกครั้ง" : ""}
        </Text>
      ) : null}
      <EntrySaveButton saving={saving} disabled={saving} bottom={Math.max(44, insets.bottom + 28)} onPress={submit} />

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
        onCreateTag={(name) => createTagMutation.mutateAsync({ name, color: colors.blue })}
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
        description="พี่มนุษย์เริ่มจดรายการ แต่ยังไม่ได้บันทึกนะ"
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
