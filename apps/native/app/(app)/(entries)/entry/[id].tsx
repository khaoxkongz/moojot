import { useQuery } from "@tanstack/react-query";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton, InfoBox, PillButton } from "@/components/ui/controls";
import { EntryEditor } from "@/features/entries/components/entry-editor";
import { draftFromTransaction } from "@/features/entries/entry-draft";
import { entriesQueryOptions } from "@/features/entries/query-options";
import { useAppTheme } from "@/lib/use-app-theme";
import type { FinanceTransaction } from "@/types/finance";

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

export default function EditEntryRoute() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const entryId = Array.isArray(id) ? id[0] : id;
  const isFocused = useIsFocused();
  const transactionQuery = useQuery({
    ...entriesQueryOptions.detail(entryId ?? ""),
    enabled: isFocused && Boolean(entryId),
  });
  // The editor keeps the entry it opened with, so a refresh after saving or deleting never resets the draft. It opens
  // only once a stale cached copy has been read again: an entry changed elsewhere since (a category picked in the
  // queue after the editor was last open on it) must not come back with its old fields.
  const [opened, setOpened] = useState<FinanceTransaction | null>(null);
  if (!opened && transactionQuery.data && !transactionQuery.isFetching) setOpened(transactionQuery.data);

  if (entryId && opened) return <EditEntry key={entryId} id={entryId} transaction={opened} />;

  const missing = !entryId || (transactionQuery.data === null && !transactionQuery.isFetching);
  const failed = transactionQuery.error && transactionQuery.data === undefined;
  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <View style={{ height: 52, paddingHorizontal: 6, justifyContent: "center" }}>
        <IconButton icon="close" size={26} label="ปิดหน้าจดรายการ" onPress={goBack} />
      </View>
      <View style={{ flex: 1, justifyContent: "center", padding: 16, gap: 16 }}>
        {missing ? (
          <InfoBox tone="danger" icon="alert-circle-outline" title="ไม่พบรายการนี้แล้ว" body="รายการอาจถูกลบไปแล้ว" />
        ) : failed ? (
          <>
            <InfoBox
              tone="danger"
              icon="alert-circle-outline"
              title="เปิดรายการไม่สำเร็จ"
              body="ตรวจการเชื่อมต่อแล้วลองอีกครั้ง"
            />
            <PillButton label="ลองอีกครั้ง" onPress={() => void transactionQuery.refetch()} />
          </>
        ) : (
          <ActivityIndicator accessibilityLabel="กำลังเปิดรายการ" color={theme.accentText} />
        )}
      </View>
    </View>
  );
}

function EditEntry({ id, transaction }: { id: string; transaction: FinanceTransaction }) {
  const [initialDraft] = useState(() => draftFromTransaction(transaction));
  return <EntryEditor mode="edit" id={id} transaction={transaction} initialDraft={initialDraft} />;
}
