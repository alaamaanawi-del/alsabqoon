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
  Modal,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/theme/colors';
import { router } from 'expo-router';
import { 
  getCharityList, 
  getDailyCharity, 
  getCharityRange,
  createCharityEntry,
  getCurrentLocalDateString,
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
  
  // Sorting states
  const [sortOption, setSortOption] = useState<'highest' | 'lowest'>('highest');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  
  // Fast Add modal states
  const [showFastAdd, setShowFastAdd] = useState(false);
  const [selectedCharityForAdd, setSelectedCharityForAdd] = useState<Charity | null>(null);
  const [fastAddAmount, setFastAddAmount] = useState('');

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
    
    const startDateStr = startOfWeek.toLocaleDateString('en-GB');
    const endDateStr = today.toLocaleDateString('en-GB');
    
    return `من ${startDateStr} إلى ${endDateStr}`;
  };

  // Get month date range for display
  const getMonthDateRange = (): string => {
    const today = new Date();
    const startOfMonth = new Date(today);
    startOfMonth.setDate(today.getDate() - 29); // Last 30 days including today
    
    const startDateStr = startOfMonth.toLocaleDateString('en-GB');
    const endDateStr = today.toLocaleDateString('en-GB');
    
    return `من ${startDateStr} إلى ${endDateStr}`;
  };

  // Load charities and daily data
  useEffect(() => {
    loadCharities();
    loadDailyData();
    loadCharityDataForCalendar();
  }, [selectedDate, monthDate, selectedFilter]);

  // Refresh data when screen comes into focus (e.g., returning from charity detail page)
  useFocusEffect(
    React.useCallback(() => {
      console.log('Charity screen focused - refreshing data');
      loadCharities();
      loadDailyData();
      loadCharityDataForCalendar();
    }, [selectedFilter, selectedDate, monthDate])
  );

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
      console.log('Loading charity data for filter:', selectedFilter);
      
      if (selectedFilter === 'today') {
        // Load data for today
        const dateStr = formatDateForAPI(selectedDate);
        console.log('Loading today charity data for:', dateStr);
        const result = await getDailyCharity(dateStr);
        setDailySummary(result);
      } else if (selectedFilter === 'week') {
        // Load data for the last 7 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 6); // Last 7 days
        
        const startDateStr = formatDateForAPI(startDate);
        const endDateStr = formatDateForAPI(endDate);
        console.log('Loading week charity data from:', startDateStr, 'to:', endDateStr);
        
        const rangeData = await getCharityRange(startDateStr, endDateStr);
        // Convert range data to daily summary format
        setDailySummary({
          date: `${startDateStr} to ${endDateStr}`,
          total_daily: rangeData.total_range,
          charity_summary: rangeData.charity_summary,
          entries: rangeData.entries
        });
      } else if (selectedFilter === 'month') {
        // Load data for the last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 29); // Last 30 days
        
        const startDateStr = formatDateForAPI(startDate);
        const endDateStr = formatDateForAPI(endDate);
        console.log('Loading month charity data from:', startDateStr, 'to:', endDateStr);
        
        const rangeData = await getCharityRange(startDateStr, endDateStr);
        // Convert range data to daily summary format
        setDailySummary({
          date: `${startDateStr} to ${endDateStr}`,
          total_daily: rangeData.total_range,
          charity_summary: rangeData.charity_summary,
          entries: rangeData.entries
        });
      } else if (selectedFilter === 'select' && customStartDate && customEndDate) {
        // Load data for custom date range
        const startDateStr = formatDateForAPI(customStartDate);
        const endDateStr = formatDateForAPI(customEndDate);
        console.log('Loading custom range charity data from:', startDateStr, 'to:', endDateStr);
        
        const rangeData = await getCharityRange(startDateStr, endDateStr);
        // Convert range data to daily summary format
        setDailySummary({
          date: `${startDateStr} to ${endDateStr}`,
          total_daily: rangeData.total_range,
          charity_summary: rangeData.charity_summary,
          entries: rangeData.entries
        });
      } else {
        // Fallback to today's data
        const dateStr = formatDateForAPI(selectedDate);
        console.log('Loading fallback charity data for:', dateStr);
        const result = await getDailyCharity(dateStr);
        setDailySummary(result);
      }
    } catch (error) {
      console.error('Error loading charity data:', error);
      // Set empty summary on error
      setDailySummary({
        date: formatDateForAPI(selectedDate),
        total_daily: 0,
        charity_summary: {},
        entries: []
      });
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
            console.log('Filter button pressed:', button.key);
            setSelectedFilter(button.key);
            
            // Update selectedDate based on filter type
            if (button.key === 'today') {
              // Set selected date to today for immediate data loading
              const today = new Date();
              setSelectedDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
              console.log('Today filter - setting selectedDate to today:', today);
            } else if (button.key === 'select') {
              // Show calendar when "Select" button is pressed
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

  // Function to sort charity list based on completion percentage
  const getSortedCharitiesList = () => {
    const baseList = charitiesList;
    
    return [...baseList].sort((a, b) => {
      const dataA = dailySummary?.charity_summary[a.id] || { count: 0, percentage: 0 };
      const dataB = dailySummary?.charity_summary[b.id] || { count: 0, percentage: 0 };
      
      if (sortOption === 'highest') {
        return dataB.percentage - dataA.percentage; // Highest first
      } else {
        return dataA.percentage - dataB.percentage; // Lowest first
      }
    });
  };

  // Handle Fast Add button press
  const handleFastAdd = (charity: Charity) => {
    setSelectedCharityForAdd(charity);
    setFastAddAmount('');
    setShowFastAdd(true);
  };

  // Handle Fast Add submission
  const handleFastAddSubmit = async () => {
    if (!selectedCharityForAdd || !fastAddAmount) {
      Alert.alert('خطأ', 'يرجى إدخال المبلغ');
      return;
    }

    const amount = parseFloat(fastAddAmount);
    if (amount <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال مبلغ صحيح');
      return;
    }

    try {
      const date = getCurrentLocalDateString();
      await createCharityEntry(selectedCharityForAdd.id, amount, date);
      
      // Refresh data
      await loadCharitiesList();
      await loadDailySummary();
      
      setShowFastAdd(false);
      setSelectedCharityForAdd(null);
      setFastAddAmount('');
      
      Alert.alert('تم الحفظ', 'تم إضافة الصدقة بنجاح');
    } catch (error) {
      console.error('Error creating charity entry:', error);
      Alert.alert('خطأ', 'فشل في حفظ الصدقة. يرجى المحاولة مرة أخرى.');
    }
  };

  const renderCharityItem = (charity: Charity) => {
    const dailyData = dailySummary?.charity_summary[charity.id];
    const count = dailyData?.count || 0;
    const percentage = dailyData?.percentage || 0;

    return (
      <View key={charity.id} style={styles.charityItem}>
        {/* Top Row: Fast Add Button + Charity Name with Color Circle */}
        <View style={styles.charityTopRow}>
          <TouchableOpacity 
            style={styles.fastAddButton}
            onPress={() => handleFastAdd(charity)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.darkGray} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.charityNameContainer}
            onPress={() => handleCharityPress(charity)}
          >
            <View style={styles.charityNameRow}>
              <View style={[styles.colorCircle, { backgroundColor: charity.color }]} />
              <Text style={styles.charityNameAr}>{charity.nameAr}</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Progress Section: Percentage + Progress Bar + Count */}
        <View style={styles.progressSection}>
          <Text style={styles.percentageNumber}>{percentage.toFixed(1)}%</Text>
          
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: percentage + '%',
                    backgroundColor: '#2D5A52'
                  }
                ]} 
              />
            </View>
          </View>
          
          <Text style={styles.countNumber}>{count.toLocaleString()}</Text>
        </View>
      </View>
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
            <CharityMonthCalendar
              onSelectDate={onSelectDateFromMonth}
              selectedDate={selectedDate}
              monthDate={monthDate}
              onMonthChange={setMonthDate}
              charityDataByDate={charityDataByDate}
            />
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

        {/* Sort Control */}
        <View style={styles.sortContainer}>
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>ترتيب حسب:</Text>
            <TouchableOpacity 
              style={styles.sortButton}
              onPress={() => setShowSortDropdown(!showSortDropdown)}
            >
              <Text style={styles.sortButtonText}>
                {sortOption === 'highest' ? 'أعلى معدل أولاً' : 'أقل معدل أولاً'}
              </Text>
              <Ionicons 
                name={showSortDropdown ? "chevron-up" : "chevron-down"} 
                size={16} 
                color={Colors.darkGray} 
              />
            </TouchableOpacity>
          </View>
          
          {/* Sort Dropdown */}
          {showSortDropdown && (
            <View style={styles.sortDropdown}>
              <TouchableOpacity 
                style={[styles.sortOption, sortOption === 'highest' && styles.sortOptionActive]}
                onPress={() => {
                  setSortOption('highest');
                  setShowSortDropdown(false);
                }}
              >
                <Text style={[styles.sortOptionText, sortOption === 'highest' && styles.sortOptionTextActive]}>
                  أعلى معدل أولاً
                </Text>
                {sortOption === 'highest' && (
                  <Ionicons name="checkmark" size={16} color={Colors.warmOrange} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.sortOption, sortOption === 'lowest' && styles.sortOptionActive]}
                onPress={() => {
                  setSortOption('lowest');
                  setShowSortDropdown(false);
                }}
              >
                <Text style={[styles.sortOptionText, sortOption === 'lowest' && styles.sortOptionTextActive]}>
                  أقل معدل أولاً
                </Text>
                {sortOption === 'lowest' && (
                  <Ionicons name="checkmark" size={16} color={Colors.warmOrange} />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Charity List */}
        <View style={styles.charitiesContainer}>
          <Text style={styles.totalDailyText}>
            إجمالي الصدقات اليوم: {dailySummary?.total_daily || 0}
          </Text>
          {getSortedCharitiesList().map(renderCharityItem)}
        </View>

        {/* Progress Chart */}
        {renderProgressChart()}
      </ScrollView>

      {/* Fast Add Modal */}
      <Modal
        visible={showFastAdd}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFastAdd(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.fastAddModal}>
            <Text style={styles.modalTitle}>
              {selectedCharityForAdd?.nameAr}
            </Text>
            
            <Text style={styles.modalLabel}>المبلغ:</Text>
            <TextInput
              style={styles.modalInput}
              value={fastAddAmount}
              onChangeText={setFastAddAmount}
              placeholder="أدخل المبلغ"
              placeholderTextColor={Colors.mediumGray}
              keyboardType="numeric"
              autoFocus={true}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setShowFastAdd(false)}
              >
                <Text style={styles.cancelModalButtonText}>إلغاء</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.doneModalButton]}
                onPress={handleFastAddSubmit}
              >
                <Text style={styles.doneModalButtonText}>تم</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: Colors.light,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // New design styles
  charityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fastAddButton: {
    marginLeft: 8,
    padding: 4,
  },
  charityNameContainer: {
    flex: 1,
    marginLeft: 12,
  },
  charityNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
    marginLeft: 2,
  },
  charityNameAr: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkGray,
    flex: 1,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  percentageNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.deepGreen,
    minWidth: 50,
    textAlign: 'center',
  },
  progressBarContainer: {
    flex: 1,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  countNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.darkGray,
    minWidth: 50,
    textAlign: 'center',
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
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  navButton: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.deepGreen,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    textAlign: 'center',
  },
  calendarGrid: {
    backgroundColor: Colors.light,
  },
  dayHeadersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  dayHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.darkGray,
    textAlign: 'center',
    flex: 1,
  },
  calendarDaysContainer: {
    backgroundColor: Colors.light,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  emptyDay: {
    flex: 1,
    height: 40,
  },
  calendarDay: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    borderRadius: 8,
  },
  selectedDay: {
    borderWidth: 2,
    borderColor: Colors.deepGreen,
  },
  todayDay: {
    borderWidth: 2,
    borderColor: Colors.deepGreen,
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.light,
    textAlign: 'center',
  },
  selectedDayText: {
    color: Colors.deepGreen,
    fontWeight: 'bold',
  },
  todayDayText: {
    color: Colors.deepGreen,
    fontWeight: 'bold',
  },
  // Sort Control Styles
  sortContainer: {
    backgroundColor: Colors.light,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    position: 'relative',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sortLabel: {
    fontSize: 16,
    color: Colors.darkGray,
    fontWeight: '600',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 8,
    backgroundColor: Colors.background,
    minWidth: 140,
  },
  sortButtonText: {
    fontSize: 16,
    color: Colors.darkGray,
    fontWeight: '500',
  },
  sortDropdown: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    backgroundColor: Colors.light,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 100,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  sortOptionActive: {
    backgroundColor: Colors.background,
  },
  sortOptionText: {
    fontSize: 16,
    color: Colors.darkGray,
  },
  sortOptionTextActive: {
    color: Colors.warmOrange,
    fontWeight: '600',
  },
  // Fast Add Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fastAddModal: {
    backgroundColor: Colors.light,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkGray,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 16,
    color: Colors.darkGray,
    marginBottom: 8,
    fontWeight: '600',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    backgroundColor: Colors.background,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: Colors.lightGray,
  },
  doneModalButton: {
    backgroundColor: Colors.warmOrange,
  },
  cancelModalButtonText: {
    fontSize: 16,
    color: Colors.mediumGray,
    fontWeight: '600',
  },
  doneModalButtonText: {
    fontSize: 16,
    color: Colors.light,
    fontWeight: '600',
  },
});
