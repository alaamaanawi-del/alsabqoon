import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  I18nManager, 
  TouchableOpacity, 
  Dimensions, 
  Platform,
  ActionSheetIOS,
  Alert
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  runOnJS,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
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
  const [nextWeekStart, setNextWeekStart] = useState<Date | null>(null);
  const [nextScores, setNextScores] = useState<Record<string, number>>({});
  
  // Animation values
  const translateX = useSharedValue(0);
  const animating = useSharedValue(false);
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    setWeekStart(startOfWeek(selectedDate));
  }, [selectedDate]);

  const days = useMemo(() => new Array(7).fill(0).map((_, i) => addDays(weekStart, i)), [weekStart]);
  const nextDays = useMemo(() => 
    nextWeekStart ? new Array(7).fill(0).map((_, i) => addDays(nextWeekStart, i)) : [], 
    [nextWeekStart]
  );

  // Function to load scores for a week
  const loadWeekScores = async (weekDays: Date[]): Promise<Record<string, number>> => {
    const map: Record<string, number> = {};
    for (const d of weekDays) {
      const ymd = fmtYMD(d);
      let sum = 0; 
      for (const p of ['fajr','dhuhr','asr','maghrib','isha']) { 
        const rec = await loadPrayerRecord(p, ymd); 
        sum += computeScore(rec).total; 
      }
      map[ymd] = Math.round(sum / 5);
    }
    return map;
  };

  useEffect(() => {
    (async () => {
      const map = await loadWeekScores(days);
      setScores(map);
    })();
  }, [days]);

  useEffect(() => {
    if (nextDays.length > 0) {
      (async () => {
        const map = await loadWeekScores(nextDays);
        setNextScores(map);
      })();
    }
  }, [nextDays]);

  // Function to complete week transition
  const completeTransition = () => {
    if (nextWeekStart) {
      setWeekStart(nextWeekStart);
      setScores(nextScores);
      setNextWeekStart(null);
      setNextScores({});
    }
    translateX.value = 0;
    animating.value = false;
  };

  // Horizontal swipe to change week with animation
  const panRef = useRef<any>();
  const onGestureEvent = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.END) {
      const dx = nativeEvent.translationX;
      const dy = nativeEvent.translationY;
      const rtl = I18nManager.isRTL;
      
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && !animating.value) {
        const dir = dx > 0 ? 1 : -1; // swipe right (+) or left (-)
        const step = rtl ? -dir : dir; // invert for RTL
        const newWeekStart = addDays(weekStart, step * 7);
        
        // Start animation
        animating.value = true;
        setNextWeekStart(newWeekStart);
        
        // Animate slide transition
        const animationDirection = rtl ? -step : step;
        translateX.value = withTiming(
          animationDirection * screenWidth, 
          { duration: 300 },
          () => {
            runOnJS(completeTransition)();
          }
        );
      } else if (dy > 40) {
        onExpandMonth();
      }
    }
  };

  const todayYmd = fmtYMD(new Date());
  const selYmd = fmtYMD(selectedDate);

  // Animated styles for smooth transitions
  const currentWeekStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: interpolate(
        Math.abs(translateX.value),
        [0, screenWidth * 0.5, screenWidth],
        [1, 0.7, 0],
        Extrapolation.CLAMP
      ),
    };
  });

  const nextWeekStyle = useAnimatedStyle(() => {
    const isMovingRight = translateX.value > 0;
    const startPosition = isMovingRight ? -screenWidth : screenWidth;
    
    return {
      transform: [{ translateX: startPosition + translateX.value }],
      opacity: interpolate(
        Math.abs(translateX.value),
        [0, screenWidth * 0.5, screenWidth],
        [0, 0.7, 1],
        Extrapolation.CLAMP
      ),
    };
  });

  // Render week function
  const renderWeek = (weekDays: Date[], weekScores: Record<string, number>) => {
    return weekDays.map((d, idx) => {
      const ymd = fmtYMD(d);
      const percent = weekScores[ymd] ?? 0;
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
    });
  };

  return (
    <PanGestureHandler ref={panRef} onHandlerStateChange={onGestureEvent}>
      <View style={styles.container}>
        <View style={styles.wrap}>
          {/* Current week */}
          <Animated.View style={[styles.weekContainer, currentWeekStyle]}>
            {renderWeek(days, scores)}
          </Animated.View>
          
          {/* Next/Previous week during transition */}
          {nextWeekStart && (
            <Animated.View style={[styles.weekContainer, styles.nextWeek, nextWeekStyle]}>
              {renderWeek(nextDays, nextScores)}
            </Animated.View>
          )}
        </View>
        
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
  container: { 
    position: 'relative',
    marginBottom: 12,
    overflow: 'hidden'
  },
  wrap: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    position: 'relative'
  },
  weekContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%'
  },
  nextWeek: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0
  },
  cell: { 
    width: `${100/7 - 1}%`, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  labelWrap: { 
    position: 'absolute', 
    alignItems: 'center' 
  },
  dayNum: { 
    color: Colors.light, 
    fontWeight: '800' 
  },
  dayName: { 
    color: '#A6D3CF', 
    fontSize: 12, 
    marginTop: 2 
  },
  todayBtn: { 
    position: 'absolute', 
    left: 0, 
    backgroundColor: Colors.greenTeal, 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 10,
    zIndex: 10
  },
  todayTxt: { 
    color: Colors.light, 
    fontWeight: '800' 
  },
});