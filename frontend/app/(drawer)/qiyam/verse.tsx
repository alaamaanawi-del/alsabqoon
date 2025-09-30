import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, Switch, ScrollView, Alert } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Colors } from "../../../src/theme/colors";
import { searchQuran } from "../../../src/db/quran.index";
import { showToast } from "../../../src/utils/toast";
import { 
  createQiyamEntry, 
  updateQiyamEntry, 
  getQiyamHistory, 
  getSurahsWithVerseCounts, 
  QiyamEntry,
  SurahWithVerseCount
} from "../../../src/api/client";
import SurahSelector from "../../../src/components/SurahSelector";
import SuraViewer from "../../../src/components/SuraViewer";
import SearchResultsModal from "../../../src/components/SearchResultsModal";
import SelectedVersesDisplay from "../../../src/components/SelectedVersesDisplay";
import HighlightedText from "../../../src/components/HighlightedText";
import TaskProgressBar from "../../../src/components/TaskProgressBar";

// Types for search rows
interface DBItem {
  surahNumber: number;
  nameAr: string;
  nameEn: string;
  ayah: number;
  textAr: string;
  en?: string | null;
  es?: string | null;
  tafseer?: string | null;
}
interface SearchItem extends DBItem {}

type QiyamQuestionKey = 'understood' | 'made_dua' | 'practiced' | 'taught';

function ymdFromParam(dateParam?: string): string {
  if (!dateParam) return new Date().toISOString().split('T')[0];
  return dateParam;
}

// Tab Button Component - same as prayers
function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tab, active && styles.activeTab]}
      activeOpacity={0.8}
    >
      <Text style={[styles.tabText, active && styles.activeTabText]}>{label}</Text>
    </TouchableOpacity>
  );
}

