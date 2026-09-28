import { Pressable, View } from "react-native";

import { CategoryGlyph } from "@/components/ui/category-glyph";
import { Text, TextInput } from "@/components/ui/typography";
import { EntryIcon } from "@/features/entries/components/entry-icon";
import { dateLabel } from "@/features/entries/date";
import { useEntryStyles } from "@/features/entries/entry-styles";
import { useAppTheme } from "@/lib/use-app-theme";
import type { Category, Tag, TransactionKind } from "@/types/finance";
import { kindLabel } from "@/utils/format";

export function EntryKindTabs({
  kind,
  onChange,
}: {
  kind: TransactionKind;
  onChange: (kind: TransactionKind) => void;
}) {
  const styles = useEntryStyles();
  const theme = useAppTheme();
  return (
    <View style={styles.kindTabs}>
      {(["expense", "income", "transfer"] as const).map((value) => {
        const selected = kind === value;
        return (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={kindLabel(value)}
            onPress={() => onChange(value)}
            style={[styles.kindTab, selected ? styles.kindTabSelected : styles.kindTabIdle]}
          >
            <EntryIcon
              name={value === "expense" ? "up" : value === "income" ? "down" : "transfer"}
              size={23}
              color={selected ? theme.text : theme.text}
            />
            <Text style={[styles.kindTabText, { color: selected ? theme.text : theme.text }]}>{kindLabel(value)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function EntryDateRow({ value, onPress }: { value: string; onPress: () => void }) {
  const styles = useEntryStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={"วันที่ " + dateLabel(value)}
      onPress={onPress}
      style={styles.dateRow}
    >
      <EntryIcon name="calendar" size={27} />
      <Text style={styles.dateText}>{dateLabel(value)}</Text>
    </Pressable>
  );
}

export function EntryAmountCard({
  kind,
  amount,
  active,
  expression,
  history,
  onPress,
}: {
  kind: TransactionKind;
  amount: string;
  active: boolean;
  expression: string;
  history: string | null;
  onPress: () => void;
}) {
  const styles = useEntryStyles();
  const theme = useAppTheme();
  const displayAmount =
    amount && Number(amount.replace(/,/g, "")) > 0
      ? Number(amount.replace(/,/g, "")).toLocaleString("th-TH", { maximumFractionDigits: 2 })
      : "0";
  const amountCardText = active && !history && expression ? expression : displayAmount;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={"จำนวนเงิน " + amountCardText + " บาท"}
      onPress={onPress}
      style={[styles.amountCard, active && styles.amountCardActive]}
    >
      <EntryIcon
        name={kind === "expense" ? "up" : kind === "income" ? "down" : "transfer"}
        size={44}
        color={kind === "expense" ? theme.dangerText : kind === "income" ? theme.successText : theme.accent}
      />
      <View style={styles.amountTextBlock}>
        {active && history ? <Text style={styles.amountHistory}>{history}</Text> : null}
        <View style={styles.amountValueRow}>
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            style={[styles.amountValue, amountCardText === "0" && styles.amountPlaceholder]}
          >
            {amountCardText}
          </Text>
          <Text style={styles.baht}>฿</Text>
        </View>
      </View>
    </Pressable>
  );
}

export function EntryCategoryRow({
  category,
  tags,
  onPress,
}: {
  category: Category | null;
  tags: Tag[];
  onPress: () => void;
}) {
  const styles = useEntryStyles();
  const tagLabel = tags.map((tag) => "#" + tag.name).join(" ");
  const label = [category?.name ?? "เลือกหมวดหมู่ / แท็ก", tagLabel].filter(Boolean).join(" ");
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.optionCard}>
      <View style={styles.categoryIcon}>
        {category ? (
          <CategoryGlyph id={category.isSystem ? category.id : "custom"} icon={category.icon} />
        ) : (
          <EntryIcon name="category" size={30} />
        )}
      </View>
      <View style={styles.categoryDetails}>
        <Text numberOfLines={1} style={[styles.categoryName, !category && styles.categoryPlaceholder]}>
          {category?.name ?? "เลือกหมวดหมู่ / แท็ก"}
        </Text>
        {tagLabel ? (
          <Text numberOfLines={1} style={styles.categoryTags}>
            {tagLabel}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function EntryNoteCard({
  value,
  focused,
  onChange,
  onFocus,
  onBlur,
}: {
  value: string;
  focused: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const styles = useEntryStyles();
  const theme = useAppTheme();
  return (
    <View style={[styles.noteCard, focused && styles.focusedCard]}>
      <EntryIcon name="note" size={30} color={focused ? theme.accent : value ? theme.text : theme.accentText} />
      <TextInput
        accessibilityLabel="เพิ่มโน้ต"
        value={value}
        onChangeText={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="เพิ่มโน้ต"
        placeholderTextColor={theme.accentText}
        selectionColor={theme.accent}
        returnKeyType="done"
        style={styles.noteInput}
      />
    </View>
  );
}

export function EntryTransferHint() {
  const styles = useEntryStyles();
  return (
    <Text style={styles.transferHint}>
      รายการย้ายเงิน ไม่นับเป็นรายจ่าย/รายรับ{"\n"}ใช้จัดการย้ายเงินข้ามบัญชี เติมเงินวอลเล็ต จ่ายหนี้
    </Text>
  );
}

export function EntryRecurringRow({ onPress }: { onPress: () => void }) {
  const styles = useEntryStyles();
  return (
    <View style={styles.extraCard}>
      <Text style={styles.extraHeading}>เพิ่มเติม</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="จดซ้ำล่วงหน้า" onPress={onPress} style={styles.repeatRow}>
        <EntryIcon name="repeat" size={30} />
        <Text style={styles.optionText}>จดซ้ำล่วงหน้า</Text>
      </Pressable>
    </View>
  );
}

export function EntrySaveButton({
  saving,
  disabled,
  bottom,
  onPress,
}: {
  saving: boolean;
  disabled: boolean;
  bottom: number;
  onPress: () => void;
}) {
  const styles = useEntryStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="บันทึกรายการ"
      disabled={disabled}
      onPress={onPress}
      style={[styles.saveButton, { bottom }, disabled && styles.disabled]}
    >
      <Text style={styles.saveText}>{saving ? "กำลังบันทึก…" : "บันทึก"}</Text>
    </Pressable>
  );
}
