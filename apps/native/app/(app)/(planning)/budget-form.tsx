import { useForm, useSelector } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import { z } from "zod";

import { Button, Card, Field, Pill, SectionHeading } from "@/components/ui/moo-ui";
import { Text } from "@/components/ui/typography";
import { useAppTheme } from "@/lib/use-app-theme";
import { categoriesQueryOptions } from "@/features/categories/query-options";
import { planningMutationOptions } from "@/features/planning/mutation-options";
import { planningQueryOptions } from "@/features/planning/query-options";
import { getPeriodBounds } from "@/utils/dates";
import { formatBaht, thaiDate, toSatang } from "@/utils/format";

type Target = "all" | "category" | "tag";

const budgetFormSchema = z
  .object({
    target: z.enum(["all", "category", "tag"]),
    categoryId: z.string().nullable(),
    tagId: z.string().nullable(),
    amount: z.string().refine((value) => toSatang(value) !== null, "กรุณาใส่งบที่มากกว่า 0 บาท"),
    warning: z.string().refine((value) => {
      const percent = Number(value);
      return value.trim() !== "" && Number.isInteger(percent) && percent >= 1 && percent <= 100;
    }, "แจ้งเตือนต้องอยู่ระหว่าง 1–100%"),
  })
  .superRefine((value, context) => {
    if (value.target === "category" && !value.categoryId) {
      context.addIssue({ code: "custom", path: ["categoryId"], message: "กรุณาเลือกหมวดหมู่" });
    }
    if (value.target === "tag" && !value.tagId) {
      context.addIssue({ code: "custom", path: ["tagId"], message: "กรุณาเลือกแท็ก" });
    }
  });

function confirmDelete(onConfirm: () => void) {
  if (process.env.EXPO_OS === "web") {
    if (window.confirm("ลบงบประมาณนี้ใช่ไหม?")) onConfirm();
  } else {
    Alert.alert("ลบงบประมาณ", "ลบงบประมาณนี้ใช่ไหม?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: "destructive", onPress: onConfirm },
    ]);
  }
}

