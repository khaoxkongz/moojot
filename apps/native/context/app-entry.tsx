import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createContext, use } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { Text } from "@/components/ui/typography";
import { appEntry, type AppEntry } from "@/features/auth/app-entry";
import { slipScanSession } from "@/features/slips/auto-import";
import { useAppTheme } from "@/lib/use-app-theme";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

type AppEntryContextValue = {
  /** Where the root guard sends this device: auth, setup or Home. */
  entry: Extract<AppEntry, "auth" | "onboarding" | "app">;
  signOut: () => Promise<void>;
};

const AppEntryContext = createContext<AppEntryContextValue | null>(null);

/**
 * Decides where the root guard sends this device from the session and the setup check, and ends the session. Until
 * the entry is known it shows the loading screen, or the retry screen when the setup check failed.
 */
export function AppEntryProvider({ children }: { children: ReactNode }) {
  const theme = useAppTheme();
  const { data: session, isPending: isSessionPending } = authClient.useSession();

  const userId = session?.user.id ?? null;

  const { data, isError, error, refetch } = useQuery(
    orpc.financePreferences.hasCompletedOnboarding.queryOptions({ enabled: Boolean(userId) })
  );
  const entry = appEntry({
    session: isSessionPending ? "pending" : userId ? "signed-in" : "signed-out",
    onboarding:
      data !== undefined ? { status: "ready", complete: data } : isError ? { status: "failed" } : { status: "pending" },
  });

  if (entry === "loading" || entry === "retry") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.background,
          padding: 24,
          gap: 18,
        }}
      >
        <Text style={{ color: theme.text, fontSize: 36, fontWeight: "900" }}>หมูจด</Text>
        {entry === "retry" ? (
          <>
            <Text accessibilityRole="alert" selectable style={{ color: theme.text, textAlign: "center", fontSize: 16 }}>
              โหลดข้อมูลเริ่มต้นไม่สำเร็จ: {error?.message}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="ลองโหลดข้อมูลอีกครั้ง"
              onPress={() => refetch()}
              style={{
                borderRadius: 999,
                backgroundColor: theme.accent,
                paddingHorizontal: 32,
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: theme.onAccent, fontSize: 17, fontWeight: "800" }}>ลองอีกครั้ง</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color={theme.accentText} size="large" accessibilityLabel="กำลังเตรียมหมูจด" />
        )}
      </View>
    );
  }

  return (
    <AppEntryContext.Provider
      value={{
        entry,
        signOut: async () => {
          const result = await authClient.signOut();
          if (result.error) throw new Error(result.error.message);
          // Slip requests in flight carry the old sign-in; none may finish for the next account on this device.
          slipScanSession.cancel();
          queryClient.clear();
        },
      }}
    >
      {children}
    </AppEntryContext.Provider>
  );
}

export function useAppEntry(): AppEntryContextValue {
  const context = use(AppEntryContext);
  if (!context) throw new Error("useAppEntry must be used inside AppEntryProvider");
  return context;
}
