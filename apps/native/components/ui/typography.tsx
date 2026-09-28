import React from "react";
import {
  Text as NativeText,
  TextInput as NativeTextInput,
  StyleSheet,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native";

import { fontFamilyForWeight } from "@/constants/fonts";

// null means a parent explicitly uses the platform font for tabular numerals.
type InheritedFont = string | null | undefined;
const FontContext = React.createContext<InheritedFont>(undefined);

function withAppFont(
  style: TextProps["style"] | TextInputProps["style"],
  inheritedFont?: InheritedFont
): { style: TextStyle; family: InheritedFont } {
  const resolvedStyle = StyleSheet.flatten(style) ?? {};

  // LINE Seed Sans TH has proportional digits, so keep the platform font for
  // figures that explicitly request tabular numerals.
  if (
    resolvedStyle.fontVariant?.includes("tabular-nums") ||
    (inheritedFont === null && resolvedStyle.fontFamily == null)
  ) {
    return { style: { ...resolvedStyle, fontFamily: undefined }, family: null };
  }

  // A nested Text with no weight keeps its parent's face instead of resetting
  // to Regular. Native Text inheritance alone cannot do this once we set a face.
  if (resolvedStyle.fontWeight == null && resolvedStyle.fontFamily == null && inheritedFont !== undefined) {
    return {
      style: { ...resolvedStyle, fontFamily: inheritedFont ?? undefined },
      family: inheritedFont,
    };
  }

  const { fontWeight, ...styleWithoutWeight } = resolvedStyle;
  const family = styleWithoutWeight.fontFamily ?? fontFamilyForWeight(fontWeight);
  return {
    style: { ...styleWithoutWeight, fontFamily: family },
    family,
  };
}

export const Text = React.forwardRef<NativeText, TextProps>(function Text({ style, children, ...props }, ref) {
  const inheritedFont = React.useContext(FontContext);
  const resolved = withAppFont(style, inheritedFont);
  return (
    <FontContext.Provider value={resolved.family}>
      <NativeText ref={ref} {...props} style={resolved.style}>
        {children}
      </NativeText>
    </FontContext.Provider>
  );
});

export const TextInput = React.forwardRef<NativeTextInput, TextInputProps>(function TextInput(
  { style, ...props },
  ref
) {
  return <NativeTextInput ref={ref} {...props} style={withAppFont(style).style} />;
});
