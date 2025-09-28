import React, { useState, useEffect, useRef } from 'react';
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
  getAzkarList,
  getCurrentLocalDateString,
  ZikrEntry,
  ZikrStats,
  Zikr
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
  3: {
    id: 3,
    nameAr: 'سبحان الله وبحمده + استغفر الله وأتوب إليه',
    nameEn: 'Subhan Allah wa Bi Hamdih, Astaghfir Allah wa Atubu ilayh',
    color: '#45B7D1',
    description: 'الجمع بين التسبيح والاستغفار يجمع خير الدنيا والآخرة',
    benefits: 'يجمع بين فضل التسبيح وفضل الاستغفار معاً',
  },
  4: {
    id: 4,
    nameAr: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شئ قدير',
    nameEn: 'La ilaha illa Allah wahdahu la sharika lahu',
    color: '#96CEB4',
    description: 'من قالها في يوم مائة مرة كانت له عدل عشر رقاب، وكتبت له مائة حسنة',
    benefits: 'تعدل عشر رقاب وتكتب مائة حسنة وتمحو مائة سيئة',
  },
  5: {
    id: 5,
    nameAr: 'لا حول ولا قوة إلا بالله',
    nameEn: 'La hawla wala quwwata illa billah',
    color: '#FFEAA7',
    description: 'كنز من كنوز الجنة، وهي استعانة بالله وتفويض الأمر إليه',
    benefits: 'كنز من كنوز الجنة وتعين على الصبر والاحتساب',
  },
  6: {
    id: 6,
    nameAr: 'سبحان الله',
    nameEn: 'Subhan Allah',
    color: '#DDA0DD',
    description: 'تسبيح الله وتنزيهه عن كل نقص وعيب',
    benefits: 'تنزه الله تعالى وتقدسه وتثقل في الميزان',
  },
  7: {
    id: 7,
    nameAr: 'سبحان الله وبحمده سبحان الله العظيم',
    nameEn: 'Subhan Allah wa Bi Hamdih + Subhan Allah al-Azeem',
    color: '#98D8C8',
    description: 'كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن',
    benefits: 'محبوبتان عند الله وثقيلتان في الميزان',
  },
  8: {
    id: 8,
    nameAr: 'سبحان الله والحمد لله ولا إله إلا الله والله أكبر',
    nameEn: 'Subhan Allah wa al-Hamdulillah wa la ilaha illa Allah, wa Allahu Akbar',
    color: '#F7DC6F',
    description: 'الباقيات الصالحات، أحب الكلام إلى الله وخير ما تكلم به الناس',
    benefits: 'أحب الكلام إلى الله وأفضل الذكر',
  },
  9: {
    id: 9,
    nameAr: 'لا إله إلا أنت سبحانك إني كنت من الظالمين',
    nameEn: 'La ilaha illa anta subhanak inni kuntu min al-zalimeen',
    color: '#BB8FCE',
    description: 'دعوة ذي النون، ما دعا بها مكروب إلا فرج الله كربه',
    benefits: 'تفرج الكروب وتزيل الهموم بإذن الله',
  },
  10: {
    id: 10,
    nameAr: 'الصلاة على النبي',
    nameEn: 'Salat Ala al-Nabi',
    color: '#85C1E9',
    description: 'من صلى علي واحدة صلى الله عليه بها عشراً',
    benefits: 'يصلي الله على من صلى على النبي عشر مرات',
  },
  11: {
    id: 11,
    nameAr: 'استغفر الله وأتوب إليه',
    nameEn: 'Astaghfir Allah wa Atubu ilayh',
    color: '#F8C471',
    description: 'الاستغفار يمحو الذنوب ويجلب الرزق والفرج',
    benefits: 'يمحو الذنوب ويجلب البركة والرزق',
  },
  12: {
    id: 12,
    nameAr: 'آيات قرأتها',
    nameEn: 'Verses I read of the Quran',
    color: '#82E0AA',
    description: 'قراءة القرآن الكريم، بكل حرف حسنة والحسنة بعشر أمثالها',
    benefits: 'بكل حرف حسنة والحسنة بعشر أمثالها',
  },
  13: {
    id: 13,
    nameAr: 'الدعوة – تعليم',
    nameEn: 'Da\'wah - Teaching Islam',
    color: '#FF9F43',
    description: 'تسجيل عدد الأشخاص الذين علمتهم الإسلام أو القرآن أو الأحاديث النبوية',
    benefits: 'الدال على الخير كفاعله، ومن دعا إلى هدى كان له من الأجر مثل أجور من تبعه',
  },
};

