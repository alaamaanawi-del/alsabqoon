import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Colors } from "../../../src/theme/colors";
import { Link, useRouter } from "expo-router";
import { loadPrayerRecord, computeScore } from "../../../src/storage/prayer";
import MonthCalendar from "../../../src/components/MonthCalendar";
import { addDays, colorForScore, fmtYMD, hijriFullString, gregFullString } from "../../../src/utils/date";
import { getSettings, saveSettings } from "../../../src/storage/settings";
import WeekBar from "../../../src/components/WeekBar";

const PRAYERS = [
  { key: "fajr", label: "الفجر" },
  { key: "dhuhr", label: "الظهر" },
  { key: "asr", label: "العصر" },
  { key: "maghrib", label: "المغرب" },
  { key: "isha", label: "العشاء" },
];

export default function MyPrayers() {
  const [scores, setScores] = useState<Record<string, { r1: number; r2: number }>>({});
  const [showCal, setShowCal] = useState(false);
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const s = await getSettings();
      if (s.rememberSelectedDate && s.lastSelectedDate) {
        setSelectedDate(new Date(s.lastSelectedDate));
        setMonthDate(new Date(s.lastSelectedDate));
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const date = fmtYMD(selectedDate);
      const out: Record<string, { r1: number; r2: number }> = {};
      for (const p of PRAYERS) {
        const rec = await loadPrayerRecord(p.key, date);
        const sc = computeScore(rec);
        out[p.key] = { r1: sc.r1, r2: sc.r2 };
      }
      setScores(out);
      const s = await getSettings();
      if (s.rememberSelectedDate) {
        await saveSettings({ ...s, lastSelectedDate: date });
      }
    })();
  }, [selectedDate]);

  const last7 = new Array(7).fill(0).map((_, i) => addDays(selectedDate, -(6 - i)));

  const onSelectDate = (d: Date) => {
    setSelectedDate(d);
  };

  const onSelectDateFromMonth = (d: Date) => {
    setSelectedDate(d);
    router.push({ pathname: '/(drawer)/my-prayers/day-summary', params: { date: fmtYMD(d) } });
  };

  // Navigation functions for WeekBar action sheet
  const onNavigateToSummary = (date: Date) => {
    setSelectedDate(date);
    router.push({ pathname: '/(drawer)/my-prayers/day-summary', params: { date: fmtYMD(date) } });
  };

  const onNavigateToRecord = (date: Date) => {
    setSelectedDate(date);
    router.push({ pathname: '/(drawer)/my-prayers/record', params: { prayer: 'fajr', date: fmtYMD(date) } });
  };

  const onNavigateToTasks = (date: Date) => {
    setSelectedDate(date);
    router.push('/(drawer)/tasks');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>صلاتي</Text>
        <View style={{ backgroundColor: 'blue', padding: 10 }}>
          <Text style={{ color: 'white' }}>TEST</Text>
        </View>
        <TouchableOpacity onPress={() => setShowCal((s) => !s)} style={styles.calBtn}>
          <Text style={styles.calTxt}>{showCal ? 'إغلاق' : 'التقويم'}</Text>
        </TouchableOpacity>
      </View>

      {/* Week bar - visible only in week view, hidden in month view */}
      <View style={{ display: showCal ? 'none' : 'flex' }}>
        <WeekBar 
          selectedDate={selectedDate} 
          onSelectDate={onSelectDate} 
          onExpandMonth={() => setShowCal(true)}
          onNavigateToSummary={onNavigateToSummary}
          onNavigateToRecord={onNavigateToRecord}
          onNavigateToTasks={onNavigateToTasks}
        />
      </View>

      {/* Selected date label (Hijri + Gregorian) */}
      <View style={styles.dateLabelBox}>
        <Text style={styles.hijriTxt}>{hijriFullString(selectedDate)}</Text>
        <Text style={styles.gregTxt}>{gregFullString(selectedDate)}</Text>
      </View>

      {showCal && (
        <MonthCalendar monthDate={monthDate} selectedDate={selectedDate} onChangeMonth={setMonthDate} onSelectDate={onSelectDateFromMonth} />
      )}

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
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  header: { color: Colors.light, fontSize: 22, fontWeight: "800" },
  calBtn: { backgroundColor: 'red', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 2, borderColor: 'yellow' },
  calTxt: { color: Colors.light, fontWeight: '800' },
  dateLabelBox: { backgroundColor: '#0e1615', borderRadius: 12, padding: 12, marginTop: 10, marginBottom: 12 },
  hijriTxt: { color: Colors.warmOrange, fontWeight: '800', textAlign: 'right' },
  gregTxt: { color: Colors.light, opacity: 0.9, textAlign: 'right', marginTop: 4 },
  row: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.greenTeal, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 16, marginBottom: 8 },
  prayer: { color: Colors.light, fontSize: 16, fontWeight: "700" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
  recordBtn: { backgroundColor: Colors.warmOrange, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24 }
});