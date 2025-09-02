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
import CharityMonthCalendar from '../../src/components/CharityMonthCalendar';
import { fmtYMD, hijriFullString, gregFullString } from '../../src/utils/date';

const FILTER_BUTTONS = [
  { key: 'today', labelAr: 'اليوم', labelEn: 'Today', labelEs: 'Hoy' },
  { key: 'week', labelAr: 'أسبوع', labelEn: 'Week', labelEs: 'Semana' },
  { key: 'month', labelAr: 'شهر', labelEn: 'Month', labelEs: 'Mes' },
  { key: 'select', labelAr: 'اختر', labelEn: 'Select', labelEs: 'Seleccionar' },
];

export default function MyCharitiesScreen() {
  const [showCalendar, setShowCalendar] = useState(false);
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedFilter, setSelectedFilter] = useState('today');
  const [selectedLanguage, setSelectedLanguage] = useState<'ar' | 'en' | 'es'>('ar'); // Default to Arabic
  const [charitiesList, setCharitiesList] = useState<Charity[]>([]);
  const [dailySummary, setDailySummary] = useState<DailyCharitySummary | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [charityDataByDate, setCharityDataByDate] = useState<Record<string, number>>({});

  // Load charities and daily data
  useEffect(() => {
    loadCharities();
    loadDailyData();
    loadCharityDataForCalendar();
  }, [selectedDate, monthDate]);

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
        const dateStr = date.toISOString().split('T')[0];
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
    setSelectedDate(date);
    setShowCalendar(false); // Close calendar when date is selected
  };

  const onSelectDateFromMonth = (date: Date) => {
    setSelectedDate(date);
    setShowCalendar(false);
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

    // Get charity name based on selected language
    const getCharityName = (charity: Charity) => {
      switch (selectedLanguage) {
        case 'ar': return charity.nameAr;
        case 'en': return charity.nameEn;
        case 'es': return charity.nameEs;
        default: return charity.nameAr;
      }
    };

    const getSecondaryName = (charity: Charity) => {
      if (selectedLanguage === 'ar') return charity.nameEn;
      return charity.nameAr;
    };

    return (
      <TouchableOpacity
        key={charity.id}
        style={styles.charityItem}
        onPress={() => handleCharityPress(charity)}
      >
        <View style={[styles.charityCircle, { backgroundColor: charity.color }]} />
        <View style={styles.charityContent}>
          <Text style={styles.charityNamePrimary}>{getCharityName(charity)}</Text>
          <Text style={styles.charityNameSecondary}>{getSecondaryName(charity)}</Text>
          <View style={styles.charityStats}>
            <Text style={styles.charityCount}>
              {selectedLanguage === 'ar' ? `العدد: ${count}` : 
               selectedLanguage === 'en' ? `Count: ${count}` : 
               `Cantidad: ${count}`}
            </Text>
            <Text style={styles.charityPercentage}>{percentage.toFixed(1)}%</Text>
          </View>
        </View>
        <Ionicons name="chevron-back" size={20} color={Colors.darkGray} />
      </TouchableOpacity>
    );
  };

  const renderLanguageSelector = () => (
    <View style={styles.languageContainer}>
      <Text style={styles.languageTitle}>
        {selectedLanguage === 'ar' ? 'اللغة:' : 
         selectedLanguage === 'en' ? 'Language:' : 
         'Idioma:'}
      </Text>
      <View style={styles.languageButtons}>
        {[
          { key: 'ar', label: 'العربية' },
          { key: 'en', label: 'English' },
          { key: 'es', label: 'Español' }
        ].map((lang) => (
          <TouchableOpacity
            key={lang.key}
            style={[
              styles.languageButton,
              selectedLanguage === lang.key && styles.languageButtonSelected
            ]}
            onPress={() => setSelectedLanguage(lang.key as 'ar' | 'en' | 'es')}
          >
            <Text style={[
              styles.languageButtonText,
              selectedLanguage === lang.key && styles.languageButtonTextSelected
            ]}>
              {lang.labelAr}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
  };


  const renderProgressChart = () => {
    // Arabic day names (corrected order for proper RTL calendar flow)
    const weekdays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    // Get color based on charity count
    const getDateColor = (count: number) => {
      if (count === 0) return Colors.lightGray;
      if (count >= 1 && count <= 3) return '#FF6B6B'; // Red
      if (count >= 4 && count <= 10) return '#FFA500'; // Orange  
      return '#32CD32'; // Green for 11+
    };

    // Get actual progress data from charity data
    const progressData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const count = charityDataByDate[dateStr] || 0;
      return { date, count };
    }).reverse();

    // Handle date click to navigate to specific day
    const handleDateClick = (date: Date) => {
      setSelectedDate(date);
      // Scroll to top to show the selected date
      // You can add smooth scrolling here if needed
    };

  const renderProgressChart = () => {
    return (
      <View style={styles.progressContainer}>
        <Text style={styles.progressTitle}>
          {selectedLanguage === 'ar' ? 'التقدم الأسبوعي' : 
           selectedLanguage === 'en' ? 'Weekly Progress' : 
           'Progreso Semanal'}
        </Text>
        <View style={styles.progressChart}>
          {progressData.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.progressBar}
              onPress={() => handleDateClick(item.date)}
            >
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
              <Text style={styles.progressBarCount}>
                {item.count}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.header}>
            {selectedLanguage === 'ar' ? 'صدقاتي' : 
             selectedLanguage === 'en' ? 'My Charities' : 
             'Mis Caridades'}
          </Text>
          <TouchableOpacity 
            onPress={() => setShowCalendar(!showCalendar)}
            style={styles.calBtn}
          >
            <Text style={styles.calTxt}>
              {showCalendar 
                ? (selectedLanguage === 'ar' ? 'إغلاق' : selectedLanguage === 'en' ? 'Close' : 'Cerrar')
                : (selectedLanguage === 'ar' ? 'التقويم' : selectedLanguage === 'en' ? 'Calendar' : 'Calendario')
              }
            </Text>
          </TouchableOpacity>
        </View>

        {/* Language Selector */}
        {renderLanguageSelector()}

        {/* Calendar */}
        {showCalendar && (
          <CharityMonthCalendar 
            monthDate={monthDate} 
            selectedDate={selectedDate} 
            onChangeMonth={setMonthDate} 
            onSelectDate={onSelectDateFromMonth} 
            charityDataByDate={charityDataByDate}
          />
        )}

        {/* Selected date label (Hijri + Gregorian) */}
        <View style={styles.dateLabelBox}>
          <Text style={styles.hijriTxt}>{hijriFullString(selectedDate)}</Text>
          <Text style={styles.gregTxt}>{gregFullString(selectedDate)}</Text>
        </View>

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
              {selectedLanguage === 'ar' ? `إجمالي الصدقات اليوم: ${dailySummary.total_daily}` :
               selectedLanguage === 'en' ? `Total charities today: ${dailySummary.total_daily}` :
               `Total de caridades hoy: ${dailySummary.total_daily}`}
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
  scrollContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.darkText,
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
    color: Colors.darkText,
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
    color: Colors.darkText,
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
    color: Colors.darkText,
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
    color: Colors.darkText,
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
});
