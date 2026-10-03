import { useMutation, useQuery } from "@tanstack/react-query";
import { categoriesMutationOptions } from "@/features/categories/mutation-options";
import { categoriesQueryOptions } from "@/features/categories/query-options";
import { Text, TextInput } from "@/components/ui/typography";
import { Image } from "expo-image";
import { router, useIsFocused } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Tag } from "@/types/finance";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/lib/use-app-theme";
import { errorMessage } from "@/utils/format";

const tagColors = ["#4D99FF", "#FF8C83", "#FFC65A", "#A18AFF", "#66CBB0", "#ED83CE"];
const suggestedTags = [
  ["❤️ เปย์ตัวเอง", "ฟุ่มเฟือย", "บัตรเครดิต", "เงินสด"],
  ["ทริปญี่ปุ่น", "ให้แม่", "คุณแฟน", "จ่ายประจำ", "ให้ยืม"],
  ["สำรองจ่าย", "แต้มแลก", "ลดหย่อนภาษี"],
];

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/settings");
}

export default function TagsScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isFocused = useIsFocused();
  const createTagMutation = useMutation(categoriesMutationOptions.createTag());
  const deleteTagMutation = useMutation(categoriesMutationOptions.deleteTag());
  const updateTagMutation = useMutation(categoriesMutationOptions.updateTag());
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tagsQuery = useQuery({ ...categoriesQueryOptions.tags(), enabled: isFocused });
  const tags = tagsQuery.data ?? [];
  const loading = tagsQuery.isPending;
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [deleting, setDeleting] = useState<Tag | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(tagColors[0]);
  const [error, setError] = useState<string | null>(null);

  const openEditor = (tag: Tag | null = null, suggestion = "") => {
    setEditing(tag);
    setName(tag?.name ?? suggestion);
    setColor(tag?.color ?? tagColors[0]);
    setError(null);
    setEditorOpen(true);
  };

  const saveTag = async () => {
    const nextName = name.trim();
    if (!nextName) {
      setError("กรุณาใส่ชื่อแท็ก");
      return;
    }
    if (tags.some((tag) => tag.id !== editing?.id && tag.name.toLocaleLowerCase() === nextName.toLocaleLowerCase())) {
      setError("มีแท็กชื่อนี้แล้ว");
      return;
    }
    try {
      setBusy(true);
      setError(null);
      if (editing) await updateTagMutation.mutateAsync({ id: editing.id, patch: { name: nextName, color } });
      else await createTagMutation.mutateAsync({ name: nextName, color });
      setEditorOpen(false);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const removeTag = async () => {
    if (!deleting) return;
    try {
      setBusy(true);
      setError(null);
      await deleteTagMutation.mutateAsync({ id: deleting.id });
      setDeleting(null);
    } catch (cause) {
      setError(errorMessage(cause));
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="กลับไปหน้าพี่มนุษย์"
          onPress={goBack}
          hitSlop={10}
          style={styles.headerSide}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>แท็กของฉัน</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(146, insets.bottom + 120) }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={theme.accentText} style={{ marginTop: 190 }} />
        ) : tags.length === 0 ? (
          <View style={styles.emptyState}>
            <Image
              source={require("../../../assets/generated/tags-empty-pig.png")}
              contentFit="contain"
              accessibilityLabel="น้องหมูนั่งข้างสัญลักษณ์แท็ก"
              style={[styles.emptyArt, { width: Math.min(318, width - 50) }]}
            />
            <Text style={styles.emptyCopy}>
              ลองสร้าง <Text style={styles.emptyEmphasis}>#แท็ก</Text>
              {"\n"}ช่วยแบ่งค่าใช้จ่ายได้ละเอียด
            </Text>
            <View style={styles.suggestions}>
              {suggestedTags.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.suggestionRow}>
                  {row.map((suggestion) => (
                    <Pressable
                      key={suggestion}
                      accessibilityRole="button"
                      accessibilityLabel={`เพิ่มแท็ก ${suggestion}`}
                      onPress={() => openEditor(null, suggestion)}
                      style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
                    >
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.savedContent}>
            <Text style={styles.savedHeading}>แท็กของฉัน</Text>
            <Text style={styles.savedHint}>เลือกแท็กเพื่อแก้ไข หรือกดลบเมื่อไม่ต้องการใช้แล้ว</Text>
            {tags.map((tag) => (
              <View key={tag.id} style={styles.tagRow}>
                <View style={[styles.tagMark, { backgroundColor: tag.color + "25" }]}>
                  <Text style={[styles.tagHash, { color: tag.color }]}>#</Text>
                </View>
                <Text numberOfLines={1} style={styles.tagName}>
                  {tag.name}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`แก้ไขแท็ก ${tag.name}`}
                  onPress={() => openEditor(tag)}
                  style={styles.rowAction}
                >
                  <Text style={styles.editText}>แก้ไข</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`ลบแท็ก ${tag.name}`}
                  onPress={() => setDeleting(tag)}
                  style={styles.rowAction}
                >
                  <Text style={styles.deleteText}>ลบ</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
        {(error ?? tagsQuery.error?.message) && !editorOpen ? (
          <Text accessibilityRole="alert" style={styles.pageError}>
            {error ?? tagsQuery.error?.message}
          </Text>
        ) : null}
      </ScrollView>

      <View pointerEvents="box-none" style={[styles.footer, { bottom: Math.max(56, insets.bottom + 34) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="เพิ่มแท็กใหม่"
          onPress={() => openEditor()}
          style={[styles.addButton, { width: Math.min(320, Math.max(240, width - 150)) }]}
        >
          <Text style={styles.addPlus}>＋</Text>
          <Text style={styles.addText}>เพิ่มแท็กใหม่</Text>
        </Pressable>
      </View>

      <Modal transparent visible={editorOpen} animationType="fade" onRequestClose={() => !busy && setEditorOpen(false)}>
        <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={styles.modalBackdrop} onPress={() => !busy && setEditorOpen(false)} />
          <View style={styles.editorCard}>
            <Text style={styles.modalTitle}>{editing ? "แก้ไขแท็ก" : "เพิ่มแท็กใหม่"}</Text>
            <Text style={styles.fieldLabel}>ชื่อแท็ก</Text>
            <TextInput
              accessibilityLabel="ชื่อแท็ก"
              autoFocus
              value={name}
              onChangeText={setName}
              maxLength={40}
              placeholder="เช่น ทริปญี่ปุ่น"
              placeholderTextColor={theme.muted}
              style={styles.input}
            />
            <Text style={styles.fieldLabel}>สีแท็ก</Text>
            <View style={styles.colorRow}>
              {tagColors.map((choice) => (
                <Pressable
                  key={choice}
                  accessibilityRole="radio"
                  accessibilityLabel={`สี ${choice}`}
                  accessibilityState={{ checked: color === choice }}
                  onPress={() => setColor(choice)}
                  style={[styles.colorChoice, { backgroundColor: choice }, color === choice && styles.colorSelected]}
                >
                  {color === choice ? <Text style={styles.colorCheck}>✓</Text> : null}
                </Pressable>
              ))}
            </View>
            {error ? (
              <Text accessibilityRole="alert" style={styles.modalError}>
                {error}
              </Text>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => setEditorOpen(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>ยกเลิก</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => {
                  void saveTag();
                }}
                style={[styles.saveButton, busy && styles.disabled]}
              >
                <Text style={styles.saveText}>{busy ? "กำลังบันทึก…" : "บันทึก"}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        transparent
        visible={deleting !== null}
        animationType="fade"
        onRequestClose={() => !busy && setDeleting(null)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => !busy && setDeleting(null)} />
          <View style={styles.editorCard}>
            <Text style={styles.modalTitle}>ลบแท็กนี้?</Text>
            <Text style={styles.deleteDescription}>#{deleting?.name} จะถูกลบออกจากรายการเดิมด้วย แต่รายการเงินยังอยู่</Text>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => setDeleting(null)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>ยกเลิก</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => {
                  void removeTag();
                }}
                style={[styles.saveButton, busy && styles.disabled]}
              >
                <Text style={styles.saveText}>ลบแท็ก</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    header: {
      minHeight: 105,
      paddingHorizontal: 17,
      backgroundColor: theme.accent,
      flexDirection: "row",
      alignItems: "center",
    },
    headerSide: { width: 46, minHeight: 52, justifyContent: "center", alignItems: "center" },
    backIcon: { color: theme.onAccent, fontSize: 44, lineHeight: 49, fontWeight: "300" },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      color: theme.onAccent,
      fontSize: 20,
      lineHeight: 28,
      fontWeight: "900",
    },
    content: { flexGrow: 1 },
    emptyState: { alignItems: "center", paddingTop: 107 },
    emptyArt: { height: 230 },
    emptyCopy: {
      color: theme.muted,
      fontSize: 19,
      lineHeight: 28,
      textAlign: "center",
      paddingTop: 2,
    },
    emptyEmphasis: { color: theme.text, fontWeight: "800" },
    suggestions: { paddingTop: 24, alignItems: "center", gap: 9, width: "100%" },
    suggestionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 4,
      width: "100%",
      paddingHorizontal: 16,
    },
    suggestion: {
      backgroundColor: theme.raised,
      borderRadius: 20,
      minHeight: 32,
      paddingHorizontal: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    suggestionText: { color: theme.text, fontSize: 14, fontWeight: "600" },
    pressed: { opacity: 0.78 },
    footer: { position: "absolute", left: 0, right: 0, alignItems: "center" },
    addButton: {
      minHeight: 50,
      backgroundColor: theme.accent,
      borderRadius: 28,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    addPlus: { color: theme.onAccent, fontSize: 32, lineHeight: 38, fontWeight: "300" },
    addText: { color: theme.onAccent, fontSize: 20, fontWeight: "900" },
    pageError: { color: theme.danger, textAlign: "center", paddingHorizontal: 20, paddingTop: 24 },
    savedContent: { paddingTop: 25, paddingHorizontal: 16, gap: 4 },
    savedHeading: { color: theme.text, fontSize: 20, fontWeight: "800", paddingBottom: 2 },
    savedHint: { color: theme.muted, fontSize: 13, lineHeight: 19, paddingBottom: 20 },
    tagRow: {
      minHeight: 70,
      borderRadius: 16,
      backgroundColor: theme.surface,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      gap: 6,
    },
    tagMark: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
    },
    tagHash: { fontSize: 24, fontWeight: "900" },
    tagName: { flex: 1, color: theme.text, fontSize: 16, fontWeight: "700", paddingLeft: 5 },
    rowAction: { minHeight: 42, paddingHorizontal: 5, justifyContent: "center" },
    editText: { color: theme.accentText, fontSize: 13, fontWeight: "700" },
    deleteText: { color: theme.danger, fontSize: 13, fontWeight: "700" },
    modalRoot: { flex: 1, alignItems: "center", justifyContent: "center" },
    modalBackdrop: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: "rgba(0, 0, 0, .62)",
    },
    editorCard: {
      width: "90%",
      maxWidth: 420,
      padding: 22,
      borderRadius: 20,
      backgroundColor: theme.raised,
      gap: 10,
    },
    modalTitle: { color: theme.text, fontSize: 21, fontWeight: "900", paddingBottom: 6 },
    fieldLabel: { color: theme.muted, fontSize: 14, fontWeight: "700" },
    input: {
      color: theme.text,
      backgroundColor: theme.surface,
      borderRadius: 12,
      minHeight: 48,
      paddingHorizontal: 14,
      fontSize: 17,
    },
    colorRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
    colorChoice: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
    },
    colorSelected: { borderWidth: 2, borderColor: theme.text },
    colorCheck: { color: theme.text, fontSize: 22, fontWeight: "900" },
    modalError: { color: theme.danger, fontSize: 13 },
    modalActions: { flexDirection: "row", gap: 12, paddingTop: 12 },
    cancelButton: {
      flex: 1,
      minHeight: 45,
      borderWidth: 1,
      borderColor: theme.accentText,
      borderRadius: 25,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelText: { color: theme.accentText, fontSize: 16, fontWeight: "800" },
    saveButton: {
      flex: 1,
      minHeight: 45,
      backgroundColor: theme.accent,
      borderRadius: 25,
      alignItems: "center",
      justifyContent: "center",
    },
    saveText: { color: theme.onAccent, fontSize: 16, fontWeight: "900" },
    deleteDescription: { color: theme.muted, fontSize: 15, lineHeight: 23 },
    disabled: { opacity: 0.5 },
  });
}
