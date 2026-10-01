import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs } from "expo-router";

import { fontFaces } from "@/constants/fonts";
import { useAppTheme } from "@/lib/use-app-theme";

export default function TabLayout() {
  const theme = useAppTheme();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
        headerTitleStyle: { color: theme.text, fontFamily: fontFaces.regular, fontSize: 17 },
        sceneStyle: { backgroundColor: theme.background },
        tabBarActiveTintColor: theme.accentText,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopWidth: 0,
          borderTopLeftRadius: 17,
          borderTopRightRadius: 17,
          // The bar adds the real bottom safe area itself; no fixed mock-phone height.
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: fontFaces.regular, fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "หน้าแรก",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? "home" : "home-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "พี่มนุษย์",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? "account" : "account-outline"} size={26} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
