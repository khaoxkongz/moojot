import { useMutation } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";

import { Button, Card, Field, Pill, SectionHeading } from "@/components/ui/moo-ui";
import { Text } from "@/components/ui/typography";
import { useAppTheme } from "@/lib/use-app-theme";
import type { FileForImport } from "@/features/imports/client";
import { importsMutationOptions } from "@/features/imports/mutation-options";
import { setImportSession } from "@/features/imports/session";

export default function ImportScreen() {
  const theme = useAppTheme();
  const { type } = useLocalSearchParams<{ type?: string }>();

  const [mode, setMode] = useState<"slip" | "statement">(type === "statement" ? "statement" : "slip");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const analyzeDocumentMutation = useMutation(importsMutationOptions.analyzeDocument());

  const processFile = async (file: FileForImport, source: "slip" | "statement", originalImageUri?: string) => {
    try {
      setBusy(true);
      setError(null);
      setNotice("กำลังให้ AI อ่านไฟล์และแยกรายการ…");
      const result = await analyzeDocumentMutation.mutateAsync({
        source,
        file,
        password: source === "statement" ? password : undefined,
      });
      const slipImageUri =
        originalImageUri && !originalImageUri.toLowerCase().startsWith("data:") ? originalImageUri : null;
      setImportSession(source === "slip" ? { ...result, slipImageUri } : result);
      setNotice(null);
      router.push("/review");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setNotice(null);
    } finally {
      setBusy(false);
    }
  };

  const openSlipPicker = async () => {
    try {
      const selection = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsMultipleSelection: false,
      });
      if (selection.canceled || !selection.assets.length) return;
      const asset = selection.assets[0];
      const normalized = await ImageManipulator.manipulateAsync(asset.uri, [], {
        compress: 0.88,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      await processFile({ uri: normalized.uri, mimeType: "image/jpeg" }, "slip", asset.uri);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const pickSlip = async () => {
    setError(null);
    await openSlipPicker();
  };

  const pickStatement = async () => {
    try {
      const selection = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (selection.canceled || !selection.assets.length) return;
      const asset = selection.assets[0];
      await processFile(
        {
          uri: asset.uri,
          mimeType: asset.mimeType || "application/pdf",
          webFile: asset.file ?? undefined,
        },
        "statement"
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <ScrollView
      bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ alignItems: "center", padding: 18, paddingBottom: 50 }}
    >
      <View style={{ width: "100%", maxWidth: 620, gap: 18 }}>
        <View style={{ alignItems: "center", gap: 5, paddingVertical: 8 }}>
          <Text style={{ fontSize: 48 }}>{mode === "slip" ? "🧾" : "💳"}</Text>
          <Text style={{ color: theme.text, fontSize: 21, fontWeight: "900" }}>ให้หมูช่วยอ่านไฟล์</Text>
          <Text style={{ color: theme.muted, fontSize: 13, textAlign: "center" }}>
            Gemini ช่วยอ่านและเสนอรายการ ให้คุณตรวจทุกครั้งก่อนบันทึก
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pill label="สลิปโอนเงิน" selected={mode === "slip"} onPress={() => setMode("slip")} />
          <Pill label="ใบแจ้งยอด PDF" selected={mode === "statement"} onPress={() => setMode("statement")} />
        </View>
        <Card style={{ gap: 14 }}>
          <SectionHeading title={mode === "slip" ? "เลือกภาพสลิป" : "เลือกใบแจ้งยอดบัตร"} />
          <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 21 }}>
            {mode === "slip"
              ? "เลือกภาพสลิปจากเครื่อง หมูจะแปลงเป็น JPEG แล้วให้ Gemini ช่วยอ่านวันที่ ยอดเงิน และชื่อร้าน"
              : "เลือกไฟล์ PDF รายเดือน ให้ Gemini ช่วยแยกรายการ แล้วเลือกว่าจะบันทึกรายการใด"}
          </Text>
          {mode === "statement" ? (
            <Field
              label="รหัสผ่าน PDF (ถ้ามี)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="รหัสผ่านไฟล์"
            />
          ) : null}
          <Button
            label={busy ? "กำลังอ่าน…" : mode === "slip" ? "เลือกรูปสลิป" : "เลือกไฟล์ PDF"}
            onPress={mode === "slip" ? pickSlip : pickStatement}
            disabled={busy}
            icon="＋"
          />
        </Card>
        <Card style={{ gap: 12 }}>
          <SectionHeading title="การอ่านเอกสารด้วย AI" />
          <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 19 }}>
            ไฟล์ที่คุณเลือกจะถูกส่งผ่านเซิร์ฟเวอร์หมูจดไปยัง Google Gemini 3.8 Flash เพื่อวิเคราะห์ข้อมูล การอ่านอาจคลาดเคลื่อน กรุณาตรวจยอดเงิน
            วันที่ และรายการก่อนบันทึก
          </Text>
        </Card>
        {notice ? (
          <View style={{ alignItems: "center", gap: 9 }}>
            <ActivityIndicator color={theme.accentText} />
            <Text style={{ color: theme.muted }}>{notice}</Text>
          </View>
        ) : null}
        {error ? (
          <Card style={{ backgroundColor: theme.raised }}>
            <Text selectable style={{ color: theme.dangerText, lineHeight: 21 }}>
              {error}
            </Text>
          </Card>
        ) : null}
        <Button label="จดเองแทน" variant="outline" onPress={() => router.push("/entry")} />
      </View>
    </ScrollView>
  );
}
