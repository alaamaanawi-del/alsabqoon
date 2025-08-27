import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, Link } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { computeScore, loadPrayerRecord } from '../../src/storage/prayer';
import { fmtYMD, gregFullString, hijriFullString } from '../../src/utils/date';

const PRAYERS = [
  { key: 'fajr', label: 'الفجر' },
  { key: 'dhuhr', label: 'الظهر' },
  { key: 'asr', label: 'العصر' },
  { key: 'maghrib', label: 'المغرب' },
  { key: 'isha', label: 'العشاء' },
];

export default function DaySummary() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const [rows, setRows] = useState<{ key: string; label: string; r1: number; r2: number; total: number }[]>([]);
  const selected = date ? new Date(date as string) : new Date();
  const ymd = fmtYMD(selected);

  useEffect(() => {
    (async () => {
      const list: any[] = [];
      for (const p of PRAYERS) {
        const rec = await loadPrayerRecord(p.key, ymd);
        const sc = computeScore(rec);
        list.push({ key: p.key, label: p.label, r1: sc.r1, r2: sc.r2, total: sc.total });
      }
      setRows(list);
    })();
  }, [ymd]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>ملخص اليوم</Text>
      <Text style={styles.hijri}>{hijriFullString(selected)}</Text>
      <Text style={styles.greg}>{gregFullString(selected)}</Text>

      {rows.map((r) => (
        <View key={r.key} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{r.label}</Text>
            <Text style={styles.meta}>ركعة 1: {Math.round(r.r1)} • ركعة 2: {Math.round(r.r2)} • الإجمالي: {Math.round(r.total)}</Text>
          </View>
          <Link asChild href={{ pathname: '/(drawer)/my-prayers/record', params: { prayer: r.key, date: ymd } }}>
            <Text style={styles.link}>تسجيل</Text>
          </Link>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  title: { color: Colors.warmOrange, fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'right' },
  hijri: { color: Colors.light, textAlign: 'right' },
  greg: { color: '#A6D3CF', textAlign: 'right', marginBottom: 12 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: '#1d2a29', borderRadius: 12, padding: 12, marginBottom: 8 },
  name: { color: Colors.light, fontWeight: '800' },
  meta: { color: '#A6D3CF', marginTop: 4 },
  link: { color: Colors.warmOrange, fontWeight: '800' },
});