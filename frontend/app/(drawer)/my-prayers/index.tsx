import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Colors } from "../../../src/theme/colors";
import { Link } from "expo-router";

const PRAYERS = [
  { key: "fajr", label: "الفجر" },
  { key: "dhuhr", label: "الظهر" },
  { key: "asr", label: "العصر" },
  { key: "maghrib", label: "المغرب" },
  { key: "isha", label: "العشاء" },
];

export default function MyPrayers() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.header}>صلاتي</Text>
      {PRAYERS.map((p) => (
        <View key={p.key} style={styles.row}>
          <Text style={styles.prayer}>{p.label}</Text>
          <Link asChild href={{ pathname: "/(drawer)/my-prayers/record", params: { prayer: p.key } }}>
            <TouchableOpacity style={styles.recordBtn}>
              <Text style={{ color: Colors.dark, fontWeight: "700" }}>تسجيل</Text>
            </TouchableOpacity>
          </Link>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  header: { color: Colors.light, fontSize: 22, fontWeight: "800", marginBottom: 12 },
  row: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.greenTeal, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 16, marginBottom: 8 },
  prayer: { color: Colors.light, fontSize: 16, fontWeight: "700" },
  recordBtn: { backgroundColor: Colors.warmOrange, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24 }
});