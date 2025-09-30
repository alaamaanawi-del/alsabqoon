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

// Tab Button Component - EXACT SAME as prayers
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

// Question Row Component - EXACT SAME as prayers with task icon
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
      <View style={styles.questionContent}>
        <Text style={styles.questionLabel}>{label}</Text>
        <View style={styles.rightControls}>
          <TouchableOpacity
            onPress={onTask}
            style={[styles.taskIcon, taskOn && styles.taskIconActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.taskIconText, taskOn && styles.taskIconActiveText]}>📋</Text>
          </TouchableOpacity>
          <Switch
            value={value}
            onValueChange={onToggle}
            trackColor={{ false: '#767577', true: Colors.warmOrange }}
            thumbColor={value ? Colors.light : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
          />
        </View>
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

  // State management - same structure as prayer record
  const [loading, setLoading] = useState(true);
  const [qiyamHistory, setQiyamHistory] = useState<QiyamEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<QiyamEntry | null>(null);
  
  // Search and selection state - SAME AS PRAYER RECORD
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showSurahSelector, setShowSurahSelector] = useState(false);
  const [showSuraViewer, setShowSuraViewer] = useState(false);
  const [selectedSura, setSelectedSura] = useState<{ number: number; nameAr: string; nameEn: string; initialVerse: number } | null>(null);
  const [selectedVerses, setSelectedVerses] = useState<any[]>([]);
  
  // Input method state (manual vs surah selection)
  const [inputMethod, setInputMethod] = useState<'manual' | 'surah_selection'>('manual');
  const [manualVersesCount, setManualVersesCount] = useState('');
  const [selectedSurahs, setSelectedSurahs] = useState<number[]>([]);
  const [surahs, setSurahs] = useState<SurahWithVerseCount[]>([]);
  
  // Evaluation questions state
  const [questions, setQuestions] = useState({
    understood: false,
    made_dua: false,
    practiced: false,
    taught: false,
  });
  
  // Teaching details
  const [taughtCount, setTaughtCount] = useState(0);
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

  // Load data with proper cleanup
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Clear all form data first to prevent state leakage
        setInputMethod('manual');
        setManualVersesCount('');
        setSelectedSurahs([]);
        setQuestions({
          understood: false,
          made_dua: false,
          practiced: false,
          taught: false,
        });
        setTaughtCount(0);
        setTeachingComment('');
        setNotes('');
        setSelectedVerses([]);
        setQuery('');
        setCurrentEntry(null);
        
        // Load surahs with verse counts
        const surahsData = await getSurahsWithVerseCounts();
        setSurahs(surahsData);
        
        // Load Qiyam history for this specific date
        const historyResponse = await getQiyamHistory(currentDate);
        setQiyamHistory(historyResponse.entries || []);
        
        // Find current entry for this specific verse and date
        const existing = (historyResponse.entries || []).find(e => 
          e.verse_number === verseNumber && e.date === currentDate
        );
        
        if (existing) {
          // Only load data if entry exists for this specific verse and date
          setCurrentEntry(existing);
          setInputMethod(existing.input_method);
          setManualVersesCount(existing.verses_count.toString());
          setSelectedSurahs(existing.selected_surahs || []);
          setQuestions({
            understood: existing.understood,
            made_dua: existing.made_dua,
            practiced: existing.practiced,
            taught: existing.taught,
          });
          setTaughtCount(existing.people_taught || 0);
          setTeachingComment(existing.teaching_comment || '');
          setNotes(existing.notes || '');
        }
        
      } catch (error) {
        console.error('Error loading Qiyam data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentDate, verseNumber]); // Reload when date OR verse changes

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
    setQuestions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleTask = (key: QiyamQuestionKey) => {
    setAddToTask(prev => ({ ...prev, [key]: !prev[key] }));
    showToast(addToTask[key] ? 'أُزيلت من المهام' : 'أُضيفت للمَهَام');
  };

  // Handle surah selection
  const handleSurahToggle = (surahNumber: number) => {
    setSelectedSurahs(prev => {
      if (prev.includes(surahNumber)) {
        return prev.filter(s => s !== surahNumber);
      } else {
        return [...prev, surahNumber];
      }
    });
  };

  // Search functionality - SAME AS PRAYER RECORD
  const handleSearchChange = (text: string) => {
    setQuery(text);
    if (text.trim().length > 2) {
      performSearch(text);
    } else {
      setSearchResults([]);
      setShowSearchModal(false);
    }
  };

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

  const handleSelectSurah = (surah: { number: number; nameAr: string; nameEn: string }) => {
    setSelectedSura({
      number: surah.number,
      nameAr: surah.nameAr,
      nameEn: surah.nameEn,
      initialVerse: 1
    });
    setShowSuraViewer(true);
    setShowSurahSelector(false);
  };

  const handleRangeSelected = (startVerse: number, endVerse: number, verses: any[]) => {
    try {
      // Add selected verses to display - same logic as prayers
      const newVerses = verses.map(verse => ({
        surahNumber: selectedSura!.number,
        nameAr: selectedSura!.nameAr,
        nameEn: selectedSura!.nameEn,
        fromAyah: verse.ayah,
        toAyah: verse.ayah,
        verseText: verse.textAr,
      }));

      setSelectedVerses(prev => [...prev, ...newVerses]);
      setShowSuraViewer(false);
      setSelectedSura(null);
    } catch (error) {
      console.error('Error handling range selection:', error);
    }
  };

  const handleSearchResultSelect = (result: SearchItem) => {
    try {
      // Add search result to selected verses - same as prayers
      const newVerse = {
        surahNumber: result.surahNumber,
        nameAr: result.nameAr,
        nameEn: result.nameEn,
        fromAyah: result.ayah,
        toAyah: result.ayah,
        verseText: result.textAr,
      };

      setSelectedVerses(prev => [...prev, newVerse]);
      setShowSearchModal(false);
      setQuery('');
    } catch (error) {
      console.error('Error handling search result selection:', error);
    }
  };

  // Navigation between verses
  const navigateToVerse = (targetVerse: number) => {
    router.replace({
      pathname: '/(drawer)/qiyam/verse',
      params: { date: currentDate, verse: targetVerse.toString() }
    });
  };

  // Save entry
  const handleDone = async () => {
    if (finalVersesCount === 0) {
      Alert.alert('تنبيه', 'يرجى إدخال عدد الآيات أو اختيار السور');
      return;
    }

    try {
      if (currentEntry) {
        // Update existing entry
        await updateQiyamEntry(
          currentEntry.id,
          finalVersesCount,
          questions.understood,
          questions.made_dua,
          questions.practiced,
          questions.taught,
          taughtCount,
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
          questions.understood,
          questions.made_dua,
          questions.practiced,
          questions.taught,
          taughtCount,
          teachingComment,
          notes
        );
        showToast('تم حفظ الآية بنجاح');
      }

      // Navigate back to prayers list, not main app
      router.push('/(drawer)/my-prayers');
    } catch (error) {
      console.error('Error saving Qiyam entry:', error);
      Alert.alert('خطأ', 'حدث خطأ في حفظ البيانات');
    }
  };

  const handleAddVerse = async () => {
    if (finalVersesCount === 0) {
      Alert.alert('تنبيه', 'يرجى إدخال عدد الآيات أو اختيار السور');
      return;
    }

    try {
      if (currentEntry) {
        // Update existing entry
        await updateQiyamEntry(
          currentEntry.id,
          finalVersesCount,
          questions.understood,
          questions.made_dua,
          questions.practiced,
          questions.taught,
          taughtCount,
          teachingComment,
          notes
        );
      } else {
        // Create new entry
        await createQiyamEntry(
          verseNumber,
          finalVersesCount,
          currentDate,
          inputMethod,
          selectedSurahs,
          questions.understood,
          questions.made_dua,
          questions.practiced,
          questions.taught,
          taughtCount,
          teachingComment,
          notes
        );
      }

      showToast('تم حفظ الآية بنجاح');
      
      // Navigate to next verse - state will be cleared automatically by useEffect
      const nextVerse = verseNumber + 1;
      navigateToVerse(nextVerse);
      
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

  // Calculate progress
  const questionsAnswered = Object.values(questions).filter(Boolean).length;
  const progress = Math.round((questionsAnswered / 4) * 100);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      {/* Fixed Header - SAME AS PRAYER */}
      <View style={styles.header}>
        <View style={styles.headerInfoRow}>
          <Text style={styles.prayerNameText}>القيام</Text>
          <Text style={[styles.verseHighlight, styles.currentVerseText]}>آية {verseNumber}</Text>
          <Text style={styles.dayText}>{new Date(currentDate).toLocaleDateString('en-US', { weekday: 'long' })}</Text>
          <Text style={styles.dateText}>{new Date(currentDate).toLocaleDateString('en-GB')}</Text>
          <View style={styles.progressBarContainer}>
            <TaskProgressBar score={progress} showPercentage={true} />
          </View>
        </View>
      </View>

      {/* Verse Tabs - UNLIMITED VERSES */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.verseTabsContent}>
          {Array.from({ length: Math.max(qiyamHistory.length + 2, 10) }, (_, i) => {
            const verseNum = i + 1;
            const hasEntry = qiyamHistory.some(entry => entry.verse_number === verseNum);
            return (
              <TouchableOpacity
                key={verseNum}
                style={[
                  styles.verseTab,
                  verseNum === verseNumber && styles.activeTab,
                  hasEntry && styles.completedTab
                ]}
                onPress={() => navigateToVerse(verseNum)}
              >
                <Text style={[
                  styles.verseTabText,
                  verseNum === verseNumber && styles.activeTabText,
                  hasEntry && styles.completedTabText
                ]}>
                  آية {verseNum}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Scrollable Content - SAME STRUCTURE AS PRAYER */}
      <ScrollView 
        style={styles.scrollContent} 
        contentContainerStyle={{
          paddingBottom: Math.max(120, insets.bottom + 30),
          paddingLeft: Math.max(0, insets.left),
          paddingRight: Math.max(0, insets.right),
        }}
      >
        {/* Selected Verses Display - SAME AS PRAYER */}
        {selectedVerses.length > 0 && (
          <SelectedVersesDisplay 
            ranges={selectedVerses} 
            maxLines={8}
          />
        )}

        {/* Verse Count Input - ONLY ON VERSE 1 */}
        {verseNumber === 1 && (
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>عدد الآيات التي قرأتها في صلاة القيام</Text>
            
            {/* Show current totals in header */}
            <View style={styles.totalsHeader}>
              <Text style={styles.totalVersesHeaderText}>
                إجمالي الآيات: {finalVersesCount}
              </Text>
              {inputMethod === 'surah_selection' && selectedSurahs.length > 0 && (
                <Text style={styles.totalSurahsText}>
                  عدد السور: {selectedSurahs.length}
                </Text>
              )}
            </View>
            
            {/* Input Method Tabs */}
            <View style={styles.inputMethodTabs}>
              <TabBtn
                label="ادخل العدد"
                active={inputMethod === 'manual'}
                onPress={() => {
                  setInputMethod('manual');
                  setSelectedSurahs([]);
                }}
              />
              <TabBtn
                label="اختر السور التي قرأت"
                active={inputMethod === 'surah_selection'}
                onPress={() => {
                  setInputMethod('surah_selection');
                  setManualVersesCount('');
                }}
              />
            </View>

            {inputMethod === 'manual' ? (
              <View style={styles.manualInputSection}>
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
              </View>
            )}
          </View>
        )}

        {/* Search Section - ALWAYS VISIBLE */}
        <View style={styles.searchSection}>
          <View style={styles.controlsRow}>
            <TouchableOpacity 
              onPress={() => setShowSurahSelector(true)} 
              style={styles.wholeSurahBtn}
            >
              <Text style={styles.wholeSurahBtnText}>السورة كاملة</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            placeholder="ابحث في القرآن..."
            placeholderTextColor="#888"
            value={query}
            onChangeText={handleSearchChange}
            style={styles.searchInput}
            textAlign="right"
          />
        </View>

        {/* Questions Section - EXACTLY THE SAME AS PRAYER */}
        <View style={styles.questionsSection}>
          <QuestionRow
            label="هل فهمت الآيات؟"
            value={questions.understood}
            onToggle={() => toggleQuestion('understood')}
            taskOn={addToTask.understood}
            onTask={() => toggleTask('understood')}
          />

          <QuestionRow
            label="الدعاء المتعلق بالآيات."
            value={questions.made_dua}
            onToggle={() => toggleQuestion('made_dua')}
            taskOn={addToTask.made_dua}
            onTask={() => toggleTask('made_dua')}
          />

          <QuestionRow
            label="هل اتبعت الآيات؟"
            value={questions.practiced}
            onToggle={() => toggleQuestion('practiced')}
            taskOn={addToTask.practiced}
            onTask={() => toggleTask('practiced')}
          />

          <QuestionRow
            label="هل علمت الآيات؟"
            value={questions.taught}
            onToggle={() => toggleQuestion('taught')}
            taskOn={addToTask.taught}
            onTask={() => toggleTask('taught')}
          />

          {/* Teaching Details - EXACT SAME AS PRAYER */}
          {questions.taught && (
            <View style={styles.teachingSection}>
              <View style={styles.countRow}>
                <Text style={styles.countLabel}>كم شخص علمت؟</Text>
                <TextInput
                  placeholder="أدخل العدد"
                  placeholderTextColor="#888"
                  value={String(taughtCount)}
                  onChangeText={(text) => setTaughtCount(parseInt(text) || 0)}
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

        {/* Comments Section - EXACTLY THE SAME AS PRAYER */}
        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>التعليقات والملاحظات</Text>
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
      </ScrollView>

      {/* Fixed Bottom Bar - EXACTLY THE SAME AS PRAYER */}
      <View style={styles.fixedBottomBar}>
        <TouchableOpacity 
          onPress={handleDone}
          style={styles.doneButton}
        >
          <Text style={styles.doneButtonText}>تم</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={handleAddVerse}
          style={styles.addVerseButton}
        >
          <Text style={styles.addVerseButtonText}>أضف آية</Text>
        </TouchableOpacity>
      </View>

      {/* Search Results Modal - SAME AS PRAYER */}
      <SearchResultsModal
        visible={showSearchModal}
        results={searchResults}
        onClose={() => setShowSearchModal(false)}
        onSelectResult={handleSearchResultSelect}
      />

      {/* Surah Selector Modal - SAME AS PRAYER */}
      <SurahSelector
        visible={showSurahSelector}
        onClose={() => setShowSurahSelector(false)}
        onSelectSurah={handleSelectSurah}
        onSelectWholeSurah={handleSelectSurah}
      />

      {/* Sura Viewer Modal - SAME AS PRAYER */}
      {selectedSura && (
        <SuraViewer
          visible={showSuraViewer}
          surah={selectedSura}
          onClose={() => {
            setShowSuraViewer(false);
            setSelectedSura(null);
          }}
          onRangeSelected={handleRangeSelected}
        />
      )}
    </KeyboardAvoidingView>
  );
}

// Styles - COPIED EXACTLY FROM PRAYER RECORD
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
  header: {
    backgroundColor: Colors.greenTeal,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerInfoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prayerNameText: {
    color: Colors.light,
    fontSize: 18,
    fontWeight: '700',
  },
  verseHighlight: {
    backgroundColor: Colors.warmOrange,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  currentVerseText: {
    color: Colors.dark,
    fontSize: 16,
    fontWeight: '700',
  },
  dayText: {
    color: Colors.light,
    fontSize: 14,
    opacity: 0.8,
  },
  dateText: {
    color: Colors.light,
    fontSize: 14,
    opacity: 0.8,
  },
  progressBarContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  tabsContainer: {
    backgroundColor: Colors.greenTeal,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  verseTabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  verseTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: Colors.warmOrange,
  },
  completedTab: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    borderColor: '#22C55E',
    borderWidth: 1,
  },
  verseTabText: {
    color: Colors.light,
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.dark,
  },
  completedTabText: {
    color: '#22C55E',
  },
  tab: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  tabText: {
    color: Colors.light,
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
    padding: 16,
  },
  searchSection: {
    backgroundColor: Colors.greenTeal,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  controlsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 12,
  },
  wholeSurahBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  wholeSurahBtnText: {
    color: Colors.light,
    fontSize: 14,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 12,
    color: Colors.light,
    fontSize: 14,
    marginBottom: 8,
  },
  inputSection: {
    backgroundColor: Colors.greenTeal,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  totalsHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    padding: 8,
    backgroundColor: 'rgba(244, 189, 36, 0.2)',
    borderRadius: 8,
  },
  totalVersesHeaderText: {
    color: Colors.warmOrange,
    fontSize: 16,
    fontWeight: '700',
  },
  totalSurahsText: {
    color: Colors.warmOrange,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    color: Colors.warmOrange,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 12,
  },
  inputMethodTabs: {
    flexDirection: 'row-reverse',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  manualInputSection: {
    alignItems: 'center',
  },
  versesInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: Colors.light,
    fontSize: 16,
    fontWeight: '600',
    minWidth: 100,
  },
  lockedInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    opacity: 0.7,
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
  totalsHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  totalVersesHeaderText: {
    color: Colors.warmOrange,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  totalSurahsText: {
    color: Colors.light,
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
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
  questionsSection: {
    backgroundColor: Colors.greenTeal,
    borderRadius: 12,
    padding: 16,
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
  rightControls: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  taskIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskIconActive: {
    backgroundColor: Colors.warmOrange,
  },
  taskIconText: {
    fontSize: 16,
    opacity: 0.5,
  },
  taskIconActiveText: {
    opacity: 1.0,
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
    marginBottom: 16,
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
  fixedBottomBar: {
    flexDirection: 'row-reverse',
    backgroundColor: Colors.greenTeal,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  doneButton: {
    flex: 1,
    backgroundColor: Colors.warmOrange,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: Colors.dark,
    fontSize: 16,
    fontWeight: '700',
  },
  addVerseButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.warmOrange,
  },
  addVerseButtonText: {
    color: Colors.warmOrange,
    fontSize: 16,
    fontWeight: '700',
  },
});