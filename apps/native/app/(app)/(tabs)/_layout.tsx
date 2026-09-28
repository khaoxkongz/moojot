import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs } from "expo-router";

import { fontFaces } from "@/constants/fonts";
import { palette } from "@/constants/moo-theme";
const blue = "#1478F2";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: palette.background },
        headerShadowVisible: false,
        headerTitleStyle: { color: palette.ink, fontFamily: fontFaces.heavy, fontSize: 21 },
        sceneStyle: { backgroundColor: "#09243D" },
        tabBarActiveTintColor: blue,
        tabBarInactiveTintColor: "#1A2635",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
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
