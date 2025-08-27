import React from "react";
import { Drawer } from "expo-router/drawer";
import { Colors } from "../../src/theme/colors";
import { Image, View, Text } from "react-native";
import { useLogoBase64 } from "../../src/hooks/useLogoBase64";

export default function DrawerLayout() {
  const b64 = useLogoBase64();
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
            {b64 ? (
              <Image
                source={{ uri: `data:image/png;base64,${b64}` }}
                style={{ width: 28, height: 28, marginHorizontal: 8 }}
              />
            ) : null}
            <Text style={{ color: Colors.light, fontWeight: "700", fontSize: 18 }}>ALSABQON</Text>
          </View>
        ),
      }}
    >
      <Drawer.Screen name="index" options={{ title: "الرئيسية" }} />
      <Drawer.Screen name="my-prayers/index" options={{ title: "صلاتي" }} />
      <Drawer.Screen name="tasks" options={{ title: "المهام" }} />
      <Drawer.Screen name="lessons/index" options={{ title: "الدروس" }} />
      <Drawer.Screen name="messages-support" options={{ title: "الرسائل والدعم" }} />
      <Drawer.Screen name="information" options={{ title: "المعلومات" }} />
      <Drawer.Screen name="settings" options={{ title: "الإعدادات" }} />
    </Drawer>
  );
}