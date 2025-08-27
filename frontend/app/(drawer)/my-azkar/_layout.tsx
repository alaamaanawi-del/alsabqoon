import React from "react";
import { Stack } from "expo-router";
import { Colors } from "../../../src/theme/colors";

export default function AzkarLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.deepGreen },
        headerTintColor: Colors.light,
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: "أذكاري",
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="[id]" 
        options={{ 
          title: "تفاصيل الذكر",
          presentation: "modal"
        }} 
      />
    </Stack>
  );
}