import { useForm, useSelector } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, View } from "react-native";
import { z } from "zod";

import { Button, Card, Field, Pill, SectionHeading } from "@/components/ui/moo-ui";
import { Text } from "@/components/ui/typography";
import { useAppTheme } from "@/lib/use-app-theme";
import { categoriesQueryOptions } from "@/features/categories/query-options";
import { planningMutationOptions } from "@/features/planning/mutation-options";
import { planningQueryOptions } from "@/features/planning/query-options";
import type { TransactionKind } from "@/types/finance";
import { formatBaht, isValidISODate, toSatang, todayISO } from "@/utils/format";

const emptyRows: never[] = [];

const recurringFormSchema = z
  .object({
    kind: z.enum(["expense", "income", "transfer"]),
    amount: z.string().refine((value) => toSatang(value) !== null, "กรุณาใส่จำนวนเงินที่มากกว่า 0 บาท"),
    title: z.string().trim().min(1, "กรุณาใส่ชื่อรายการ"),
    dayOfMonth: z.string().refine((value) => {
      const day = Number(value);
      return value.trim() !== "" && Number.isInteger(day) && day >= 1 && day <= 31;
    }, "วันที่จดซ้ำต้องอยู่ระหว่าง 1–31"),
    startsOn: z.string().refine(isValidISODate, "วันเริ่มต้นต้องเป็น YYYY-MM-DD และเป็นวันที่ถูกต้อง"),
    endsOn: z.string().refine((value) => !value || isValidISODate(value), "วันสิ้นสุดต้องเป็น YYYY-MM-DD และเป็นวันที่ถูกต้อง"),
    categoryId: z.string().nullable(),
    tagIds: z.array(z.string()),
    bank: z.string(),
    note: z.string(),
    isActive: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.endsOn && value.endsOn < value.startsOn) {
      context.addIssue({ code: "custom", path: ["endsOn"], message: "วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น" });
    }
  });

function confirmDelete(onConfirm: () => void) {
  if (process.env.EXPO_OS === "web") {
    if (window.confirm("ลบรายการจดซ้ำนี้ใช่ไหม? รายการที่จดไปแล้วจะยังอยู่")) onConfirm();
  } else {
    Alert.alert("ลบรายการจดซ้ำ", "รายการที่จดไปแล้วจะยังอยู่ ต้องการลบกฎนี้ใช่ไหม?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: "destructive", onPress: onConfirm },
    ]);
  }
}

