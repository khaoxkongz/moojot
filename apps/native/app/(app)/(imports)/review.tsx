import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useIsFocused } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

import { Button, Card, EmptyState, Field, Pill, SectionHeading } from "@/components/ui/moo-ui";
import { Text } from "@/components/ui/typography";
import { useAppTheme } from "@/lib/use-app-theme";
import { categoriesQueryOptions } from "@/features/categories/query-options";
import { detectDuplicates } from "@/features/entries/data";
import { entriesQueryOptions } from "@/features/entries/query-options";
import { suggestCategory } from "@/features/imports/categorize";
import { importsMutationOptions } from "@/features/imports/mutation-options";
import { clearImportSession, getImportSession } from "@/features/imports/session";
import type { ImportCandidate } from "@/features/imports/types";
import { authClient } from "@/lib/auth-client";
import { setLocalSlipImage } from "@/lib/local-slip-assets";
import type { TransactionKind } from "@/types/finance";
import { formatBaht, isValidISODate, toSatang } from "@/utils/format";

interface ReviewRow extends Omit<ImportCandidate, "amountSatang" | "occurredOn"> {
  amountText: string;
  occurredOn: string;
  categoryId: string | null;
  note: string;
  selected: boolean;
  duplicate: boolean;
}
const emptyCandidates: never[] = [];
const emptyReviewRows: ReviewRow[] = [];

