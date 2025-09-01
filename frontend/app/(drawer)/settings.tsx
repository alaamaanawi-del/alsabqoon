import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from "../../src/theme/colors";
import { loadSettings, saveSettings } from "../../src/storage/settings";

export default function Settings() {
  const insets = useSafeAreaInsets();
  // ... existing state and logic ...

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
      {/* Existing settings content */}
    </ScrollView>
  );
}

// Existing styles...