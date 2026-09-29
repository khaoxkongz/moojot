import { Image } from "expo-image";

export function PigMascot({ size = 100 }: { size?: number }) {
  return (
    <Image
      source={require("../../../assets/generated/brand-mascot.png")}
      contentFit="contain"
      accessibilityLabel="มาสคอตหมูน้อย"
      style={{ width: size, height: size }}
    />
  );
}
