import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, TextStyle, View } from "react-native";
import { Text } from "@/components/ui/typography";

export interface SpinningCounterProps {
  value: string | number;
  prefix?: string;
  suffix?: string;
  style?: TextStyle;
  cellHeight?: number;
  duration?: number;
  stagger?: number;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const REPETITIONS = 3;
const FULL_STRIP = Array.from({ length: REPETITIONS }, () => DIGITS).flat();

interface ReelColProps {
  digit: number;
  colIndex: number;
  cellHeight: number;
  duration: number;
  stagger: number;
  textStyle?: TextStyle;
}

function ReelCol({ digit, colIndex, cellHeight, duration, stagger, textStyle }: ReelColProps) {
  const [animatedValue] = useState(() => new Animated.Value(0));
  const isFirstRun = useRef(true);

  useEffect(() => {
    // Land on the middle/last repetition for smooth spinning
    const targetIndex = 10 + digit;
    const targetTranslateY = -targetIndex * cellHeight;

    if (isFirstRun.current) {
      isFirstRun.current = false;
      // Start slightly offset so on mount there is a delightful initial spin
      animatedValue.setValue(-(digit * cellHeight));
    }

    Animated.timing(animatedValue, {
      toValue: targetTranslateY,
      duration,
      delay: colIndex * stagger,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: true,
    }).start();
  }, [digit, cellHeight, colIndex, duration, stagger, animatedValue]);

  return (
    <View style={[styles.reelCol, { height: cellHeight }]}>
      <Animated.View style={{ transform: [{ translateY: animatedValue }] }}>
        {FULL_STRIP.map((d, index) => (
          <View key={index} style={[styles.cell, { height: cellHeight }]}>
            <Text style={[styles.digitText, textStyle, { height: cellHeight, lineHeight: cellHeight }]}>{d}</Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

export function SpinningCounter({
  value,
  prefix = "",
  suffix = "",
  style,
  cellHeight = 35,
  duration = 1000,
  stagger = 70,
}: SpinningCounterProps) {
  const stringValue = `${prefix}${value}${suffix}`;

  // Analyze characters and assign column indices only to digits
  const { characters } = useMemo(() => {
    let digitCount = 0;
    const chars = stringValue.split("").map((char) => {
      const isDigit = char >= "0" && char <= "9";
      const colIndex = isDigit ? digitCount++ : -1;
      return {
        char,
        isDigit,
        digit: isDigit ? Number(char) : null,
        colIndex,
      };
    });
    return { characters: chars, totalDigits: digitCount };
  }, [stringValue]);

  return (
    <View style={[styles.container, { height: cellHeight }]}>
      {characters.map((item, index) => {
        if (!item.isDigit || item.digit === null) {
          return (
            <View key={index} style={[styles.cell, { height: cellHeight }]}>
              <Text style={[styles.staticText, style, { height: cellHeight, lineHeight: cellHeight }]}>
                {item.char}
              </Text>
            </View>
          );
        }

        return (
          <ReelCol
            key={index}
            digit={item.digit}
            colIndex={item.colIndex}
            cellHeight={cellHeight}
            duration={duration}
            stagger={stagger}
            textStyle={style}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  reelCol: {
    overflow: "hidden",
    justifyContent: "flex-start",
  },
  cell: {
    alignItems: "center",
    justifyContent: "center",
  },
  digitText: {
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
  staticText: {
    textAlign: "center",
  },
});
