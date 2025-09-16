import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../src/theme/colors';
import { router, useLocalSearchParams } from 'expo-router';
import {
  getCharityList,
  getCharityHistory,
  getCharityStats,
  createCharityEntry,
  updateCharityEntry,
  Charity,
  CharityEntry,
  CharityStats,
} from '../../../src/api/client';

export default function CharityDetailScreen() {
  const { id } = useLocalSearchParams();
  const charityId = parseInt(id as string);
  
  const [charity, setCharity] = useState<Charity | null>(null);
  const [charityStats, setCharityStats] = useState<CharityStats | null>(null);
  const [history, setHistory] = useState<CharityEntry[]>([]);
  const [count, setCount] = useState('');
  const [comments, setComments] = useState('');
  const [editingEntry, setEditingEntry] = useState<CharityEntry | null>(null);
  const [editCount, setEditCount] = useState('');
  const [editComments, setEditComments] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCharityData();
  }, [charityId]);

  const loadCharityData = async () => {
    try {
      // Load charity info
      const charitiesResult = await getCharityList();
      const charityInfo = charitiesResult.charities.find(c => c.id === charityId);
      setCharity(charityInfo || null);

      // Load statistics
      const statsResult = await getCharityStats(charityId);
      setCharityStats(statsResult);

      // Load history
      const historyResult = await getCharityHistory(charityId);
      setHistory(historyResult.entries);
    } catch (error) {
      console.error('Error loading charity data:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل البيانات');
    }
  };

  const handleSubmit = async () => {
    if (!count.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال عدد الصدقات');
      return;
    }

    const countNum = parseInt(count);
    if (isNaN(countNum) || countNum <= 0) {
      Alert.alert('تنبيه', 'يرجى إدخال عدد صحيح');
      return;
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await createCharityEntry(charityId, countNum, today, comments);
      
      Alert.alert('نجح', 'تم تسجيل الصدقة بنجاح');
      setCount('');
      setComments('');
      
      // Reload data
      await loadCharityData();
    } catch (error) {
      console.error('Error creating charity entry:', error);
      Alert.alert('خطأ', 'حدث خطأ في تسجيل الصدقة');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry: CharityEntry) => {
    setEditingEntry(entry);
    setEditCount(entry.count.toString());
    setEditComments(entry.comments || '');
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;

    if (!editCount.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال عدد الصدقات');
      return;
    }

    const countNum = parseInt(editCount);
    if (isNaN(countNum) || countNum <= 0) {
      Alert.alert('تنبيه', 'يرجى إدخال عدد صحيح');
      return;
    }

    setLoading(true);
    try {
      const editNote = `تعديل: تم تغيير العدد من ${editingEntry.count} إلى ${countNum}`;
      await updateCharityEntry(editingEntry.id, countNum, editComments, editNote);
      
      Alert.alert('نجح', 'تم تحديث الصدقة بنجاح');
      setEditingEntry(null);
      setEditCount('');
      setEditComments('');
      
      // Reload data
      await loadCharityData();
    } catch (error) {
      console.error('Error updating charity entry:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحديث الصدقة');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timestamp: string) => {
    try {
      // Ensure the timestamp has timezone info, assume UTC if missing
      let timeString = timestamp;
      if (timeString && !timeString.includes('Z') && !timeString.includes('+') && !timeString.includes('-', 10)) {
        timeString = timeString + 'Z'; // Treat as UTC if no timezone info
      }
      
      const date = new Date(timeString);
      return date.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone // Use device timezone
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'وقت غير صحيح';
    }
  };

  // Group history by date
  const groupHistoryByDate = () => {
    const grouped: { [date: string]: CharityEntry[] } = {};
    history.forEach(entry => {
      if (!grouped[entry.date]) {
        grouped[entry.date] = [];
      }
      grouped[entry.date].push(entry);
    });
    return grouped;
  };

  const getDateBackgroundColor = (index: number) => {
    const colors = [
      '#E3F2FD', // Light Blue
      '#F3E5F5', // Light Purple
      '#E8F5E8', // Light Green
      '#FFF3E0', // Light Orange
      '#FCE4EC', // Light Pink
      '#F1F8E9', // Light Lime
      '#E0F2F1', // Light Teal
    ];
    return colors[index % colors.length];
  };

  if (!charity) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>لم يتم العثور على الصدقة</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>العودة</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
            <Ionicons name="arrow-forward" size={24} color={Colors.light} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.charityNameAr}>{charity.nameAr}</Text>
            <Text style={styles.charityNameEn}>{charity.nameEn}</Text>
            <Text style={styles.currentDate}>
              {formatDate(new Date().toISOString().split('T')[0])} - {formatTime(new Date().toISOString())}
            </Text>
          </View>
        </View>

        <ScrollView style={styles.content}>
          {/* Entry Form */}
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>تسجيل صدقة جديدة</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>عدد المرات</Text>
              <TextInput
                style={styles.textInput}
                value={count}
                onChangeText={setCount}
                placeholder="أدخل عدد المرات"
                keyboardType="numeric"
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>تعليقات/ملاحظات</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={comments}
                onChangeText={setComments}
                placeholder="اكتب ملاحظاتك هنا (اختياري)"
                multiline
                numberOfLines={3}
                returnKeyType="done"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'جاري التسجيل...' : 'تسجيل الصدقة'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Admin Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>وصف الصدقة</Text>
            <Text style={styles.descriptionText}>{charity.description}</Text>
          </View>

          {/* Statistics */}
          {charityStats && (
            <View style={styles.statsContainer}>
              <Text style={styles.statsTitle}>الإحصائيات</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{charityStats.total_count}</Text>
                  <Text style={styles.statLabel}>إجمالي المرات</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{charityStats.total_sessions}</Text>
                  <Text style={styles.statLabel}>عدد الجلسات</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {charityStats.last_entry ? 
                      formatDate(new Date(charityStats.last_entry).toISOString().split('T')[0]) : 
                      'لا يوجد'
                    }
                  </Text>
                  <Text style={styles.statLabel}>آخر تسجيل</Text>
                </View>
              </View>
            </View>
          )}

          {/* History */}
          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>السجل التاريخي</Text>
            {Object.entries(groupHistoryByDate()).map(([date, entries], dateIndex) => (
              <View key={date} style={[
                styles.dateGroup,
                { backgroundColor: getDateBackgroundColor(dateIndex) }
              ]}>
                <Text style={styles.dateGroupHeader}>
                  {formatDate(date)} - {new Date(date).toLocaleDateString('ar-SA', { weekday: 'long' })}
                </Text>
                {entries.map((entry, entryIndex) => (
                  <View key={entry.id} style={styles.historyEntry}>
                    <View style={styles.historyEntryContent}>
                      <View style={styles.historyEntryHeader}>
                        <Text style={styles.historyEntryCount}>عدد المرات: {entry.count}</Text>
                        <Text style={styles.historyEntryTime}>{formatTime(entry.timestamp)}</Text>
                      </View>
                      {entry.comments && (
                        <Text style={styles.historyEntryComments}>{entry.comments}</Text>
                      )}
                      {entry.edit_notes && entry.edit_notes.length > 0 && (
                        <View style={styles.editNotesContainer}>
                          <Text style={styles.editNotesTitle}>سجل التعديلات:</Text>
                          {entry.edit_notes.map((note, noteIndex) => (
                            <Text key={noteIndex} style={styles.editNote}>{note}</Text>
                          ))}
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEdit(entry)}
                    >
                      <Ionicons name="create-outline" size={20} color={Colors.deepGreen} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Edit Modal */}
        {editingEntry && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>تعديل الصدقة</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>عدد المرات</Text>
                <TextInput
                  style={styles.textInput}
                  value={editCount}
                  onChangeText={setEditCount}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>تعليقات</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={editComments}
                  onChangeText={setEditComments}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButtonCancel}
                  onPress={() => setEditingEntry(null)}
                >
                  <Text style={styles.modalButtonTextCancel}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButtonSave, loading && styles.submitButtonDisabled]}
                  onPress={handleSaveEdit}
                  disabled={loading}
                >
                  <Text style={styles.modalButtonTextSave}>
                    {loading ? 'جاري الحفظ...' : 'حفظ'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: Colors.darkText,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: Colors.deepGreen,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: Colors.light,
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: Colors.deepGreen,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backIcon: {
    marginLeft: 16,
  },
  headerContent: {
    flex: 1,
  },
  charityNameAr: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light,
    marginBottom: 4,
  },
  charityNameEn: {
    fontSize: 16,
    color: Colors.light,
    opacity: 0.9,
    marginBottom: 4,
  },
  currentDate: {
    fontSize: 14,
    color: Colors.light,
    opacity: 0.8,
  },
  content: {
    flex: 1,
  },
  formContainer: {
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
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 16,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: Colors.background,
    textAlign: 'right',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: Colors.deepGreen,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.darkGray,
  },
  submitButtonText: {
    color: Colors.light,
    fontSize: 16,
    fontWeight: 'bold',
  },
  descriptionContainer: {
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
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: Colors.darkGray,
    lineHeight: 24,
  },
  statsContainer: {
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
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 16,
    textAlign: 'center',
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
    fontSize: 14,
    color: Colors.darkGray,
  },
  historyContainer: {
    margin: 16,
    marginBottom: 32,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 16,
    textAlign: 'center',
  },
  dateGroup: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  dateGroupHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkText,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  historyEntry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  historyEntryContent: {
    flex: 1,
  },
  historyEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyEntryCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  historyEntryTime: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  historyEntryComments: {
    fontSize: 14,
    color: Colors.darkGray,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  editNotesContainer: {
    backgroundColor: Colors.background,
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  editNotesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.darkGray,
    marginBottom: 4,
  },
  editNote: {
    fontSize: 12,
    color: Colors.darkGray,
    marginBottom: 2,
  },
  editButton: {
    padding: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: Colors.light,
    margin: 20,
    padding: 20,
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  modalButtonSave: {
    flex: 1,
    backgroundColor: Colors.deepGreen,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  modalButtonTextCancel: {
    color: Colors.darkText,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButtonTextSave: {
    color: Colors.light,
    fontSize: 16,
    fontWeight: 'bold',
  },
});