import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../src/theme/colors';
import { router } from 'expo-router';
import { 
  getAzkarList, 
  getDailyAzkar, 
  Zikr, 
  DailyAzkarSummary 
} from '../../../src/api/client';

const AZKAR_LIST = [
  { id: 1, nameAr: 'سبحان الله وبحمده', nameEn: 'Subhan Allah wa Bi Hamdih', color: '#FF6B6B' },
  { id: 2, nameAr: 'سبحان الله العظيم وبحمده', nameEn: 'Subhan Allah al-Azeem wa Bi Hamdih', color: '#4ECDC4' },
  { id: 3, nameAr: 'سبحان الله وبحمده + استغفر الله وأتوب إليه', nameEn: 'Subhan Allah wa Bi Hamdih, Astaghfir Allah wa Atubu ilayh', color: '#45B7D1' },
  { id: 4, nameAr: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شئ قدير', nameEn: 'La ilaha illa Allah wahdahu la sharika lahu', color: '#96CEB4' },
  { id: 5, nameAr: 'لا حول ولا قوة إلا بالله', nameEn: 'La hawla wala quwwata illa billah', color: '#FFEAA7' },
  { id: 6, nameAr: 'سبحان الله', nameEn: 'Subhan Allah', color: '#DDA0DD' },
  { id: 7, nameAr: 'سبحان الله وبحمده سبحان الله العظيم', nameEn: 'Subhan Allah wa Bi Hamdih + Subhan Allah al-Azeem', color: '#98D8C8' },
  { id: 8, nameAr: 'سبحان الله والحمد لله ولا إله إلا الله والله أكبر', nameEn: 'Subhan Allah wa al-Hamdulillah wa la ilaha illa Allah, wa Allahu Akbar', color: '#F7DC6F' },
  { id: 9, nameAr: 'لا إله إلا أنت سبحانك إني كنت من الظالمين', nameEn: 'La ilaha illa anta subhanak inni kuntu min al-zalimeen', color: '#BB8FCE' },
  { id: 10, nameAr: 'الصلاة على النبي', nameEn: 'Salat Ala al-Nabi', color: '#85C1E9' },
  { id: 11, nameAr: 'استغفر الله وأتوب إليه', nameEn: 'Astaghfir Allah wa Atubu ilayh', color: '#F8C471' },
  { id: 12, nameAr: 'آيات قرأتها', nameEn: 'Verses I read of the Quran', color: '#82E0AA' },
];

const FILTER_BUTTONS = [
  { key: 'today', label: 'اليوم' },
  { key: 'week', label: 'أسبوع' },
  { key: 'month', label: 'شهر' },
  { key: 'select', label: 'اختر' },
];

export default function MyAzkarScreen() {
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('today');
  const [isHijri, setIsHijri] = useState(false);
  const [azkarList, setAzkarList] = useState<Zikr[]>([]);
  const [dailySummary, setDailySummary] = useState<DailyAzkarSummary | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadAzkarData();
  }, [selectedFilter, selectedDate]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const azkarResponse = await getAzkarList();
      setAzkarList(azkarResponse.azkar);
    } catch (error) {
      console.error('Error loading azkar list:', error);
      Alert.alert('خطأ', 'فشل في تحميل قائمة الأذكار');
      // Fallback to local data
      setAzkarList(AZKAR_LIST);
    } finally {
      setLoading(false);
    }
  };

  const loadAzkarData = async () => {
    try {
      const dateStr = formatDateForAPI(selectedDate);
      const summary = await getDailyAzkar(dateStr);
      setDailySummary(summary);
    } catch (error) {
      console.error('Error loading daily azkar:', error);
      // Set empty summary on error
      setDailySummary({
        date: formatDateForAPI(selectedDate),
        total_daily: 0,
        azkar_summary: {},
        entries: []
      });
    }
  };

  const formatDateForAPI = (date: Date): string => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  const getTotalDaily = () => {
    return dailySummary?.total_daily || 0;
  };

  const getDailyColorCode = (total) => {
    if (total < 1000) return Colors.accent; // Red
    if (total <= 3000) return '#FF8C00'; // Orange
    return Colors.success; // Green
  };

  const handleZikrPress = (zikr) => {
    router.push(`/my-azkar/${zikr.id}`);
  };

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      {FILTER_BUTTONS.map((button) => (
        <TouchableOpacity
          key={button.key}
          style={[
            styles.filterButton,
            selectedFilter === button.key && styles.filterButtonActive,
          ]}
          onPress={() => setSelectedFilter(button.key)}
        >
          <Text
            style={[
              styles.filterText,
              selectedFilter === button.key && styles.filterTextActive,
            ]}
          >
            {button.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderAzkarList = () => (
    <View style={styles.azkarListContainer}>
      {(azkarList.length > 0 ? azkarList : AZKAR_LIST).map((zikr, index) => {
        const azkarSummary = dailySummary?.azkar_summary || {};
        const data = azkarSummary[zikr.id] || { count: 0, percentage: 0 };
        return (
          <TouchableOpacity
            key={zikr.id}
            style={styles.azkarItem}
            onPress={() => handleZikrPress(zikr)}
          >
            <View style={styles.azkarRow}>
              <View style={[styles.colorCircle, { backgroundColor: zikr.color }]} />
              <View style={styles.azkarContent}>
                <Text style={styles.azkarNameAr}>{zikr.nameAr}</Text>
                <Text style={styles.azkarNameEn}>{zikr.nameEn}</Text>
                <View style={styles.statsRow}>
                  <Text style={styles.countText}>{data.count.toLocaleString()}</Text>
                  <Text style={styles.percentageText}>{data.percentage}%</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.mediumGray} />
            </View>
            {index < (azkarList.length > 0 ? azkarList : AZKAR_LIST).length - 1 && <View style={styles.separator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderProgressChart = () => {
    // Mock data for 7 days
    const chartData = Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      count: Math.floor(Math.random() * 4000),
    }));

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>التقدم اليومي</Text>
        <View style={styles.chart}>
          {chartData.map((data, index) => (
            <View key={index} style={styles.chartBar}>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(20, (data.count / 4000) * 100),
                    backgroundColor: getDailyColorCode(data.count),
                  },
                ]}
              />
              <Text style={styles.chartCount}>{data.count}</Text>
              <Text style={styles.chartDay}>{data.day}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="bookmark" size={24} color={Colors.light} />
          <Text style={styles.headerTitle}>أذكاري</Text>
          <TouchableOpacity
            onPress={() => setShowCalendar(!showCalendar)}
            style={styles.calendarButton}
          >
            <Ionicons name="calendar" size={24} color={Colors.light} />
          </TouchableOpacity>
        </View>
        
        {/* Calendar Toggle */}
        {showCalendar && (
          <View style={styles.calendarContainer}>
            <TouchableOpacity
              style={styles.calendarTypeButton}
              onPress={() => setIsHijri(!isHijri)}
            >
              <Text style={styles.calendarTypeText}>
                {isHijri ? 'التقويم الهجري' : 'التقويم الميلادي'}
              </Text>
            </TouchableOpacity>
            <View style={styles.calendarPlaceholder}>
              <Text style={styles.calendarPlaceholderText}>
                عرض التقويم - سيتم التطوير لاحقاً
              </Text>
              <Text style={styles.totalDisplay}>
                إجمالي اليوم: {getTotalDaily().toLocaleString()}
              </Text>
              <View
                style={[
                  styles.totalIndicator,
                  { backgroundColor: getDailyColorCode(getTotalDaily()) },
                ]}
              />
            </View>
          </View>
        )}
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Filter Buttons */}
        {renderFilterButtons()}

        {/* Azkar List */}
        {renderAzkarList()}

        {/* Progress Chart */}
        {renderProgressChart()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.deepGreen,
    paddingTop: Platform.OS === 'ios' ? 0 : 25,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  calendarButton: {
    padding: 4,
  },
  calendarContainer: {
    backgroundColor: Colors.greenTeal,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  calendarTypeButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.deepGreen,
    borderRadius: 20,
    marginBottom: 12,
  },
  calendarTypeText: {
    color: Colors.light,
    fontSize: 14,
    fontWeight: '600',
  },
  calendarPlaceholder: {
    backgroundColor: Colors.light,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  calendarPlaceholderText: {
    color: Colors.darkGray,
    fontSize: 16,
    marginBottom: 12,
  },
  totalDisplay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.deepGreen,
    marginBottom: 8,
  },
  totalIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  scrollContainer: {
    flex: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: Colors.deepGreen,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkGray,
  },
  filterTextActive: {
    color: Colors.light,
  },
  azkarListContainer: {
    backgroundColor: Colors.light,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  azkarItem: {
    paddingHorizontal: 16,
  },
  azkarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  colorCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 12,
  },
  azkarContent: {
    flex: 1,
    marginLeft: 12,
  },
  azkarNameAr: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkGray,
    marginBottom: 4,
  },
  azkarNameEn: {
    fontSize: 14,
    color: Colors.mediumGray,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  countText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.deepGreen,
  },
  percentageText: {
    fontSize: 14,
    color: Colors.accent,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.lightGray,
    marginLeft: 40,
  },
  chartContainer: {
    backgroundColor: Colors.light,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkGray,
    textAlign: 'center',
    marginBottom: 16,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 20,
    marginBottom: 8,
    borderRadius: 4,
  },
  chartCount: {
    fontSize: 10,
    color: Colors.darkGray,
    marginBottom: 4,
  },
  chartDay: {
    fontSize: 12,
    color: Colors.mediumGray,
  },
});