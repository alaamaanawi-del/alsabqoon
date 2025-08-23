import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, I18nManager, TouchableOpacity, Dimensions } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  runOnJS,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';
import { Colors } from '../theme/colors';
import { addDays, colorForScore, fmtYMD, startOfWeek, weekdayShort } from '../utils/date';
import { loadPrayerRecord, computeScore } from '../storage/prayer';
import ProgressRing from './ProgressRing';

interface Props {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  onExpandMonth: () => void;
}

export default function WeekBar({ selectedDate, onSelectDate, onExpandMonth }: Props) {
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(selectedDate));
  const [scores, setScores] = useState<Record<string, number>>({});

  useEffect(() => {
    setWeekStart(startOfWeek(selectedDate));
  }, [selectedDate]);

  const days = useMemo(() => new Array(7).fill(0).map((_, i) => addDays(weekStart, i)), [weekStart]);

  useEffect(() => {
    (async () => {
      const map: Record<string, number> = {};
      for (const d of days) {
        const ymd = fmtYMD(d);
        let sum = 0; for (const p of ['fajr','dhuhr','asr','maghrib','isha']) { const rec = await loadPrayerRecord(p, ymd); sum += computeScore(rec).total; }
        map[ymd] = Math.round(sum / 5);
      }
      setScores(map);
    })();
  }, [days]);

  // Horizontal swipe to change week
  const panRef = useRef<any>();
  const onGestureEvent = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.END) {
      const dx = nativeEvent.translationX;
      const dy = nativeEvent.translationY;
      const rtl = I18nManager.isRTL;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        const dir = dx > 0 ? 1 : -1; // swipe right (+) or left (-)
        const step = rtl ? -dir : dir; // invert for RTL
        setWeekStart(addDays(weekStart, step * 7));
      } else if (dy > 40) {
        onExpandMonth();
      }
    }
  };

  const todayYmd = fmtYMD(new Date());
  const selYmd = fmtYMD(selectedDate);

  return (
    <PanGestureHandler ref={panRef} onHandlerStateChange={onGestureEvent}>
      <View style={styles.wrap}>
        {days.map((d, idx) => {
          const ymd = fmtYMD(d);
          const percent = scores[ymd] ?? 0;
          const color = colorForScore(percent);
          const selected = selYmd === ymd;
          return (
            <TouchableOpacity key={ymd + idx} style={styles.cell} onPress={() => onSelectDate(d)}>
              <ProgressRing size={42} strokeWidth={5} percent={percent} color={color} trackColor="#263736" neon={selected} />
              <View style={styles.labelWrap}>
                <Text style={styles.dayNum}>{d.getDate()}</Text>
                <Text style={styles.dayName}>{weekdayShort(d, 'ar')}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        {selYmd !== todayYmd && (
          <TouchableOpacity onPress={() => onSelectDate(new Date())} style={styles.todayBtn}>
            <Text style={styles.todayTxt}>اليوم</Text>
          </TouchableOpacity>
        )}
      </View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cell: { width: `${100/7 - 1}%`, alignItems: 'center', justifyContent: 'center' },
  labelWrap: { position: 'absolute', alignItems: 'center' },
  dayNum: { color: Colors.light, fontWeight: '800' },
  dayName: { color: '#A6D3CF', fontSize: 12, marginTop: 2 },
  todayBtn: { position: 'absolute', left: 0, backgroundColor: Colors.greenTeal, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  todayTxt: { color: Colors.light, fontWeight: '800' },
});