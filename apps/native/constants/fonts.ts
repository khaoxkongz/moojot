import { useFonts } from "expo-font";
import type { TextStyle } from "react-native";

export const fontFaces = {
  thin: "LINESeedSansTH-Thin",
  regular: "LINESeedSansTH-Regular",
  bold: "LINESeedSansTH-Bold",
  extraBold: "LINESeedSansTH-ExtraBold",
  heavy: "LINESeedSansTH-Heavy",
} as const;

const fontAssets = {
  [fontFaces.thin]: require("../assets/fonts/LINESeedSansTH-Thin.ttf"),
  [fontFaces.regular]: require("../assets/fonts/LINESeedSansTH-Regular.ttf"),
  [fontFaces.bold]: require("../assets/fonts/LINESeedSansTH-Bold.ttf"),
  [fontFaces.extraBold]: require("../assets/fonts/LINESeedSansTH-ExtraBold.ttf"),
  [fontFaces.heavy]: require("../assets/fonts/LINESeedSansTH-Heavy.ttf"),
};

export function useAppFonts() {
  return useFonts(fontAssets);
}

export function fontFamilyForWeight(weight?: TextStyle["fontWeight"]) {
  if (weight === "bold") return fontFaces.bold;
  if (weight == null || weight === "normal") return fontFaces.regular;

  const numericWeight = Number(weight);
  if (numericWeight >= 900) return fontFaces.heavy;
  if (numericWeight >= 800) return fontFaces.extraBold;
  if (numericWeight >= 600) return fontFaces.bold;
  if (numericWeight <= 300) return fontFaces.thin;
  return fontFaces.regular;
}
