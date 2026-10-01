import React from "react";
import {
  Text as NativeText,
  TextInput as NativeTextInput,
  StyleSheet,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native";

import { fontFaces } from "@/constants/fonts";

// null means a parent explicitly uses the platform font for tabular numerals.
type InheritedFont = string | null | undefined;
const FontContext = React.createContext<InheritedFont>(undefined);

/** Amounts are weight 500 at most. A nested piece with no weight inherits its parent's. */
function amountWeight(weight: TextStyle["fontWeight"], nested: boolean): TextStyle["fontWeight"] {
  if (weight == null) return nested ? undefined : "500";
  if (weight === "bold" || Number(weight) > 500) return "500";
  return weight;
}

function withAppFont(
  style: TextProps["style"] | TextInputProps["style"],
  inheritedFont?: InheritedFont
): { style: TextStyle; family: InheritedFont } {
  const resolvedStyle = StyleSheet.flatten(style) ?? {};

  // LINE Seed Sans TH has proportional digits, so figures that request tabular
  // numerals use the platform font. Amounts are weight 500 at most; a nested
  // ฿ sign may ask for the regular weight.
  if (
    resolvedStyle.fontVariant?.includes("tabular-nums") ||
    (inheritedFont === null && resolvedStyle.fontFamily == null)
  ) {
    const fontWeight = amountWeight(resolvedStyle.fontWeight, inheritedFont === null);
    return { style: { ...resolvedStyle, fontFamily: undefined, fontWeight }, family: null };
  }

  // A nested Text with no weight keeps its parent's face instead of resetting
  // to Regular. Native Text inheritance alone cannot do this once we set a face.
  if (resolvedStyle.fontWeight == null && resolvedStyle.fontFamily == null && inheritedFont !== undefined) {
    return {
      style: { ...resolvedStyle, fontFamily: inheritedFont ?? undefined },
      family: inheritedFont,
    };
  }

  // Weight is dropped: the one Regular face carries no faux bold.
  const styleWithoutWeight = { ...resolvedStyle, fontWeight: undefined };
  const family = styleWithoutWeight.fontFamily ?? fontFaces.regular;
  return {
    style: { ...styleWithoutWeight, fontFamily: family },
    family,
  };
}

/**
 * Dynamic Type stays on but is capped, as the handoff recommends, so larger
 * system sizes don't push actions off rows. Pass a prop to override.
 */
export const MAX_FONT_SCALE = 1.3;

export const Text = React.forwardRef<NativeText, TextProps>(function Text({ style, children, ...props }, ref) {
  const inheritedFont = React.useContext(FontContext);
  const resolved = withAppFont(style, inheritedFont);
  return (
    <FontContext.Provider value={resolved.family}>
      <NativeText ref={ref} maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} style={resolved.style}>
        {children}
      </NativeText>
    </FontContext.Provider>
  );
});

export const TextInput = React.forwardRef<NativeTextInput, TextInputProps>(function TextInput(
  { style, ...props },
  ref
) {
  return (
    <NativeTextInput ref={ref} maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} style={withAppFont(style).style} />
  );
});
