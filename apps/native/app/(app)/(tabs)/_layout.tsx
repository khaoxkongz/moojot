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
        headerTitleStyle: { color: theme.text, fontFamily: fontFaces.heavy, fontSize: 21 },
        sceneStyle: { backgroundColor: theme.background },
        tabBarActiveTintColor: theme.accentText,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopWidth: 0,
          borderTopLeftRadius: 17,
          borderTopRightRadius: 17,
          height: 79,
          paddingTop: 9,
          paddingBottom: 3,
        },
        tabBarLabelStyle: { fontFamily: fontFaces.extraBold, fontSize: 14 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "หน้าแรก",
          headerShown: false,
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="home-outline" size={29} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "พี่มนุษย์",
          headerShown: false,
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account-outline" size={29} color={color} />,
        }}
      />
    </Tabs>
  );
}
