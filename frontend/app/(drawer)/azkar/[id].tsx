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
  updateZikrEntry,
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
  const [history, setHistory] = useState<ZikrEntry[]>([]);
  const [stats, setStats] = useState<ZikrStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editCount, setEditCount] = useState<string>('');

  useEffect(() => {
    loadZikrDetails();
    loadZikrHistory();
    loadZikrStats();
  }, [id]);

  const loadZikrDetails = () => {
    const zikrId = parseInt(id as string);
    const details = AZKAR_DETAILS[zikrId] || {
      id: zikrId,
      nameAr: 'ذكر غير محدد',
      nameEn: 'Unknown Zikr',
      color: '#666666',
      description: 'لا توجد تفاصيل متاحة حالياً',
      benefits: 'سيتم إضافة الفوائد لاحقاً',
    };
    setZikrDetails(details);
  };

  const loadZikrHistory = async () => {
    try {
      const zikrId = parseInt(id as string);
      const response = await getZikrHistory(zikrId, 30);
      setHistory(response.entries);
    } catch (error) {
      console.error('Error loading zikr history:', error);
      setHistory([]);
    }
  };

  const loadZikrStats = async () => {
    try {
      const zikrId = parseInt(id as string);
      const statsData = await getZikrStats(zikrId);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading zikr stats:', error);
      setStats({
        zikr_id: parseInt(id as string),
        total_count: 0,
        total_sessions: 0,
        last_entry: undefined
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const countValue = parseInt(count);
    if (!countValue || countValue <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال عدد صحيح');
      return;
    }

    try {
      const zikrId = parseInt(id as string);
      const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      await createZikrEntry(zikrId, countValue, dateStr);
      
      // Refresh data
      await loadZikrHistory();
      await loadZikrStats();
      
      setCount('');
      
      Alert.alert(
        'تم الحفظ',
        `تم إضافة ${countValue} من الذكر بنجاح`,
        [{ text: 'موافق' }]
      );
    } catch (error) {
      console.error('Error creating zikr entry:', error);
      Alert.alert('خطأ', 'فشل في حفظ الذكر. يرجى المحاولة مرة أخرى.');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleEditEntry = (entryId: string, currentCount: number) => {
    setEditingEntry(entryId);
    setEditCount(currentCount.toString());
  };

  const handleSaveEdit = async (entry: ZikrEntry) => {
    const newCount = parseInt(editCount);
    if (!newCount || newCount <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال عدد صحيح');
      return;
    }

    try {
      // Create edit note
      const originalCount = entry.count;
      const editNote = `تعديل: تم تغيير العدد من ${originalCount} إلى ${newCount}`;
      
      // Call backend API to update entry
      const response = await updateZikrEntry(entry.id, newCount, editNote);
      
      if (response.success) {
        // Update local state with the updated entry
        const updatedHistory = history.map(h => 
          h.id === entry.id ? response.entry : h
        );
        setHistory(updatedHistory);
        
        // Refresh stats
        await loadZikrStats();
        
        setEditingEntry(null);
        setEditCount('');
        
        Alert.alert(
          'تم الحفظ',
          'تم تحديث الإدخال بنجاح وحفظ ملاحظة التعديل',
          [{ text: 'موافق' }]
        );
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      Alert.alert('خطأ', 'فشل في تحديث الإدخال. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setEditCount('');
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ar', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getDayName = (dateString) => {
    const date = new Date(dateString);
    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return dayNames[date.getDay()];
  };

  const getDayColor = (dayIndex) => {
    const colors = [
      '#E8F5E8', // Sunday - Light Green
      '#E8F0FF', // Monday - Light Blue
      '#F0E8FF', // Tuesday - Light Purple
      '#FFF0E8', // Wednesday - Light Orange
      '#E8FFE8', // Thursday - Very Light Green
      '#F0F8FF', // Friday - Alice Blue
      '#FFF8E8', // Saturday - Light Yellow
    ];
    return colors[dayIndex % 7];
  };

  const groupHistoryByDay = () => {
    const grouped = {};
    
    history.forEach(entry => {
      const date = new Date(entry.created_at || entry.date);
      const dateKey = date.toDateString();
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: date,
          dayName: getDayName(entry.created_at || entry.date),
          dayIndex: date.getDay(),
          entries: []
        };
      }
      
      grouped[dateKey].entries.push(entry);
    });

    return Object.values(grouped).sort((a, b) => b.date - a.date);
  };

  if (!zikrDetails || loading) {
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
            
            {/* Current Date and Time Display */}
            <View style={styles.dateTimeContainer}>
              <Text style={styles.dateTimeText}>
                {new Date().toLocaleDateString('ar', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
              <Text style={styles.timeText}>
                {new Date().toLocaleTimeString('ar', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </Text>
            </View>
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
                <Text style={styles.statNumber}>{stats?.total_count?.toLocaleString() || '0'}</Text>
                <Text style={styles.statLabel}>إجمالي الأذكار</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats?.total_sessions?.toLocaleString() || '0'}</Text>
                <Text style={styles.statLabel}>عدد الجلسات</Text>
              </View>
            </View>
          </View>

          {/* History */}
          <View style={styles.historyContainer}>
            <Text style={styles.sectionTitle}>سجل الأذكار:</Text>
            {history.length > 0 ? (
              groupHistoryByDay().map((dayGroup, dayIndex) => (
                <View key={dayIndex} style={styles.dayGroup}>
                  {/* Day Header */}
                  <View style={[
                    styles.dayHeader, 
                    { backgroundColor: getDayColor(dayGroup.dayIndex) }
                  ]}>
                    <Text style={styles.dayHeaderText}>
                      {dayGroup.dayName} - {formatDate(dayGroup.date)}
                    </Text>
                    <Text style={styles.dayEntriesCount}>
                      {dayGroup.entries.length} إدخال
                    </Text>
                  </View>

                  {/* Entries for this day */}
                  {dayGroup.entries.map((entry, entryIndex) => (
                    <View 
                      key={entry.id} 
                      style={[
                        styles.historyItem,
                        { backgroundColor: getDayColor(dayGroup.dayIndex) }
                      ]}
                    >
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyTime}>
                          {formatTime(entry.created_at || entry.date)}
                        </Text>
                        {/* Show edit notes if available */}
                        {entry.edit_notes && entry.edit_notes.length > 0 && (
                          <View style={styles.editNotesContainer}>
                            <Ionicons name="create-outline" size={12} color={Colors.mediumGray} />
                            <Text style={styles.editNotesText}>تم التعديل</Text>
                          </View>
                        )}
                      </View>
                      
                      {/* Editable Count Section */}
                      <View style={styles.historyCountSection}>
                        {editingEntry === entry.id ? (
                          <View style={styles.editCountContainer}>
                            <TextInput
                              style={styles.editCountInput}
                              value={editCount}
                              onChangeText={setEditCount}
                              keyboardType="numeric"
                              autoFocus={true}
                            />
                            <TouchableOpacity 
                              style={styles.editActionButton}
                              onPress={() => handleSaveEdit(entry)}
                            >
                              <Ionicons name="checkmark" size={16} color={Colors.success} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={styles.editActionButton}
                              onPress={handleCancelEdit}
                            >
                              <Ionicons name="close" size={16} color={Colors.accent} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.historyCountContainer}>
                            <Text style={styles.historyCount}>{entry.count.toLocaleString()}</Text>
                            <TouchableOpacity 
                              style={styles.editButton}
                              onPress={() => handleEditEntry(entry.id, entry.count)}
                            >
                              <Ionicons name="create-outline" size={16} color={Colors.deepGreen} />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
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
  dateTimeContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    alignItems: 'center',
  },
  dateTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkGray,
    textAlign: 'center',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 12,
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
  historyCountSection: {
    alignItems: 'flex-end',
  },
  historyCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: Colors.lightGray,
  },
  editCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editCountInput: {
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 14,
    minWidth: 60,
    textAlign: 'center',
    backgroundColor: Colors.background,
  },
  editActionButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: Colors.lightGray,
  },
});