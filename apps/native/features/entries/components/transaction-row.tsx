import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/typography";
import { palette } from "@/constants/moo-theme";
import type { Category, FinanceTransaction } from "@/types/finance";
import { formatMoney, sourceLabel } from "@/utils/format";

export function TransactionRow({
  item,
  category,
  onPress,
}: {
  item: FinanceTransaction;
  category?: Category;
  onPress: () => void;
}) {
  const color = item.kind === "income" ? palette.green : item.kind === "transfer" ? palette.muted : palette.ink;
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
          backgroundColor: category?.color ? `${category.color}22` : palette.pinkPale,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 22 }}>{category?.icon ?? (item.kind === "transfer" ? "🔁" : "🧾")}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text numberOfLines={1} style={{ color: palette.ink, fontSize: 15, fontWeight: "800" }}>
          {item.title}
        </Text>
        <Text numberOfLines={1} style={{ color: palette.muted, fontSize: 12 }}>
          {category?.name ?? (item.kind === "transfer" ? "ย้ายเงิน" : "ไม่ระบุหมวด")} ·{" "}
          {item.bank || item.cardName || sourceLabel(item.source)}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 3 }}>
        <Text selectable style={{ color, fontSize: 15, fontWeight: "900", fontVariant: ["tabular-nums"] }}>
          {symbol}
          {formatMoney(item.amountSatang)}
        </Text>
        <Text style={{ color: palette.muted, fontSize: 11 }}>
          {item.source === "slip" ? "จากสลิป" : item.source === "statement" ? "จากบัตร" : ""}
        </Text>
      </View>
    </Pressable>
  );
}
