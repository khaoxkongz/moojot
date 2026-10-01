import { Pressable, View } from "react-native";

import { Amount } from "@/components/ui/controls";
import { Text } from "@/components/ui/typography";
import { bankDisplayName } from "@/features/wallets/banks";
import { useAppTheme } from "@/lib/use-app-theme";
import type { Category, FinanceTransaction } from "@/types/finance";
import { formatBaht, sourceLabel } from "@/utils/format";

export function TransactionRow({
  item,
  category,
  onPress,
}: {
  item: FinanceTransaction;
  category?: Category;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const color = item.kind === "income" ? theme.success : item.kind === "transfer" ? theme.muted : theme.text;
  const symbol = item.kind === "income" ? "+" : item.kind === "expense" ? "−" : "";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 17,
          backgroundColor: category?.color ? `${category.color}22` : theme.raised,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 22 }}>{category?.icon ?? (item.kind === "transfer" ? "🔁" : "🧾")}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text numberOfLines={1} style={{ color: theme.text, fontSize: 15, fontWeight: "800" }}>
          {item.title}
        </Text>
        <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12 }}>
          {category?.name ?? (item.kind === "transfer" ? "ย้ายเงิน" : "ไม่ระบุหมวด")} ·{" "}
          {(item.bank && bankDisplayName(item.bank)) || item.cardName || sourceLabel(item.source)}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 3 }}>
        <Amount selectable value={symbol + formatBaht(item.amountSatang)} size={15} color={color} />
        <Text style={{ color: theme.muted, fontSize: 11 }}>
          {item.source === "slip" ? "จากสลิป" : item.source === "statement" ? "จากบัตร" : ""}
        </Text>
      </View>
    </Pressable>
  );
}
