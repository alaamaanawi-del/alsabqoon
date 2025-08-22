import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Colors } from "../../../src/theme/colors";
import { Link } from "expo-router";
import { loadPrayerRecord, computeScore } from "../../../src/storage/prayer";
import MonthCalendar from "../../../src/components/MonthCalendar";
import { addDays, colorForScore, fmtYMD } from "../../../src/utils/date";

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

export default function MyPrayers() {
  const [scores, setScores] = useState<Record<string, { r1: number; r2: number }>>({});
  const [showCal, setShowCal] = useState(false);
  const [monthDate, setMonthDate] = useState(new Date());

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

  const last7 = new Array(7).fill(0).map((_, i) => addDays(new Date(), -(6 - i)));

  const avgForDate = async (ymd: string) => {
    let sum = 0; const prayers = ['fajr','dhuhr','asr','maghrib','isha'];
    for (const p of prayers) { const rec = await loadPrayerRecord(p, ymd); sum += computeScore(rec).total; }
    return Math.round(sum / 5);
  };

  const onSelectDate = (d: Date) => {
    // Navigate to Record of selected date for Fajr (user can switch prayers in drawer)
    // We pass date param and let Record load that day
    // For smoother UX, we might add a daily summary screen later
    // @ts-ignore
    const date = fmtYMD(d);
    // Use Link-style deep link
    // But here simple navigation suggestion: open Fajr by default
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>صلاتي</Text>
        <TouchableOpacity onPress={() => setShowCal((s) => !s)} style={styles.calBtn}><Text style={styles.calTxt}>التقويم</Text></TouchableOpacity>
      </View>

      {/* 7-day quick bar */}
      <View style={styles.quickRow}>
        {last7.map((d, idx) => (
          <QuickDay key={idx} date={d} />
        ))}
      </View>

      {showCal && (
        <MonthCalendar monthDate={monthDate} onChangeMonth={setMonthDate} onSelectDate={() => {}} />
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

function QuickDay({ date }: { date: Date }) {
  const [score, setScore] = useState<number>(0);
  useEffect(() => { (async () => { setScore(await (async () => { let sum=0; for (const p of ['fajr','dhuhr','asr','maghrib','isha']) { const rec = await loadPrayerRecord(p, fmtYMD(date)); sum += computeScore(rec).total; } return Math.round(sum/5); })()); })(); }, [date]);
  const border = colorForScore(score);
  return (
    <View style={[styles.quickDot, { borderColor: border }]}> 
      <Text style={styles.quickTxt}>{date.getDate()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  header: { color: Colors.light, fontSize: 22, fontWeight: "800", marginBottom: 12 },
  calBtn: { backgroundColor: Colors.greenTeal, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  calTxt: { color: Colors.light, fontWeight: '800' },
  quickRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 12 },
  quickDot: { width: `${100/7 - 1}%`, aspectRatio: 1, borderWidth: 2, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  quickTxt: { color: Colors.light, fontWeight: '800' },
  row: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.greenTeal, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 16, marginBottom: 8 },
  prayer: { color: Colors.light, fontSize: 16, fontWeight: "700" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
  recordBtn: { backgroundColor: Colors.warmOrange, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24 }
});