// Question Row Component - same as prayers but adapted for Qiyam questions
function QuestionRow({ 
  label, 
  value, 
  onToggle, 
  taskOn, 
  onTask, 
  isHighlighted = false 
}: { 
  label: string; 
  value: boolean; 
  onToggle: () => void; 
  taskOn: boolean; 
  onTask: () => void; 
  isHighlighted?: boolean;
}) {
  return (
    <View style={[styles.questionRow, isHighlighted && styles.highlightedRow]}>
      <TouchableOpacity
        onPress={onTask}
        style={[styles.taskButton, taskOn && styles.taskButtonActive]}
        activeOpacity={0.8}
      >
        <Text style={[styles.taskButtonText, taskOn && styles.taskButtonActiveText]}>مهام</Text>
      </TouchableOpacity>
      
      <View style={styles.questionContent}>
        <Text style={styles.questionLabel}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#767577', true: Colors.warmOrange }}
          thumbColor={value ? Colors.light : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
        />
      </View>
    </View>
  );
}

export default function QiyamVerseScreen() {
  const { date, verse } = useLocalSearchParams<{ date: string; verse: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const verseNumber = parseInt(verse || '1');
  const currentDate = date || new Date().toISOString().split('T')[0];

  // State management - similar to prayer record but adapted for Qiyam
  const [loading, setLoading] = useState(true);
  const [existingEntry, setExistingEntry] = useState<QiyamEntry | null>(null);
  
  // Input method state (manual vs surah selection)
  const [inputMethod, setInputMethod] = useState<'manual' | 'surah_selection'>('manual');
  const [manualVersesCount, setManualVersesCount] = useState('');
  const [selectedSurahs, setSelectedSurahs] = useState<number[]>([]);
  const [surahs, setSurahs] = useState<SurahWithVerseCount[]>([]);
  
  // Evaluation questions state
  const [understood, setUnderstood] = useState(false);
  const [madeDua, setMadeDua] = useState(false);
  const [practiced, setPracticed] = useState(false);
  const [taught, setTaught] = useState(false);
  
  // Teaching details
  const [taughtCount, setTaughtCount] = useState('0');
  const [teachingComment, setTeachingComment] = useState('');
  const [showTeachingComments, setShowTeachingComments] = useState(false);
  
  // General notes
  const [notes, setNotes] = useState('');
  
  // Add to task state
  const [addToTask, setAddToTask] = useState({
    understood: false,
    made_dua: false,
    practiced: false,
    taught: false,
  });

  // Search and selection state - same as prayer record
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showSurahSelector, setShowSurahSelector] = useState(false);
  const [showSuraViewer, setShowSuraViewer] = useState(false);
  const [selectedSura, setSelectedSura] = useState<{ number: number; nameAr: string; nameEn: string; initialVerse: number } | null>(null);

  // Load surahs and existing entry
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load surahs with verse counts
        const surahsData = await getSurahsWithVerseCounts();
        setSurahs(surahsData);
        
        // Load existing entry if it exists
        const historyResponse = await getQiyamHistory(currentDate);
        const existing = historyResponse.entries.find(e => e.verse_number === verseNumber);
        
        if (existing) {
          setExistingEntry(existing);
          setInputMethod(existing.input_method);
          setManualVersesCount(existing.verses_count.toString());
          setSelectedSurahs(existing.selected_surahs || []);
          setUnderstood(existing.understood);
          setMadeDua(existing.made_dua);
          setPracticed(existing.practiced);
          setTaught(existing.taught);
          setTaughtCount((existing.people_taught || 0).toString());
          setTeachingComment(existing.teaching_comment || '');
          setNotes(existing.notes || '');
        }
        
      } catch (error) {
        console.error('Error loading Qiyam data:', error);
        Alert.alert('خطأ', 'حدث خطأ في تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentDate, verseNumber]);

  // Calculate total verses when surahs are selected
  const totalVersesFromSurahs = useMemo(() => {
    if (selectedSurahs.length === 0) return 0;
    return selectedSurahs.reduce((total, surahNumber) => {
      const surah = surahs.find(s => s.number === surahNumber);
      return total + (surah?.verse_count || 0);
    }, 0);
  }, [selectedSurahs, surahs]);

  // Get final verses count
  const finalVersesCount = inputMethod === 'surah_selection' ? totalVersesFromSurahs : parseInt(manualVersesCount) || 0;

  // Toggle functions
  const toggleQuestion = (key: QiyamQuestionKey) => {
    switch (key) {
      case 'understood':
        setUnderstood(!understood);
        break;
      case 'made_dua':
        setMadeDua(!madeDua);
        break;
      case 'practiced':
        setPracticed(!practiced);
        break;
      case 'taught':
        setTaught(!taught);
        break;
    }
  };

  const toggleTask = (key: QiyamQuestionKey) => {
    setAddToTask(prev => ({ ...prev, [key]: !prev[key] }));
    showToast(addToTask[key] ? 'أُزيلت من المهام' : 'أُضيفت للمَهَام');
  };

  // Search functionality - same as prayer record
  const performSearch = async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      const results = await searchQuran(term.trim());
      setSearchResults(results);
      setShowSearchModal(true);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  // Handle surah selection for auto-calculation
  const handleSurahToggle = (surahNumber: number) => {
    setSelectedSurahs(prev => {
      if (prev.includes(surahNumber)) {
        return prev.filter(s => s !== surahNumber);
      } else {
        return [...prev, surahNumber];
      }
    });
  };

  // Save entry
  const handleSave = async (action: 'save' | 'next') => {
    if (finalVersesCount === 0) {
      Alert.alert('تنبيه', 'يرجى إدخال عدد الآيات أو اختيار السور');
      return;
    }

    try {
      if (existingEntry) {
        // Update existing entry
        await updateQiyamEntry(
          existingEntry.id,
          finalVersesCount,
          understood,
          madeDua,
          practiced,
          taught,
          parseInt(taughtCount) || 0,
          teachingComment,
          notes
        );
        showToast('تم تحديث الآية بنجاح');
      } else {
        // Create new entry
        await createQiyamEntry(
          verseNumber,
          finalVersesCount,
          currentDate,
          inputMethod,
          selectedSurahs,
          understood,
          madeDua,
          practiced,
          taught,
          parseInt(taughtCount) || 0,
          teachingComment,
          notes
        );
        showToast('تم حفظ الآية بنجاح');
      }

      if (action === 'save') {
        router.back();
      } else if (action === 'next') {
        // Navigate to next verse
        router.replace({
          pathname: '/(drawer)/qiyam/verse',
          params: { date: currentDate, verse: (verseNumber + 1).toString() }
        });
      }
    } catch (error) {
      console.error('Error saving Qiyam entry:', error);
      Alert.alert('خطأ', 'حدث خطأ في حفظ البيانات');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
        {/* Header - same style as prayer record */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>رجوع</Text>
          </TouchableOpacity>
          <Text style={styles.title}>قيام الليل - آية {verseNumber}</Text>
        </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <Text style={styles.progressTitle}>التقدم</Text>
            <TaskProgressBar 
              score={(() => {
                const questionsAnswered = [understood, madeDua, practiced, taught].filter(Boolean).length;
                return Math.round((questionsAnswered / 4) * 100);
              })()} 
              showPercentage={true} 
            />
          </View>

          {/* Input Method Selection - DUAL SYSTEM */}
          <View style={styles.inputMethodSection}>
            <Text style={styles.sectionTitle}>طريقة الإدخال</Text>
            
            <View style={styles.inputMethodTabs}>
              <TabBtn
                label="إدخال يدوي"
                active={inputMethod === 'manual'}
                onPress={() => setInputMethod('manual')}
              />
              <TabBtn
                label="اختيار السور"
                active={inputMethod === 'surah_selection'}
                onPress={() => setInputMethod('surah_selection')}
              />
            </View>

            {inputMethod === 'manual' ? (
              <View style={styles.manualInputSection}>
                <Text style={styles.inputLabel}>عدد الآيات</Text>
                <TextInput
                  style={styles.versesInput}
                  value={manualVersesCount}
                  onChangeText={setManualVersesCount}
                  placeholder="أدخل عدد الآيات"
                  placeholderTextColor="#888"
                  keyboardType="number-pad"
                  textAlign="center"
                />
              </View>
            ) : (
              <View style={styles.surahSelectionSection}>
                <Text style={styles.inputLabel}>اختيار السور</Text>
                <Text style={styles.totalVersesText}>
                  إجمالي الآيات: {totalVersesFromSurahs}
                </Text>
                
                <ScrollView 
                  style={styles.surahsList}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled={true}
                >
                  {surahs.map(surah => (
                    <TouchableOpacity
                      key={surah.number}
                      style={[
                        styles.surahItem,
                        selectedSurahs.includes(surah.number) && styles.surahItemSelected
                      ]}
                      onPress={() => handleSurahToggle(surah.number)}
                    >
                      <Text style={[
                        styles.surahText,
                        selectedSurahs.includes(surah.number) && styles.surahTextSelected
                      ]}>
                        {surah.nameAr} ({surah.verse_count} آية)
                      </Text>
                      {selectedSurahs.includes(surah.number) && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Lock/Read-only indicator for manual input */}
                <View style={styles.lockedInputSection}>
                  <Text style={styles.inputLabel}>عدد الآيات (محسوب تلقائياً)</Text>
                  <TextInput
                    style={[styles.versesInput, styles.lockedInput]}
                    value={totalVersesFromSurahs.toString()}
                    editable={false}
                    textAlign="center"
                  />
                </View>
              </View>
            )}
          </View>

          {/* Evaluation Questions - Same style as prayer record */}
          <View style={styles.questionsSection}>
            <Text style={styles.sectionTitle}>الأسئلة التقييمية</Text>
            
            <QuestionRow
              label="هل فهمت الآيات؟"
              value={understood}
              onToggle={() => toggleQuestion('understood')}
              taskOn={addToTask.understood}
              onTask={() => toggleTask('understood')}
            />

            <QuestionRow
              label="هل دعوت بها؟"
              value={madeDua}
              onToggle={() => toggleQuestion('made_dua')}
              taskOn={addToTask.made_dua}
              onTask={() => toggleTask('made_dua')}
            />

            <QuestionRow
              label="هل عملت بها؟"
              value={practiced}
              onToggle={() => toggleQuestion('practiced')}
              taskOn={addToTask.practiced}
              onTask={() => toggleTask('practiced')}
            />

            <QuestionRow
              label="هل علمت بها؟"
              value={taught}
              onToggle={() => toggleQuestion('taught')}
              taskOn={addToTask.taught}
              onTask={() => toggleTask('taught')}
            />

            {/* Teaching Details - Same as prayer record */}
            {taught && (
              <View style={styles.teachingSection}>
                <View style={styles.countRow}>
                  <Text style={styles.countLabel}>كم شخص علمت؟</Text>
                  <TextInput
                    placeholder="أدخل العدد"
                    placeholderTextColor="#888"
                    value={taughtCount}
                    onChangeText={setTaughtCount}
                    keyboardType="number-pad"
                    style={styles.countInput}
                    textAlign="center"
                  />
                </View>
                
                <TouchableOpacity 
                  style={styles.addCommentButton}
                  onPress={() => setShowTeachingComments(!showTeachingComments)}
                >
                  <Text style={styles.addCommentButtonText}>
                    أضف ملاحظات (ماذا علمته، أيه، حديث، موعظة إلخ)
                  </Text>
                  <Text style={styles.expandIcon}>
                    {showTeachingComments ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>
                
                {showTeachingComments && (
                  <View style={styles.commentSection}>
                    <TextInput
                      style={styles.commentInput}
                      value={teachingComment}
                      onChangeText={setTeachingComment}
                      placeholder="مثال: علمت سورة الفاتحة، شرحت معنى الآيات، قرأت حديث عن الصلاة..."
                      placeholderTextColor="#888"
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Notes Section - Same as prayer record */}
          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>الملاحظات والتعليقات</Text>
            <TextInput
              placeholder="اضف تعليقاتك وملاحظاتك هنا..."
              placeholderTextColor="#888"
              value={notes}
              onChangeText={setNotes}
              style={styles.commentsInput}
              textAlign="right"
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Action Buttons - Same style as prayer record */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => handleSave('save')}
            >
              <Text style={styles.primaryButtonText}>تم</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => handleSave('next')}
            >
              <Text style={styles.secondaryButtonText}>إضافة آية</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// Styles - copied exactly from prayer record and adapted
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark,
  },
  loadingText: {
    color: Colors.light,
    fontSize: 16,
    fontWeight: '600',
  },
  safeContainer: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.greenTeal,
  },
  backBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  backBtnText: {
    color: Colors.light,
    fontWeight: '600',
  },
  title: {
    color: Colors.light,
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
    marginRight: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  progressSection: {
    backgroundColor: Colors.greenTeal,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  progressTitle: {
    color: Colors.warmOrange,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 8,
  },
  inputMethodSection: {
    backgroundColor: Colors.greenTeal,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  inputMethodTabs: {
    flexDirection: 'row-reverse',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: Colors.warmOrange,
  },
  tabText: {
    color: Colors.light,
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.dark,
  },
  manualInputSection: {
    alignItems: 'center',
  },
  inputLabel: {
    color: Colors.light,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 8,
  },
  versesInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: Colors.light,
    fontSize: 16,
    fontWeight: '600',
    minWidth: 100,
    textAlign: 'center',
  },
  surahSelectionSection: {
    // Container for surah selection
  },
  totalVersesText: {
    color: Colors.warmOrange,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  surahsList: {
    maxHeight: 200,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    marginBottom: 16,
  },
  surahItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  surahItemSelected: {
    backgroundColor: 'rgba(244, 189, 36, 0.2)',
  },
  surahText: {
    color: Colors.light,
    fontSize: 14,
    fontWeight: '600',
  },
  surahTextSelected: {
    color: Colors.warmOrange,
  },
  checkmark: {
    color: Colors.warmOrange,
    fontSize: 16,
    fontWeight: '700',
  },
  lockedInputSection: {
    alignItems: 'center',
  },
  lockedInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    opacity: 0.7,
  },
  questionsSection: {
    backgroundColor: Colors.greenTeal,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    color: Colors.warmOrange,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 16,
  },
  questionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
  },
  highlightedRow: {
    backgroundColor: 'rgba(244, 189, 36, 0.2)',
  },
  taskButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 12,
  },
  taskButtonActive: {
    backgroundColor: Colors.warmOrange,
  },
  taskButtonText: {
    color: Colors.light,
    fontSize: 12,
    fontWeight: '600',
  },
  taskButtonActiveText: {
    color: Colors.dark,
  },
  questionContent: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  questionLabel: {
    color: Colors.light,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginRight: 12,
  },
  teachingSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  countRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  countLabel: {
    color: Colors.light,
    fontSize: 14,
    fontWeight: '600',
  },
  countInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    padding: 8,
    color: Colors.light,
    fontSize: 14,
    fontWeight: '600',
    minWidth: 60,
  },
  addCommentButton: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  addCommentButtonText: {
    color: Colors.light,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  expandIcon: {
    color: Colors.warmOrange,
    fontSize: 12,
    fontWeight: '700',
  },
  commentSection: {
    marginTop: 8,
  },
  commentInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    padding: 12,
    color: Colors.light,
    fontSize: 12,
    textAlign: 'right',
    minHeight: 80,
  },
  commentsSection: {
    backgroundColor: Colors.greenTeal,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  commentsInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 12,
    color: Colors.light,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginTop: 20,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: Colors.warmOrange,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.dark,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.warmOrange,
  },
  secondaryButtonText: {
    color: Colors.warmOrange,
    fontSize: 16,
    fontWeight: '700',
  },
});