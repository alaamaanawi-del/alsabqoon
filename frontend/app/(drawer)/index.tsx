import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from "../../src/theme/colors";
import { Link } from "expo-router";

export default function Home() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={{ 
        padding: 16,
        paddingLeft: Math.max(16, insets.left),
        paddingRight: Math.max(16, insets.right),
        paddingBottom: Math.max(16, insets.bottom + 20)
      }}
    >
      {/* Existing home content */}
    </ScrollView>
  );
}

// Existing styles...