export default function ReviewScreen() {
  const theme = useAppTheme();
  const isFocused = useIsFocused();

  const { data } = authClient.useSession();

  const [session] = useState(getImportSession);
  const [draftRows, setDraftRows] = useState<ReviewRow[] | null>(null);

  const saveReviewedTransactionsMutation = useMutation(importsMutationOptions.saveReviewedTransactions());

  const categoriesQuery = useQuery({
    ...categoriesQueryOptions.list(),
    enabled: isFocused && Boolean(session),
  });
  const historyQuery = useQuery({
    ...entriesQueryOptions.list({ limit: 1000 }),
    enabled: isFocused && Boolean(session),
  });
  const candidates = session?.candidates ?? emptyCandidates;
  const duplicateInputs = candidates.map((candidate) => ({
    kind: candidate.kind,
    amountSatang: candidate.amountSatang,
    occurredOn: candidate.occurredOn,
    title: candidate.title,
    source: candidate.source,
  }));
  const duplicatesQuery = useQuery({
    queryKey: ["finance", "imports", "review-duplicates", duplicateInputs],
    queryFn: () =>
      Promise.all(
        candidates.map((candidate) =>
          candidate.amountSatang && candidate.occurredOn && isValidISODate(candidate.occurredOn)
            ? detectDuplicates({
                kind: candidate.kind,
                amountSatang: candidate.amountSatang,
                occurredOn: candidate.occurredOn,
                title: candidate.title || "ไม่ระบุรายการ",
                source: candidate.source,
              })
            : Promise.resolve([])
        )
      ),
    enabled: isFocused && Boolean(session),
  });
  const categories = categoriesQuery.data ?? [];
  const loadError = [categoriesQuery, historyQuery, duplicatesQuery].find(
    (query) => query.data === undefined && query.error
  )?.error?.message;
  const queryError = categoriesQuery.error?.message ?? historyQuery.error?.message ?? duplicatesQuery.error?.message;
  const prepared = Boolean(categoriesQuery.data && historyQuery.data && duplicatesQuery.data);
  const initialRows = useMemo(() => {
    if (!categoriesQuery.data || !historyQuery.data || !duplicatesQuery.data) return emptyReviewRows;
    return candidates.map((candidate, index) => {
      const duplicate = (duplicatesQuery.data[index]?.length ?? 0) > 0;
      return {
        ...candidate,
        amountText: candidate.amountSatang ? formatBaht(candidate.amountSatang) : "",
        occurredOn: candidate.occurredOn ?? "",
        categoryId: suggestCategory(candidate.title, candidate.kind, categoriesQuery.data, historyQuery.data),
        note: "",
        selected: !duplicate,
        duplicate,
      } as ReviewRow;
    });
  }, [candidates, categoriesQuery.data, historyQuery.data, duplicatesQuery.data]);
  const rows = draftRows ?? initialRows;
  const loading = !loadError && !prepared;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedCount = useMemo(() => rows.filter((row) => row.selected).length, [rows]);

  const update = (index: number, patch: Partial<ReviewRow>) =>
    setDraftRows((items) => (items ?? rows).map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const save = async () => {
    const selected = rows.map((row, index) => ({ row, index })).filter(({ row }) => row.selected);
    if (!selected.length) return setError("กรุณาเลือกรายการที่ต้องการบันทึก");
    for (const { row, index } of selected) {
      if (!toSatang(row.amountText)) return setError(`รายการที่ ${index + 1}: จำนวนเงินไม่ถูกต้อง`);
      if (!isValidISODate(row.occurredOn)) return setError(`รายการที่ ${index + 1}: วันที่ต้องเป็น YYYY-MM-DD`);
      if (!row.title.trim()) return setError(`รายการที่ ${index + 1}: กรุณาใส่ชื่อรายการ`);
    }
    try {
      setSaving(true);
      setError(null);

      const items = selected.map(({ row, index }) => ({
        index,
        input: {
          kind: row.kind,
          amountSatang: toSatang(row.amountText)!,
          occurredOn: row.occurredOn,
          title: row.title.trim(),
          note: row.note.trim(),
          bank: row.bank,
          cardName: row.cardName,
          cardLast4: row.cardLast4,
          slipImageUri: row.source === "slip" ? (session?.slipImageUri ?? null) : null,
          categoryId: row.kind === "transfer" ? null : row.categoryId,
          tagIds: [],
          source: row.source,
        },
      }));

      for (const { index, input } of items) {
        const created = await saveReviewedTransactionsMutation.mutateAsync(input);
        await setLocalSlipImage(data?.user.id || "", created.id, input.slipImageUri);
        update(index, { selected: false, duplicate: true });
      }

      clearImportSession();
      router.dismissTo("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  if (!session)
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 22 }}>
        <Card>
          <EmptyState icon="🧾" title="ยังไม่มีไฟล์ให้ตรวจ" body="กลับไปเลือกสลิปหรือใบแจ้งยอดก่อน" />
          <Button label="กลับไปนำเข้า" onPress={() => router.replace("/import")} />
        </Card>
      </View>
    );

  return (
    <ScrollView
      bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ alignItems: "center", padding: 18, paddingBottom: 50 }}
    >
      <View style={{ width: "100%", maxWidth: 680, gap: 16 }}>
        <View style={{ alignItems: "center", gap: 5, paddingVertical: 6 }}>
          <Text style={{ fontSize: 43 }}>🔎</Text>
          <Text style={{ color: theme.text, fontSize: 21, fontWeight: "900" }}>ตรวจให้ชัวร์ก่อนจด</Text>
          <Text style={{ color: theme.muted, textAlign: "center", fontSize: 13 }}>
            เลือกและแก้ไขรายการที่อ่านได้ก่อนบันทึกลงบัญชี
          </Text>
        </View>
        {session.warnings.length ? (
          <Card style={{ backgroundColor: theme.raised, gap: 5 }}>
            {session.warnings.map((warning, i) => (
              <Text key={i} style={{ color: theme.accentText, fontSize: 12, lineHeight: 19 }}>
                • {warning}
              </Text>
            ))}
          </Card>
        ) : null}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <SectionHeading title={`${rows.length} รายการที่พบ`} />
          <Text style={{ color: theme.accentText, fontWeight: "800", fontSize: 13 }}>เลือก {selectedCount} รายการ</Text>
        </View>
        {loading ? (
          <ActivityIndicator color={theme.accentText} />
        ) : loadError ? (
          <Card style={{ backgroundColor: theme.raised }}>
            <Text selectable style={{ color: theme.dangerText }}>
              {loadError}
            </Text>
            <Button
              label="ลองอีกครั้ง"
              onPress={() => {
                void categoriesQuery.refetch();
                void historyQuery.refetch();
                void duplicatesQuery.refetch();
              }}
            />
          </Card>
        ) : rows.length === 0 ? (
          <Card>
            <EmptyState icon="🐽" title="ยังแยกรายการไม่ได้" body="ลองไฟล์ที่ชัดขึ้น หรือจดรายการเองได้ทันที" />
            <Button label="จดเอง" onPress={() => router.push("/entry")} />
          </Card>
        ) : (
          rows.map((row, index) => (
            <Card key={index} style={{ gap: 13, borderColor: row.selected ? theme.accent : theme.border }}>
              <Pressable
                onPress={() => update(index, { selected: !row.selected })}
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <View
                  style={{
                    width: 25,
                    height: 25,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: row.selected ? theme.accent : theme.muted,
                    backgroundColor: row.selected ? theme.accent : theme.surface,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {row.selected ? <Text style={{ color: theme.onAccent, fontWeight: "900" }}>✓</Text> : null}
                </View>
                <Text style={{ color: theme.text, fontWeight: "900", fontSize: 15, flex: 1 }}>รายการที่ {index + 1}</Text>
                <Text
                  style={{
                    color: row.issues.length ? theme.accentText : theme.muted,
                    fontSize: 11,
                    fontWeight: "800",
                  }}
                >
                  {row.issues.length ? "มีจุดที่ต้องตรวจ" : "ตรวจทุกช่องก่อนบันทึก"}
                </Text>
              </Pressable>
              {row.duplicate ? (
                <Text style={{ color: theme.accentText, fontSize: 12 }}>⚠ พบรายการที่อาจซ้ำ จึงไม่ได้เลือกไว้</Text>
              ) : null}
              {row.issues.map((issue, i) => (
                <Text key={i} style={{ color: theme.accentText, fontSize: 12 }}>
                  • {issue}
                </Text>
              ))}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
                {(["expense", "income", "transfer"] as TransactionKind[]).map((kind) => (
                  <Pill
                    key={kind}
                    label={kind === "expense" ? "รายจ่าย" : kind === "income" ? "รายรับ" : "ย้ายเงิน"}
                    selected={row.kind === kind}
                    onPress={() => update(index, { kind, categoryId: null })}
                  />
                ))}
              </View>
              <Field
                label="จำนวนเงิน (บาท)"
                value={row.amountText}
                onChangeText={(value) => update(index, { amountText: value })}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
              <Field
                label="ชื่อรายการ"
                value={row.title}
                onChangeText={(value) => update(index, { title: value })}
                placeholder="ชื่อร้าน / รายการ"
              />
              <Field
                label="วันที่ใช้จริง"
                value={row.occurredOn}
                onChangeText={(value) => update(index, { occurredOn: value })}
                placeholder="YYYY-MM-DD"
              />
              {row.kind !== "transfer" ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ color: theme.text, fontWeight: "700", fontSize: 14 }}>หมวดหมู่</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
                    <Pill
                      label="ไม่ระบุ"
                      selected={!row.categoryId}
                      onPress={() => update(index, { categoryId: null })}
                    />
                    {categories
                      .filter((category) => category.kind === row.kind)
                      .map((category) => (
                        <Pill
                          key={category.id}
                          label={`${category.icon} ${category.name}`}
                          selected={row.categoryId === category.id}
                          onPress={() => update(index, { categoryId: category.id })}
                          color={category.color}
                        />
                      ))}
                  </ScrollView>
                </View>
              ) : null}
              <Field
                label="โน้ต (ถ้ามี)"
                value={row.note}
                onChangeText={(value) => update(index, { note: value })}
                placeholder="รายละเอียดเพิ่มเติม"
              />
              <Text style={{ color: theme.muted, fontSize: 11 }}>
                {[row.bank, row.cardName, row.cardLast4 ? `•••• ${row.cardLast4}` : null].filter(Boolean).join(" · ")}
              </Text>
            </Card>
          ))
        )}
        {error || (prepared && queryError) ? (
          <Card style={{ backgroundColor: theme.raised }}>
            <Text selectable style={{ color: theme.dangerText }}>
              {error ?? queryError}
            </Text>
          </Card>
        ) : null}
        <Button
          label={saving ? "กำลังบันทึก…" : `บันทึก ${selectedCount} รายการ`}
          onPress={save}
          disabled={saving || selectedCount === 0}
        />
        <Button label="กลับไปเลือกไฟล์" variant="outline" onPress={() => router.back()} disabled={saving} />
      </View>
    </ScrollView>
  );
}
