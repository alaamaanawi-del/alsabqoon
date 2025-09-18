import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, Switch, ScrollView, Alert } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from "expo-router";
import { Colors } from "../../../src/theme/colors";
import { searchQuran } from "../../../src/db/quran.index";
import { loadPrayerRecord, savePrayerRecord, syncTasksFromRecord, computeScore, type PrayerRecord, type VerseRange, type RakkaIndex } from "../../../src/storage/prayer";
import { showToast } from "../../../src/utils/toast";
import { createZikrEntry, getCurrentLocalDateString } from "../../../src/api/client";
import SurahSelector from "../../../src/components/SurahSelector";
import SuraViewer from "../../../src/components/SuraViewer";
import SearchResultsModal from "../../../src/components/SearchResultsModal";
import SelectedVersesDisplay from "../../../src/components/SelectedVersesDisplay";
import HighlightedText from "../../../src/components/HighlightedText";
import TaskProgressBar from "../../../src/components/TaskProgressBar";

const PRAYERS = [
  { key: "fajr", label: "الفجر" },
  { key: "dhuhr", label: "الظهر" },
  { key: "asr", label: "العصر" },
  { key: "maghrib", label: "المغرب" },
  { key: "isha", label: "العشاء" },
];

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

type QuestionKey = 'understood' | 'dua' | 'followed' | 'taught';

function ymdFromParam(dateParam?: string): string {
  if (!dateParam) return new Date().toISOString().split('T')[0];
  return dateParam;
}

// Tab Button Component
function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tab, active && styles.activeTab]}
    >
      <Text style={[styles.tabText, active && styles.activeTabText]}>{label}</Text>
    </TouchableOpacity>
  );
}

