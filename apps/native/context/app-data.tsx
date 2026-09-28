import { useQuery } from "@tanstack/react-query";
import type React from "react";
import { createContext, use, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { OnboardingIllustration } from "@/components/ui/onboarding-illustrations";
import { Text } from "@/components/ui/typography";
import { palette } from "@/constants/moo-theme";
import { authClient } from "@/lib/auth-client";
import type { WalletFilterSelection } from "@/types/finance";
import { orpc } from "@/utils/orpc";

type AppData = {
  appliedWalletFilter: WalletFilterSelection | null;
  setAppliedWalletFilter: React.Dispatch<React.SetStateAction<WalletFilterSelection | null>>;
};

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [appliedWalletFilter, setAppliedWalletFilter] = useState<WalletFilterSelection | null>(null);

  const { data: session } = authClient.useSession();
  const userId = session?.user.id ?? null;

  const { isPending, error, refetch } = useQuery(
    orpc.ledger.initializeDatabase.queryOptions({ enabled: Boolean(userId) })
  );

  if (userId && (isPending || error)) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFDA60",
          padding: 24,
          gap: 16,
        }}
      >
        <OnboardingIllustration variant="logo" size={155} />
        <Text style={{ color: palette.ink, fontSize: 30, fontWeight: "900" }}>หมูจด</Text>
        {error ? (
          <>
            <Text selectable style={{ color: palette.red, textAlign: "center" }}>
              {error.message}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => refetch()}
              style={{
                backgroundColor: palette.pink,
                borderRadius: 14,
                paddingHorizontal: 22,
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>ลองอีกครั้ง</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color="#1978F2" />
            <Text style={{ color: palette.muted, textAlign: "center" }}>กำลังเตรียมข้อมูล...</Text>
          </>
        )}
      </View>
    );
  }

  return (
    <AppDataContext.Provider value={{ appliedWalletFilter, setAppliedWalletFilter }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const data = use(AppDataContext);
  if (!data) throw new Error("useAppData must be used inside AppDataProvider");
  return data;
}
