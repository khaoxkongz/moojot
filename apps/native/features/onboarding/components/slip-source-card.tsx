import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { View } from "react-native";

import { Text } from "@/components/ui/typography";
import { color } from "@/features/onboarding/theme";
import { FilterSourceIcon } from "@/features/wallets/components/filter-source-icon";

export type SlipSource = {
  id: "krungthai" | "kplus" | "paotang" | "truemoney";
  name: string;
  count?: number;
};

function SlipSourceLogo({ id }: { id: SlipSource["id"] }) {
  if (id === "krungthai") {
    return (
      <View style={{ width: 38, height: 38, borderRadius: 9, backgroundColor: "#0799D6" }}>
        <FilterSourceIcon kind="bank" bankName="krungthai" size={38} />
      </View>
    );
  }

  if (id === "kplus") {
    return (
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 9,
          backgroundColor: "#07984F",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: color.white, fontSize: 22, fontWeight: "900", lineHeight: 26 }}>K+</Text>
      </View>
    );
  }

  if (id === "paotang") {
    return (
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 9,
          backgroundColor: "#00A8DE",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
        }}
      >
        <MaterialCommunityIcons name="cash-multiple" size={17} color={color.white} />
        <Text style={{ color: color.white, fontSize: 9, fontWeight: "800", lineHeight: 11 }}>เป๋าตัง</Text>
      </View>
    );
  }

  return (
    <View style={{ width: 38, height: 38, borderRadius: 9, backgroundColor: color.white }}>
      <FilterSourceIcon kind="bank" bankName="truemoney" size={38} />
    </View>
  );
}

export function SlipSourceCard({ source }: { source: SlipSource }) {
  return (
    <View
      accessible
      accessibilityLabel={`${source.name}, ${source.count === undefined ? "ยังไม่มีผลการสแกน" : `${source.count} สลิป`} ใน 30 วันย้อนหลัง`}
      style={{
        width: 158,
        height: 182,
        backgroundColor: "#FFECA9",
        borderRadius: 14,
        borderCurve: "continuous",
        borderWidth: 1.5,
        borderColor: color.white,
        padding: 16,
        justifyContent: "space-between",
      }}
    >
      <View style={{ gap: 12 }}>
        <SlipSourceLogo id={source.id} />
        <Text style={{ color: color.ink, fontSize: 18, lineHeight: 24, fontWeight: "800" }}>{source.name}</Text>
        {source.count === undefined ? null : (
          <Text style={{ color: "#68778C", fontSize: 18, fontWeight: "700" }}>{source.count} สลิป</Text>
        )}
      </View>
      <Text style={{ color: "#68778C", fontSize: 14 }}>30 วันย้อนหลัง</Text>
    </View>
  );
}
