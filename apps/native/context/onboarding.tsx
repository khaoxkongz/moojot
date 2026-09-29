import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createContext, use } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { Text } from "@/components/ui/typography";
import { slipScanSession } from "@/features/slips/auto-import";
import { useAppTheme } from "@/lib/use-app-theme";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

type OnboardingContextValue = {
  isComplete: boolean;
  signOut: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const theme = useAppTheme();
  const { data: session, isPending: isSessionPending } = authClient.useSession();

  const userId = session?.user.id ?? null;

  const {
    data,
    isError,
    error,
    refetch,
    isPending: isOnboardingPending,
  } = useQuery(orpc.financePreferences.hasCompletedOnboarding.queryOptions({ enabled: Boolean(userId) }));

  if (isSessionPending || (Boolean(userId) && isOnboardingPending)) {
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
        {isError ? (
          <>
            <Text accessibilityRole="alert" selectable style={{ color: theme.text, textAlign: "center", fontSize: 16 }}>
              โหลดข้อมูลเริ่มต้นไม่สำเร็จ: {error.message}
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
    <OnboardingContext.Provider
      value={{
        isComplete: Boolean(data),
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
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const context = use(OnboardingContext);
  if (!context) throw new Error("useOnboarding must be used inside OnboardingProvider");
  return context;
}