export default function RecurringFormScreen() {
  const theme = useAppTheme();
  const isFocused = useIsFocused();
  const {
    id,
    kind: initialKind,
    amount: initialAmount,
    title: initialTitle,
    note: initialNote,
    occurredOn: initialOccurredOn,
    categoryId: initialCategoryId,
    tagIds: initialTagIds,
    bank: initialBank,
  } = useLocalSearchParams<{
    id?: string;
    kind?: string;
    amount?: string;
    title?: string;
    note?: string;
    occurredOn?: string;
    categoryId?: string;
    tagIds?: string;
    bank?: string;
  }>();

  const createRecurringRuleMutation = useMutation(planningMutationOptions.createRecurringRule());
  const deleteRecurringRuleMutation = useMutation(planningMutationOptions.deleteRecurringRule());
  const generateDueRecurringTransactionsMutation = useMutation(
    planningMutationOptions.generateDueRecurringTransactions()
  );
  const updateRecurringRuleMutation = useMutation(planningMutationOptions.updateRecurringRule());

  const categoriesQuery = useQuery({ ...categoriesQueryOptions.list(), enabled: isFocused });
  const tagsQuery = useQuery({ ...categoriesQueryOptions.tags(), enabled: isFocused });
  const rulesQuery = useQuery({
    ...planningQueryOptions.recurringRules(),
    enabled: isFocused && Boolean(id),
  });

  const categories = categoriesQuery.data ?? emptyRows;
  const tags = tagsQuery.data ?? emptyRows;
  const existing = id ? (rulesQuery.data?.find((rule) => rule.id === id) ?? null) : null;
  const missingRule = Boolean(id && rulesQuery.data && !existing && !rulesQuery.isFetching);
  const loadError = [categoriesQuery, tagsQuery, ...(id ? [rulesQuery] : [])].find(
    (query) => query.data === undefined && query.error
  )?.error?.message;
  const loading = !loadError && (!categoriesQuery.data || !tagsQuery.data || (id && !rulesQuery.data));
  const queryError =
    categoriesQuery.error?.message ?? tagsQuery.error?.message ?? (id ? rulesQuery.error?.message : null);

  const hydratedId = useRef<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      kind: "expense" as TransactionKind,
      amount: "",
      title: "",
      dayOfMonth: String(Number(todayISO().slice(8))),
      startsOn: todayISO(),
      endsOn: "",
      categoryId: null as string | null,
      tagIds: [] as string[],
      bank: "",
      note: "",
      isActive: true,
    },
    validators: { onSubmit: recurringFormSchema },
    onSubmitInvalid: ({ value }) => {
      const result = recurringFormSchema.safeParse(value);
      if (!result.success) setError(result.error.issues[0]?.message ?? "ตรวจสอบข้อมูลอีกครั้ง");
    },
    onSubmit: async ({ value }) => {
      try {
        setSaving(true);
        setError(null);
        const input = recurringFormSchema.parse(value);
        const rule = {
          kind: input.kind,
          amountSatang: toSatang(input.amount)!,
          title: input.title,
          note: input.note.trim(),
          bank: input.bank.trim() || null,
          categoryId: input.kind === "transfer" ? null : input.categoryId,
          tagIds: input.tagIds,
          dayOfMonth: Number(input.dayOfMonth),
          startsOn: input.startsOn,
          endsOn: input.endsOn || null,
          isActive: input.isActive,
        };
        if (existing) await updateRecurringRuleMutation.mutateAsync({ id: existing.id, patch: rule });
        else await createRecurringRuleMutation.mutateAsync(rule);
        await generateDueRecurringTransactionsMutation.mutateAsync(undefined);
        router.back();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setSaving(false);
      }
    },
  });

  const kind = useSelector(form.store, (state) => state.values.kind);
  const categoryId = useSelector(form.store, (state) => state.values.categoryId);
  const tagIds = useSelector(form.store, (state) => state.values.tagIds);
  const isActive = useSelector(form.store, (state) => state.values.isActive);

  const visibleCategories = useMemo(() => categories.filter((category) => category.kind === kind), [categories, kind]);

  useEffect(() => {
    if (!isFocused || !categoriesQuery.data || !tagsQuery.data || (id && !rulesQuery.data)) return;
    if (categoriesQuery.isFetching || tagsQuery.isFetching || (id && rulesQuery.isFetching)) return;
    const key = JSON.stringify([
      id,
      initialKind,
      initialAmount,
      initialTitle,
      initialNote,
      initialOccurredOn,
      initialCategoryId,
      initialTagIds,
      initialBank,
    ]);
    if (hydratedId.current === key) return;
    const allCategories = categoriesQuery.data;
    const allTags = tagsQuery.data;
    if (id) {
      const found = existing;
      if (!found) return;
      form.reset({
        kind: found.kind,
        amount: formatBaht(found.amountSatang),
        title: found.title,
        dayOfMonth: String(found.dayOfMonth),
        startsOn: found.startsOn,
        endsOn: found.endsOn ?? "",
        categoryId: found.categoryId,
        tagIds: found.tagIds,
        bank: found.bank ?? "",
        note: found.note,
        isActive: found.isActive,
      });
    } else {
      const nextKind: TransactionKind =
        initialKind === "income" || initialKind === "transfer" ? initialKind : "expense";
      let amount = "";
      if (typeof initialAmount === "string") {
        const satang = toSatang(initialAmount);
        if (satang) amount = formatBaht(satang);
      }
      let startsOn = todayISO();
      let dayOfMonth = String(Number(startsOn.slice(8)));
      if (typeof initialOccurredOn === "string" && isValidISODate(initialOccurredOn)) {
        startsOn = initialOccurredOn;
        dayOfMonth = String(Number(initialOccurredOn.slice(8)));
      }
      let categoryId: string | null = null;
      if (
        nextKind !== "transfer" &&
        typeof initialCategoryId === "string" &&
        allCategories.some((category) => category.id === initialCategoryId && category.kind === nextKind)
      ) {
        categoryId = initialCategoryId;
      }
      let tagIds: string[] = [];
      if (typeof initialTagIds === "string") {
        const validTagIds = new Set(allTags.map((tag) => tag.id));
        tagIds = [
          ...new Set(
            initialTagIds
              .split(",")
              .map((value) => value.trim())
              .filter((value) => validTagIds.has(value))
          ),
        ];
      }
      form.reset({
        kind: nextKind,
        amount,
        title: typeof initialTitle === "string" ? initialTitle.trim() : "",
        dayOfMonth,
        startsOn,
        endsOn: "",
        categoryId,
        tagIds,
        bank: typeof initialBank === "string" ? initialBank.trim() : "",
        note: typeof initialNote === "string" ? initialNote.trim() : "",
        isActive: true,
      });
    }
    hydratedId.current = key;
  }, [
    form,
    id,
    existing,
    categoriesQuery.data,
    tagsQuery.data,
    rulesQuery.data,
    categoriesQuery.isFetching,
    tagsQuery.isFetching,
    rulesQuery.isFetching,
    isFocused,
    initialKind,
    initialAmount,
    initialTitle,
    initialNote,
    initialOccurredOn,
    initialCategoryId,
    initialTagIds,
    initialBank,
  ]);

  const remove = () =>
    existing &&
    confirmDelete(async () => {
      try {
        setSaving(true);
        await deleteRecurringRuleMutation.mutateAsync({ id: existing.id });
        router.back();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setSaving(false);
      }
    });

  return (
    <ScrollView
      bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ alignItems: "center", padding: 18, paddingBottom: 52 }}
    >
      <View style={{ width: "100%", maxWidth: 620, gap: 18 }}>
        <View style={{ alignItems: "center", gap: 5, paddingVertical: 7 }}>
          <Text style={{ fontSize: 42 }}>🔁</Text>
          <Text style={{ color: theme.text, fontSize: 20, fontWeight: "900" }}>
            {existing ? "แก้ไขรายการจดซ้ำ" : "ตั้งครั้งเดียว จดให้ทุกเดือน"}
          </Text>
          <Text style={{ color: theme.muted, fontSize: 13, textAlign: "center" }}>
            เหมาะกับเงินเดือน ค่าเช่า ค่าบริการ หรือรายการประจำ
          </Text>
        </View>
        {loading ? (
          <ActivityIndicator color={theme.accentText} style={{ paddingVertical: 35 }} />
        ) : loadError ? (
          <Card>
            <Text selectable style={{ color: theme.dangerText }}>
              {loadError}
            </Text>
            <Button
              label="ลองอีกครั้ง"
              onPress={() => {
                void categoriesQuery.refetch();
                void tagsQuery.refetch();
                if (id) void rulesQuery.refetch();
              }}
            />
          </Card>
        ) : (
          <>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(["expense", "income", "transfer"] as const).map((value) => (
                <Pill
                  key={value}
                  label={value === "expense" ? "รายจ่าย" : value === "income" ? "รายรับ" : "ย้ายเงิน"}
                  selected={kind === value}
                  onPress={() => {
                    form.setFieldValue("kind", value);
                    form.setFieldValue("categoryId", null);
                  }}
                  color={value === "income" ? theme.successText : value === "transfer" ? theme.muted : theme.accentText}
                />
              ))}
            </View>
            <Card style={{ gap: 16 }}>
              <form.Field name="title">
                {(field) => (
                  <Field
                    label="ชื่อรายการ"
                    value={field.state.value}
                    onChangeText={field.handleChange}
                    onBlur={field.handleBlur}
                    placeholder="เช่น ค่าเช่าบ้าน, เงินเดือน"
                    autoFocus={!existing}
                  />
                )}
              </form.Field>
              <form.Field name="amount">
                {(field) => (
                  <Field
                    label="จำนวนเงิน (บาท)"
                    value={field.state.value}
                    onChangeText={field.handleChange}
                    onBlur={field.handleBlur}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                )}
              </form.Field>
              <form.Field name="dayOfMonth">
                {(field) => (
                  <Field
                    label="จดทุกวันที่"
                    value={field.state.value}
                    onChangeText={field.handleChange}
                    onBlur={field.handleBlur}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="1–31"
                    hint="ถ้าเดือนนั้นไม่มีวันที่เลือก หมูจะจดในวันสุดท้ายของเดือน"
                  />
                )}
              </form.Field>
            </Card>
            <Card style={{ gap: 16 }}>
              <SectionHeading title="ระยะเวลา" />
              <form.Field name="startsOn">
                {(field) => (
                  <Field
                    label="เริ่มจดตั้งแต่"
                    value={field.state.value}
                    onChangeText={field.handleChange}
                    onBlur={field.handleBlur}
                    placeholder="YYYY-MM-DD"
                    hint="ระบุปี ค.ศ. เช่น 2026-09-24"
                  />
                )}
              </form.Field>
              <form.Field name="endsOn">
                {(field) => (
                  <Field
                    label="สิ้นสุดวันที่ (ไม่บังคับ)"
                    value={field.state.value}
                    onChangeText={field.handleChange}
                    onBlur={field.handleBlur}
                    placeholder="YYYY-MM-DD"
                    hint="เว้นว่างไว้หากต้องการให้จดต่อไปเรื่อยๆ"
                  />
                )}
              </form.Field>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ color: theme.text, fontWeight: "800", fontSize: 14 }}>เปิดใช้งาน</Text>
                  <Text style={{ color: theme.muted, fontSize: 12 }}>ปิดไว้ก่อนได้โดยไม่ต้องลบกฎนี้</Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={(value) => form.setFieldValue("isActive", value)}
                  trackColor={{ true: theme.accent, false: theme.border }}
                  thumbColor={theme.surface}
                />
              </View>
            </Card>
            {kind !== "transfer" ? (
              <Card style={{ gap: 13 }}>
                <SectionHeading title="หมวดหมู่" />
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <Pill label="ไม่ระบุ" selected={!categoryId} onPress={() => form.setFieldValue("categoryId", null)} />
                  {visibleCategories.map((category) => (
                    <Pill
                      key={category.id}
                      label={`${category.icon} ${category.name}`}
                      selected={categoryId === category.id}
                      onPress={() => form.setFieldValue("categoryId", category.id)}
                      color={category.color}
                    />
                  ))}
                </View>
              </Card>
            ) : (
              <Card>
                <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 20 }}>
                  การย้ายเงินระหว่างบัญชีของตัวเองจะไม่รวมในยอดรายรับรายจ่าย
                </Text>
              </Card>
            )}
            <Card style={{ gap: 16 }}>
              <SectionHeading title="รายละเอียดเพิ่มเติม" />
              <form.Field name="bank">
                {(field) => (
                  <Field
                    label="ธนาคาร / กระเป๋าเงิน"
                    value={field.state.value}
                    onChangeText={field.handleChange}
                    onBlur={field.handleBlur}
                    placeholder="เช่น KBank, TrueMoney"
                  />
                )}
              </form.Field>
              <form.Field name="note">
                {(field) => (
                  <Field
                    label="โน้ต"
                    value={field.state.value}
                    onChangeText={field.handleChange}
                    onBlur={field.handleBlur}
                    placeholder="รายละเอียดที่อยากจำ"
                    multiline
                    style={{ minHeight: 76, textAlignVertical: "top" }}
                  />
                )}
              </form.Field>
              {tags.length ? (
                <View style={{ gap: 9 }}>
                  <Text style={{ color: theme.text, fontSize: 14, fontWeight: "700" }}>แท็ก</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {tags.map((tag) => (
                      <Pill
                        key={tag.id}
                        label={tag.name}
                        selected={tagIds.includes(tag.id)}
                        onPress={() =>
                          form.setFieldValue(
                            "tagIds",
                            tagIds.includes(tag.id) ? tagIds.filter((item) => item !== tag.id) : [...tagIds, tag.id]
                          )
                        }
                        color={tag.color}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </Card>
            {existing ? (
              <Text style={{ color: theme.muted, fontSize: 12, textAlign: "center", lineHeight: 18 }}>
                การแก้ไขกฎนี้จะมีผลกับรายการที่จดครั้งถัดไป รายการเดิมยังคงอยู่
              </Text>
            ) : null}
            {error || queryError || missingRule ? (
              <Text selectable style={{ color: theme.dangerText, textAlign: "center", fontSize: 13 }}>
                {error ?? queryError ?? "ไม่พบรายการจดซ้ำนี้"}
              </Text>
            ) : null}
            <Button
              label={saving ? "กำลังบันทึก…" : "บันทึกรายการจดซ้ำ"}
              onPress={() => void form.handleSubmit()}
              disabled={saving || (Boolean(id) && !existing)}
            />
            {existing ? (
              <Pressable onPress={remove} disabled={saving} style={{ alignItems: "center", padding: 14 }}>
                <Text style={{ color: theme.dangerText, fontWeight: "800" }}>ลบกฎจดซ้ำนี้</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    </ScrollView>
  );
}
