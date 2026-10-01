import { useMutation, useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, Stack, useIsFocused } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/typography";
import { useAppTheme } from "@/lib/use-app-theme";
import { CarrotIcon } from "@/features/streak/components/carrot-icon";
import { streakMutationOptions } from "@/features/streak/mutation-options";
import { streakQueryOptions } from "@/features/streak/query-options";
import type { StreakCountMode } from "@/features/streak/types";

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/streak-stats");
}

function CountOption({
  mode,
  selected,
  title,
  description,
  disabled,
  onPress,
}: {
  mode: StreakCountMode;
  selected: boolean;
  title: string;
  description: string;
  disabled: boolean;
  onPress: (mode: StreakCountMode) => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={`${title}: ${description}`}
      onPress={() => onPress(mode)}
      disabled={disabled}
      style={({ pressed }) => ({
        minHeight: 91,
        flexDirection: "row",
        alignItems: "center",
        gap: 13,
        backgroundColor: theme.surface,
        paddingHorizontal: 18,
        paddingVertical: 17,
        opacity: pressed ? 0.8 : disabled ? 0.65 : 1,
      })}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          borderWidth: selected ? 0 : 2,
          borderColor: theme.accent,
          backgroundColor: selected ? theme.accent : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected ? (
          <Text style={{ color: theme.onAccent, fontSize: 24, lineHeight: 28, fontWeight: "800" }}>✓</Text>
        ) : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: theme.text, fontSize: 17, fontWeight: "700" }}>{title}</Text>
        <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 19 }}>{description}</Text>
      </View>
    </Pressable>
  );
}

