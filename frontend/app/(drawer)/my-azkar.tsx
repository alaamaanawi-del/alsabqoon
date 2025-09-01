import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from "../../src/theme/colors";
import { Link, useRouter, useFocusEffect } from "expo-router";
import MonthCalendar from "../../src/components/MonthCalendar";
import { addDays, colorForScore, fmtYMD, hijriFullString, gregFullString } from "../../src/utils/date";
import { loadSettings, saveSettings } from "../../src/storage/settings";
import WeekBar from "../../src/components/WeekBar";

// Rest of existing code would be imported here
// But I'll focus on adding safe area support to the container

export default function MyAzkar() {
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
      {/* Existing content */}
    </ScrollView>
  );
}

// Existing styles...