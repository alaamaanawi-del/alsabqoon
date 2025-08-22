import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Colors } from "../../../src/theme/colors";
import { Link } from "expo-router";
import { loadPrayerRecord, computeScore } from "../../../src/storage/prayer";

const PRAYERS = [
  { key: "fajr", label: "الفجر" },
  { key: "dhuhr", label: "الظهر" },
  { key: "asr", label: "العصر" },
  { key: "maghrib", label: "المغرب" },
  { key: "isha", label: "العشاء" },
];

const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
};

function colorForScore(n: number) {
  if (n >= 61) return '#16a34a'; // green
  if (n >= 31) return '#f59e0b'; // orange
  return '#ef4444'; // red
}

export default function MyPrayers() {
  const [scores, setScores] = useState<Record<string, { r1: number; r2: number }>>({});

  useEffect(() => {
    (async () => {
      const date = todayStr();
      const out: Record<string, { r1: number; r2: number }> = {};
      for (const p of PRAYERS) {
        const rec = await loadPrayerRecord(p.key, date);
        const sc = computeScore(rec);
        out[p.key] = { r1: sc.r1, r2: sc.r2 };
      }
      setScores(out);
    })();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.header}>صلاتي</Text>
      {PRAYERS.map((p) => {
        const sc = scores[p.key] || { r1: 0, r2: 0 };
        return (
          <View key={p.key} style={styles.row}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
              <Text style={styles.prayer}>{p.label}</Text>
              <View style={[styles.badge, { backgroundColor: colorForScore(sc.r1) }]}><Text style={styles.badgeTxt}>ر1 {Math.round(sc.r1)}</Text></View>
              <View style={[styles.badge, { backgroundColor: colorForScore(sc.r2) }]}><Text style={styles.badgeTxt}>ر2 {Math.round(sc.r2)}</Text></View>
            </View>
            <Link asChild href={{ pathname: "/(drawer)/my-prayers/record", params: { prayer: p.key } }}>
              <TouchableOpacity style={styles.recordBtn}>
                <Text style={{ color: Colors.dark, fontWeight: "700" }}>تسجيل</Text>
              </TouchableOpacity>
            </Link>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  header: { color: Colors.light, fontSize: 22, fontWeight: "800", marginBottom: 12 },
  row: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.greenTeal, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 16, marginBottom: 8 },
  prayer: { color: Colors.light, fontSize: 16, fontWeight: "700" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
  recordBtn: { backgroundColor: Colors.warmOrange, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24 }
});