export default function ZikrDetailsScreen() {
  const { id, date } = useLocalSearchParams();
  const selectedDate = date as string || getCurrentLocalDateString(); // Use passed date or current date as fallback
  const [count, setCount] = useState('');
  const [comments, setComments] = useState('');
  const [showNotesBox, setShowNotesBox] = useState(false); // Hide notes box by default
  const [zikrDetails, setZikrDetails] = useState(null);
  const [history, setHistory] = useState<ZikrEntry[]>([]);
  const [stats, setStats] = useState<ZikrStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editCount, setEditCount] = useState<string>('');
  const [azkarFromAPI, setAzkarFromAPI] = useState<Zikr[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadAzkarFromAPI();
    loadZikrDetails();
    loadZikrHistory();
    loadZikrStats();
  }, [id]);

  const loadAzkarFromAPI = async () => {
    try {
      const response = await getAzkarList();
      setAzkarFromAPI(response.azkar || []);
    } catch (error) {
      console.error('Error loading azkar from API:', error);
      setAzkarFromAPI([]);
    }
  };

  const loadZikrDetails = async () => {
    const zikrId = parseInt(id as string);
    // Try to get from API first
    let apiZikr = null;
    if (azkarFromAPI.length > 0) {
      apiZikr = azkarFromAPI.find(z => z.id === zikrId);
    } else {
      try {
        const response = await getAzkarList();
        apiZikr = response.azkar?.find(z => z.id === zikrId);
      } catch (error) {
        console.error('Error loading azkar from API:', error);
      }
    }
    
    // Get local details
    const localDetails = AZKAR_DETAILS[zikrId];
    
    // Merge API data with local details, prioritizing API for names and colors
    const details = {
      id: zikrId,
      nameAr: apiZikr?.nameAr || localDetails?.nameAr || 'ذكر غير محدد',
      nameEn: apiZikr?.nameEn || localDetails?.nameEn || 'Unknown Zikr',
      color: apiZikr?.color || localDetails?.color || '#666666',
      description: localDetails?.description || 'لا توجد تفاصيل متاحة حالياً',
      benefits: localDetails?.benefits || 'سيتم إضافة الفوائد لاحقاً',
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
      
      console.log('Creating zikr entry:', { zikrId, countValue, selectedDate, localTime: new Date(selectedDate).toString() });
      
      await createZikrEntry(zikrId, countValue, selectedDate, comments.trim() || undefined);
      
      // Refresh data
      await loadZikrHistory();
      await loadZikrStats();
      
      setCount('');
      setComments('');
      
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

  const formatDate = (selectedDateing) => {
    const date = new Date(selectedDateing);
    return date.toLocaleDateString('ar', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
                  timeZone: 'Asia/Riyadh',
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
      // Create edit note with timestamp
      const originalCount = entry.count;
      const now = new Date();
      const timestamp = now.toISOString().split('T')[0] + 'T' + now.toTimeString().split(' ')[0];
      const editNote = `${timestamp}: تعديل: تم تغيير العدد من ${originalCount} إلى ${newCount}`;
      
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

  const formatTime = (selectedDateing) => {
    try {
      // Ensure the date string has timezone info, assume UTC if missing
      let timeString = selectedDateing;
      if (timeString && !timeString.includes('Z') && !timeString.includes('+') && !timeString.includes('-', 10)) {
        timeString = timeString + 'Z'; // Treat as UTC if no timezone info
      }
      
      const date = new Date(timeString);
      return date.toLocaleTimeString('ar', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone // Use device timezone
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'وقت غير صحيح';
    }
  };

  const getDayName = (selectedDateing) => {
    const date = new Date(selectedDateing);
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
              <TouchableOpacity onPress={() => router.push('/(drawer)/my-azkar')} style={styles.backButton}>
                <Ionicons name="arrow-forward" size={24} color={Colors.light} />
              </TouchableOpacity>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>{zikrDetails.nameAr}</Text>
                <Text style={styles.headerDate}>
                  {new Date(selectedDate).toLocaleDateString('ar', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    timeZone: 'Asia/Riyadh' 
                  })}
                </Text>
              </View>
            </View>
          </View>

          {/* Removed Zikr Info Container - moved date to header */}

          {/* Count Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              {zikrDetails.id === 13 ? 'كم شخصاً علمته بنفسك؟' : 'أدخل عدد مرات الذكر:'}
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.countInput}
                value={count}
                onChangeText={setCount}
                keyboardType="numeric"
                placeholder={zikrDetails.id === 13 ? "مثال: 5" : "مثال: 100"}
                placeholderTextColor={Colors.mediumGray}
              />
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>إضافة</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Notes Button and Field */}
          <View style={styles.inputContainer}>
            <TouchableOpacity 
              style={styles.notesButton}
              onPress={() => setShowNotesBox(!showNotesBox)}
            >
              <Text style={styles.notesButtonText}>أضف ملاحظة</Text>
              <Ionicons 
                name={showNotesBox ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={Colors.warmOrange} 
              />
            </TouchableOpacity>
            
            {showNotesBox && (
              <>
                <Text style={styles.inputLabel}>
                  {zikrDetails.id === 13 ? 'ملاحظات (ماذا علمته، السياق، المكان، إلخ):' : 'ملاحظات:'}
                </Text>
                <TextInput
                  style={styles.commentInput}
                  value={comments}
                  onChangeText={setComments}
                  placeholder={zikrDetails.id === 13 ? "مثال: علمت القرآن للأطفال في المسجد..." : "اكتب ملاحظاتك هنا..."}
                  placeholderTextColor={Colors.mediumGray}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </>
            )}
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
                          {formatTime(entry.timestamp)}
                        </Text>
                        {/* Show edit notes if available */}
                        {entry.edit_notes && entry.edit_notes.length > 0 && (
                          <View style={styles.editNotesContainer}>
                            <Ionicons name="create-outline" size={12} color={Colors.mediumGray} />
                            <View style={styles.editNotesContent}>
                              {entry.edit_notes.map((note, noteIndex) => (
                                <Text key={noteIndex} style={styles.editNotesText}>
                                  {note}
                                </Text>
                              ))}
                            </View>
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
  headerTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light,
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 14,
    color: Colors.light,
    opacity: 0.9,
  },
  // Removed unused styles: zikrInfoContainer, colorIndicator, zikrNameAr, zikrNameEn, dateTimeContainer, dateTimeText, timeText
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
  commentInput: {
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: Colors.background,
    minHeight: 100,
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
  notesButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    marginBottom: 8,
  },
  notesButtonText: {
    fontSize: 16,
    color: Colors.darkGray,
    fontWeight: '600',
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
  dayGroup: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  dayHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkGray,
  },
  dayEntriesCount: {
    fontSize: 12,
    color: Colors.mediumGray,
    fontWeight: '600',
  },
  editNotesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  editNotesContent: {
    flex: 1,
  },
  editNotesText: {
    fontSize: 11,
    color: Colors.mediumGray,
    fontStyle: 'italic',
    lineHeight: 14,
    marginBottom: 2,
  },
});