import React from "react";
import { Drawer } from "expo-router/drawer";
import { Colors } from "../../src/theme/colors";
import { Image, View, Text } from "react-native";
import { logoBase64 } from "../../src/assets/logo";

export default function DrawerLayout() {
  return (
    <Drawer
      screenOptions={{
        headerTintColor: Colors.light,
        headerStyle: { backgroundColor: Colors.deepGreen },
        drawerActiveTintColor: Colors.warmOrange,
        drawerInactiveTintColor: Colors.light,
        drawerStyle: { backgroundColor: Colors.greenTeal },
        headerTitle: () => (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image
              source={{ uri: `data:image/png;base64,${logoBase64}` }}
              style={{ width: 28, height: 28, marginHorizontal: 8 }}
            />
            <Text style={{ color: Colors.light, fontWeight: "700", fontSize: 18 }}>ALSABQON</Text>
          </View>
        ),
      }}
    >
      <Drawer.Screen name="index" options={{ title: "الرئيسية" }} />
      <Drawer.Screen name="my-prayers/index" options={{ title: "صلاتي" }} />
      <Drawer.Screen name="tasks" options={{ title: "المهام" }} />
      <Drawer.Screen name="messages" options={{ title: "الرسائل" }} />
      <Drawer.Screen name="information" options={{ title: "المعلومات" }} />
      <Drawer.Screen name="settings" options={{ title: "الإعدادات" }} />
    </Drawer>
  );
}