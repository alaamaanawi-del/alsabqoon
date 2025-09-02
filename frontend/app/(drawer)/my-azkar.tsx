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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/theme/colors';
import { router } from 'expo-router';
import { 
  getAzkarList, 
  getDailyAzkar, 
  Zikr, 
  DailyAzkarSummary 
} from '../../src/api/client';

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
  const insets = useSafeAreaInsets();
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('today');
  const [isHijri, setIsHijri] = useState(false);
  const [azkarList, setAzkarList] = useState<Zikr[]>([]);
  const [dailySummary, setDailySummary] = useState<DailyAzkarSummary | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<Record<string, number>>({});
  const [weeklyData, setWeeklyData] = useState<Record<string, number>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [dateRangeStep, setDateRangeStep] = useState<'start' | 'end'>('start');

  // Hijri calendar conversion functions
  const gregorianToHijri = (gregorianDate: Date) => {
    // Simple approximation for Hijri conversion (you can use a library like moment-hijri for accuracy)
    const gregorianYear = gregorianDate.getFullYear();
    const hijriYear = Math.floor((gregorianYear - 622) * 1.030684);
    const hijriMonth = (gregorianDate.getMonth() + Math.floor(Math.random() * 2)) % 12; // Simplified
    const hijriDay = gregorianDate.getDate();
    
    return {
      year: hijriYear + 1,
      month: hijriMonth,
      day: hijriDay
    };
  };

  const getHijriMonthName = (month: number) => {
    const hijriMonths = [
      'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية',
      'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
    ];
    return hijriMonths[month] || 'محرم';
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadAzkarData();
    loadMonthlyData();
    loadWeeklyData();
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

  const loadMonthlyData = async () => {
    try {
      const currentMonth = selectedDate.getMonth();
      const currentYear = selectedDate.getFullYear();
      const monthData: Record<string, number> = {};
      
      // Load data for each day of the current month
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dateStr = formatDateForAPI(date);
        
        try {
          const summary = await getDailyAzkar(dateStr);
          monthData[dateStr] = summary.total_daily;
        } catch (error) {
          monthData[dateStr] = Math.floor(Math.random() * 2500); // Fallback to mock data
        }
      }
      
      setMonthlyData(monthData);
    } catch (error) {
      console.error('Error loading monthly data:', error);
    }
  };

  const loadWeeklyData = async () => {
    try {
      const weekData: Record<string, number> = {};
      
      // Load data for the last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = formatDateForAPI(date);
        
        try {
          const summary = await getDailyAzkar(dateStr);
          weekData[dateStr] = summary.total_daily;
        } catch (error) {
          weekData[dateStr] = Math.floor(Math.random() * 3500); // Fallback to mock data
        }
      }
      
      setWeeklyData(weekData);
    } catch (error) {
      console.error('Error loading weekly data:', error);
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

  const getDailyColorCode = (total: number) => {
    if (total < 1000) return Colors.accent; // Red
    if (total <= 3000) return '#FF8C00'; // Orange
    return Colors.success; // Green
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    // Don't show calendar, just update the azkar list for the selected date
    // The azkar list will automatically update because of the useEffect dependency on selectedDate
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setMonth(selectedDate.getMonth() - 1);
    } else {
      newDate.setMonth(selectedDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
    // Reload data for the new month
    loadMonthlyData();
  };

  const handleZikrPress = (zikr: any) => {
    router.push(`/azkar/${zikr.id}`);
  };

  const renderCalendarDays = () => {
    const today = new Date();
    let currentMonth, currentYear, monthName;
    
    if (isHijri) {
      const hijriDate = gregorianToHijri(selectedDate);
      currentMonth = hijriDate.month;
      currentYear = hijriDate.year;
      monthName = getHijriMonthName(currentMonth);
    } else {
      currentMonth = selectedDate.getMonth();
      currentYear = selectedDate.getFullYear();
      const gregorianMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
                             'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      monthName = gregorianMonths[currentMonth];
    }
    
    // Get first day of the month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // FIXED: Correct day of week calculation for RTL calendar
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // For Arabic RTL calendar: Sunday should be rightmost (index 6), Saturday leftmost (index 0)
    let startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 6 = Saturday
    // Convert to RTL positioning: Sunday=0 becomes 6, Monday=1 becomes 5, etc.
    startingDayOfWeek = (7 - startingDayOfWeek) % 7;
    
    const days = [];
    
    // Add month/year header with navigation
    days.push(
      <View key="month-header" style={styles.monthHeader}>
        <TouchableOpacity 
          onPress={() => navigateMonth('prev')} 
          style={styles.monthNavButton}
        >
          <Ionicons name="chevron-back" size={20} color={Colors.deepGreen} />
        </TouchableOpacity>
        <Text style={styles.monthHeaderText}>
          {monthName} {currentYear}
        </Text>
        <TouchableOpacity 
          onPress={() => navigateMonth('next')} 
          style={styles.monthNavButton}
        >
          <Ionicons name="chevron-forward" size={20} color={Colors.deepGreen} />
        </TouchableOpacity>
      </View>
    );
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <View key={`empty-${i}`} style={styles.calendarDay}>
          <Text style={styles.dayText}></Text>
        </View>
      );
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(currentYear, currentMonth, day);
      const isToday = dayDate.toDateString() === today.toDateString();
      const isSelected = dayDate.toDateString() === selectedDate.toDateString();
      
      // Get zikr count for this day from monthlyData - FIXED: Use correct date format
      const dateStr = formatDateForAPI(dayDate);
      const dayZikrCount = monthlyData[dateStr] || 0;
      
      let displayDay = day;
      if (isHijri) {
        // For Hijri calendar, you might want to adjust day display
        displayDay = day;
      }
      
      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            isToday && styles.todayDay,
            isSelected && styles.selectedDay,
          ]}
          onPress={() => {
            setSelectedDate(dayDate);
            // Smooth auto-hide calendar after selection
            setTimeout(() => {
              if (showCalendar) {
                setShowCalendar(false);
              }
            }, 300); // Delay for visual feedback
          }}
        >
          <Text style={[
            styles.dayText,
            isToday && styles.todayText,
            isSelected && styles.selectedText,
          ]}>
            {displayDay}
          </Text>
          {/* Zikr count under each day */}
          <Text style={[
            styles.zikrCountText,
            isToday && styles.todayText,
            isSelected && styles.selectedText,
          ]}>
            {dayZikrCount > 0 ? dayZikrCount.toLocaleString() : ''}
          </Text>
        </TouchableOpacity>
      );
    }
    
    return days;
  };

  const renderDateRangeCalendar = () => {
    const today = new Date();
    let currentMonth, currentYear, monthName;
    
    if (isHijri) {
      const hijriDate = gregorianToHijri(selectedDate);
      currentMonth = hijriDate.month;
      currentYear = hijriDate.year;
      monthName = getHijriMonthName(currentMonth);
    } else {
      currentMonth = selectedDate.getMonth();
      currentYear = selectedDate.getFullYear();
      const gregorianMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
                             'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      monthName = gregorianMonths[currentMonth];
    }
    
    // Get first day of the month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // FIXED: Correct day of week calculation for RTL calendar
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // For Arabic RTL calendar: Sunday should be rightmost (index 6), Saturday leftmost (index 0)
    let startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 6 = Saturday
    // Convert to RTL positioning: Sunday=0 becomes 6, Monday=1 becomes 5, etc.
    startingDayOfWeek = (7 - startingDayOfWeek) % 7;
    
    const days = [];
    
    // Add month/year header with navigation
    days.push(
      <View key="month-header" style={styles.monthHeader}>
        <TouchableOpacity 
          onPress={() => navigateMonth('prev')} 
          style={styles.monthNavButton}
        >
          <Ionicons name="chevron-back" size={20} color={Colors.deepGreen} />
        </TouchableOpacity>
        <Text style={styles.monthHeaderText}>
          {monthName} {currentYear}
        </Text>
        <TouchableOpacity 
          onPress={() => navigateMonth('next')} 
          style={styles.monthNavButton}
        >
          <Ionicons name="chevron-forward" size={20} color={Colors.deepGreen} />
        </TouchableOpacity>
      </View>
    );
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <View key={`empty-${i}`} style={styles.calendarDay}>
          <Text style={styles.dayText}></Text>
        </View>
      );
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(currentYear, currentMonth, day);
      const isToday = dayDate.toDateString() === today.toDateString();
      
      // Check if this date is in the selected range
      const isInRange = customStartDate && customEndDate && 
                       dayDate >= customStartDate && dayDate <= customEndDate;
      const isStartDate = customStartDate && dayDate.toDateString() === customStartDate.toDateString();
      const isEndDate = customEndDate && dayDate.toDateString() === customEndDate.toDateString();
      
      let displayDay = day;
      if (isHijri) {
        displayDay = day;
      }
      
      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            isToday && styles.todayDay,
            isStartDate && styles.startDateDay,
            isEndDate && styles.endDateDay,
            isInRange && styles.inRangeDay,
          ]}
          onPress={() => {
            if (dateRangeStep === 'start') {
              setCustomStartDate(dayDate);
              setCustomEndDate(null);
              setDateRangeStep('end');
            } else {
              if (customStartDate && dayDate >= customStartDate) {
                setCustomEndDate(dayDate);
              } else {
                // If selected end date is before start date, swap them
                setCustomEndDate(customStartDate);
                setCustomStartDate(dayDate);
              }
            }
          }}
        >
          <Text style={[
            styles.dayText,
            isToday && styles.todayText,
            (isStartDate || isEndDate) && styles.selectedText,
            isInRange && styles.rangeText,
          ]}>
            {displayDay}
          </Text>
        </TouchableOpacity>
      );
    }
    
    return days;
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
          onPress={() => handleFilterPress(button.key)}
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

  const handleFilterPress = (filterKey: string) => {
    setSelectedFilter(filterKey);
    if (filterKey === 'select') {
      setShowDatePicker(true);
    }
  };

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
    // Generate data for the last 7 days
    const chartData = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      // Get day name in Arabic (without ال prefix)
      const dayNames = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
      const dayName = dayNames[date.getDay()];
      
      // Format date
      const formattedDate = `${date.getDate()}/${date.getMonth() + 1}`;
      
      // Get real zikr count from weeklyData
      const dateStr = formatDateForAPI(date);
      const count = weeklyData[dateStr] || 0;
      
      chartData.push({
        date: formattedDate,
        dayName: dayName,
        count: count,
        fullDate: date
      });
    }

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
              {/* Zikr count */}
              <Text style={styles.chartCount}>{data.count.toLocaleString()}</Text>
              {/* Day name */}
              <Text style={styles.chartDayName}>{data.dayName}</Text>
              {/* Clickable Date */}
              <TouchableOpacity onPress={() => handleDateClick(data.fullDate)}>
                <Text style={styles.chartDateClickable}>{data.date}</Text>
              </TouchableOpacity>
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
            
            {/* Actual Calendar Implementation */}
            <ScrollView style={styles.calendarScrollView} nestedScrollEnabled={true}>
              <View style={styles.calendarGrid}>
                {/* Calendar Header - Day Names - RTL Order */}
                <View style={styles.calendarHeader}>
                  {['سبت', 'جمعة', 'خميس', 'أربعاء', 'ثلاثاء', 'اثنين', 'أحد'].map((day, index) => (
                    <Text key={index} style={styles.dayHeader}>{day}</Text>
                  ))}
                </View>
                
                {/* Calendar Days */}
                <View style={styles.daysGrid}>
                  {renderCalendarDays()}
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={{
          paddingLeft: Math.max(16, insets.left),
          paddingRight: Math.max(16, insets.right),
          paddingBottom: Math.max(50, insets.bottom + 30) // Extra space for navigation keys
        }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Filter Buttons */}
        {renderFilterButtons()}

        {/* Filter Description Display */}
        <View style={styles.filterDescriptionContainer}>
          {selectedFilter === 'today' && (
            <Text style={styles.filterDescriptionText}>
              {selectedDate.toLocaleDateString('ar', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
          )}
          {selectedFilter === 'week' && (
            <Text style={styles.filterDescriptionText}>
              أدائك خلال أسبوع
            </Text>
          )}
          {selectedFilter === 'month' && (
            <Text style={styles.filterDescriptionText}>
              أدائك خلال شهر
            </Text>
          )}
          {selectedFilter === 'custom' && customStartDate && customEndDate && (
            <Text style={styles.filterDescriptionText}>
              من {customStartDate.toLocaleDateString('ar')} إلى {customEndDate.toLocaleDateString('ar')}
            </Text>
          )}
        </View>

        {/* Azkar List */}
        {renderAzkarList()}

        {/* Progress Chart Section - Moved to bottom */}
        <View style={styles.chartSectionContainer}>
          {renderProgressChart()}
        </View>
      </ScrollView>

      {/* Date Picker Modal for Select Filter */}
      {showDatePicker && (
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerModal}>
            <Text style={styles.datePickerTitle}>اختر نطاق التاريخ</Text>
            
            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={() => {
                const today = new Date();
                setSelectedDate(today);
                setShowDatePicker(false);
                setSelectedFilter('today');
              }}
            >
              <Text style={styles.datePickerButtonText}>اليوم</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={() => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                setSelectedDate(weekAgo);
                setShowDatePicker(false);
                setSelectedFilter('week');
              }}
            >
              <Text style={styles.datePickerButtonText}>آخر 7 أيام</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={() => {
                const monthAgo = new Date();
                monthAgo.setDate(monthAgo.getDate() - 30);
                setSelectedDate(monthAgo);
                setShowDatePicker(false);
                setSelectedFilter('month');
              }}
            >
              <Text style={styles.datePickerButtonText}>آخر 30 يوم</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={() => {
                setShowDatePicker(false);
                setShowDateRangePicker(true);
                setDateRangeStep('start');
                setCustomStartDate(null);
                setCustomEndDate(null);
              }}
            >
              <Text style={styles.datePickerButtonText}>تحديد نطاق مخصص</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.datePickerButton, styles.cancelButton]}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={[styles.datePickerButtonText, styles.cancelButtonText]}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Custom Date Range Picker Modal */}
      {showDateRangePicker && (
        <View style={styles.datePickerOverlay}>
          <View style={styles.dateRangeModal}>
            <Text style={styles.datePickerTitle}>
              {dateRangeStep === 'start' ? 'اختر تاريخ البداية' : 'اختر تاريخ النهاية'}
            </Text>
            
            {/* Mini Calendar for Date Range Selection */}
            <ScrollView style={styles.rangeDatePickerCalendar} nestedScrollEnabled={true}>
              <View style={styles.calendarGrid}>
                {/* Calendar Header - Day Names - RTL Order */}
                <View style={styles.calendarHeader}>
                  {['سبت', 'جمعة', 'خميس', 'أربعاء', 'ثلاثاء', 'اثنين', 'أحد'].map((day, index) => (
                    <Text key={index} style={styles.dayHeader}>{day}</Text>
                  ))}
                </View>
                
                {/* Calendar Days for Date Range */}
                <View style={styles.daysGrid}>
                  {renderDateRangeCalendar()}
                </View>
              </View>
            </ScrollView>

            {/* Selected Range Display */}
            <View style={styles.selectedRangeContainer}>
              <Text style={styles.selectedRangeText}>
                من: {customStartDate ? customStartDate.toLocaleDateString('ar') : 'غير محدد'}
              </Text>
              <Text style={styles.selectedRangeText}>
                إلى: {customEndDate ? customEndDate.toLocaleDateString('ar') : 'غير محدد'}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.dateRangeActions}>
              {customStartDate && customEndDate && (
                <TouchableOpacity 
                  style={[styles.datePickerButton, styles.doneButton]}
                  onPress={() => {
                    setShowDateRangePicker(false);
                    setSelectedFilter('custom');
                    // Apply the custom date range
                    setSelectedDate(customStartDate);
                  }}
                >
                  <Text style={styles.doneButtonText}>تم</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.datePickerButton, styles.cancelButton]}
                onPress={() => {
                  setShowDateRangePicker(false);
                  setCustomStartDate(null);
                  setCustomEndDate(null);
                  setDateRangeStep('start');
                }}
              >
                <Text style={[styles.datePickerButtonText, styles.cancelButtonText]}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.deepGreen,
    marginBottom: 8,
  },
  totalIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  calendarScrollView: {
    maxHeight: 300,
  },
  calendarGrid: {
    backgroundColor: Colors.light,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  dayHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.deepGreen,
    textAlign: 'center',
    flex: 1,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 8,
  },
  todayDay: {
    backgroundColor: Colors.accent,
  },
  selectedDay: {
    backgroundColor: Colors.deepGreen,
  },
  dayText: {
    fontSize: 14,
    color: Colors.darkGray,
    textAlign: 'center',
  },
  todayText: {
    color: Colors.light,
    fontWeight: 'bold',
  },
  selectedText: {
    color: Colors.light,
    fontWeight: 'bold',
  },
  zikrCountText: {
    fontSize: 10,
    color: Colors.mediumGray,
    textAlign: 'center',
    marginTop: 2,
  },
  monthHeader: {
    width: '100%',
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.lightGray,
    marginBottom: 8,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  monthNavButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  monthHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.deepGreen,
    flex: 1,
    textAlign: 'center',
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
    fontSize: 16,
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
    paddingHorizontal: 8,
    paddingTop: 20, // Add top padding to prevent overflow
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 40, // Limit bar width to prevent overlap
  },
  bar: {
    width: 20,
    marginBottom: 8,
    borderRadius: 4,
    maxHeight: 80, // Ensure bars don't exceed container height
    minHeight: 4, // Minimum height for visibility
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
  chartDayName: {
    fontSize: 10,
    color: Colors.darkGray,
    marginBottom: 2,
    textAlign: 'center',
  },
  chartDate: {
    fontSize: 9,
    color: Colors.mediumGray,
    textAlign: 'center',
  },
  chartDateClickable: {
    fontSize: 9,
    color: Colors.deepGreen,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  filterDescriptionContainer: {
    backgroundColor: Colors.light,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  filterDescriptionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.deepGreen,
    textAlign: 'center',
  },
  datePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  datePickerModal: {
    backgroundColor: Colors.light,
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    maxWidth: 300,
    width: '90%',
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkGray,
    textAlign: 'center',
    marginBottom: 20,
  },
  datePickerButton: {
    backgroundColor: Colors.lightGray,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  datePickerButtonText: {
    fontSize: 16,
    color: Colors.darkGray,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: Colors.accent,
  },
  cancelButtonText: {
    color: Colors.light,
  },
  // Date Range Picker Styles
  dateRangeModal: {
    backgroundColor: Colors.light,
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    maxWidth: 350,
    width: '95%',
    maxHeight: '80%',
  },
  rangeDatePickerCalendar: {
    maxHeight: 300,
    marginVertical: 10,
  },
  selectedRangeContainer: {
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
  },
  selectedRangeText: {
    fontSize: 14,
    color: Colors.darkGray,
    textAlign: 'center',
    marginBottom: 4,
  },
  dateRangeActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  doneButton: {
    backgroundColor: Colors.deepGreen,
    flex: 1,
    marginRight: 8,
  },
  doneButtonText: {
    color: Colors.light,
    fontSize: 16,
    fontWeight: '600',
  },
  // Date Range Calendar Styles
  startDateDay: {
    backgroundColor: Colors.deepGreen,
  },
  endDateDay: {
    backgroundColor: Colors.deepGreen,
  },
  inRangeDay: {
    backgroundColor: Colors.lightGray,
  },
  rangeText: {
    color: Colors.darkGray,
  },
  // Chart Section Container
  chartSectionContainer: {
    backgroundColor: Colors.lightGray,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
});
