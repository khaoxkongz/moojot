import { useMutation, useQuery } from "@tanstack/react-query";
import { categoriesMutationOptions } from "@/features/categories/mutation-options";
import { categoriesQueryOptions } from "@/features/categories/query-options";
import { CategoryGlyph } from "@/components/ui/category-glyph";
import { Text, TextInput } from "@/components/ui/typography";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Category } from "@/types/finance";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/lib/use-app-theme";
import { errorMessage } from "@/utils/format";

type Kind = "expense" | "income";
type Editor = { id: string | null; name: string; icon: string; color: string };

const icons = ["🍜", "🚙", "🛍️", "🏠", "💊", "🎬", "🎁", "📚", "💼", "💸", "✨", "📈"];
const swatches = ["#FF9E15", "#21B6D1", "#EE59CA", "#7957E5", "#19CDA9", "#8DDD29", "#D7971C"];

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/settings");
}

export default function CategoriesScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isFocused = useIsFocused();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const createCategoryMutation = useMutation(categoriesMutationOptions.createCategory());
  const deleteCategoryMutation = useMutation(categoriesMutationOptions.deleteCategory());
  const updateCategoryMutation = useMutation(categoriesMutationOptions.updateCategory());
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState<Kind>(() => (section === "income" ? "income" : "expense"));
  const categoriesQuery = useQuery({ ...categoriesQueryOptions.list(), enabled: isFocused });
  const loading = categoriesQuery.isPending;
  const [busy, setBusy] = useState(false);
  const [manage, setManage] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const visible = useMemo(
    () => (categoriesQuery.data ?? []).filter((item) => item.kind === kind),
    [categoriesQuery.data, kind]
  );

  const openNew = () => {
    setError(null);
    setEditor({ id: null, name: "", icon: "✨", color: swatches[0] });
  };
  const openExisting = (category: Category) => {
    if (!manage || category.isSystem) return;
    setError(null);
    setEditor({ id: category.id, name: category.name, icon: category.icon, color: category.color });
  };
  const saveEditor = async () => {
    if (!editor || busy) return;
    if (!editor.name.trim()) {
      setError("กรุณาใส่ชื่อหมวดหมู่");
      return;
    }
    try {
      setBusy(true);
      setError(null);
      if (editor.id)
        await updateCategoryMutation.mutateAsync({
          id: editor.id,
          patch: {
            name: editor.name.trim(),
            icon: editor.icon,
            color: editor.color,
          },
        });
      else
        await createCategoryMutation.mutateAsync({
          kind,
          name: editor.name.trim(),
          icon: editor.icon,
          color: editor.color,
        });
      setEditor(null);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  const remove = () => {
    if (!editor?.id || busy) return;
    const id = editor.id;
    const perform = async () => {
      try {
        setBusy(true);
        setError(null);
        await deleteCategoryMutation.mutateAsync({ id });
        setEditor(null);
      } catch (cause) {
        setError(errorMessage(cause));
      } finally {
        setBusy(false);
      }
    };
    if (process.env.EXPO_OS === "web") {
      if (window.confirm("ลบหมวดหมู่นี้ใช่ไหม?")) void perform();
    } else
      Alert.alert("ลบหมวดหมู่?", "รายการเงินเดิมจะยังอยู่ แต่ไม่มีหมวดหมู่นี้อีก", [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ลบ",
          style: "destructive",
          onPress: () => {
            void perform();
          },
        },
      ]);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="ย้อนกลับ" onPress={goBack} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.tabs}>
          {(["expense", "income"] as const).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: kind === value }}
              onPress={() => setKind(value)}
              style={[styles.tab, kind === value ? styles.selectedTab : styles.unselectedTab]}
            >
              <Text style={[styles.tabArrow, { color: kind === value ? theme.text : theme.text }]}>
                {value === "expense" ? "↑" : "↓"}
              </Text>
              <Text style={[styles.tabLabel, { color: kind === value ? theme.text : theme.text }]}>
                {value === "expense" ? "รายจ่าย" : "รายรับ"}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={manage ? "เสร็จ" : "จัดการ"}
          onPress={() => setManage((current) => !current)}
          style={styles.manage}
        >
          <Text style={styles.manageText}>{manage ? "เสร็จ" : "จัดการ"}</Text>
        </Pressable>
      </View>

      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        <View style={styles.sectionHeading}>
          <Text style={styles.headingText}>หมวดหมู่{kind === "expense" ? "รายจ่าย" : "รายรับ"}</Text>
        </View>
        {loading ? (
          <ActivityIndicator color={theme.accentText} style={{ marginTop: 32 }} />
        ) : (
          <View style={styles.grid}>
            {visible.map((category) => (
              <Pressable
                key={category.id}
                accessibilityRole="button"
                accessibilityLabel={`${category.name}${category.isSystem ? " หมวดหมู่พื้นฐาน" : manage ? " แก้ไขได้" : ""}`}
                onPress={() => openExisting(category)}
                style={({ pressed }) => [styles.cell, pressed && manage && !category.isSystem && { opacity: 0.72 }]}
              >
                <View style={styles.iconBadge}>
                  <CategoryGlyph id={category.isSystem ? category.id : "custom"} icon={category.icon} />
                  {manage && !category.isSystem ? (
                    <View style={styles.editDot}>
                      <Text style={styles.editDotText}>✎</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.cellLabel}>{category.name}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {manage ? <Text style={styles.manageHint}>แตะหมวดหมู่ที่สร้างเองเพื่อแก้ไข หมวดหมู่พื้นฐานแก้ไขไม่ได้</Text> : null}
        {(error ?? categoriesQuery.error?.message) && !editor ? (
          <Text accessibilityRole="alert" style={styles.inlineError}>
            {error ?? categoriesQuery.error?.message}
          </Text>
        ) : null}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="เพิ่มหมวดหมู่ใหม่"
        onPress={openNew}
        style={[styles.addButton, { bottom: Math.max(insets.bottom + 24, 56) }]}
      >
        <Text style={styles.addButtonText}>＋ เพิ่มหมวดหมู่ใหม่</Text>
      </Pressable>

      <Modal visible={!!editor} animationType="fade" transparent onRequestClose={() => setEditor(null)}>
        <KeyboardAvoidingView behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={styles.modalShade}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{editor?.id ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่ใหม่"}</Text>
              <Text style={styles.fieldCaption}>ชื่อหมวดหมู่</Text>
              <TextInput
                accessibilityLabel="ชื่อหมวดหมู่"
                placeholder="เช่น คาเฟ่"
                placeholderTextColor={theme.muted}
                value={editor?.name ?? ""}
                onChangeText={(value) => setEditor((current) => current && { ...current, name: value })}
                style={styles.nameInput}
              />
              <Text style={styles.fieldCaption}>เลือกไอคอน</Text>
              <View style={styles.iconChoices}>
                {icons.map((item) => (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityLabel={`ไอคอน ${item}`}
                    onPress={() => setEditor((current) => current && { ...current, icon: item })}
                    style={[styles.iconChoice, editor?.icon === item && styles.selectedChoice]}
                  >
                    <Text style={{ fontSize: 23 }}>{item}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.fieldCaption}>เลือกสี</Text>
              <View style={styles.swatches}>
                {swatches.map((item) => (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityLabel={`สี ${item}`}
                    onPress={() => setEditor((current) => current && { ...current, color: item })}
                    style={[styles.swatch, { backgroundColor: item }, editor?.color === item && styles.selectedSwatch]}
                  />
                ))}
              </View>
              {error ? (
                <Text accessibilityRole="alert" style={styles.formError}>
                  {error}
                </Text>
              ) : null}
              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setEditor(null)}
                  style={[styles.modalAction, styles.cancelAction]}
                >
                  <Text style={styles.cancelText}>ยกเลิก</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => {
                    void saveEditor();
                  }}
                  style={[styles.modalAction, styles.saveAction]}
                >
                  <Text style={styles.saveText}>{busy ? "กำลังบันทึก…" : "บันทึก"}</Text>
                </Pressable>
              </View>
              {editor?.id ? (
                <Pressable accessibilityRole="button" disabled={busy} onPress={remove} style={styles.deleteAction}>
                  <Text style={styles.deleteText}>ลบหมวดหมู่นี้</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    header: {
      minHeight: 105,
      backgroundColor: theme.accent,
      paddingHorizontal: 15,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
    },
    back: { width: 45, height: 56, alignItems: "flex-start", justifyContent: "center" },
    backText: { color: theme.onAccent, fontSize: 46, fontWeight: "300", lineHeight: 49 },
    tabs: { height: 56, flexDirection: "row", alignItems: "flex-end" },
    tab: {
      width: 75,
      height: 56,
      borderTopLeftRadius: 13,
      borderTopRightRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      gap: 0,
    },
    selectedTab: { backgroundColor: theme.background },
    unselectedTab: { backgroundColor: theme.raised },
    tabArrow: { fontSize: 23, lineHeight: 25, fontWeight: "300" },
    tabLabel: { fontSize: 13, lineHeight: 19, fontWeight: "800" },
    manage: { width: 57, height: 56, justifyContent: "center", alignItems: "flex-end" },
    manageText: { color: theme.onAccent, fontWeight: "800", fontSize: 17 },
    sectionHeading: {
      minHeight: 72,
      justifyContent: "center",
      paddingHorizontal: 16,
      backgroundColor: theme.background,
    },
    headingText: { color: theme.text, fontSize: 17, fontWeight: "800" },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      backgroundColor: theme.surface,
      paddingTop: 16,
      paddingBottom: 5,
    },
    cell: { width: "25%", minHeight: 114, alignItems: "center", paddingHorizontal: 3 },
    iconBadge: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: theme.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    editDot: {
      position: "absolute",
      right: -2,
      bottom: -2,
      width: 17,
      height: 17,
      borderRadius: 9,
      backgroundColor: theme.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    editDotText: { color: theme.onAccent, fontSize: 11, fontWeight: "900" },
    cellLabel: { color: theme.text, fontSize: 14, lineHeight: 19, textAlign: "center", paddingTop: 8 },
    manageHint: {
      color: theme.muted,
      fontSize: 12,
      textAlign: "center",
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    inlineError: { color: theme.danger, textAlign: "center", padding: 18 },
    addButton: {
      position: "absolute",
      alignSelf: "center",
      width: "62%",
      maxWidth: 300,
      minHeight: 49,
      borderRadius: 26,
      backgroundColor: theme.accent,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 10,
    },
    addButtonText: {
      color: theme.onAccent,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: "800",
      textAlign: "center",
    },
    modalShade: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,.62)",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    modalCard: {
      maxWidth: 460,
      width: "100%",
      alignSelf: "center",
      backgroundColor: theme.raised,
      borderRadius: 18,
      padding: 20,
      gap: 10,
    },
    modalTitle: {
      color: theme.text,
      fontSize: 20,
      fontWeight: "900",
      textAlign: "center",
      paddingBottom: 7,
    },
    fieldCaption: { color: theme.text, fontSize: 14, fontWeight: "700" },
    nameInput: {
      minHeight: 48,
      borderRadius: 10,
      backgroundColor: theme.surface,
      color: theme.text,
      paddingHorizontal: 12,
      fontSize: 16,
    },
    iconChoices: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    iconChoice: {
      width: 43,
      height: 43,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.background,
    },
    selectedChoice: { borderWidth: 2, borderColor: theme.accent },
    swatches: { flexDirection: "row", flexWrap: "wrap", gap: 9, paddingVertical: 4 },
    swatch: { width: 30, height: 30, borderRadius: 15 },
    selectedSwatch: { borderWidth: 3, borderColor: theme.text },
    formError: { color: theme.danger, fontSize: 13 },
    modalActions: { flexDirection: "row", gap: 9, paddingTop: 9 },
    modalAction: {
      flex: 1,
      minHeight: 43,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelAction: { borderWidth: 1, borderColor: theme.accentText },
    cancelText: { color: theme.accentText, fontWeight: "800", fontSize: 15 },
    saveAction: { backgroundColor: theme.accent },
    saveText: { color: theme.onAccent, fontWeight: "800", fontSize: 15 },
    deleteAction: { alignItems: "center", paddingTop: 6 },
    deleteText: { color: theme.danger, fontSize: 13, fontWeight: "700" },
  });
}
