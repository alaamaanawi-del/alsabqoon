import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { addDays, colorForScore, daysInMonth, dayOfWeek, fmtYMD, hijriDayString, startOfMonth } from '../utils/date';
import { loadPrayerRecord, computeScore } from '../storage/prayer';
import ProgressRing from './ProgressRing';

// Arabic weekday names for RTL display - Saturday to Sunday (right to left)
const WEEKDAYS = ['السبت', 'الجمعة', 'الخميس', 'الأربعاء', 'الثلاثاء', 'الإثنين', 'الأحد'];

function hijriMonthYear(d: Date): string {
  try {
    const fmt = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { month: 'long', year: 'numeric' } as any);
    return fmt.format(d);
  } catch { return ''; }
}
function gregMonthYear(d: Date): string {
  try {
    const fmt = new Intl.DateTimeFormat('ar', { month: 'long', year: 'numeric' } as any);
    return fmt.format(d);
  } catch { return ''; }
}

export default function MonthCalendar({ monthDate, selectedDate, onChangeMonth, onSelectDate }: { monthDate: Date; selectedDate: Date; onChangeMonth: (d: Date) => void; onSelectDate: (date: Date) => void; }) {
  const [scoresByDate, setScoresByDate] = useState<Record<string, number>>({});

  const days = useMemo(() => {
    const som = startOfMonth(monthDate);
    const dim = daysInMonth(monthDate);
    const startDow = dayOfWeek(som); // 0=Sunday, 1=Monday, etc.
    const cells: { date: Date; ymd: string }[] = [];
    
    // Fill leading blanks by going back startDow days
    for (let i = 0; i < startDow; i++) {
      cells.push({ date: addDays(som, i - startDow), ymd: fmtYMD(addDays(som, i - startDow)) });
    }
    
    // Add the days of the current month
    for (let d = 1; d <= dim; d++) {
      const dt = new Date(monthDate.getFullYear(), monthDate.getMonth(), d);
      cells.push({ date: dt, ymd: fmtYMD(dt) });
    }
    
    // Fill to a multiple of 7
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].date;
      const next = addDays(last, 1);
      cells.push({ date: next, ymd: fmtYMD(next) });
    }
    
    return cells;
  }, [monthDate]);

  useEffect(() => {
    (async () => {
      const map: Record<string, number> = {};
      for (const c of days) {
        const ymd = c.ymd;
        let sum = 0;
        const prayers = ['fajr','dhuhr','asr','maghrib','isha'];
        for (const p of prayers) {
          const rec = await loadPrayerRecord(p, ymd);
          const sc = computeScore(rec);
          sum += sc.total;
        }
        map[ymd] = Math.round(sum / 5);
      }
      setScoresByDate(map);
    })();
  }, [days]);

  const selectedYmd = fmtYMD(selectedDate);
  const todayYmd = fmtYMD(new Date());

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => onChangeMonth(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))} style={styles.navBtn}><Text style={styles.navTxt}>‹</Text></TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.monthTitle}>{hijriMonthYear(monthDate)}</Text>
          <Text style={styles.monthSub}>{gregMonthYear(monthDate)}</Text>
        </View>
        <TouchableOpacity onPress={() => onChangeMonth(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))} style={styles.navBtn}><Text style={styles.navTxt}>›</Text></TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((d) => (<Text key={d} style={styles.weekTxt}>{d}</Text>))}
      </View>

      <View style={styles.grid}>
        {days.map(({ date, ymd }, idx) => {
          const inMonth = date.getMonth() === monthDate.getMonth();
          const sc = scoresByDate[ymd] ?? 0;
          const color = colorForScore(sc);
          const hijri = hijriDayString(date);
          const isSelected = ymd === selectedYmd;
          return (
            <TouchableOpacity key={ymd + idx} onPress={() => onSelectDate(date)} style={[styles.cell, { opacity: inMonth ? 1 : 0.35 }]}> 
              <ProgressRing size={42} strokeWidth={5} percent={sc} color={color} trackColor="#263736" neon={isSelected} />
              <View style={styles.cellTextWrap}>
                <Text style={styles.hijri}>{hijri}</Text>
                <Text style={styles.greg}>{date.getDate()}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Today button */}
      {selectedYmd !== todayYmd && (
        <View style={styles.todayWrap}>
          <TouchableOpacity onPress={() => onSelectDate(new Date())} style={styles.todayBtn}>
            <Text style={styles.todayTxt}>اليوم</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#0e1615', borderRadius: 12, marginHorizontal: 12, marginBottom: 12, paddingBottom: 8 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 8 },
  navBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#1d2a29', borderRadius: 8 },
  navTxt: { color: Colors.light, fontWeight: '800' },
  monthTitle: { color: Colors.warmOrange, fontWeight: '800' },
  monthSub: { color: Colors.light },
  weekRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 4 },
  weekTxt: { color: '#A6D3CF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingTop: 6 },
  cell: { width: `${100/7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
  cellTextWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  hijri: { color: Colors.warmOrange, fontSize: 12 },
  greg: { color: Colors.light, marginTop: 4, fontWeight: '800' },
  todayWrap: { alignItems: 'center', marginTop: 8 },
  todayBtn: { backgroundColor: Colors.greenTeal, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  todayTxt: { color: Colors.light, fontWeight: '800' },
});