import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { IconButton } from "@/components/ui/controls";
import { accentRing, radius, touch, type AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/lib/use-app-theme";
import { Text, TextInput } from "@/components/ui/typography";
import type { Category, Tag } from "@/types/finance";

const suggestions = [
  "❤️ เปย์ตัวเอง",
  "ฟุ่มเฟือย",
  "บัตรเครดิต",
  "เงินสด",
  "ทริปญี่ปุ่น",
  "ให้แม่",
  "คุณแฟน",
  "จ่ายประจำ",
  "ให้ยืม",
  "สำรองจ่าย",
  "แต้มแลก",
  "ลดหย่อนภาษี",
];

export type CategoryTagSheetProps = {
  visible: boolean;
  kind: "expense" | "income";
  categories: Category[];
  tags: Tag[];
  categoryId: string | null;
  tagIds: string[];
  onCategoryChange: (id: string | null) => void;
  onTagIdsChange: (ids: string[]) => void;
  onCreateTag: (name: string) => Promise<Tag>;
  onManageCategories?: () => void;
  onClose: () => void;
};

export function CategoryTagSheet({
  visible,
  kind,
  categories,
  tags,
  categoryId,
  tagIds,
  onCategoryChange,
  onTagIdsChange,
  onCreateTag,
  onManageCategories,
  onClose,
}: CategoryTagSheetProps) {
  const styles = useLocalStyles();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const [screen, setScreen] = useState<"category" | "tag">("category");
  const [tagName, setTagName] = useState("");
  const [savingTag, setSavingTag] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const visibleCategories = useMemo(() => categories.filter((item) => item.kind === kind), [categories, kind]);
  const freeSuggestions = suggestions.filter((name) => !tags.some((tag) => tag.name === name));
  const [gridWidth, setGridWidth] = useState(0);
  /** Three equal columns with 8 between them, as the prototype's grid. */
  const tileWidth = gridWidth > 0 ? (gridWidth - 2 * 8) / 3 : undefined;

  const close = () => {
    setScreen("category");
    setTagName("");
    setTagError(null);
    onClose();
  };

  const toggleTag = (tagId: string) => {
    onTagIdsChange(tagIds.includes(tagId) ? tagIds.filter((id) => id !== tagId) : [...tagIds, tagId]);
  };

  /** Adds the typed name or a tapped suggestion: an existing tag (any case) is selected instead of made twice. */
  const saveTag = async (raw: string) => {
    if (savingTag) return;
    const name = raw.trim();
    if (!name) {
      setTagError("กรุณาใส่ชื่อแท็ก");
      return;
    }
    if (Array.from(name).length > 20) {
      setTagError("ชื่อแท็กต้องไม่เกิน 20 ตัวอักษร");
      return;
    }
    const existing = tags.find((tag) => tag.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (existing) {
      if (!tagIds.includes(existing.id)) onTagIdsChange([...tagIds, existing.id]);
      setScreen("category");
      setTagName("");
      setTagError(null);
      return;
    }
    try {
      setSavingTag(true);
      setTagError(null);
      const tag = await onCreateTag(name);
      onTagIdsChange([...tagIds, tag.id]);
      setScreen("category");
      setTagName("");
    } catch (cause) {
      setTagError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSavingTag(false);
    }
  };

  const title = screen === "category" ? "เลือกหมวด" : "เพิ่มแท็ก";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
      statusBarTranslucent
      onShow={() => {
        setScreen("category");
        setTagName("");
        setTagError(null);
      }}
    >
      <KeyboardAvoidingView style={styles.modalRoot} behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ปิดแผงเลือกหมวด"
          style={styles.backdrop}
          onPress={close}
        />
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { maxHeight: height * 0.86, paddingBottom: insets.bottom + 12 }]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.headerTitle}>
              {title}
            </Text>
            <IconButton icon="close" size={24} label="ปิด" onPress={close} style={{ marginRight: -10 }} />
          </View>

          {screen === "category" ? (
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <Text style={styles.sectionLabel}>แท็ก · ไม่ใส่ก็ได้</Text>
              <View style={styles.chipWrap}>
                {tags.map((tag) => {
                  const selected = tagIds.includes(tag.id);
                  return (
                    <Pressable
                      key={tag.id}
                      accessibilityRole="checkbox"
                      accessibilityLabel={`แท็ก ${tag.name}`}
                      accessibilityState={{ checked: selected }}
                      onPress={() => toggleTag(tag.id)}
                      hitSlop={4}
                      style={[styles.tagChip, selected && styles.tagChipSelected]}
                    >
                      <Text numberOfLines={1} style={[styles.tagChipText, selected && styles.tagChipTextSelected]}>
                        # {tag.name}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="เพิ่มแท็ก"
                  hitSlop={4}
                  onPress={() => {
                    setTagName("");
                    setTagError(null);
                    setScreen("tag");
                  }}
                  style={styles.addTagChip}
                >
                  <MaterialCommunityIcons name="plus" size={17} color={theme.accentText} />
                  <Text style={styles.addTagText}>เพิ่มแท็ก</Text>
                </Pressable>
              </View>

              <Text style={[styles.sectionLabel, { marginTop: 16 }]}>หมวด</Text>
              <View style={styles.grid} onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}>
                {visibleCategories.map((category) => {
                  const selected = categoryId === category.id;
                  return (
                    <Pressable
                      key={category.id}
                      accessibilityRole="button"
                      accessibilityLabel={`หมวด ${category.name}`}
                      accessibilityState={{ selected }}
                      onPress={() => {
                        onCategoryChange(category.id);
                        close();
                      }}
                      style={({ pressed }) => [
                        styles.tile,
                        tileWidth !== undefined && { width: tileWidth },
                        pressed && { backgroundColor: theme.border },
                        selected && accentRing(theme),
                      ]}
                    >
                      <Text style={styles.tileIcon}>{category.icon}</Text>
                      <Text numberOfLines={2} style={styles.tileName}>
                        {category.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {onManageCategories ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    close();
                    onManageCategories();
                  }}
                  style={styles.manageButton}
                >
                  <MaterialCommunityIcons name="view-grid-outline" size={18} color={theme.accentText} />
                  <Text style={styles.manageText}>จัดการหมวดหมู่</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          ) : (
            <View style={styles.addTagBody}>
              <View style={styles.inputRow}>
                <IconButton
                  icon="chevron-left"
                  size={28}
                  color={theme.accentText}
                  label="กลับไปเลือกหมวด"
                  onPress={() => {
                    setScreen("category");
                    setTagError(null);
                  }}
                  style={{ marginLeft: -10 }}
                />
                <View style={styles.inputPill}>
                  <Text style={styles.inputHash}>#</Text>
                  <TextInput
                    accessibilityLabel="ชื่อแท็ก"
                    autoFocus
                    value={tagName}
                    onChangeText={(value) => {
                      setTagName(value);
                      setTagError(null);
                    }}
                    maxLength={20}
                    placeholder="ใส่ชื่อแท็กไม่เกิน 20 ตัวอักษร"
                    placeholderTextColor={theme.muted}
                    selectionColor={theme.accent}
                    returnKeyType="done"
                    onSubmitEditing={() => void saveTag(tagName)}
                    style={styles.tagInput}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={savingTag ? "กำลังเพิ่มแท็ก" : "บันทึกแท็ก"}
                  accessibilityState={{ busy: savingTag }}
                  onPress={savingTag ? undefined : () => void saveTag(tagName)}
                  style={({ pressed }) => [styles.saveTag, { opacity: savingTag ? 0.6 : pressed ? 0.84 : 1 }]}
                >
                  <MaterialCommunityIcons name="plus" size={24} color={theme.onAccent} />
                </Pressable>
              </View>
              {freeSuggestions.length > 0 ? (
                <>
                  <Text style={[styles.sectionLabel, { marginTop: 14 }]}>แตะเพื่อเพิ่มได้เลย</Text>
                  <View style={styles.chipWrap}>
                    {freeSuggestions.map((suggestion) => (
                      <Pressable
                        key={suggestion}
                        accessibilityRole="button"
                        accessibilityLabel={`เพิ่มแท็ก ${suggestion}`}
                        hitSlop={4}
                        onPress={savingTag ? undefined : () => void saveTag(suggestion)}
                        style={({ pressed }) => [styles.tagChip, pressed && { backgroundColor: theme.raised }]}
                      >
                        <Text style={styles.tagChipText}>{suggestion}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}
              {tagError ? (
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {tagError}
                </Text>
              ) : null}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    modalRoot: { flex: 1, justifyContent: "flex-end" },
    backdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: theme.shade },
    sheet: {
      width: "100%",
      maxWidth: 680,
      alignSelf: "center",
      backgroundColor: theme.surface,
      borderTopLeftRadius: radius.sheet,
      borderTopRightRadius: radius.sheet,
      paddingTop: 10,
      paddingHorizontal: 16,
    },
    handle: {
      alignSelf: "center",
      width: 36,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.border,
      marginBottom: 6,
    },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    headerTitle: { flex: 1, color: theme.text, fontSize: 17, lineHeight: 24 },
    scrollContent: { paddingBottom: 6 },
    sectionLabel: { color: theme.muted, fontSize: 12, lineHeight: 17 },
    chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
    tagChip: {
      minHeight: 36,
      maxWidth: "100%",
      paddingHorizontal: 12,
      borderWidth: 1.2,
      borderColor: theme.border,
      borderRadius: radius.chip,
      justifyContent: "center",
    },
    tagChipSelected: { backgroundColor: theme.accent, borderColor: theme.accent },
    tagChipText: { color: theme.text, fontSize: 13, lineHeight: 18 },
    tagChipTextSelected: { color: theme.onAccent },
    addTagChip: {
      minHeight: 36,
      paddingLeft: 8,
      paddingRight: 12,
      borderWidth: 1.2,
      borderStyle: "dashed",
      borderColor: theme.accent,
      borderRadius: radius.chip,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    addTagText: { color: theme.accentText, fontSize: 13, lineHeight: 18 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
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
    manageButton: {
      marginTop: 6,
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    manageText: { color: theme.accentText, fontSize: 14 },
    addTagBody: { paddingTop: 6, paddingBottom: 14 },
    inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    inputPill: {
      flex: 1,
      minWidth: 0,
      height: touch.min,
      borderRadius: touch.min / 2,
      backgroundColor: theme.raised,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      gap: 6,
    },
    inputHash: { color: theme.muted, fontSize: 17, lineHeight: 22 },
    tagInput: { flex: 1, minWidth: 0, color: theme.text, fontSize: 15, lineHeight: 20, paddingVertical: 0 },
    errorText: { color: theme.danger, marginTop: 12, fontSize: 13, lineHeight: 19 },
    saveTag: {
      width: touch.min,
      height: touch.min,
      borderRadius: touch.min / 2,
      backgroundColor: theme.accent,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}

function useLocalStyles() {
  const theme = useAppTheme();
  return useMemo(() => createStyles(theme), [theme]);
}
