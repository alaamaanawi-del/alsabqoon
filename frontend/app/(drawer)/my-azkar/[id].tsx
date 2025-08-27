import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../src/theme/colors';
import { router, useLocalSearchParams } from 'expo-router';
import { 
  createZikrEntry,
  getZikrHistory,
  getZikrStats,
  ZikrEntry,
  ZikrStats
} from '../../../src/api/client';

const AZKAR_DETAILS = {
  1: {
    id: 1,
    nameAr: 'سبحان الله وبحمده',
    nameEn: 'Subhan Allah wa Bi Hamdih',
    color: '#FF6B6B',
    description: 'من قال سبحان الله وبحمده في يوم مائة مرة حطت خطاياه وإن كانت مثل زبد البحر',
    benefits: 'تحط الخطايا وتكفر السيئات وتزيد في الحسنات',
  },
  2: {
    id: 2,
    nameAr: 'سبحان الله العظيم وبحمده',
    nameEn: 'Subhan Allah al-Azeem wa Bi Hamdih',
    color: '#4ECDC4',
    description: 'كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن',
    benefits: 'ثقيلتان في الميزان يوم القيامة ومحبوبتان عند الله',
  },
  // Add more details for other azkar...
};

export default function ZikrDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [count, setCount] = useState('');
  const [zikrDetails, setZikrDetails] = useState(null);
  const [history, setHistory] = useState([]);
  const [totalAllTime, setTotalAllTime] = useState(0);

  useEffect(() => {
    loadZikrDetails();
    loadZikrHistory();
  }, [id]);

  const loadZikrDetails = () => {
    const details = AZKAR_DETAILS[id] || {
      id: parseInt(id),
      nameAr: 'ذكر غير محدد',
      nameEn: 'Unknown Zikr',
      color: '#666666',
      description: 'لا توجد تفاصيل متاحة حالياً',
      benefits: 'سيتم إضافة الفوائد لاحقاً',
    };
    setZikrDetails(details);
  };

  const loadZikrHistory = () => {
    // Mock history data - replace with actual data loading
    const mockHistory = [
      { date: new Date().toISOString(), count: 100, time: '14:30' },
      { date: new Date(Date.now() - 86400000).toISOString(), count: 250, time: '09:15' },
      { date: new Date(Date.now() - 172800000).toISOString(), count: 180, time: '16:45' },
    ];
    setHistory(mockHistory);
    
    const total = mockHistory.reduce((sum, entry) => sum + entry.count, 0);
    setTotalAllTime(total);
  };

  const handleSubmit = () => {
    const countValue = parseInt(count);
    if (!countValue || countValue <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال عدد صحيح');
      return;
    }

    // Add new entry to history
    const newEntry = {
      date: new Date().toISOString(),
      count: countValue,
      time: new Date().toLocaleTimeString('ar', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
    };

    setHistory(prev => [newEntry, ...prev]);
    setTotalAllTime(prev => prev + countValue);
    setCount('');

    Alert.alert(
      'تم الحفظ',
      `تم إضافة ${countValue} من الذكر بنجاح`,
      [{ text: 'موافق' }]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!zikrDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: zikrDetails.color }]}>
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-forward" size={24} color={Colors.light} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>تفاصيل الذكر</Text>
            </View>
          </View>

          {/* Zikr Info */}
          <View style={styles.zikrInfoContainer}>
            <View style={[styles.colorIndicator, { backgroundColor: zikrDetails.color }]} />
            <Text style={styles.zikrNameAr}>{zikrDetails.nameAr}</Text>
            <Text style={styles.zikrNameEn}>{zikrDetails.nameEn}</Text>
          </View>

          {/* Count Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>أدخل عدد مرات الذكر:</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.countInput}
                value={count}
                onChangeText={setCount}
                keyboardType="numeric"
                placeholder="مثال: 100"
                placeholderTextColor={Colors.mediumGray}
              />
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>إضافة</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>وصف الذكر:</Text>
            <Text style={styles.descriptionText}>{zikrDetails.description}</Text>
            
            <Text style={styles.sectionTitle}>الفوائد:</Text>
            <Text style={styles.benefitsText}>{zikrDetails.benefits}</Text>
          </View>

          {/* Total Stats */}
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>الإحصائيات:</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{totalAllTime.toLocaleString()}</Text>
                <Text style={styles.statLabel}>إجمالي الأذكار</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{history.length}</Text>
                <Text style={styles.statLabel}>عدد الجلسات</Text>
              </View>
            </View>
          </View>

          {/* History */}
          <View style={styles.historyContainer}>
            <Text style={styles.sectionTitle}>سجل الأذكار:</Text>
            {history.length > 0 ? (
              history.map((entry, index) => (
                <View key={index} style={styles.historyItem}>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyDate}>{formatDate(entry.date)}</Text>
                    <Text style={styles.historyTime}>{entry.time}</Text>
                  </View>
                  <Text style={styles.historyCount}>{entry.count.toLocaleString()}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noHistoryText}>لا يوجد سجل أذكار بعد</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.mediumGray,
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 44 : 25,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light,
    marginRight: 16,
  },
  zikrInfoContainer: {
    backgroundColor: Colors.light,
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  colorIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginBottom: 12,
  },
  zikrNameAr: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.darkGray,
    textAlign: 'center',
    marginBottom: 8,
  },
  zikrNameEn: {
    fontSize: 16,
    color: Colors.mediumGray,
    textAlign: 'center',
  },
  inputContainer: {
    backgroundColor: Colors.light,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkGray,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  countInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: Colors.background,
  },
  submitButton: {
    backgroundColor: Colors.deepGreen,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  submitButtonText: {
    color: Colors.light,
    fontSize: 16,
    fontWeight: 'bold',
  },
  descriptionContainer: {
    backgroundColor: Colors.light,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkGray,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.darkGray,
    lineHeight: 22,
    marginBottom: 16,
  },
  benefitsText: {
    fontSize: 14,
    color: Colors.mediumGray,
    lineHeight: 22,
  },
  statsContainer: {
    backgroundColor: Colors.light,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.deepGreen,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.mediumGray,
  },
  historyContainer: {
    backgroundColor: Colors.light,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  historyInfo: {
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkGray,
    marginBottom: 2,
  },
  historyTime: {
    fontSize: 12,
    color: Colors.mediumGray,
  },
  historyCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.deepGreen,
  },
  noHistoryText: {
    fontSize: 14,
    color: Colors.mediumGray,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});