export default function BudgetFormScreen() {
  const theme = useAppTheme();
  const isFocused = useIsFocused();

  const params = useLocalSearchParams<{
    id?: string;
    periodKey?: string;
    categoryId?: string;
    tagId?: string;
  }>();

  const deleteBudgetMutation = useMutation(planningMutationOptions.deleteBudget());
  const upsertBudgetMutation = useMutation(planningMutationOptions.upsertBudget());

  const currentPeriodQuery = useQuery({
    ...planningQueryOptions.currentPeriod(),
    enabled: isFocused,
  });
  const monthStartQuery = useQuery({ ...planningQueryOptions.monthStartDay(), enabled: isFocused });
  const categoriesQuery = useQuery({
    ...categoriesQueryOptions.list("expense"),
    enabled: isFocused,
  });
  const tagsQuery = useQuery({ ...categoriesQueryOptions.tags(), enabled: isFocused });
  const periodKey = params.periodKey ?? currentPeriodQuery.data?.periodKey ?? null;
  const budgetsQuery = useQuery({
    ...planningQueryOptions.budgets(periodKey ?? ""),
    enabled: isFocused && Boolean(periodKey),
  });
  const monthStartDay = monthStartQuery.data ?? 1;
  const existing = params.id ? (budgetsQuery.data?.find((budget) => budget.id === params.id) ?? null) : null;
  const missingBudget = Boolean(params.id && budgetsQuery.data && !existing && !budgetsQuery.isFetching);
  const categories = categoriesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const loadQueries = [currentPeriodQuery, monthStartQuery, categoriesQuery, tagsQuery, budgetsQuery];
  const loadError = loadQueries.find((query) => query.data === undefined && query.error)?.error?.message;
  const loading = !loadError && loadQueries.some((query) => query.data === undefined);
  const queryError = loadQueries.find((query) => query.error)?.error?.message;

  const hydratedKey = useRef<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      target: "all" as Target,
      categoryId: null as string | null,
      tagId: null as string | null,
      amount: "",
      warning: "80",
    },
    validators: { onSubmit: budgetFormSchema },
    onSubmitInvalid: ({ value }) => {
      const result = budgetFormSchema.safeParse(value);
      if (!result.success) setError(result.error.issues[0]?.message ?? "ตรวจสอบข้อมูลอีกครั้ง");
    },
    onSubmit: async ({ value }) => {
      if (!periodKey) return setError("ยังไม่พบรอบเดือน");
      try {
        setSaving(true);
        setError(null);
        const input = budgetFormSchema.parse(value);
        const saved = await upsertBudgetMutation.mutateAsync({
          periodKey,
          categoryId: input.target === "category" ? input.categoryId : null,
          tagId: input.target === "tag" ? input.tagId : null,
          limitSatang: toSatang(input.amount)!,
          warningThresholdPercent: Number(input.warning),
        });
        if (existing && existing.id !== saved.id) await deleteBudgetMutation.mutateAsync({ id: existing.id });
        router.back();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setSaving(false);
      }
    },
  });

  const target = useSelector(form.store, (state) => state.values.target);
  const categoryId = useSelector(form.store, (state) => state.values.categoryId);
  const tagId = useSelector(form.store, (state) => state.values.tagId);

  useEffect(() => {
    if (!isFocused || !periodKey || !categoriesQuery.data || !tagsQuery.data || !budgetsQuery.data) return;
    if (
      (!params.periodKey && currentPeriodQuery.isFetching) ||
      categoriesQuery.isFetching ||
      tagsQuery.isFetching ||
      budgetsQuery.isFetching
    )
      return;
    const key = `${params.id ?? "new"}:${params.periodKey ?? "current"}:${params.categoryId ?? ""}:${params.tagId ?? ""}`;
    if (hydratedKey.current === key) return;
    if (params.id) {
      const found = existing;
      if (!found) return;
      form.reset({
        target: found.categoryId ? "category" : found.tagId ? "tag" : "all",
        categoryId: found.categoryId,
        tagId: found.tagId,
        amount: formatBaht(found.limitSatang),
        warning: String(found.warningThresholdPercent),
      });
    } else if (params.categoryId) {
      form.reset({
        target: "category",
        categoryId: params.categoryId,
        tagId: null,
        amount: "",
        warning: "80",
      });
    } else if (params.tagId) {
      form.reset({
        target: "tag",
        categoryId: null,
        tagId: params.tagId,
        amount: "",
        warning: "80",
      });
    }
    hydratedKey.current = key;
  }, [
    form,
    periodKey,
    params.id,
    params.periodKey,
    params.categoryId,
    params.tagId,
    existing,
    categoriesQuery.data,
    tagsQuery.data,
    budgetsQuery.data,
    currentPeriodQuery.isFetching,
    categoriesQuery.isFetching,
    tagsQuery.isFetching,
    budgetsQuery.isFetching,
    isFocused,
  ]);

  const bounds = useMemo(
    () => (periodKey ? getPeriodBounds(periodKey, monthStartDay) : null),
    [periodKey, monthStartDay]
  );

  const remove = () =>
    existing &&
    confirmDelete(async () => {
      try {
        setSaving(true);
        await deleteBudgetMutation.mutateAsync({ id: existing.id });
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
          <Text style={{ fontSize: 42 }}>🎯</Text>
          <Text style={{ color: theme.text, fontSize: 20, fontWeight: "900" }}>
            {existing ? "แก้ไขงบประมาณ" : "ตั้งงบไว้ให้หมูช่วยดู"}
          </Text>
          <Text style={{ color: theme.muted, fontSize: 13, textAlign: "center" }}>
            ใกล้ถึงงบเมื่อไร หมูจะบอกให้รู้ในหน้าวางแผน
          </Text>
        </View>
        {loading ? (
          <ActivityIndicator color={theme.accentText} style={{ paddingVertical: 35 }} />
        ) : loadError ? (
          <Card>
            <Text selectable style={{ color: theme.danger }}>
              {loadError}
            </Text>
            <Button
              label="ลองอีกครั้ง"
              onPress={() => {
                void currentPeriodQuery.refetch();
                void monthStartQuery.refetch();
                void categoriesQuery.refetch();
                void tagsQuery.refetch();
                if (periodKey) void budgetsQuery.refetch();
              }}
            />
          </Card>
        ) : (
          <>
            {bounds ? (
              <Card
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  backgroundColor: theme.raised,
                }}
              >
                <Text style={{ fontSize: 28 }}>🗓️</Text>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ color: theme.text, fontSize: 14, fontWeight: "800" }}>รอบเดือนที่ตั้งงบ</Text>
                  <Text selectable style={{ color: theme.muted, fontSize: 13 }}>
                    {thaiDate(bounds.from)} – {thaiDate(bounds.to)}
                  </Text>
                </View>
              </Card>
            ) : null}
            <Card style={{ gap: 15 }}>
              <SectionHeading title="งบนี้ใช้กับอะไร" />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Pill label="ทุกหมวด" selected={target === "all"} onPress={() => form.setFieldValue("target", "all")} />
                <Pill
                  label="หมวดหมู่"
                  selected={target === "category"}
                  onPress={() => form.setFieldValue("target", "category")}
                />
                <Pill label="แท็ก" selected={target === "tag"} onPress={() => form.setFieldValue("target", "tag")} />
              </View>
              {target === "category" ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {categories.map((category) => (
                    <Pill
                      key={category.id}
                      label={`${category.icon} ${category.name}`}
                      selected={categoryId === category.id}
                      onPress={() => form.setFieldValue("categoryId", category.id)}
                      color={category.color}
                    />
                  ))}
                </View>
              ) : null}
              {target === "tag" ? (
                tags.length ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {tags.map((tag) => (
                      <Pill
                        key={tag.id}
                        label={tag.name}
                        selected={tagId === tag.id}
                        onPress={() => form.setFieldValue("tagId", tag.id)}
                        color={tag.color}
                      />
                    ))}
                  </View>
                ) : (
                  <Button label="สร้างแท็กก่อน" variant="soft" onPress={() => router.push("/tags")} />
                )
              ) : null}
            </Card>
            <Card style={{ gap: 16 }}>
              <form.Field name="amount">
                {(field) => (
                  <Field
                    label="วงเงิน (บาท)"
                    value={field.state.value}
                    onChangeText={field.handleChange}
                    onBlur={field.handleBlur}
                    keyboardType="decimal-pad"
                    placeholder="เช่น 5,000"
                    autoFocus={!existing}
                  />
                )}
              </form.Field>
              <form.Field name="warning">
                {(field) => (
                  <Field
                    label="เตือนเมื่องบใช้ไป (%)"
                    value={field.state.value}
                    onChangeText={field.handleChange}
                    onBlur={field.handleBlur}
                    keyboardType="number-pad"
                    placeholder="80"
                    hint="เช่น 80 หมายถึงแสดงสัญญาณเตือนเมื่อใช้ไป 80% ของงบ"
                  />
                )}
              </form.Field>
            </Card>
            {error || queryError || missingBudget ? (
              <Text selectable style={{ color: theme.danger, textAlign: "center", fontSize: 13 }}>
                {error ?? queryError ?? "ไม่พบงบประมาณนี้ กรุณากลับไปเลือกจากหน้าวางแผนอีกครั้ง"}
              </Text>
            ) : null}
            <Button
              label={saving ? "กำลังบันทึก…" : "บันทึกงบประมาณ"}
              onPress={() => void form.handleSubmit()}
              disabled={saving || !periodKey || (Boolean(params.id) && !existing)}
            />
            {existing ? (
              <Pressable onPress={remove} disabled={saving} style={{ alignItems: "center", padding: 14 }}>
                <Text style={{ color: theme.danger, fontWeight: "800" }}>ลบงบประมาณนี้</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    </ScrollView>
  );
}
