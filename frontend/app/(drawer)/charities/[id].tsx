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
  getCurrentLocalDateString,
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
  // Removed unused modal state variables
  const [loading, setLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  
  // History editing and filtering states
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'prayer' | 'manual'>('all');

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
      const today = getCurrentLocalDateString(); // Use local date instead of UTC
      console.log('Creating charity entry:', { charityId, countNum, today, comments, localTime: new Date().toString() });
      
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
    return date.toLocaleDateString('ar', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      calendar: 'gregory', // Explicitly use Gregorian calendar
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
      return date.toLocaleTimeString('ar', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Use device timezone
        calendar: 'gregory', // Explicitly use Gregorian calendar
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'وقت غير صحيح';
    }
  };

  // Group history by date with filtering
  const groupHistoryByDate = () => {
    const filtered = history.filter(entry => {
      if (historyFilter === 'all') return true;
      if (historyFilter === 'prayer') return entry.source === 'prayer';
      if (historyFilter === 'manual') return !entry.source || entry.source === 'manual';
      return true;
    });

    const grouped: { [date: string]: CharityEntry[] } = {};
    filtered.forEach(entry => {
      const entryDate = entry.date || entry.timestamp.split('T')[0];
      if (!grouped[entryDate]) {
        grouped[entryDate] = [];
      }
      grouped[entryDate].push(entry);
    });
    return grouped;
  };

  // Handle clicking on prayer-linked records
  const handlePrayerRecordClick = (entry: CharityEntry) => {
    if (entry.source === 'prayer' && entry.prayer_id) {
      router.push(`/(drawer)/my-prayers/record?date=${entry.date}&rakka=${entry.rakka || 1}`);
    }
  };

  // Handle note editing
  const handleEditNote = (entryId: string, currentNote: string) => {
    setEditingNoteId(entryId);
    setEditNoteText(currentNote);
  };

  const handleSaveNote = async (entryId: string) => {
    try {
      // Update the note via API
      const response = await updateCharityEntry(entryId, undefined, editNoteText);
      if (response.success) {
        // Refresh history
        await loadCharityData();
        setEditingNoteId(null);
        setEditNoteText('');
        Alert.alert('تم الحفظ', 'تم تحديث الملاحظة بنجاح');
      }
    } catch (error) {
      console.error('Error updating note:', error);
      Alert.alert('خطأ', 'فشل في تحديث الملاحظة');
    }
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditNoteText('');
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
          <TouchableOpacity onPress={() => router.push('/(drawer)/my-charities')} style={styles.backIcon}>
            <Ionicons name="arrow-forward" size={24} color={Colors.light} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.charityNameAr}>{charity.nameAr}</Text>
            <Text style={styles.currentDate}>
              {formatDate(new Date().toISOString().split('T')[0])} - {formatTime(new Date().toISOString())}
            </Text>
          </View>
        </View>

        <ScrollView style={styles.content}>
          {/* Entry Form */}
          <View style={styles.formContainer}>
            {/* Removed "تسجيل صدقة جديدة" text */}
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>عدد الصدقات</Text>
              <TextInput
                style={styles.textInput}
                value={count}
                onChangeText={setCount}
                placeholder="عدد الصدقات"
                keyboardType="numeric"
                returnKeyType="next"
              />
            </View>

            {/* Notes Button */}
            <TouchableOpacity 
              style={styles.addNoteButton} 
              onPress={() => setShowComments(!showComments)}
            >
              <Text style={styles.addNoteButtonText}>أضف ملاحظة</Text>
              <Ionicons 
                name={showComments ? "chevron-up" : "chevron-down"} 
                size={16} 
                color={Colors.darkGray} 
              />
            </TouchableOpacity>

            {/* Expandable Comments Section */}
            {showComments && (
              <View style={styles.inputGroup}>
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
            )}

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
              <Text style={styles.statsTitle}>
                الإحصائيات – إجمالي المرات: {charityStats.total_count} – عدد الجلسات: {charityStats.total_sessions}
              </Text>
            </View>
          )}

          {/* History */}
          <View style={styles.historyContainer}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>سجل الصدقات</Text>
              
              {/* Filter Controls */}
              <View style={styles.historyFilters}>
                <TouchableOpacity 
                  style={[styles.filterButton, historyFilter === 'all' && styles.filterButtonActive]}
                  onPress={() => setHistoryFilter('all')}
                >
                  <Text style={[styles.filterButtonText, historyFilter === 'all' && styles.filterButtonTextActive]}>
                    الكل
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.filterButton, historyFilter === 'prayer' && styles.filterButtonActive]}
                  onPress={() => setHistoryFilter('prayer')}
                >
                  <Text style={[styles.filterButtonText, historyFilter === 'prayer' && styles.filterButtonTextActive]}>
                    من الصلاة
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.filterButton, historyFilter === 'manual' && styles.filterButtonActive]}
                  onPress={() => setHistoryFilter('manual')}
                >
                  <Text style={[styles.filterButtonText, historyFilter === 'manual' && styles.filterButtonTextActive]}>
                    يدوي
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            {Object.entries(groupHistoryByDate()).map(([date, entries], dateIndex) => (
              <View key={date} style={[
                styles.dateGroup,
                { backgroundColor: getDateBackgroundColor(dateIndex) }
              ]}>
                <Text style={styles.dateGroupHeader}>
                  {formatDate(date)}
                </Text>
                {entries.map((entry, entryIndex) => (
                  <TouchableOpacity 
                    key={entry.id} 
                    style={[
                      styles.historyEntry,
                      entry.source === 'prayer' && styles.historyEntryClickable
                    ]}
                    onPress={() => handlePrayerRecordClick(entry)}
                    disabled={entry.source !== 'prayer'}
                  >
                    <View style={styles.historyEntryContent}>
                      <View style={styles.historyEntryHeader}>
                        <View style={styles.historyEntryHeaderLeft}>
                          <Text style={styles.historyEntryCount}>عدد الصدقات: {entry.count}</Text>
                          {entry.source === 'prayer' && (
                            <View style={styles.prayerLinkIndicator}>
                              <Ionicons name="link" size={14} color={Colors.warmOrange} />
                              <Text style={styles.prayerLinkText}>من الصلاة</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.historyEntryTime}>{formatTime(entry.timestamp)}</Text>
                      </View>
                      
                      {/* Comments Section with Inline Editing */}
                      {entry.comments && (
                        <View style={styles.commentsSection}>
                          {editingNoteId === entry.id ? (
                            <View style={styles.inlineEditContainer}>
                              <TextInput
                                style={styles.inlineEditInput}
                                value={editNoteText}
                                onChangeText={setEditNoteText}
                                multiline
                                placeholder="تحرير الملاحظة..."
                                autoFocus
                              />
                              <View style={styles.inlineEditButtons}>
                                <TouchableOpacity 
                                  style={styles.inlineEditSave}
                                  onPress={() => handleSaveNote(entry.id)}
                                >
                                  <Text style={styles.inlineEditSaveText}>حفظ</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                  style={styles.inlineEditCancel}
                                  onPress={handleCancelEdit}
                                >
                                  <Text style={styles.inlineEditCancelText}>إلغاء</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ) : (
                            <TouchableOpacity 
                              onPress={() => handleEditNote(entry.id, entry.comments)}
                              style={styles.editableComment}
                            >
                              <Text style={styles.historyEntryComments}>{entry.comments}</Text>
                              <Ionicons name="create-outline" size={16} color={Colors.mediumGray} />
                            </TouchableOpacity>
                          )}
                        </View>
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
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Removed old edit modal - using inline editing instead */}
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
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    marginBottom: 8,
  },
  addNoteButtonText: {
    fontSize: 16,
    color: Colors.darkGray,
    fontWeight: '500',
  },
  // History Enhancement Styles
  historyHeader: {
    marginBottom: 16,
  },
  historyFilters: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.mediumGray,
  },
  filterButtonActive: {
    backgroundColor: Colors.warmOrange,
    borderColor: Colors.warmOrange,
  },
  filterButtonText: {
    fontSize: 12,
    color: Colors.darkGray,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: Colors.light,
  },
  historyEntryClickable: {
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 3,
    borderLeftColor: Colors.warmOrange,
  },
  historyEntryHeaderLeft: {
    flex: 1,
  },
  prayerLinkIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  prayerLinkText: {
    fontSize: 11,
    color: Colors.warmOrange,
    fontWeight: '600',
  },
  commentsSection: {
    marginTop: 8,
  },
  editableComment: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 8,
    backgroundColor: Colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  inlineEditContainer: {
    backgroundColor: Colors.background,
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.mediumGray,
  },
  inlineEditInput: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  inlineEditButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  inlineEditSave: {
    backgroundColor: Colors.warmOrange,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  inlineEditCancel: {
    backgroundColor: Colors.lightGray,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  inlineEditSaveText: {
    color: Colors.light,
    fontWeight: '600',
    fontSize: 14,
  },
  inlineEditCancelText: {
    color: Colors.darkGray,
    fontWeight: '500',
    fontSize: 14,
  },
});