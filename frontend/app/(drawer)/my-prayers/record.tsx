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

  // Range selection state - per rakka
  const [rangeStart, setRangeStart] = useState<Record<RakkaIndex, SearchItem | null>>({ 1: null, 2: null });
  const [rangeEnd, setRangeEnd] = useState<Record<RakkaIndex, SearchItem | null>>({ 1: null, 2: null });

  const bilingualParam = useMemo(() => (
    lang === "ar_tafseer" ? "tafseer" : 
    lang === "ar_en" ? "en" : 
    lang === "ar_es" ? "es" : 
    ""
  ), [lang]);

  const doSearch = async () => {
    if (!query.trim()) { 
      setResults(prev => ({ ...prev, [activeRakka]: [] })); 
      return; 
    }
    try {
      const rows = await searchQuran(query, (bilingualParam as any) || '');
      setResults(prev => ({ ...prev, [activeRakka]: rows as SearchItem[] }));
    } catch (e) {
      console.warn("search error", e);
    }
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
    const start = rangeStart[activeRakka];
    const end = rangeEnd[activeRakka];
    
    if (!start) { 
      setRangeStart(prev => ({ ...prev, [activeRakka]: item })); 
      return; 
    }
    if (start && !end) {
      if (item.surahNumber !== start.surahNumber) {
        setRangeStart(prev => ({ ...prev, [activeRakka]: item })); 
        setRangeEnd(prev => ({ ...prev, [activeRakka]: null })); 
        return;
      }
      setRangeEnd(prev => ({ ...prev, [activeRakka]: item }));
      return;
    }
    setRangeStart(prev => ({ ...prev, [activeRakka]: item })); 
    setRangeEnd(prev => ({ ...prev, [activeRakka]: null }));
  };

  const selectWholeSurah = async () => {
    setShowSurahSelector(true);
  };

  const toggleQuestion = (key: QuestionKey) => {
    if (!record) return;
    const rk = record.rakka[activeRakka];
    const next = { ...record, rakka: { ...record.rakka, [activeRakka]: { ...rk, questions: { ...rk.questions, [key]: !rk.questions[key] } } } };
    setRecord(next);
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
    // Set up for range selection mode - user will select verses manually
    const mockItem: SearchItem = {
      surahNumber: surah.number,
      nameAr: surah.nameAr,
      nameEn: surah.nameEn,
      ayah: 1,
      textAr: '',
    };
    setRangeStart(prev => ({ ...prev, [activeRakka]: mockItem }));
    setRangeEnd(prev => ({ ...prev, [activeRakka]: null }));
    showToast(`تم اختيار ${surah.nameAr} - اختر نطاق الآيات`);
  };

  const handleSelectWholeSurah = async (surah: { number: number; nameAr: string; nameEn: string }) => {
    try {
      const mod = Platform.OS === 'web' ? await import("../../../src/db/quran.web") : await import("../../../src/db/quran.native");
      const range = await mod.getSurahRange(surah.number);
      if (range) {
        const startItem: SearchItem = {
          surahNumber: surah.number,
          nameAr: surah.nameAr,
          nameEn: surah.nameEn,
          ayah: range.fromAyah,
          textAr: '',
        };
        const endItem: SearchItem = {
          surahNumber: surah.number,
          nameAr: surah.nameAr,
          nameEn: surah.nameEn,
          ayah: range.toAyah,
          textAr: '',
        };
        setRangeStart(prev => ({ ...prev, [activeRakka]: startItem }));
        setRangeEnd(prev => ({ ...prev, [activeRakka]: endItem }));
        showToast(`تم اختيار ${surah.nameAr} كاملة`);
      } else {
        // Fallback - just set a mock range
        const startItem: SearchItem = {
          surahNumber: surah.number,
          nameAr: surah.nameAr,
          nameEn: surah.nameEn,
          ayah: 1,
          textAr: '',
        };
        setRangeStart(prev => ({ ...prev, [activeRakka]: startItem }));
        setRangeEnd(prev => ({ ...prev, [activeRakka]: startItem }));
        showToast(`تم اختيار ${surah.nameAr}`);
      }
    } catch (error) {
      console.warn('Error getting surah range:', error);
      showToast(`خطأ في تحديد نطاق ${surah.nameAr}`);
    }
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

  const handleCompleteRecording = async () => {
    if (!record) {
      router.replace('/(drawer)/my-prayers');
      return;
    }

    // Always navigate to main prayers page after completing
    router.replace('/(drawer)/my-prayers');
  };

  const sc = record ? computeScore(record) : { r1: 0, r2: 0, total: 0 };

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
            <TouchableOpacity onPress={selectWholeSurah} style={styles.wholeSurahBtn}>
              <Text style={styles.wholeSurahBtnText}>السورة كاملة</Text>
            </TouchableOpacity>

            <View style={styles.langChipsContainer}>
              <TouchableOpacity 
                style={[styles.langChip, lang === "ar" && styles.langChipActive]}
                onPress={() => setLang("ar")}
              >
                <Text style={[styles.langChipText, lang === "ar" && styles.langChipTextActive]}>عربي</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.langChip, lang === "ar_tafseer" && styles.langChipActive]}
                onPress={() => setLang("ar_tafseer")}
              >
                <Text style={[styles.langChipText, lang === "ar_tafseer" && styles.langChipTextActive]}>تفسير</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TextInput
            placeholder="ابحث في القرآن..."
            placeholderTextColor="#888"
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            textAlign="right"
          />

          {/* Search Results */}
          {results[activeRakka].length > 0 && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>نتائج البحث ({results[activeRakka].length})</Text>
              {results[activeRakka].slice(0, 10).map((item, idx) => (
                <TouchableOpacity
                  key={`${item.surahNumber}-${item.ayah}-${idx}`}
                  style={[
                    styles.resultRow,
                    withinRange(item) && styles.resultRowSelected
                  ]}
                  onPress={() => onVerseNumberPress(item)}
                >
                  <View style={styles.resultHeader}>
                    <Text style={styles.verseRef}>
                      {item.nameAr} {item.surahNumber}:{item.ayah}
                    </Text>
                  </View>
                  <HighlightedText 
                    text={item.textAr}
                    searchTerm={query}
                    style={styles.arabicText}
                  />
                  {lang === "ar_tafseer" && item.tafseer && (
                    <HighlightedText 
                      text={item.tafseer}
                      searchTerm={query}
                      style={styles.tafseerText}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
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
            
            {record && record.rakka[activeRakka].questions.taught && (
              <View style={styles.countRow}>
                <Text style={styles.countLabel}>كم شخص علمت؟</Text>
                <TextInput
                  placeholder="أدخل العدد"
                  placeholderTextColor="#888"
                  value={String(record.rakka[activeRakka].taughtCount || 0)}
                  onChangeText={setTaughtCount}
                  keyboardType="number-pad"
                  style={styles.countInput}
                  textAlign="center"
                />
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
        <TouchableOpacity onPress={handleCompleteRecording} style={styles.doneButton}>
          <Text style={styles.doneButtonText}>تم</Text>
        </TouchableOpacity>
      </View>

      {/* SurahSelector Modal */}
      <SurahSelector
        visible={showSurahSelector}
        onClose={() => setShowSurahSelector(false)}
        onSelectSurah={handleSelectSurah}
        onSelectWholeSurah={handleSelectWholeSurah}
      />
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
  langChipsContainer: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  langChip: {
    backgroundColor: '#2a3f3e',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  langChipActive: {
    backgroundColor: Colors.warmOrange,
    borderColor: Colors.warmOrange,
  },
  langChipText: {
    color: Colors.light,
    fontSize: 12,
    fontWeight: '600',
  },
  langChipTextActive: {
    color: Colors.dark,
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
});