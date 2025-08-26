import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from "react-native";
import { Colors } from "../../../src/theme/colors";
import { Link, useRouter } from "expo-router";
import { loadPrayerRecord, computeScore, loadTasks } from "../../../src/storage/prayer";
import MonthCalendar from "../../../src/components/MonthCalendar";
import { addDays, colorForScore, fmtYMD, hijriFullString, gregFullString } from "../../../src/utils/date";
import { loadSettings, saveSettings } from "../../../src/storage/settings";
import WeekBar from "../../../src/components/WeekBar";
import { usePrayerIcons } from "../../../src/hooks/usePrayerIcons";
import TaskProgressBar from "../../../src/components/TaskProgressBar";

const PRAYERS = [
  { key: "fajr", label: "الفجر" },
  { key: "dhuhr", label: "الظهر" },
  { key: "asr", label: "العصر" },
  { key: "maghrib", label: "المغرب" },
  { key: "isha", label: "العشاء" },
];

export default function MyPrayers() {
  const [scores, setScores] = useState<Record<string, { r1: number; r2: number }>>({});
  const [tasks, setTasks] = useState<any[]>([]);
  const [showCal, setShowCal] = useState(false);
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const router = useRouter();
  const { icons } = usePrayerIcons();

  useEffect(() => {
    (async () => {
      const s = await loadSettings();
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
      
      // Load tasks to check task icons
      const allTasks = await loadTasks();
      setTasks(allTasks);
      
      const s = await loadSettings();
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
        const ymd = fmtYMD(selectedDate);
        const sc = scores[p.key] || { r1: 0, r2: 0 };
        const score = Math.max(sc.r1, sc.r2); // Use the higher of the two scores
        const isRecorded = score > 0;
        const prayerIcon = icons?.[p.key as keyof typeof icons];
        
        return (
          <TouchableOpacity 
            key={p.key} 
            style={styles.enhancedRow}
            onPress={() => router.push({ 
              pathname: '/(drawer)/my-prayers/record', 
              params: { prayer: p.key, date: ymd } 
            })}
            activeOpacity={0.7}
          >
            {/* Prayer Icon */}
            <View style={styles.iconContainer}>
              {prayerIcon ? (
                <Image 
                  source={{ uri: `data:image/png;base64,${prayerIcon}` }} 
                  style={styles.prayerIcon}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.placeholderIcon} />
              )}
            </View>
            
            {/* Prayer Name and Progress Bar */}
            <View style={styles.prayerContent}>
              <Text style={styles.prayer}>{p.label}</Text>
              <TaskProgressBar score={score} showPercentage={isRecorded} />
            </View>
            
            {/* Status Indicators */}
            <View style={styles.actionContainer}>
              {isRecorded ? (
                <View style={styles.statusContainer}>
                  <View style={styles.checkmarkContainer}>
                    <Text style={styles.checkmark}>✓</Text>
                  </View>
                  <View style={styles.taskIconContainer}>
                    <Text style={styles.taskIcon}>📝</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.unrecordedIndicator}>
                  <Text style={styles.recordBtnText}>تسجيل</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Daily Progress Summary */}
      <View style={styles.dailyProgressContainer}>
        <Text style={styles.dailyProgressTitle}>التقدم اليومي</Text>
        <TaskProgressBar 
          score={(() => {
            const totalScore = PRAYERS.reduce((sum, p) => {
              const sc = scores[p.key] || { r1: 0, r2: 0 };
              return sum + Math.max(sc.r1, sc.r2);
            }, 0);
            return Math.round(totalScore / PRAYERS.length);
          })()} 
          showPercentage={true} 
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  header: { color: Colors.light, fontSize: 22, fontWeight: "800" },
  calBtn: { backgroundColor: Colors.greenTeal, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  calTxt: { color: Colors.light, fontWeight: '800' },
  dateLabelBox: { backgroundColor: '#0e1615', borderRadius: 12, padding: 12, marginTop: 10, marginBottom: 12 },
  hijriTxt: { color: Colors.warmOrange, fontWeight: '800', textAlign: 'right' },
  gregTxt: { color: Colors.light, opacity: 0.9, textAlign: 'right', marginTop: 4 },
  row: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.greenTeal, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 16, marginBottom: 8 },
  enhancedRow: { 
    flexDirection: "row-reverse", 
    alignItems: "center", 
    backgroundColor: Colors.greenTeal, 
    borderRadius: 12, 
    paddingHorizontal: 12, 
    paddingVertical: 16, 
    marginBottom: 8,
    gap: 12
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prayerIcon: {
    width: 32,
    height: 32,
  },
  placeholderIcon: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
  },
  prayerContent: {
    flex: 1,
    gap: 8,
  },
  actionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkmarkContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.warmOrange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: Colors.dark,
    fontSize: 18,
    fontWeight: 'bold',
  },
  taskIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskIcon: {
    fontSize: 16,
  },
  unrecordedIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  recordBtnText: {
    color: Colors.light,
    fontWeight: "600",
    fontSize: 12
  },
  prayer: { color: Colors.light, fontSize: 16, fontWeight: "700" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
  recordBtn: { backgroundColor: Colors.warmOrange, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24 },
  dailyProgressContainer: {
    backgroundColor: '#0e1615',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  dailyProgressTitle: {
    color: Colors.warmOrange,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right',
    marginBottom: 12,
  },
});