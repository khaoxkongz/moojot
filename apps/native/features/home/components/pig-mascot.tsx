import { palette } from "@/constants/moo-theme";
import { View } from "react-native";

export function PigMascot({ size = 100 }: { size?: number }) {
  const earSize = size * 0.37;
  return (
    <View
      accessibilityLabel="มาสคอตหมูน้อย"
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
    >
      <View
        style={{
          position: "absolute",
          width: earSize,
          height: earSize,
          backgroundColor: "#F8A4B3",
          borderRadius: earSize * 0.32,
          transform: [{ rotate: "-32deg" }],
          top: size * 0.04,
          left: size * 0.08,
          borderWidth: 3,
          borderColor: "#F4879E",
        }}
      />
      <View
        style={{
          position: "absolute",
          width: earSize,
          height: earSize,
          backgroundColor: "#F8A4B3",
          borderRadius: earSize * 0.32,
          transform: [{ rotate: "32deg" }],
          top: size * 0.04,
          right: size * 0.08,
          borderWidth: 3,
          borderColor: "#F4879E",
        }}
      />
      <View
        style={{
          width: size * 0.83,
          height: size * 0.77,
          backgroundColor: "#FFC5D0",
          borderRadius: size * 0.4,
          borderWidth: 3,
          borderColor: "#F4879E",
          alignItems: "center",
          justifyContent: "center",
          marginTop: size * 0.12,
        }}
      >
        <View style={{ flexDirection: "row", gap: size * 0.27, position: "absolute", top: size * 0.25 }}>
          <View
            style={{
              width: size * 0.045,
              height: size * 0.085,
              borderRadius: size * 0.03,
              backgroundColor: palette.ink,
            }}
          />
          <View
            style={{
              width: size * 0.045,
              height: size * 0.085,
              borderRadius: size * 0.03,
              backgroundColor: palette.ink,
            }}
          />
        </View>
        <View
          style={{
            width: size * 0.42,
            height: size * 0.29,
            borderRadius: size * 0.18,
            backgroundColor: "#F49BAD",
            borderWidth: 2,
            borderColor: "#EC8096",
            marginTop: size * 0.25,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: size * 0.1,
          }}
        >
          <View
            style={{
              width: size * 0.055,
              height: size * 0.095,
              borderRadius: size * 0.04,
              backgroundColor: "#CF6C84",
            }}
          />
          <View
            style={{
              width: size * 0.055,
              height: size * 0.095,
              borderRadius: size * 0.04,
              backgroundColor: "#CF6C84",
            }}
          />
        </View>
      </View>
    </View>
  );
}