function HomeExample({ mode, enabled }: { mode: StreakCountMode; enabled: boolean }) {
  const theme = useAppTheme();
  return (
    <View
      accessible
      accessibilityLabel="ตัวอย่างป้ายความต่อเนื่องในหน้าแรก"
      style={{
        width: "100%",
        maxWidth: 330,
        height: 320,
        backgroundColor: theme.surface,
        borderRadius: 26,
        alignSelf: "center",
        overflow: "hidden",
        padding: 16,
        gap: 11,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View
          style={{
            minHeight: 32,
            paddingHorizontal: 10,
            borderRadius: 9,
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            backgroundColor: theme.raised,
          }}
        >
          <CarrotIcon size={19} />
          <Text style={{ color: theme.text, fontWeight: "800", fontSize: 14 }}>{enabled ? "30 วัน" : "ปิดการนับ"}</Text>
        </View>
        <View style={{ width: 19, height: 19, borderRadius: 10, backgroundColor: theme.raised }} />
      </View>
      <View style={{ backgroundColor: theme.raised, borderRadius: 14, padding: 11, gap: 4 }}>
        <Text style={{ color: theme.text, fontSize: 12, fontWeight: "800" }}>
          {mode === "categorized" ? "วันนี้เลือกหมวดครบแล้ว 🎉" : "วันนี้จดรายรับรายจ่ายแล้ว 🎉"}
        </Text>
        <Text style={{ color: theme.muted, fontSize: 11 }}>
          {mode === "categorized" ? "ดูสรุปครบทุกหมวด และให้น้องหมูกินแครอต" : "แครอตพร้อมแล้ว ไปให้อาหารน้องหมูกัน"}
        </Text>
      </View>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Image
          source={require("../../../assets/generated/streak-hero.png")}
          contentFit="contain"
          accessibilityLabel="ภาพน้องหมูกับแครอตและรางวัล"
          style={{ width: "100%", height: 102 }}
        />
        <View
          style={{
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
            backgroundColor: theme.accent,
            height: 67,
            paddingHorizontal: 13,
            paddingVertical: 7,
            gap: 2,
          }}
        >
          <Text style={{ color: theme.onAccent, fontSize: 12, fontWeight: "800" }}>ก.ย. 69</Text>
          <Text style={{ color: theme.onAccent, fontSize: 11 }}>ยอดใช้จ่าย</Text>
          <Text style={{ color: theme.onAccent, fontSize: 18, fontWeight: "900" }}>14,657.04 ฿</Text>
        </View>
      </View>
    </View>
  );
}

export default function StreakSettingsScreen() {
  const theme = useAppTheme();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const resetStreakProgressMutation = useMutation(streakMutationOptions.resetProgress());
  const setStreakCountModeMutation = useMutation(streakMutationOptions.setCountMode());
  const setStreakEnabledMutation = useMutation(streakMutationOptions.setEnabled());

  const settingsQuery = useQuery({ ...streakQueryOptions.settings(), enabled: isFocused });
  const settings = settingsQuery.data ?? null;

  const loadError = settingsQuery.data === undefined ? settingsQuery.error?.message : null;

  const selectMode = async (mode: StreakCountMode) => {
    if (!settings || busy || settings.mode === mode) return;
    try {
      setBusy(true);
      await setStreakCountModeMutation.mutateAsync({ mode });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const toggleEnabled = async () => {
    if (!settings || busy) return;
    try {
      setBusy(true);
      const enabled = !settings.enabled;
      await setStreakEnabledMutation.mutateAsync({ enabled });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (busy) return;
    try {
      setBusy(true);
      await resetStreakProgressMutation.mutateAsync();
      setConfirmReset(false);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: Math.max(insets.bottom, 18) }}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ backgroundColor: theme.accent, paddingTop: insets.top }}>
        <View
          style={{
            minHeight: 62,
            paddingHorizontal: 17,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 7,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="กลับหน้าสถิติ"
            hitSlop={10}
            onPress={goBack}
            style={{ width: 47, height: 50, justifyContent: "center" }}
          >
            <Text style={{ color: theme.onAccent, fontSize: 38, lineHeight: 43 }}>‹</Text>
          </Pressable>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              textAlign: "center",
              color: theme.onAccent,
              fontSize: 19,
              fontWeight: "900",
            }}
          >
            ปรับวิธีนับความต่อเนื่อง
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="รีเซ็ตสถิติความต่อเนื่อง"
            disabled={busy || !settings}
            onPress={() => setConfirmReset(true)}
            style={{
              width: 52,
              height: 50,
              alignItems: "flex-end",
              justifyContent: "center",
              opacity: busy || !settings ? 0.5 : 1,
            }}
          >
            <Text style={{ color: theme.onAccent, fontSize: 17, fontWeight: "800" }}>รีเซ็ต</Text>
          </Pressable>
        </View>
      </View>

      {!settings ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            minHeight: 260,
          }}
        >
          {loadError ? (
            <Pressable
              onPress={() => {
                void settingsQuery.refetch();
              }}
            >
              <Text selectable style={{ color: theme.danger }}>
                {loadError} · ลองอีกครั้ง
              </Text>
            </Pressable>
          ) : (
            <>
              <ActivityIndicator color={theme.accentText} size="large" />
              <Text style={{ color: theme.muted }}>กำลังโหลดการตั้งค่า…</Text>
            </>
          )}
        </View>
      ) : (
        <View style={{ flex: 1, width: "100%", maxWidth: 680, alignSelf: "center" }}>
          <View
            style={{
              backgroundColor: theme.background,
              paddingHorizontal: 18,
              paddingTop: 22,
              paddingBottom: 17,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 17, fontWeight: "800" }}>นับความต่อเนื่องจาก</Text>
          </View>
          <View accessibilityRole="radiogroup" style={{ gap: 1 }}>
            <CountOption
              mode="categorized"
              selected={settings.mode === "categorized"}
              title="จด และเลือกหมวดครบ"
              description="ได้ดูสรุปแบ่งหมวด น้องหมูได้กินแครอต"
              disabled={busy || !settings.enabled}
              onPress={selectMode}
            />
            <CountOption
              mode="recorded"
              selected={settings.mode === "recorded"}
              title="แค่จดรายรับหรือรายจ่าย"
              description="จดยอดรวมครบ น้องหมูได้กินแครอต"
              disabled={busy || !settings.enabled}
              onPress={selectMode}
            />
          </View>
          <View
            style={{
              backgroundColor: theme.background,
              paddingHorizontal: 18,
              paddingTop: 22,
              paddingBottom: 17,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 17, fontWeight: "800" }}>ตัวอย่างในหน้าแรก</Text>
          </View>
          <View
            style={{
              flex: 1,
              minHeight: 368,
              backgroundColor: theme.surface,
              justifyContent: "center",
              paddingHorizontal: 20,
              paddingVertical: 24,
            }}
          >
            <HomeExample mode={settings.mode} enabled={settings.enabled} />
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: 4,
              paddingTop: 21,
              paddingHorizontal: 16,
              paddingBottom: 20,
              backgroundColor: theme.surface,
            }}
          >
            <Text style={{ color: theme.muted, fontSize: 15 }}>
              {settings.enabled ? "ไม่อยากนับความต่อเนื่อง?" : "ปิดการนับความต่อเนื่องอยู่"}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={settings.enabled ? "ปิดการนับความต่อเนื่อง" : "เปิดการนับความต่อเนื่อง"}
              disabled={busy}
              onPress={() => void toggleEnabled()}
            >
              <Text style={{ color: theme.accentText, fontSize: 15, fontWeight: "800" }}>
                {settings.enabled ? "ปิดการนับ" : "เปิดการนับ"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
      {error || (settings && settingsQuery.error) ? (
        <Text selectable style={{ color: theme.danger, textAlign: "center", padding: 16 }}>
          {error ?? settingsQuery.error?.message}
        </Text>
      ) : null}

      {confirmReset ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: "rgba(0,0,0,.68)",
            justifyContent: "center",
            paddingHorizontal: 22,
          }}
        >
          <View style={{ backgroundColor: theme.raised, borderRadius: 23, padding: 22, gap: 14 }}>
            <Text style={{ color: theme.text, fontSize: 20, fontWeight: "900" }}>เริ่มนับความต่อเนื่องใหม่?</Text>
            <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 22 }}>
              สถิติจะเริ่มนับใหม่จากวันนี้ รายรับรายจ่ายและแครอตที่สะสมไว้ยังอยู่
            </Text>
            <View style={{ flexDirection: "row", gap: 10, paddingTop: 5 }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setConfirmReset(false)}
                disabled={busy}
                style={{
                  flex: 1,
                  borderRadius: 14,
                  backgroundColor: theme.background,
                  minHeight: 46,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: theme.text, fontWeight: "800" }}>ยกเลิก</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => void reset()}
                disabled={busy}
                style={{
                  flex: 1,
                  borderRadius: 14,
                  backgroundColor: theme.accent,
                  minHeight: 46,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: theme.onAccent, fontWeight: "800" }}>รีเซ็ต</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
