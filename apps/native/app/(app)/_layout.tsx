import { Stack } from "expo-router/stack";

import { fontFaces } from "@/constants/fonts";
import { useAppTheme } from "@/lib/use-app-theme";

export default function AppLayout() {
  const theme = useAppTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerTitleStyle: { fontFamily: fontFaces.extraBold },
        contentStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(insights)/summary" options={{ headerShown: false }} />
      <Stack.Screen name="(planning)/plan" options={{ title: "วางแผน" }} />
      <Stack.Screen name="(streak)/streak-stats" options={{ headerShown: false }} />
      <Stack.Screen name="(streak)/streak-settings" options={{ headerShown: false }} />
      <Stack.Screen name="(streak)/streak-tutorial" options={{ headerShown: false }} />
      <Stack.Screen
        name="(entries)/entry/index"
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
          contentStyle: { backgroundColor: theme.background },
        }}
      />
      <Stack.Screen
        name="(entries)/entry/[id]"
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
          contentStyle: { backgroundColor: theme.background },
        }}
      />
      <Stack.Screen
        name="(entries)/search"
        options={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}
      />
      <Stack.Screen name="(imports)/import" options={{ title: "นำเข้ารายการ", presentation: "modal" }} />
      <Stack.Screen name="(imports)/review" options={{ title: "ตรวจรายการก่อนบันทึก", presentation: "modal" }} />
      <Stack.Screen name="(planning)/budget-form" options={{ title: "ตั้งงบประมาณ", presentation: "modal" }} />
      <Stack.Screen name="(planning)/recurring-form" options={{ title: "รายการจดซ้ำ", presentation: "modal" }} />
      <Stack.Screen name="(categories)/category-form" options={{ headerShown: false }} />
      <Stack.Screen name="(categories)/categories" options={{ headerShown: false }} />
      <Stack.Screen name="(categories)/pending-categories" />
      <Stack.Screen name="(categories)/tags" options={{ headerShown: false }} />
      <Stack.Screen name="(settings)/settings/account" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="(settings)/settings/cards" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="(settings)/settings/calendar" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="(settings)/settings/theme" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="(settings)/settings/language" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="(settings)/settings/guide" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="(settings)/settings/faq" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="(settings)/settings/slips" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen
        name="(settings)/settings/supported-cards"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen name="(settings)/settings/slip-help" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="(settings)/settings-detail" options={{ headerShown: false }} />
    </Stack>
  );
}
