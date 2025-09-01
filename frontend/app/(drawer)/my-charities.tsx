import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import CharityMonthCalendar from '../../src/components/CharityMonthCalendar';
import WeekBar from '../../src/components/WeekBar';
// ... other imports

export default function MyCharities() {
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