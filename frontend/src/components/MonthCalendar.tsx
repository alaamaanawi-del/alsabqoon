import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { addDays, colorForScore, daysInMonth, dayOfWeek, fmtYMD, hijriDayString, startOfMonth } from '../utils/date';
import { loadPrayerRecord, computeScore } from '../storage/prayer';

const WEEKDAYS = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س']; // Sun..Sat in Arabic initials

export default function MonthCalendar({ monthDate, onChangeMonth, onSelectDate }: { monthDate: Date; onChangeMonth: (d: Date) => void; onSelectDate: (date: Date) => void; }) {
  const [scoresByDate, setScoresByDate] = useState<Record<string, number>>({});

  const days = useMemo(() => {
    const som = startOfMonth(monthDate);
    const dim = daysInMonth(monthDate);
    const startDow = dayOfWeek(som); // 0..6
    const cells: { date: Date; ymd: string }[] = [];
    // Fill leading blanks by going back startDow days
    for (let i = 0; i < startDow; i++) {
      cells.push({ date: addDays(som, i - startDow), ymd: fmtYMD(addDays(som, i - startDow)) });
    }
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
      // Collect unique YMDs in current month view only
      for (const c of days) {
        const ymd = c.ymd;
        // Compute average across 5 prayers (r1+r2 totals per prayer)/5
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

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => onChangeMonth(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))} style={styles.navBtn}><Text style={styles.navTxt}>‹</Text></TouchableOpacity>
        <Text style={styles.monthTitle}>{monthDate.getFullYear()} / {monthDate.getMonth() + 1}</Text>
        <TouchableOpacity onPress={() => onChangeMonth(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))} style={styles.navBtn}><Text style={styles.navTxt}>›</Text></TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((d) => (<Text key={d} style={styles.weekTxt}>{d}</Text>))}
      </View>

      <View style={styles.grid}>
        {days.map(({ date, ymd }, idx) => {
          const inMonth = date.getMonth() === monthDate.getMonth();
          const sc = scoresByDate[ymd] ?? 0;
          const border = colorForScore(sc);
          const hijri = hijriDayString(date);
          return (
            <TouchableOpacity key={ymd + idx} onPress={() => onSelectDate(date)} style={[styles.cell, { opacity: inMonth ? 1 : 0.35, borderColor: border }]}> 
              <Text style={styles.hijri}>{hijri}</Text>
              <Text style={styles.greg}>{date.getDate()}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#0e1615', borderRadius: 12, marginHorizontal: 12, marginBottom: 12 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  navBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#1d2a29', borderRadius: 8 },
  navTxt: { color: Colors.light, fontWeight: '800' },
  monthTitle: { color: Colors.light, fontWeight: '800' },
  weekRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 4 },
  weekTxt: { color: '#A6D3CF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  cell: { width: `${100/7}%`, aspectRatio: 1, borderWidth: 2, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
  hijri: { color: Colors.warmOrange, fontSize: 12 },
  greg: { color: Colors.light, marginTop: 4, fontWeight: '800' },
});