// Component for displaying question rows with task highlighting
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
    <View style={[styles.questionRow, isHighlighted && styles.highlightedQuestion]}>
      <Text style={styles.questionTxt}>{label}</Text>
      <View style={styles.questionRight}>
        <Switch
          trackColor={{ false: '#767577', true: Colors.greenTeal }}
          thumbColor={value ? Colors.warmOrange : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
          onValueChange={onToggle}
          value={value}
        />
        <TouchableOpacity onPress={onTask} style={[styles.taskToggle, taskOn && styles.taskToggleOn]}>
          <Text style={[styles.taskToggleTxt, !taskOn && styles.taskToggleGray]}>📋</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function RecordPrayer() {
  const { prayer, date, focus } = useLocalSearchParams<{ prayer?: string; date?: string; focus?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = (prayer as string) || 'fajr';
  const day = ymdFromParam(date as string | undefined);

  // Parse focus parameter: "1:understood" or "2:dua"
  const [focusRakka, focusQuestion] = useMemo(() => {
    if (!focus) return [null, null];
    const [r, q] = focus.split(':');
    return [parseInt(r) as RakkaIndex || null, q as QuestionKey || null];
  }, [focus]);

  const [record, setRecord] = useState<PrayerRecord | null>(null);
  const [activeRakka, setActiveRakka] = useState<RakkaIndex>(1);

  // Clear range selection when switching rakkas to prevent contamination
  const handleRakkaSwitch = (newRakka: RakkaIndex) => {
    if (newRakka !== activeRakka) {
      setActiveRakka(newRakka);
    }
  };

  const [query, setQuery] = useState("");
  const [lang, setLang] = useState<"ar" | "ar_tafseer" | "ar_en" | "ar_es">("ar");
  // Make results independent per rakka
  const [results, setResults] = useState<Record<RakkaIndex, SearchItem[]>>({ 1: [], 2: [] });
  const [showSurahSelector, setShowSurahSelector] = useState(false);
  const [showSuraViewer, setShowSuraViewer] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showTeachingComments, setShowTeachingComments] = useState(false);
  const [teachingComments, setTeachingComments] = useState("");
  const [selectedSura, setSelectedSura] = useState<{
    number: number;
    nameAr: string;
    nameEn: string;
    initialVerse?: number;
  } | null>(null);

  // Range selection state - per rakka
  const [rangeStart, setRangeStart] = useState<Record<RakkaIndex, SearchItem | null>>({ 1: null, 2: null });
  const [rangeEnd, setRangeEnd] = useState<Record<RakkaIndex, SearchItem | null>>({ 1: null, 2: null });
  
  // Teaching comments state

  const bilingualParam = useMemo(() => (
    lang === "ar_tafseer" ? "tafseer" : 
    lang === "ar_en" ? "en" : 
    lang === "ar_es" ? "es" : 
    ""
  ), [lang]);

  const doSearch = async () => {
    if (!query.trim()) { 
      setResults(prev => ({ ...prev, [activeRakka]: [] })); 
      setShowSearchResults(false);
      return; 
    }
    try {
      const rows = await searchQuran(query, (bilingualParam as any) || '');
      setResults(prev => ({ ...prev, [activeRakka]: rows as SearchItem[] }));
      // Show search results modal when there are results
      if (rows.length > 0) {
        setShowSearchResults(true);
      }
    } catch (e) {
      console.warn("search error", e);
      setResults(prev => ({ ...prev, [activeRakka]: [] }));
      setShowSearchResults(false);
    }
  };

  // Real-time search as user types
  const handleSearchChange = (text: string) => {
    setQuery(text);
    doSearch();
  };
  useEffect(() => { const t = setTimeout(doSearch, 250); return () => clearTimeout(t); }, [query, bilingualParam, activeRakka]);

  const clearRange = () => {
    setRangeStart(prev => ({ ...prev, [activeRakka]: null }));
    setRangeEnd(prev => ({ ...prev, [activeRakka]: null }));
    showToast('تم إلغاء التحديد');
  };

  const withinRange = (it: SearchItem) => {
    const start = rangeStart[activeRakka];
    const end = rangeEnd[activeRakka];
    if (!start || !end) return false;
    if (start.surahNumber !== end.surahNumber) return false;
    if (it.surahNumber !== start.surahNumber) return false;
    const min = Math.min(start.ayah, end.ayah);
    const max = Math.max(start.ayah, end.ayah);
    return it.ayah >= min && it.ayah <= max;
  };

  const onVerseNumberPress = (item: SearchItem) => {
    // When user clicks on search result, open the sura viewer at that verse
    setSelectedSura({
      number: item.surahNumber,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      initialVerse: item.ayah
    });
    setShowSuraViewer(true);
  };

  const selectWholeSurah = async () => {
    setShowSurahSelector(true);
  };

  const toggleQuestion = (key: QuestionKey) => {
    if (!record) return;
    console.log('🔄 TOGGLE DEBUG: Before toggle', { 
      key, 
      activeRakka, 
      currentValue: record.rakka[activeRakka]?.questions?.[key],
      fullRakka: record.rakka[activeRakka] 
    });
    
    const rk = record.rakka[activeRakka];
    const next = { ...record, rakka: { ...record.rakka, [activeRakka]: { ...rk, questions: { ...rk.questions, [key]: !rk.questions[key] } } } };
    setRecord(next);
    
    console.log('🔄 TOGGLE DEBUG: After toggle', { 
      key, 
      activeRakka, 
      newValue: !rk.questions[key],
      newRakka: next.rakka[activeRakka] 
    });
  };

  const setTaughtCount = (n: string) => {
    if (!record) return;
    const rk = record.rakka[activeRakka];
    const next = { ...record, rakka: { ...record.rakka, [activeRakka]: { ...rk, taughtCount: parseInt(n) || 0 } } };
    setRecord(next);
  };

  const setRakkaComments = (comments: string) => {
    if (!record) return;
    const rk = record.rakka[activeRakka];
    const next = { ...record, rakka: { ...record.rakka, [activeRakka]: { ...rk, comments } } };
    setRecord(next);
  };

  const toggleTask = (key: 'understood' | 'dua' | 'followed' | 'taught') => {
    if (!record) return;
    const rk = record.rakka[activeRakka];
    const now = !rk.addToTask[key];
    const next = { ...record, rakka: { ...record.rakka, [activeRakka]: { ...rk, addToTask: { ...rk.addToTask, [key]: now } } } };
    setRecord(next);
    showToast(now ? 'أُضيفت للمَهَام' : 'أُزيلت من المهام');
  };

  // SurahSelector handlers
  const handleSelectSurah = (surah: { number: number; nameAr: string; nameEn: string }) => {
    // Open sura viewer for range selection
    setSelectedSura({
      number: surah.number,
      nameAr: surah.nameAr,
      nameEn: surah.nameEn,
      initialVerse: 1
    });
    setShowSuraViewer(true);
  };

  const handleSelectWholeSurah = (surah: { number: number; nameAr: string; nameEn: string }) => {
    // Open sura viewer with whole sura pre-selected
    setSelectedSura({
      number: surah.number,
      nameAr: surah.nameAr,
      nameEn: surah.nameEn,
      initialVerse: 1
    });
    setShowSuraViewer(true);
  };

  // Load initial data
  useEffect(() => {
    (async () => {
      const rec = await loadPrayerRecord(p, day);
      setRecord(rec);
    })();
  }, [p, day]);

  // Auto-save with debounce
  useEffect(() => {
    if (!record) return;
    const timer = setTimeout(async () => {
      await savePrayerRecord(record);
      await syncTasksFromRecord(record, p, day);
    }, 300);
    return () => clearTimeout(timer);
  }, [record, p, day]);

  const handleRangeSelected = (startVerse: number, endVerse: number, verses: any[]) => {
    if (!record) return;
    
    try {
      // Create verse range objects for the selected verses
      const ranges: VerseRange[] = verses.map(verse => ({
        surahNumber: selectedSura!.number,
        surahNameAr: selectedSura!.nameAr,
        surahNameEn: selectedSura!.nameEn,
        fromAyah: verse.ayah,
        toAyah: verse.ayah,
        textAr: verse.textAr,
      }));

      // Update the record with the selected verse ranges
      const rk = record.rakka[activeRakka];
      const next = { 
        ...record, 
        rakka: { 
          ...record.rakka, 
          [activeRakka]: { 
            ...rk, 
            ranges: [...(rk.ranges || []), ...ranges]
          } 
        } 
      };
      
      setRecord(next);
      
      // Clear range selection state
      setRangeStart(prev => ({ ...prev, [activeRakka]: null }));
      setRangeEnd(prev => ({ ...prev, [activeRakka]: null }));
      
      // Clear search results and query to hide search display
      setQuery("");
      setResults(prev => ({ ...prev, [activeRakka]: [] }));
      
      // Close viewers
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


  const handleDone = async () => {
    if (!record) {
      router.replace('/(drawer)/my-prayers');
      return;
    }

    try {
      // Check if user taught anyone
      let totalTaughtCount = 0;
      const taughtRakkas = [];
      
      for (let rakkaNum = 1; rakkaNum <= 2; rakkaNum++) {
        const rakka = record.rakka[rakkaNum];
        if (rakka && rakka.questions && rakka.questions.taught && rakka.taughtCount > 0) {
          totalTaughtCount += rakka.taughtCount;
          taughtRakkas.push(rakkaNum);
        }
      }

      // If user taught people, create an entry in Da'wah category (ID 13)
      if (totalTaughtCount > 0) {
        const dateStr = getCurrentLocalDateString();
        const prayerName = PRAYERS.find(prayer => prayer.key === record.prayer)?.label || record.prayer;
        const rakkaText = taughtRakkas.length === 1 ? `الركعة ${taughtRakkas[0]}` : `الركعات ${taughtRakkas.join(' و ')}`;
        const baseTitle = `تعليم آيات الصلاة - ${prayerName} (${rakkaText}) - ${dateStr}`;
        const autoComment = teachingComments ? `${baseTitle}\n\nتفاصيل التعليم: ${teachingComments}` : baseTitle;
        
        console.log('Creating Dawah entry:', { totalTaughtCount, autoComment });
        
        await createZikrEntry(13, totalTaughtCount, dateStr, autoComment);
      }

      // FIXED WORKFLOW NAVIGATION
      if (activeRakka === 1) {
        // After completing rakka 1 → go to rakka 2
        console.log('🔄 Moving from rakka 1 to rakka 2');
        setActiveRakka(2);
        showToast('تم حفظ الركعة الأولى - انتقل إلى الركعة الثانية');
      } else if (activeRakka === 2) {
        // After completing rakka 2 → return to prayer list for same date
        console.log('🔄 Completing rakka 2 - returning to prayer list');
        if (totalTaughtCount > 0) {
          Alert.alert(
            'تم الحفظ',
            `تم تسجيل الصلاة وإضافة ${totalTaughtCount} في قسم الدعوة - تعليم`,
            [{ text: 'موافق', onPress: () => router.replace('/(drawer)/my-prayers') }]
          );
        } else {
          showToast('تم حفظ الصلاة بنجاح');
          router.replace('/(drawer)/my-prayers');
        }
      } else {
        // Fallback - return to prayers
        console.log('❌ Unknown rakka, returning to prayers');
        router.replace('/(drawer)/my-prayers');
      }
    } catch (error) {
      console.error('Error saving prayer record:', error);
      Alert.alert('خطأ', 'حدث خطأ في حفظ البيانات');
    }
  };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <View style={styles.headerInfoRow}>
          <Text style={styles.prayerNameText}>{PRAYERS.find(prayer => prayer.key === p)?.label || p}</Text>
          <Text style={styles.dayText}>{new Date().toLocaleDateString('ar-SA', { weekday: 'long' })}</Text>
          <Text style={styles.dateText}>{new Date().toLocaleDateString('ar-SA')}</Text>
          <View style={styles.progressBarContainer}>
            <TaskProgressBar score={sc.total} showPercentage={true} />
          </View>
        </View>
      </View>

      {/* Rakka Tabs */}
      <View style={styles.tabsContainer}>
        <TabBtn label="ركعة 1" active={activeRakka === 1} onPress={() => handleRakkaSwitch(1)} />
        <TabBtn label="ركعة 2" active={activeRakka === 2} onPress={() => handleRakkaSwitch(2)} />
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
        {record && (
          <SelectedVersesDisplay 
            ranges={record.rakka[activeRakka].ranges} 
            maxLines={8}
          />
        )}

        {/* Search Section */}
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

          {/* Search Results - Now shown in SearchResultsModal instead of inline */}
          {/* Inline search results removed to prevent overlapping with questions */}
        </View>

        {/* Questions Section */}
        {record && (
          <View key={`questions-${activeRakka}-${record.prayer}-${record.date}`} style={styles.questionsSection}>
            <QuestionRow
              label="هل فهمت الايات؟"
              value={record.rakka[activeRakka].questions.understood}
              onToggle={() => toggleQuestion('understood')}
              taskOn={record.rakka[activeRakka].addToTask.understood}
              onTask={() => toggleTask('understood')}
              isHighlighted={focusQuestion === 'understood' && activeRakka === focusRakka}
            />

            
            <QuestionRow
              label="الدعاء المتعلق بالايات."
              value={record.rakka[activeRakka].questions.dua}
              onToggle={() => toggleQuestion('dua')}
              taskOn={record.rakka[activeRakka].addToTask.dua}
              onTask={() => toggleTask('dua')}
              isHighlighted={focusQuestion === 'dua' && activeRakka === focusRakka}
            />

            
            <QuestionRow
              label="هل اتبعت الايات؟"
              value={record.rakka[activeRakka].questions.followed}
              onToggle={() => toggleQuestion('followed')}
              taskOn={record.rakka[activeRakka].addToTask.followed}
              onTask={() => toggleTask('followed')}
              isHighlighted={focusQuestion === 'followed' && activeRakka === focusRakka}
            />

            
            <QuestionRow
              label="هل علمت الايات؟"
              value={record.rakka[activeRakka].questions.taught}
              onToggle={() => toggleQuestion('taught')}
              taskOn={record.rakka[activeRakka].addToTask.taught}
              onTask={() => toggleTask('taught')}
              isHighlighted={focusQuestion === 'taught' && activeRakka === focusRakka}
            />
            
            {/* Always show count field for teaching question - TEMPORARY FIX */}
            {record && record.rakka[activeRakka] && record.rakka[activeRakka].questions.taught && (
              <View style={styles.teachingSection}>
                <View style={styles.countRow}>
                  <Text style={styles.countLabel}>كم شخص علمت؟</Text>
                  <TextInput
                    placeholder="أدخل العدد"
                    placeholderTextColor="#888"
                    value={String((record && record.rakka[activeRakka]) ? record.rakka[activeRakka].taughtCount || 0 : 0)}
                    onChangeText={setTaughtCount}
                    keyboardType="number-pad"
                    style={styles.countInput}
                    textAlign="center"
                  />
                </View>
                
                {/* Add Comment Button */}
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
                
                {/* Expandable Comment Field */}
                {showTeachingComments && (
                  <View style={styles.commentSection}>
                    <TextInput
                      style={styles.commentInput}
                      value={teachingComments}
                      onChangeText={setTeachingComments}
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
        )}

        {/* Comments Section */}
        {record && (
          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>التعليقات والملاحظات</Text>
            <TextInput
              placeholder="اضف تعليقاتك وملاحظاتك هنا..."
              placeholderTextColor="#888"
              value={record?.rakka?.[activeRakka]?.comments || ''}
              onChangeText={setRakkaComments}
              style={styles.commentsInput}
              textAlign="right"
              multiline={true}
              numberOfLines={4}
            />
          </View>
        )}
      </ScrollView>

      {/* Fixed Footer */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleDone} style={styles.doneButton}>
          <Text style={styles.doneButtonText}>تم</Text>
        </TouchableOpacity>
      </View>

      {/* SearchResultsModal */}
      <SearchResultsModal
        visible={showSearchResults}
        onClose={() => setShowSearchResults(false)}
        results={results[activeRakka]}
        searchTerm={query}
        onVersePress={onVerseNumberPress}
        onSearchChange={handleSearchChange}
      />

      {/* SurahSelector Modal */}
      <SurahSelector
        visible={showSurahSelector}
        onClose={() => setShowSurahSelector(false)}
        onSelectSurah={handleSelectSurah}
        onSelectWholeSurah={handleSelectWholeSurah}
      />

      {/* SuraViewer Modal */}
      {selectedSura && (
        <SuraViewer
          visible={showSuraViewer}
          onClose={() => {
            setShowSuraViewer(false);
            setSelectedSura(null);
          }}
          surahNumber={selectedSura.number}
          surahNameAr={selectedSura.nameAr}
          surahNameEn={selectedSura.nameEn}
          initialVerse={selectedSura.initialVerse}
          onRangeSelected={handleRangeSelected}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  header: {
    backgroundColor: Colors.deepGreen,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerInfoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  prayerNameText: {
    color: Colors.light,
    fontSize: 18,
    fontWeight: '700',
  },
  dayText: {
    color: Colors.light,
    fontSize: 14,
    fontWeight: '500',
  },
  dateText: {
    color: Colors.light,
    fontSize: 14,
    fontWeight: '500',
  },
  progressBarContainer: {
    flex: 1,
    marginLeft: 12,
  },
  tabsContainer: {
    flexDirection: 'row-reverse',
    backgroundColor: Colors.dark,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    backgroundColor: '#1d2a29',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: Colors.warmOrange,
  },
  tabText: {
    color: Colors.light,
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.dark,
    fontWeight: '700',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 120,
  },
  searchSection: {
    backgroundColor: '#1d2a29',
    margin: 12,
    borderRadius: 12,
    padding: 16,
  },
  controlsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  wholeSurahBtn: {
    backgroundColor: Colors.greenTeal,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  wholeSurahBtnText: {
    color: Colors.dark,
    fontSize: 14,
    fontWeight: '700',
  },
  searchInput: {
    backgroundColor: '#2a3f3e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: Colors.light,
    fontSize: 16,
    textAlign: 'right',
  },
  resultsContainer: {
    marginTop: 16,
    maxHeight: 300,
  },
  resultsTitle: {
    color: Colors.warmOrange,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'right',
  },
  resultRow: {
    backgroundColor: '#2a3f3e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  resultRowSelected: {
    backgroundColor: Colors.warmOrange,
  },
  resultHeader: {
    marginBottom: 4,
  },
  verseRef: {
    color: Colors.warmOrange,
    fontSize: 12,
    fontWeight: '700',
  },
  arabicText: {
    color: Colors.light,
    fontSize: 16,
    textAlign: 'right',
    lineHeight: 24,
  },
  tafseerText: {
    color: '#A6D3CF',
    fontSize: 14,
    textAlign: 'right',
    marginTop: 4,
    lineHeight: 20,
  },
  questionsSection: {
    backgroundColor: '#1d2a29',
    margin: 12,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    color: Colors.warmOrange,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 12,
  },
  questionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#2a3f3e',
    borderRadius: 8,
  },
  highlightedQuestion: {
    backgroundColor: 'rgba(255, 138, 88, 0.2)',
    borderWidth: 2,
    borderColor: Colors.warmOrange,
  },
  questionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  questionTxt: {
    color: Colors.light,
    fontSize: 16,
  },
  taskToggle: {
    backgroundColor: '#1d2a29',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskToggleOn: {
    backgroundColor: Colors.warmOrange,
  },
  taskToggleTxt: {
    color: Colors.light,
    fontSize: 16,
    fontWeight: '700',
  },
  taskToggleGray: {
    opacity: 0.3,
  },
  countRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a3f3e',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  countLabel: {
    color: Colors.light,
    fontSize: 16,
  },
  countInput: {
    backgroundColor: '#1d2a29',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    color: Colors.light,
    fontSize: 16,
    minWidth: 60,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.dark,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  doneButton: {
    backgroundColor: Colors.warmOrange,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: Colors.dark,
    fontSize: 18,
    fontWeight: '700',
  },
  expandedRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#1a2625',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  expandedLabel: {
    color: Colors.light,
    fontSize: 14,
    fontWeight: '600',
  },
  expandedInput: {
    backgroundColor: '#2a3f3e',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: Colors.light,
    fontSize: 14,
    flex: 1,
    minWidth: 100,
  },
  expandedNumberInput: {
    backgroundColor: '#2a3f3e',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: Colors.light,
    fontSize: 14,
    minWidth: 60,
  },
  taskLogoContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.warmOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskLogo: {
    fontSize: 16,
  },
  commentsSection: {
    backgroundColor: '#1d2a29',
    margin: 12,
    borderRadius: 12,
    padding: 16,
  },
  commentsInput: {
    backgroundColor: '#2a3f3e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: Colors.light,
    fontSize: 16,
    textAlign: 'right',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  teachingSection: {
    backgroundColor: '#2a3f3e',
    borderRadius: 8,
    marginTop: 8,
    padding: 12,
  },
  addCommentButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1d2a29',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  addCommentButtonText: {
    color: Colors.warmOrange,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  expandIcon: {
    color: Colors.warmOrange,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  commentSection: {
    marginTop: 8,
  },
  commentInput: {
    backgroundColor: '#1d2a29',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: Colors.light,
    fontSize: 16,
    textAlign: 'right',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 138, 88, 0.3)',
  },
});