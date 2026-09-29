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

import { CategoryGlyph } from "@/components/ui/category-glyph";
import { Text, TextInput } from "@/components/ui/typography";
import type { Category, Tag } from "@/types/finance";

const colors = {
  blue: "#0876F9",
  ink: "#142339",
  pale: "#EDF4FF",
  white: "#FFFFFF",
  muted: "#A9B9CA",
};

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
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const [screen, setScreen] = useState<"category" | "tag">("category");
  const [tagName, setTagName] = useState("");
  const [savingTag, setSavingTag] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const visibleCategories = useMemo(() => categories.filter((item) => item.kind === kind), [categories, kind]);

  const close = () => {
    setScreen("category");
    setTagName("");
    setTagError(null);
    onClose();
  };

  const toggleTag = (tagId: string) => {
    onTagIdsChange(tagIds.includes(tagId) ? tagIds.filter((id) => id !== tagId) : [...tagIds, tagId]);
  };

  const saveTag = async () => {
    if (savingTag) return;
    const name = tagName.trim();
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

  const sheetHeight = screen === "category" ? Math.min(height * 0.54, 620) : Math.min(height * 0.435, 460);

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
          accessibilityLabel="ปิดแผงเลือกหมวดหมู่และแท็ก"
          style={styles.backdrop}
          onPress={close}
        />
        <View style={[styles.sheet, { height: sheetHeight, paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{screen === "category" ? "เลือกหมวดหมู่ / แท็ก" : "เพิ่มแท็ก"}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="ปิด" onPress={close} style={styles.closeButton}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          {screen === "category" ? (
            <>
              <View style={styles.tagActions}>
                <View style={styles.hashBadge}>
                  <Text style={styles.hashText}>#</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="เพิ่มแท็ก"
                  onPress={() => {
                    setTagName("");
                    setTagError(null);
                    setScreen("tag");
                  }}
                  style={styles.addTagButton}
                >
                  <Text style={styles.addTagText}>＋ เพิ่มแท็ก</Text>
                </Pressable>
              </View>
              {tags.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.savedTags}
                  contentContainerStyle={styles.savedTagsInner}
                >
                  {tags.map((tag) => (
                    <Pressable
                      key={tag.id}
                      accessibilityRole="checkbox"
                      accessibilityLabel={`แท็ก ${tag.name}`}
                      accessibilityState={{ checked: tagIds.includes(tag.id) }}
                      onPress={() => toggleTag(tag.id)}
                      style={[styles.tagChip, tagIds.includes(tag.id) && styles.tagChipSelected]}
                    >
                      <Text style={[styles.tagChipText, tagIds.includes(tag.id) && styles.tagChipTextSelected]}>
                        # {tag.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
              <ScrollView
                bounces={false}
                alwaysBounceVertical={false}
                overScrollMode="never"
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.grid}>
                  {visibleCategories.map((category) => (
                    <Pressable
                      key={category.id}
                      accessibilityRole="button"
                      accessibilityLabel={`เลือกหมวดหมู่ ${category.name}`}
                      accessibilityState={{ selected: categoryId === category.id }}
                      onPress={() => {
                        onCategoryChange(category.id);
                        close();
                      }}
                      style={styles.categoryCell}
                    >
                      <View style={[styles.iconBadge, categoryId === category.id && styles.selectedBadge]}>
                        <CategoryGlyph id={category.isSystem ? category.id : "custom"} icon={category.icon} />
                      </View>
                      <Text style={styles.categoryName}>{category.name}</Text>
                    </Pressable>
                  ))}
                </View>
                {onManageCategories ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="จัดการหมวดหมู่"
                    onPress={() => {
                      close();
                      onManageCategories();
                    }}
                    style={styles.manageButton}
                  >
                    <Text style={styles.manageIcon}>▦</Text>
                    <Text style={styles.manageText}>จัดการหมวดหมู่</Text>
                  </Pressable>
                ) : null}
              </ScrollView>
            </>
          ) : (
            <View style={styles.addTagBody}>
              <View style={styles.inputRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="กลับไปเลือกหมวดหมู่"
                  onPress={() => {
                    setScreen("category");
                    setTagError(null);
                  }}
                  style={styles.backButton}
                >
                  <Text style={styles.backText}>‹</Text>
                </Pressable>
                <View style={styles.tagInputWrap}>
                  <Text style={styles.inputHash}>#</Text>
                  <TextInput
                    accessibilityLabel="ชื่อแท็ก"
                    value={tagName}
                    onChangeText={(value) => {
                      setTagName(value);
                      setTagError(null);
                    }}
                    maxLength={20}
                    placeholder="ใส่ชื่อแท็กไม่เกิน 20 ตัวอักษร"
                    placeholderTextColor={colors.muted}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      void saveTag();
                    }}
                    style={styles.tagInput}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="บันทึกแท็ก"
                  disabled={savingTag}
                  onPress={() => {
                    void saveTag();
                  }}
                  style={[styles.confirmTag, savingTag && styles.disabled]}
                >
                  <Text style={styles.confirmTagText}>＋</Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                style={styles.suggestionScroll}
                contentContainerStyle={styles.suggestionContent}
              >
                {suggestions.map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    accessibilityRole="button"
                    accessibilityLabel={`ใช้ชื่อแท็ก ${suggestion}`}
                    onPress={() => setTagName(suggestion)}
                    style={styles.suggestionChip}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </Pressable>
                ))}
              </ScrollView>
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

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0, 0, 0, .08)",
  },
  sheet: {
    width: "100%",
    backgroundColor: colors.white,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: "hidden",
  },
  header: {
    height: 56,
    backgroundColor: colors.pale,
    paddingLeft: 16,
    paddingRight: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { color: "#101D2C", fontSize: 19, fontWeight: "900" },
  closeButton: { width: 43, height: 48, alignItems: "center", justifyContent: "center" },
  closeText: { color: "#4D535F", fontSize: 41, lineHeight: 45, fontWeight: "300" },
  tagActions: {
    height: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
  },
  hashBadge: {
    width: 31,
    height: 31,
    backgroundColor: "#DDF0FF",
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  hashText: { color: colors.blue, fontSize: 27, lineHeight: 31, fontWeight: "800" },
  addTagButton: {
    borderWidth: 1.2,
    borderColor: colors.blue,
    borderRadius: 25,
    minHeight: 34,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  addTagText: { color: colors.blue, fontSize: 16, fontWeight: "700" },
  savedTags: { flexGrow: 0, maxHeight: 48 },
  savedTagsInner: { gap: 7, paddingHorizontal: 16, paddingBottom: 8 },
  tagChip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderWidth: 1.2,
    borderColor: colors.blue,
    borderRadius: 18,
    justifyContent: "center",
  },
  tagChipSelected: { backgroundColor: colors.blue },
  tagChipText: { color: colors.blue, fontSize: 13, fontWeight: "700" },
  tagChipTextSelected: { color: colors.white },
  categoryScroll: { flex: 1 },
  categoryScrollContent: { paddingTop: 10, paddingBottom: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  categoryCell: {
    width: "25%",
    minHeight: 114,
    alignItems: "center",
    paddingHorizontal: 3,
    paddingTop: 1,
  },
  iconBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 11px rgba(15, 30, 45, .15)",
  },
  selectedBadge: { borderWidth: 2, borderColor: colors.blue },
  categoryName: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 19,
    textAlign: "center",
    paddingTop: 8,
  },
  manageButton: {
    alignSelf: "center",
    minHeight: 55,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  manageIcon: { color: colors.blue, fontSize: 28, lineHeight: 32 },
  manageText: { color: colors.blue, fontSize: 17, fontWeight: "800" },
  addTagBody: { flex: 1, paddingTop: 14 },
  inputRow: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  backButton: { width: 28, height: 46, justifyContent: "center" },
  backText: { color: colors.blue, fontSize: 36, lineHeight: 42, fontWeight: "300" },
  tagInputWrap: {
    flex: 1,
    minWidth: 0,
    height: 42,
    borderRadius: 22,
    backgroundColor: "#F4F8FF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
  },
  inputHash: { color: colors.muted, fontSize: 21, paddingRight: 8 },
  tagInput: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 16, paddingVertical: 0 },
  confirmTag: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmTagText: { color: colors.white, fontSize: 27, lineHeight: 28, fontWeight: "300" },
  suggestionScroll: { flexGrow: 0, marginTop: 14, maxHeight: 38 },
  suggestionContent: { alignItems: "center", gap: 8, paddingHorizontal: 20 },
  suggestionChip: {
    borderWidth: 1.2,
    borderColor: colors.blue,
    borderRadius: 19,
    minHeight: 32,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  suggestionText: { color: colors.blue, fontSize: 14, fontWeight: "700" },
  errorText: { color: "#C83434", paddingTop: 12, paddingHorizontal: 18, fontSize: 13 },
  disabled: { opacity: 0.5 },
});
