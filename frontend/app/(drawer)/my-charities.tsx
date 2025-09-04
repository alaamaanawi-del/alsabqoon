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
import CharityMonthCalendar from '../../src/components/CharityMonthCalendar';
import { fmtYMD, hijriFullString, gregFullString } from '../../src/utils/date';

const FILTER_BUTTONS = [
  { key: 'select', labelAr: 'اختر', labelEn: 'Select', labelEs: 'Seleccionar' },
  { key: 'month', labelAr: 'شهر', labelEn: 'Month', labelEs: 'Mes' },
  { key: 'week', labelAr: 'أسبوع', labelEn: 'Week', labelEs: 'Semana' },
  { key: 'today', labelAr: 'اليوم', labelEn: 'Today', labelEs: 'Hoy' },
];

export default function MyCharitiesScreen() {
  const [showCalendar, setShowCalendar] = useState(false);
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedFilter, setSelectedFilter] = useState('today');
  const [charitiesList, setCharitiesList] = useState<Charity[]>([]);
  const [dailySummary, setDailySummary] = useState<DailyCharitySummary | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [charityDataByDate, setCharityDataByDate] = useState<Record<string, number>>({});
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [isSelectingStartDate, setIsSelectingStartDate] = useState(true);

  // Format date for API calls (consistent with backend expectations)
  const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get week date range for display
  const getWeekDateRange = (): string => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 6); // Last 7 days including today
    
    const startDateStr = startOfWeek.toLocaleDateString('ar');
    const endDateStr = today.toLocaleDateString('ar');
    
    return `من ${startDateStr} إلى ${endDateStr}`;
  };

  // Get month date range for display
  const getMonthDateRange = (): string => {
    const today = new Date();
    const startOfMonth = new Date(today);
    startOfMonth.setDate(today.getDate() - 29); // Last 30 days including today
    
    const startDateStr = startOfMonth.toLocaleDateString('ar');
    const endDateStr = today.toLocaleDateString('ar');
    
    return `من ${startDateStr} إلى ${endDateStr}`;
  };

  // Load charities and daily data
  useEffect(() => {
    loadCharities();
    loadDailyData();
    loadCharityDataForCalendar();
  }, [selectedDate, monthDate, selectedFilter]);

  // Additional effect to reload data when custom date range changes
  useEffect(() => {
    if (selectedFilter === 'select' && customStartDate && customEndDate) {
      loadDateRangeData();
    }
  }, [customStartDate, customEndDate]);

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
      // Use formatDateForAPI to ensure consistent date formatting
      const dateStr = formatDateForAPI(selectedDate);
      console.log('Loading charity data for date:', dateStr, 'selectedDate:', selectedDate);
      const result = await getDailyCharity(dateStr);
      setDailySummary(result);
    } catch (error) {
      console.error('Error loading daily data:', error);
    }
  };

  // Load data for custom date range
  const loadDateRangeData = async () => {
    try {
      if (!customStartDate || !customEndDate) return;
      
      console.log('Loading date range data from:', customStartDate, 'to:', customEndDate);
      
      // For now, we'll aggregate data from the date range
      // Since the API only supports single date queries, we'll need to query each day
      let totalCount = 0;
      const charitySummary: Record<number, { count: number; sessions: number; percentage: number }> = {};
      
      const daysDiff = Math.ceil((customEndDate.getTime() - customStartDate.getTime()) / (1000 * 60 * 60 * 24));
      
      for (let i = 0; i <= daysDiff; i++) {
        const currentDate = new Date(customStartDate);
        currentDate.setDate(customStartDate.getDate() + i);
        const dateStr = formatDateForAPI(currentDate);
        
        try {
          const dayResult = await getDailyCharity(dateStr);
          totalCount += dayResult.total_daily || 0;
          
          // Aggregate charity counts
          Object.entries(dayResult.charity_summary || {}).forEach(([charityIdStr, data]) => {
            const charityId = parseInt(charityIdStr, 10);
            if (!charitySummary[charityId]) {
              charitySummary[charityId] = { count: 0, sessions: 0, percentage: 0 };
            }
            charitySummary[charityId].count += data.count || 0;
            charitySummary[charityId].sessions += data.sessions || 0;
          });
        } catch (error) {
          console.log(`No data for ${dateStr}`);
        }
      }
      
      // Calculate percentages
      Object.keys(charitySummary).forEach(charityId => {
        if (totalCount > 0) {
          charitySummary[charityId].percentage = (charitySummary[charityId].count / totalCount) * 100;
        }
      });
      
      // Set the aggregated summary
      setDailySummary({
        date: formatDateForAPI(customEndDate),
        total_daily: totalCount,
        charity_summary: charitySummary,
        entries: [] // We don't need entries for summary view
      });
      
      console.log('Date range data loaded:', { totalCount, charitySummary });
    } catch (error) {
      console.error('Error loading date range data:', error);
    }
  };

  // Load charity data for all days in current month (for calendar colors)
  const loadCharityDataForCalendar = async () => {
    try {
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const charityData: Record<string, number> = {};

      // Load data for each day of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDateForAPI(date);
        try {
          const result = await getDailyCharity(dateStr);
          charityData[dateStr] = result.total_daily;
        } catch (error) {
          charityData[dateStr] = 0; // Default to 0 if no data
        }
      }

      setCharityDataByDate(charityData);
    } catch (error) {
      console.error('Error loading charity data for calendar:', error);
    }
  };

  const handleCharityPress = (charity: Charity) => {
    router.push(`/charities/${charity.id}`);
  };

  const onSelectDate = (date: Date) => {
    // Create a local date to avoid timezone shifts
    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    console.log('Calendar date selected:', date, 'converted to local:', localDate);
    setSelectedDate(localDate);
    setShowCalendar(false); // Close calendar when date is selected
  };

  const onSelectDateFromMonth = (date: Date) => {
    // Create a local date to avoid timezone shifts
    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    console.log('Month calendar date selected:', date, 'converted to local:', localDate);
    
    if (selectedFilter === 'select') {
      // Handle date range selection for "اختر" button
      if (isSelectingStartDate) {
        setCustomStartDate(localDate);
        setIsSelectingStartDate(false);
        console.log('Start date selected:', localDate);
      } else {
        setCustomEndDate(localDate);
        setIsSelectingStartDate(true);
        setShowCalendar(false);
        console.log('End date selected:', localDate);
        // Load data for the selected date range
        // For now, just use the end date as selected date
        setSelectedDate(localDate);
      }
    } else {
      // Normal single date selection for other filters
      setSelectedDate(localDate);
      setShowCalendar(false);
    }
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
          onPress={() => {
            setSelectedFilter(button.key);
            // Show calendar when "Select" button is pressed
            if (button.key === 'select') {
              setShowCalendar(true);
            }
          }}
        >
          <Text style={[
            styles.filterButtonText,
            selectedFilter === button.key && styles.filterButtonTextSelected
          ]}>
            {button.labelAr}
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
          <Text style={styles.charityNamePrimary}>{charity.nameAr}</Text>
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
    // Get color based on charity count
    const getDateColor = (count: number) => {
      if (count === 0) return Colors.lightGray;
      if (count >= 1 && count <= 3) return '#FF6B6B'; // Red
      if (count >= 4 && count <= 10) return '#FFA500'; // Orange  
      return '#32CD32'; // Green for 11+
    };

    return (
      <View style={styles.progressContainer}>
        <Text style={styles.progressTitle}>التقدم الأسبوعي</Text>
        
        <View style={styles.weeklyProgressContainer}>
          {Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            const dateStr = formatDateForAPI(date);
            const count = charityDataByDate[dateStr] || 0;
            
            return (
              <TouchableOpacity
                key={i}
                style={styles.dayContainer}
                onPress={() => setSelectedDate(date)}
              >
                <View
                  style={[
                    styles.dayCircle,
                    { backgroundColor: getDateColor(count) },
                  ]}
                >
                  <Text style={styles.dayNumber}>{date.getDate()}</Text>
                </View>
                <Text style={styles.dayCharityCount}>{count}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft} />
          <Text style={styles.header}>صدقاتي</Text>
          <TouchableOpacity style={styles.headerRight} onPress={() => setShowCalendar(!showCalendar)}>
            <Ionicons name="calendar" size={24} color={Colors.deepGreen} />
          </TouchableOpacity>
        </View>


        {/* Calendar */}
        {showCalendar && (
          <View style={styles.calendarContainer}>
            <View style={styles.monthHeader}>
              <TouchableOpacity onPress={() => {
                const prevMonth = new Date(monthDate);
                prevMonth.setMonth(monthDate.getMonth() - 1);
                setMonthDate(prevMonth);
              }}>
                <Text style={styles.navButton}>‹</Text>
              </TouchableOpacity>
              
              <Text style={styles.monthTitle}>
                {monthDate.toLocaleDateString('ar', { month: 'long', year: 'numeric' })}
              </Text>
              
              <TouchableOpacity onPress={() => {
                const nextMonth = new Date(monthDate);
                nextMonth.setMonth(monthDate.getMonth() + 1);
                setMonthDate(nextMonth);
              }}>
                <Text style={styles.navButton}>›</Text>
              </TouchableOpacity>
            </View>
            
            {renderSimpleCalendar()}
          </View>
        )}

        {renderFilterButtons()}

        {/* Filter Description Display */}
        <View style={styles.filterDescriptionContainer}>
          {selectedFilter === 'today' && (
            <Text style={styles.filterDescriptionText}>
              {new Date().toLocaleDateString('ar', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                timeZone: 'Asia/Riyadh'
              })}
            </Text>
          )}
          {selectedFilter === 'week' && (
            <Text style={styles.filterDescriptionText}>
              أدائك خلال أسبوع - {getWeekDateRange()}
            </Text>
          )}
          {selectedFilter === 'month' && (
            <Text style={styles.filterDescriptionText}>
              أدائك خلال شهر - {getMonthDateRange()}
            </Text>
          )}
          {selectedFilter === 'select' && (
            <Text style={styles.filterDescriptionText}>
              {customStartDate && customEndDate 
                ? `النطاق المحدد - من ${customStartDate.toLocaleDateString('ar')} إلى ${customEndDate.toLocaleDateString('ar')}`
                : isSelectingStartDate 
                  ? 'اختر تاريخ البداية'
                  : 'اختر تاريخ النهاية'
              }
            </Text>
          )}
        </View>

        {/* Charity List */}
        <View style={styles.charitiesContainer}>
          <Text style={styles.totalDailyText}>
            إجمالي الصدقات اليوم: {dailySummary?.total_daily || 0}
          </Text>
          {charitiesList.map(renderCharityItem)}
        </View>

        {/* Progress Chart */}
        {renderProgressChart()}
      </ScrollView>
    </SafeAreaView>
  );}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  filterDescriptionContainer: {
    backgroundColor: Colors.light,
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
  filterDescriptionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
    textAlign: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.dark,
  },
  calBtn: {
    backgroundColor: Colors.deepGreen,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  calTxt: {
    color: Colors.light,
    fontSize: 14,
    fontWeight: "bold",
  },
  dateLabelBox: {
    backgroundColor: Colors.light,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hijriTxt: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.dark,
    marginBottom: 4,
  },
  gregTxt: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  calendarContainer: {
    backgroundColor: Colors.light,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
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
    color: Colors.dark,
  },
  totalContainer: {
    backgroundColor: Colors.light,
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
  totalDailyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.deepGreen,
    marginBottom: 16,
    textAlign: 'center',
  },
  charitiesContainer: {
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
  charityNamePrimary: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 4,
  },
  charityNameSecondary: {
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
    marginBottom: 16,
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
    color: Colors.dark,
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
  progressBarCount: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.deepGreen,
    textAlign: 'center',
    marginTop: 2,
  },
  languageContainer: {
    backgroundColor: Colors.light,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  languageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 12,
    textAlign: 'center',
  },
  languageButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  languageButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.lightGray,
  },
  languageButtonSelected: {
    backgroundColor: Colors.deepGreen,
  },
  languageButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.darkGray,
  },
  languageButtonTextSelected: {
    color: Colors.light,
  },
  weeklyProgressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingVertical: 16,
  },
  dayContainer: {
    alignItems: 'center',
    flex: 1,
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.light,
  },
  dayCharityCount: {
    fontSize: 12,
    color: Colors.darkGray,
    textAlign: 'center',
  },
});
