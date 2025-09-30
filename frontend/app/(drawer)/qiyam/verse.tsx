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

// Types - EXACT SAME AS PRAYERS
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

interface VerseRange {
  surahNumber: number;
  nameAr: string;
  nameEn: string;
  fromAyah: number;
  toAyah: number;
}

// Qiyam Verse Object Structure
interface QiyamVerse {
  verseNumber: number;
  numberOfVerses: number;
  inputMethod: 'manual' | 'surah_selection';
  selectedSurahs: number[];
  understood: boolean;
  made_dua: boolean;
  practiced: boolean;
  taught: boolean;
  people_taught: number;
  teaching_comment: string;
  notes: string;
  ranges: VerseRange[];
  taskMarked: {
    understood: boolean;
    made_dua: boolean;
    practiced: boolean;
    taught: boolean;
  };
}

// Tab Button Component
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

// Question Row Component - EXACT SAME as prayers
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
  
  const currentVerseNumber = parseInt(verse || '1');
  const currentDate = date || new Date().toISOString().split('T')[0];

  // Main state - array of verses like prayers have rakkas
  const [verses, setVerses] = useState<QiyamVerse[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [surahs, setSurahs] = useState<SurahWithVerseCount[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Search state - EXACT SAME AS PRAYERS
  const [query, setQuery] = useState("");
  const [lang, setLang] = useState<"ar" | "ar_tafseer" | "ar_en" | "ar_es">("ar");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [showSurahSelector, setShowSurahSelector] = useState(false);
  const [showSuraViewer, setShowSuraViewer] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedSura, setSelectedSura] = useState<{
    number: number;
    nameAr: string;
    nameEn: string;
    initialVerse?: number;
  } | null>(null);

  // Teaching comments state
  const [showTeachingComments, setShowTeachingComments] = useState(false);

  const activeVerse = verses[activeIndex];

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load surahs with verse counts
        const surahsData = await getSurahsWithVerseCounts();
        setSurahs(surahsData);
        
        // Load Qiyam history for this date
        const historyResponse = await getQiyamHistory(currentDate);
        const qiyamEntries = historyResponse.entries || [];
        
        // Convert to verses array
        const versesArray: QiyamVerse[] = [];
        for (let i = 1; i <= Math.max(currentVerseNumber, qiyamEntries.length + 1); i++) {
          const existingEntry = qiyamEntries.find(e => e.verse_number === i);
          
          versesArray.push({
            verseNumber: i,
            numberOfVerses: existingEntry?.verses_count || 0,
            inputMethod: existingEntry?.input_method || 'manual',
            selectedSurahs: existingEntry?.selected_surahs || [],
            understood: existingEntry?.understood || false,
            made_dua: existingEntry?.made_dua || false,
            practiced: existingEntry?.practiced || false,
            taught: existingEntry?.taught || false,
            people_taught: existingEntry?.people_taught || 0,
            teaching_comment: existingEntry?.teaching_comment || '',
            notes: existingEntry?.notes || '',
            ranges: [],
            taskMarked: {
              understood: false,
              made_dua: false,
              practiced: false,
              taught: false,
            }
          });
        }
        
        setVerses(versesArray);
        setActiveIndex(currentVerseNumber - 1);
        
      } catch (error) {
        console.error('Error loading Qiyam data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentDate, currentVerseNumber]);

  // Search logic - EXACT SAME AS PRAYERS
  const bilingualParam = useMemo(() => (
    lang === "ar_tafseer" ? "tafseer" : 
    lang === "ar_en" ? "en" : 
    lang === "ar_es" ? "es" : 
    ""
  ), [lang]);

  const doSearch = async () => {
    if (!query.trim()) { 
      setResults([]); 
      setShowSearchResults(false);
      return; 
    }
    try {
      const rows = await searchQuran(query, (bilingualParam as any) || '');
      setResults(rows as SearchItem[]);
      if (rows.length > 0) {
        setShowSearchResults(true);
      }
    } catch (e) {
      console.warn("search error", e);
      setResults([]);
      setShowSearchResults(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setQuery(text);
  };
  
  useEffect(() => { 
    const t = setTimeout(doSearch, 250); 
    return () => clearTimeout(t); 
  }, [query, bilingualParam]);

  // Compute numberOfVerses when selectedSurahs changes
  useEffect(() => {
    if (!activeVerse || activeVerse.inputMethod !== 'surah_selection') return;
    
    const totalVerses = activeVerse.selectedSurahs.reduce((total, surahNumber) => {
      const surah = surahs.find(s => s.number === surahNumber);
      return total + (surah?.verse_count || 0);
    }, 0);
    
    if (totalVerses !== activeVerse.numberOfVerses) {
      updateActiveVerse({ numberOfVerses: totalVerses });
    }
  }, [activeVerse?.selectedSurahs, surahs, activeVerse?.inputMethod]);

  // Helper to update active verse
  const updateActiveVerse = (updates: Partial<QiyamVerse>) => {
    setVerses(prev => prev.map((v, i) => 
      i === activeIndex ? { ...v, ...updates } : v
    ));
  };

  // Toggle functions
  const toggleQuestion = (key: keyof Pick<QiyamVerse, 'understood' | 'made_dua' | 'practiced' | 'taught'>) => {
    updateActiveVerse({ [key]: !activeVerse[key] });
  };

  const toggleTask = (key: keyof QiyamVerse['taskMarked']) => {
    const newTaskMarked = { 
      ...activeVerse.taskMarked, 
      [key]: !activeVerse.taskMarked[key] 
    };
    updateActiveVerse({ taskMarked: newTaskMarked });
    showToast(newTaskMarked[key] ? 'أُضيفت للمَهَام' : 'أُزيلت من المهام');
  };

  // Surah selection toggle
  const handleSurahToggle = (surahNumber: number) => {
    if (!activeVerse) return;
    
    const newSelectedSurahs = activeVerse.selectedSurahs.includes(surahNumber)
      ? activeVerse.selectedSurahs.filter(s => s !== surahNumber)
      : [...activeVerse.selectedSurahs, surahNumber];
    
    updateActiveVerse({ selectedSurahs: newSelectedSurahs });
  };

  // Navigation between verses
  const navigateToVerse = (targetVerse: number) => {
    setActiveIndex(targetVerse - 1);
    router.replace({
      pathname: '/(drawer)/qiyam/verse',
      params: { date: currentDate, verse: targetVerse.toString() }
    });
  };

  // Search handlers - EXACT SAME AS PRAYERS
  const onVerseNumberPress = (item: SearchItem) => {
    setSelectedSura({
      number: item.surahNumber,
      nameAr: item.nameAr,
      nameEn: item.nameEn || "",
      initialVerse: item.ayah
    });
    setShowSuraViewer(true);
    setShowSearchResults(false);
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
    if (!activeVerse) return;
    
    try {
      const ranges: VerseRange[] = verses.map(verse => ({
        surahNumber: selectedSura!.number,
        nameAr: selectedSura!.nameAr,
        nameEn: selectedSura!.nameEn,
        fromAyah: verse.ayah,
        toAyah: verse.ayah,
      }));

      updateActiveVerse({ 
        ranges: [...(activeVerse.ranges || []), ...ranges]
      });
      
      setQuery("");
      setResults([]);
      setShowSuraViewer(false);
      setSelectedSura(null);
      
      const verseCount = endVerse - startVerse + 1;
      const verseText = verseCount === 1 ? `الآية ${startVerse}` : `الآيات ${startVerse}-${endVerse}`;
      showToast(`تم إضافة ${verseText} من ${selectedSura!.nameAr}`);
      
    } catch (error) {
      console.error("Error handling range selection:", error);
      showToast("حدث خطأ في حفظ الآيات المحددة");
    }
  };

  // Save current verse
  const saveCurrentVerse = async () => {
    if (!activeVerse || saving) return;

    setSaving(true);
    try {
      const historyResponse = await getQiyamHistory(currentDate);
      const existingEntry = historyResponse.entries.find(e => e.verse_number === activeVerse.verseNumber);

      if (existingEntry) {
        await updateQiyamEntry(
          existingEntry.id,
          activeVerse.numberOfVerses,
          activeVerse.understood,
          activeVerse.made_dua,
          activeVerse.practiced,
          activeVerse.taught,
          activeVerse.people_taught,
          activeVerse.teaching_comment,
          activeVerse.notes
        );
      } else {
        await createQiyamEntry(
          activeVerse.verseNumber,
          activeVerse.numberOfVerses,
          currentDate,
          activeVerse.inputMethod,
          activeVerse.selectedSurahs,
          activeVerse.understood,
          activeVerse.made_dua,
          activeVerse.practiced,
          activeVerse.taught,
          activeVerse.people_taught,
          activeVerse.teaching_comment,
          activeVerse.notes
        );
      }
    } catch (error) {
      console.error('Error saving verse:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  // Handle Done
  const handleDone = async () => {
    if (saving || !activeVerse) return;

    try {
      await saveCurrentVerse();
      showToast('تم حفظ الآية بنجاح');
      router.push('/(drawer)/my-prayers');
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ في حفظ البيانات');
    }
  };

  // Handle Add Verse
  const handleAddVerse = async () => {
    if (saving || !activeVerse) return;

    try {
      await saveCurrentVerse();
      
      // Add new verse
      const newVerseNumber = verses.length + 1;
      const newVerse: QiyamVerse = {
        verseNumber: newVerseNumber,
        numberOfVerses: 0,
        inputMethod: 'manual',
        selectedSurahs: [],
        understood: false,
        made_dua: false,
        practiced: false,
        taught: false,
        people_taught: 0,
        teaching_comment: '',
        notes: '',
        ranges: [],
        taskMarked: {
          understood: false,
          made_dua: false,
          practiced: false,
          taught: false,
        }
      };
      
      setVerses(prev => [...prev, newVerse]);
      
      showToast('تم حفظ الآية بنجاح');
      navigateToVerse(newVerseNumber);
      
    } catch (error) {
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

  if (!activeVerse) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    );
  }

  // Calculate progress
  const questionsAnswered = [activeVerse.understood, activeVerse.made_dua, activeVerse.practiced, activeVerse.taught].filter(Boolean).length;
  const progress = Math.round((questionsAnswered / 4) * 100);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <View style={styles.headerInfoRow}>
          <Text style={styles.prayerNameText}>القيام</Text>
          <Text style={[styles.verseHighlight, styles.currentVerseText]}>آية {activeVerse.verseNumber}</Text>
          <Text style={styles.dayText}>{new Date(currentDate).toLocaleDateString('en-US', { weekday: 'long' })}</Text>
          <Text style={styles.dateText}>{new Date(currentDate).toLocaleDateString('en-GB')}</Text>
          <View style={styles.progressBarContainer}>
            <TaskProgressBar score={progress} showPercentage={true} />
          </View>
        </View>
      </View>

      {/* Verse Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.verseTabsContent}>
          {verses.map((v, i) => (
            <TouchableOpacity
              key={v.verseNumber}
              style={[
                styles.verseTab,
                i === activeIndex && styles.activeTab,
                v.numberOfVerses > 0 && styles.completedTab
              ]}
              onPress={() => navigateToVerse(v.verseNumber)}
            >
              <Text style={[
                styles.verseTabText,
                i === activeIndex && styles.activeTabText,
                v.numberOfVerses > 0 && styles.completedTabText
              ]}>
                آية {v.verseNumber}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Scrollable Content */}
      <ScrollView 
        style={styles.scrollContent} 
        contentContainerStyle={{
          paddingBottom: Math.max(120, insets.bottom + 30),
          paddingLeft: Math.max(0, insets.left),
          paddingRight: Math.max(0, insets.right),
        }}
      >
        {/* Selected Verses Display */}
        {activeVerse.ranges.length > 0 && (
          <SelectedVersesDisplay 
            ranges={activeVerse.ranges} 
            maxLines={8}
          />
        )}

        {/* Verse Count Input - ONLY ON VERSE 1 */}
        {activeVerse.verseNumber === 1 && (
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>عدد الآيات التي قرأتها في صلاة القيام</Text>
            
            {/* Show current totals in header */}
            <View style={styles.totalsHeader}>
              <Text style={styles.totalVersesHeaderText}>
                إجمالي الآيات: {activeVerse.numberOfVerses}
              </Text>
              {activeVerse.inputMethod === 'surah_selection' && activeVerse.selectedSurahs.length > 0 && (
                <Text style={styles.totalSurahsText}>
                  عدد السور: {activeVerse.selectedSurahs.length}
                </Text>
              )}
            </View>
            
            {/* Input Method Tabs */}
            <View style={styles.inputMethodTabs}>
              <TabBtn
                label="ادخل العدد"
                active={activeVerse.inputMethod === 'manual'}
                onPress={() => {
                  updateActiveVerse({ inputMethod: 'manual', selectedSurahs: [] });
                }}
              />
              <TabBtn
                label="اختر السور التي قرأت"
                active={activeVerse.inputMethod === 'surah_selection'}
                onPress={() => {
                  updateActiveVerse({ inputMethod: 'surah_selection', numberOfVerses: 0 });
                }}
              />
            </View>

            {activeVerse.inputMethod === 'manual' ? (
              <View style={styles.manualInputSection}>
                <TextInput
                  style={styles.versesInput}
                  value={activeVerse.numberOfVerses.toString()}
                  onChangeText={(text) => updateActiveVerse({ numberOfVerses: parseInt(text) || 0 })}
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
                        activeVerse.selectedSurahs.includes(surah.number) && styles.surahItemSelected
                      ]}
                      onPress={() => handleSurahToggle(surah.number)}
                    >
                      <Text style={[
                        styles.surahText,
                        activeVerse.selectedSurahs.includes(surah.number) && styles.surahTextSelected
                      ]}>
                        {surah.nameAr} ({surah.verse_count} آية)
                      </Text>
                      {activeVerse.selectedSurahs.includes(surah.number) && (
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

        {/* Questions Section */}
        <View style={styles.questionsSection}>
          <QuestionRow
            label="هل فهمت الآيات؟"
            value={activeVerse.understood}
            onToggle={() => toggleQuestion('understood')}
            taskOn={activeVerse.taskMarked.understood}
            onTask={() => toggleTask('understood')}
          />

          <QuestionRow
            label="الدعاء المتعلق بالآيات."
            value={activeVerse.made_dua}
            onToggle={() => toggleQuestion('made_dua')}
            taskOn={activeVerse.taskMarked.made_dua}
            onTask={() => toggleTask('made_dua')}
          />

          <QuestionRow
            label="هل اتبعت الآيات؟"
            value={activeVerse.practiced}
            onToggle={() => toggleQuestion('practiced')}
            taskOn={activeVerse.taskMarked.practiced}
            onTask={() => toggleTask('practiced')}
          />

          <QuestionRow
            label="هل علمت الآيات؟"
            value={activeVerse.taught}
            onToggle={() => toggleQuestion('taught')}
            taskOn={activeVerse.taskMarked.taught}
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