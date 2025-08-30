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
import { Colors } from '../../src/theme/colors';
import { router } from 'expo-router';
import { 
  getCharityList, 
  getDailyCharity, 
  Charity, 
  DailyCharitySummary 
} from '../../src/api/client';
import MonthCalendar from '../../src/components/MonthCalendar';
import { fmtYMD, hijriFullString, gregFullString } from '../../src/utils/date';

const FILTER_BUTTONS = [
  { key: 'today', label: 'اليوم' },
  { key: 'week', label: 'أسبوع' },
  { key: 'month', label: 'شهر' },
  { key: 'select', label: 'اختر' },
];

export default function MyCharitiesScreen() {
  const [showCalendar, setShowCalendar] = useState(false);
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedFilter, setSelectedFilter] = useState('today');
  const [monthDate, setMonthDate] = useState(new Date());
  const [charitiesList, setCharitiesList] = useState<Charity[]>([]);
  const [dailySummary, setDailySummary] = useState<DailyCharitySummary | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Sample calendar data with color coding
  const generateCalendarData = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    
    const calendarData = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendarData.push({ date: null, count: 0 });
    }
    
    // Days of the month with sample data
    for (let day = 1; day <= daysInMonth; day++) {
      // Generate sample charity counts for demonstration
      const count = Math.floor(Math.random() * 15);
      calendarData.push({ date: day, count });
    }
    
    return calendarData;
  };

  const [calendarData] = useState(generateCalendarData());

  // Arabic day names (corrected order for proper RTL calendar flow)
  const weekdays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  // Get color based on charity count
  const getDateColor = (count: number) => {
    if (count === 0) return Colors.lightGray;
    if (count >= 1 && count <= 3) return '#FF6B6B'; // Red
    if (count >= 4 && count <= 10) return '#FFA500'; // Orange  
    return '#32CD32'; // Green for 11+
  };

  // Load charities and daily data
  useEffect(() => {
    loadCharities();
    loadDailyData();
  }, [selectedDate]);

  const loadCharities = async () => {
    try {
      const result = await getCharityList();
      setCharitiesList(result.charities);
    } catch (error) {
      console.error('Error loading charities:', error);
    }
  };

  const loadDailyData = async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const result = await getDailyCharity(dateStr);
      setDailySummary(result);
    } catch (error) {
      console.error('Error loading daily data:', error);
    }
  };

  const handleCharityPress = (charity: Charity) => {
    router.push(`/charities/${charity.id}`);
  };

  const handleDatePress = (date: number) => {
    const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), date);
    setSelectedDate(newDate);
    setShowCalendar(false);
  };

  const renderCalendar = () => {
    if (!showCalendar) return null;

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => setIsHijri(!isHijri)} style={styles.calendarToggle}>
            <Text style={styles.calendarToggleText}>
              {isHijri ? 'هجري' : 'ميلادي'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.calendarTitle}>
            {selectedDate.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}
          </Text>
        </View>

        <View style={styles.weekHeader}>
          {weekdays.map((day, index) => (
            <Text key={index} style={styles.weekDayText}>{day}</Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {calendarData.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.calendarDay,
                item.date && {
                  backgroundColor: getDateColor(item.count),
                }
              ]}
              onPress={() => item.date && handleDatePress(item.date)}
              disabled={!item.date}
            >
              <Text style={[
                styles.calendarDayText,
                !item.date && styles.calendarDayTextEmpty
              ]}>
                {item.date || ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      {FILTER_BUTTONS.map((button) => (
        <TouchableOpacity
          key={button.key}
          style={[
            styles.filterButton,
            selectedFilter === button.key && styles.filterButtonSelected
          ]}
          onPress={() => setSelectedFilter(button.key)}
        >
          <Text style={[
            styles.filterButtonText,
            selectedFilter === button.key && styles.filterButtonTextSelected
          ]}>
            {button.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderCharityItem = (charity: Charity) => {
    const dailyData = dailySummary?.charity_summary[charity.id];
    const count = dailyData?.count || 0;
    const percentage = dailyData?.percentage || 0;

    return (
      <TouchableOpacity
        key={charity.id}
        style={styles.charityItem}
        onPress={() => handleCharityPress(charity)}
      >
        <View style={[styles.charityCircle, { backgroundColor: charity.color }]} />
        <View style={styles.charityContent}>
          <Text style={styles.charityNameAr}>{charity.nameAr}</Text>
          <Text style={styles.charityNameEn}>{charity.nameEn}</Text>
          <View style={styles.charityStats}>
            <Text style={styles.charityCount}>العدد: {count}</Text>
            <Text style={styles.charityPercentage}>{percentage.toFixed(1)}%</Text>
          </View>
        </View>
        <Ionicons name="chevron-back" size={20} color={Colors.darkGray} />
      </TouchableOpacity>
    );
  };

  const renderProgressChart = () => {
    // Sample progress data for demonstration
    const progressData = Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      count: Math.floor(Math.random() * 15),
    })).reverse();

    return (
      <View style={styles.progressContainer}>
        <Text style={styles.progressTitle}>التقدم الأسبوعي</Text>
        <View style={styles.progressChart}>
          {progressData.map((item, index) => (
            <TouchableOpacity key={index} style={styles.progressBar}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    height: Math.max((item.count / 15) * 100, 10),
                    backgroundColor: getDateColor(item.count),
                  },
                ]}
              />
              <Text style={styles.progressBarDate}>
                {item.date.getDate()}
              </Text>
              <Text style={styles.progressBarDay}>
                {weekdays[item.date.getDay()]}
              </Text>
            </TouchableOpacity>
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
          <Text style={styles.headerTitle}>صدقاتي</Text>
          <TouchableOpacity 
            onPress={() => setShowCalendar(!showCalendar)}
            style={styles.calendarButton}
          >
            <Ionicons name="calendar-outline" size={24} color={Colors.light} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {renderCalendar()}
        {renderFilterButtons()}

        {/* Date Display */}
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            {selectedDate.toLocaleDateString('ar-SA', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
        </View>

        {/* Total Daily Count */}
        {dailySummary && (
          <View style={styles.totalContainer}>
            <Text style={styles.totalText}>
              إجمالي الصدقات اليوم: {dailySummary.total_daily}
            </Text>
          </View>
        )}

        {/* Charities List */}
        <View style={styles.charitiesContainer}>
          {charitiesList.map(renderCharityItem)}
        </View>

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
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light,
  },
  calendarButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  calendarContainer: {
    backgroundColor: Colors.light,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  calendarToggle: {
    backgroundColor: Colors.deepGreen,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  calendarToggleText: {
    color: Colors.light,
    fontSize: 14,
    fontWeight: 'bold',
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.darkGray,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderRadius: 8,
  },
  calendarDayText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light,
  },
  calendarDayTextEmpty: {
    color: Colors.lightGray,
  },
  filterContainer: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: Colors.light,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterButtonSelected: {
    backgroundColor: Colors.deepGreen,
  },
  filterButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkGray,
  },
  filterButtonTextSelected: {
    color: Colors.light,
  },
  dateContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  totalContainer: {
    backgroundColor: Colors.light,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.deepGreen,
  },
  charitiesContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  charityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light,
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  charityCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: 12,
  },
  charityContent: {
    flex: 1,
  },
  charityNameAr: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 4,
  },
  charityNameEn: {
    fontSize: 14,
    color: Colors.darkGray,
    marginBottom: 4,
  },
  charityStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  charityCount: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  charityPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.deepGreen,
  },
  progressContainer: {
    backgroundColor: Colors.light,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 16,
    textAlign: 'center',
  },
  progressChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
  },
  progressBar: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
    marginHorizontal: 2,
  },
  progressBarFill: {
    width: 24,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressBarDate: {
    fontSize: 12,
    color: Colors.darkGray,
    textAlign: 'center',
  },
  progressBarDay: {
    fontSize: 10,
    color: Colors.darkGray,
    textAlign: 'center',
  },
});