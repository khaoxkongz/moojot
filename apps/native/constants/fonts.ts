import { useFonts } from "expo-font";

/** LINE Seed Sans TH Regular is the only UI face: hierarchy comes from size, color and spacing, never weight. */
export const fontFaces = {
  regular: "LINESeedSansTH-Regular",
} as const;

const fontAssets = {
  [fontFaces.regular]: require("../assets/fonts/LINESeedSansTH-Regular.ttf"),
};

export function useAppFonts() {
  return useFonts(fontAssets);
}
