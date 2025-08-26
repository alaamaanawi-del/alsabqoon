import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Keyboard, Switch, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Colors } from "../../../src/theme/colors";
import { searchQuran } from "../../../src/db/quran.index";
import { loadPrayerRecord, savePrayerRecord, syncTasksFromRecord, computeScore, type PrayerRecord, type VerseRange, type RakkaIndex, type QuestionKey } from "../../../src/storage/prayer";
import { showToast } from "../../../src/utils/toast";
import SurahSelector from "../../../src/components/SurahSelector";
import SelectedVersesDisplay from "../../../src/components/SelectedVersesDisplay";

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

const ymdFromParam = (dateParam?: string) => {
  if (!dateParam) return todayStr();
  // Expect YYYY-MM-DD
  return dateParam;
};

const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
};

const highlightSearchTerm = (text: string, searchTerm: string) => {
  if (!searchTerm.trim()) return text;
  
  // Simple highlighting - in a real app you might want to use a more sophisticated approach
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return text.replace(regex, "**$1**"); // Using markdown-style highlighting for now
};

export default function RecordPrayer() {
  const { prayer, date, focus } = useLocalSearchParams<{ prayer?: string; date?: string; focus?: string }>();
  const router = useRouter();
  const p = (prayer as string) || 'fajr';
  const day = ymdFromParam(date as string | undefined);

  // Parse focus parameter: "1:understood" or "2:dua"
  const [focusRakka, focusQuestion] = useMemo(() => {
    if (!focus) return [null, null];
    const [r, q] = focus.split(':');
    return [parseInt(r) as RakkaIndex || null, q as QuestionKey || null];
  }, [focus]);

  const [record, setRecord] = useState<PrayerRecord | null>(null);
  const [activeRakka, setActiveRakka] = useState<RakkaIndex>(focusRakka || 1);

  const [query, setQuery] = useState("");
  const [lang, setLang] = useState<"ar" | "ar_tafseer" | "ar_en" | "ar_es">("ar");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [showSurahSelector, setShowSurahSelector] = useState(false);

  // Range selection state
  const [rangeStart, setRangeStart] = useState<SearchItem | null>(null);
  const [rangeEnd, setRangeEnd] = useState<SearchItem | null>(null);

  const bilingualParam = useMemo(() => (
    lang === "ar_tafseer" ? "tafseer" : 
    lang === "ar_en" ? "en" : 
    lang === "ar_es" ? "es" : 
    ""
  ), [lang]);

  useEffect(() => {
    (async () => {
      const r = await loadPrayerRecord(p, day);
      setRecord(r);
    })();
  }, [p, day]);

  // Autosave debounce
  const saveRef = useRef<any>(null);
  useEffect(() => {
    if (!record) return;
    clearTimeout(saveRef.current);
    saveRef.current = setTimeout(async () => {
      await savePrayerRecord(record);
      await syncTasksFromRecord(record);
    }, 300);
    return () => clearTimeout(saveRef.current);
  }, [record]);

  const doSearch = async () => {
    if (!query.trim()) { setResults([]); return; }
    try {
      const rows = await searchQuran(query, (bilingualParam as any) || '');
      setResults(rows as SearchItem[]);
    } catch (e) {
      console.warn("search error", e);
    }
  };
  useEffect(() => { const t = setTimeout(doSearch, 250); return () => clearTimeout(t); }, [query, bilingualParam]);

  const clearRange = () => {
    setRangeStart(null); setRangeEnd(null);
    showToast('تم إلغاء التحديد');
  };

  const withinRange = (it: SearchItem) => {
    if (!rangeStart || !rangeEnd) return false;
    if (rangeStart.surahNumber !== rangeEnd.surahNumber) return false;
    if (it.surahNumber !== rangeStart.surahNumber) return false;
    const min = Math.min(rangeStart.ayah, rangeEnd.ayah);
    const max = Math.max(rangeStart.ayah, rangeEnd.ayah);
    return it.ayah >= min && it.ayah <= max;
  };

  const onVerseNumberPress = (item: SearchItem) => {
    if (!rangeStart) { setRangeStart(item); return; }
    if (rangeStart && !rangeEnd) {
      if (item.surahNumber !== rangeStart.surahNumber) {
        setRangeStart(item); setRangeEnd(null); return;
      }
      setRangeEnd(item);
      return;
    }
    setRangeStart(item); setRangeEnd(null);
  };

  const selectWholeSurah = async () => {
    setShowSurahSelector(true);
  };

  const addCurrentRange = () => {
    if (!record || !rangeStart || !rangeEnd) return;
    const fromAyah = Math.min(rangeStart.ayah, rangeEnd.ayah);
    const toAyah = Math.max(rangeStart.ayah, rangeEnd.ayah);
    const vr: VerseRange = {
      surahNumber: rangeStart.surahNumber,
      nameAr: rangeStart.nameAr,
      nameEn: rangeStart.nameEn,
      fromAyah,
      toAyah,
    };
    const next = { ...record, rakka: { ...record.rakka, [activeRakka]: { ...record.rakka[activeRakka], ranges: [...record.rakka[activeRakka].ranges, vr] } } };
    setRecord(next);
    clearRange();
    showToast('تم حفظ النطاق');
  };

  const removeRange = (idx: number) => {
    if (!record) return;
    const list = [...record.rakka[activeRakka].ranges];
    list.splice(idx, 1);
    setRecord({ ...record, rakka: { ...record.rakka, [activeRakka]: { ...record.rakka[activeRakka], ranges: list } } });
    showToast('تم حذف النطاق');
  };

  const clearAllRanges = () => {
    if (!record) return;
    setRecord({ ...record, rakka: { ...record.rakka, [activeRakka]: { ...record.rakka[activeRakka], ranges: [] } } });
    showToast('تم مسح جميع النطاقات');
  };

  const toggleQuestion = (key: 'understood' | 'dua' | 'followed' | 'taught') => {
    if (!record) return;
    const rk = record.rakka[activeRakka];
    const next = { ...record, rakka: { ...record.rakka, [activeRakka]: { ...rk, questions: { ...rk.questions, [key]: !rk.questions[key] } } } };
    setRecord(next);
  };

  const setTaughtCount = (n: string) => {
    if (!record) return;
    const val = parseInt(n || '0', 10) || 0;
    const rk = record.rakka[activeRakka];
    setRecord({ ...record, rakka: { ...record.rakka, [activeRakka]: { ...rk, taughtCount: val } } });
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
    setRangeStart(mockItem);
    setRangeEnd(null);
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
        setRangeStart(startItem);
        setRangeEnd(endItem);
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
        setRangeStart(startItem);
        setRangeEnd(startItem);
        showToast(`تم اختيار ${surah.nameAr}`);
      }
    } catch (error) {
      console.warn('Error getting surah range:', error);
      showToast(`خطأ في تحديد نطاق ${surah.nameAr}`);
    }
  };

  const sc = record ? computeScore(record) : { r1: 0, r2: 0, total: 0 };

  const handleCompleteRecording = async () => {
    if (!record) {
      router.back();
      return;
    }

    // Check if any tasks were added across both rakkas
    const hasTasks = Object.values(record.rakka).some(rakka => 
      Object.values(rakka.addToTask).some(taskAdded => taskAdded === true)
    );

    if (hasTasks) {
      // Show confirmation dialog for navigation
      Alert.alert(
        'تم التسجيل',
        'تم حفظ الصلاة وإضافة المهام. هل تريد الانتقال إلى صفحة المهام؟',
        [
          {
            text: 'البقاء هنا',
            style: 'cancel',
            onPress: () => router.back()
          },
          {
            text: 'المهام',
            onPress: () => {
              router.replace('/(drawer)/tasks');
            }
          }
        ]
      );
    } else {
      // No tasks added, just go back
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>تسجيل - {p}</Text>

        {/* Score bar */}
        <View style={styles.scoreBox}>
          <Text style={styles.scoreTxt}>الدرجة اليوم: {Math.round(sc.total)} / 100</Text>
          <View style={styles.progressOuter}><View style={[styles.progressInner, { width: `${Math.min(100, sc.total)}%` }]} /></View>
          <Text style={styles.subScore}>ركعة 1: {Math.round(sc.r1)} • ركعة 2: {Math.round(sc.r2)}</Text>
        </View>

        {/* Rakka tabs */}
        <View style={styles.tabs}>
          <TabBtn label="ركعة 1" active={activeRakka === 1} onPress={() => setActiveRakka(1)} />
          <TabBtn label="ركعة 2" active={activeRakka === 2} onPress={() => setActiveRakka(2)} />
        </View>

        {/* Selected Verses Display */}
        {record && (
          <SelectedVersesDisplay 
            ranges={record.rakka[activeRakka].ranges} 
            maxLines={8}
          />
        )}

        <TextInput
          placeholder="ابحث في القرآن..."
          placeholderTextColor={"#ccc"}
          value={query}
          onChangeText={setQuery}
          style={styles.input}
          returnKeyType="search"
          onSubmitEditing={() => { Keyboard.dismiss(); doSearch(); }}
          textAlign="right"
        />

        <View style={styles.actionsRow}>
          <View style={styles.controlsGroup}>
            <TouchableOpacity onPress={selectWholeSurah} style={styles.wholeSurahBtn}>
              <Text style={styles.wholeSurahTxt}>السورة كاملة</Text>
            </TouchableOpacity>
            
            {/* Language chips positioned to the right */}
            <View style={styles.langRow}>
              <LangChip active={lang === "ar"} label="عربي" onPress={() => setLang("ar")} />
              <LangChip active={lang === "ar_tafseer"} label="عربي + تفسير" onPress={() => setLang("ar_tafseer")} />
              <LangChip active={lang === "ar_en"} label="عربي + English" onPress={() => setLang("ar_en")} />
              <LangChip active={lang === "ar_es"} label="عربي + Español" onPress={() => setLang("ar_es")} />
            </View>
          </View>
          
          {(rangeStart || rangeEnd) && (
            <View style={styles.rangeBar}>
              <Text style={styles.rangeText}>
                {rangeStart ? `${rangeStart.nameAr} ${rangeStart.surahNumber}: ${Math.min(rangeStart.ayah, rangeEnd?.ayah ?? rangeStart.ayah)}` : ''}
                {rangeEnd ? ` → ${Math.max(rangeStart!.ayah, rangeEnd.ayah)}` : ''}
              </Text>
              <TouchableOpacity onPress={addCurrentRange} style={styles.saveRangeBtn}><Text style={styles.saveRangeTxt}>حفظ النطاق</Text></TouchableOpacity>
              <TouchableOpacity onPress={clearRange} style={styles.clearBtn}><Text style={styles.clearTxt}>مسح</Text></TouchableOpacity>
            </View>
          )}
        </View>

        {/* Saved range chips */}
        {record && record.rakka[activeRakka].ranges.length > 0 && (
          <View style={styles.chipsWrap}>
            {record.rakka[activeRakka].ranges.map((r, idx) => (
              <View key={`${r.surahNumber}-${r.fromAyah}-${r.toAyah}-${idx}`} style={styles.chip}>
                <Text style={styles.chipTxt}>{r.nameAr} {r.surahNumber}: {r.fromAyah} - {r.toAyah}</Text>
                <TouchableOpacity onPress={() => removeRange(idx)} style={styles.chipX}><Text style={styles.chipXTxt}>×</Text></TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity onPress={clearAllRanges} style={styles.clearAll}><Text style={styles.clearAllTxt}>مسح كل نطاقات الركعة</Text></TouchableOpacity>
          </View>
        )}
        {/* Search Results */}
        {results.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>نتائج البحث ({results.length})</Text>
            {results.slice(0, 20).map((item, idx) => (
              <TouchableOpacity
                key={`${item.surahNumber}-${item.ayah}-${idx}`}
                style={[
                  styles.resultRow,
                  withinRange(item) && { backgroundColor: Colors.warmOrange }
                ]}
                onPress={() => onVerseNumberPress(item)}
              >
                <View style={styles.resultHeader}>
                  <Text style={[styles.verseRef, withinRange(item) && { color: Colors.dark }]}>
                    {item.nameAr} {item.surahNumber}:{item.ayah}
                  </Text>
                </View>
                <Text style={[styles.arabicText, withinRange(item) && { color: Colors.dark }]}>
                  {highlightSearchTerm(item.textAr, query)}
                </Text>
                {lang === "ar_tafseer" && item.tafseer && (
                  <Text style={[styles.translationText, withinRange(item) && { color: Colors.dark }]}>
                    {highlightSearchTerm(item.tafseer, query)}
                  </Text>
                )}
                {lang === "ar_en" && item.en && (
                  <Text style={[styles.translationText, withinRange(item) && { color: Colors.dark }]}>
                    {highlightSearchTerm(item.en, query)}
                  </Text>
                )}
                {lang === "ar_es" && item.es && (
                  <Text style={[styles.translationText, withinRange(item) && { color: Colors.dark }]}>
                    {highlightSearchTerm(item.es, query)}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
            {results.length > 20 && (
              <Text style={styles.moreResults}>
                عرض أول 20 نتيجة من {results.length}
              </Text>
            )}
          </View>
        )}

        {/* Questions + Add to task */}
        {record && (
          <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
            <QuestionRow
              label="فهمت الآيات؟"
              value={record.rakka[activeRakka].questions.understood}
              onToggle={() => toggleQuestion('understood')}
              taskOn={record.rakka[activeRakka].addToTask.understood}
              onTask={() => toggleTask('understood')}
              isHighlighted={focusQuestion === 'understood' && activeRakka === focusRakka}
            />
            <QuestionRow
              label="هل دعوت؟"
              value={record.rakka[activeRakka].questions.dua}
              onToggle={() => toggleQuestion('dua')}
              taskOn={record.rakka[activeRakka].addToTask.dua}
              onTask={() => toggleTask('dua')}
              isHighlighted={focusQuestion === 'dua' && activeRakka === focusRakka}
            />
            <QuestionRow
              label="هل اتبعت الآيات؟"
              value={record.rakka[activeRakka].questions.followed}
              onToggle={() => toggleQuestion('followed')}
              taskOn={record.rakka[activeRakka].addToTask.followed}
              onTask={() => toggleTask('followed')}
              isHighlighted={focusQuestion === 'followed' && activeRakka === focusRakka}
            />
            <QuestionRow
              label="هل علّمت الآيات؟"
              value={record.rakka[activeRakka].questions.taught}
              onToggle={() => toggleQuestion('taught')}
              taskOn={record.rakka[activeRakka].addToTask.taught}
              onTask={() => toggleTask('taught')}
              isHighlighted={focusQuestion === 'taught' && activeRakka === focusRakka}
            />
            {record.rakka[activeRakka].questions.taught && (
              <View style={styles.countRow}>
                <Text style={styles.countLabel}>كم شخصًا؟</Text>
                <TextInput
                  placeholder="0"
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
            )}
          </View>
        )}

        <View style={styles.spacer} />
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleCompleteRecording} style={styles.primaryBtn}><Text style={styles.primaryText}>تم</Text></TouchableOpacity>
        </View>
      </ScrollView>

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

function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.tabBtn, active && styles.tabBtnActive]}>
      <Text style={{ color: active ? Colors.dark : Colors.light, fontWeight: '800' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function LangChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.langChip, active && styles.langChipActive]}>
      <Text style={{ color: active ? Colors.dark : Colors.light, fontWeight: "700" }}>{label}</Text>
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
    <View style={[styles.qRow, isHighlighted && styles.highlightedQuestion]}>
      <TouchableOpacity onPress={onTask} style={[styles.taskBtn, taskOn && { backgroundColor: Colors.warmOrange }]}>
        <Text style={{ color: taskOn ? Colors.dark : Colors.light, fontWeight: "800" }}>مهمة</Text>
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.qLabel}>{label}</Text>
      </View>
      <Switch value={value} onValueChange={onToggle} thumbColor={value ? Colors.warmOrange : "#ccc"} trackColor={{ true: "#705100", false: "#666" }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  scrollContent: { flexGrow: 1 },
  header: { color: Colors.light, fontSize: 18, fontWeight: "800", padding: 16 },
  scoreBox: { backgroundColor: '#1d2a29', marginHorizontal: 12, borderRadius: 12, padding: 12, marginBottom: 8 },
  scoreTxt: { color: Colors.light, fontWeight: '800' },
  subScore: { color: '#A6D3CF', marginTop: 6 },
  progressOuter: { height: 8, backgroundColor: '#263736', borderRadius: 6, marginTop: 8 },
  progressInner: { height: 8, backgroundColor: Colors.warmOrange, borderRadius: 6 },
  tabs: { flexDirection: 'row-reverse', gap: 8, paddingHorizontal: 12, marginBottom: 8 },
  tabBtn: { borderColor: Colors.warmOrange, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  tabBtnActive: { backgroundColor: Colors.warmOrange },
  langRow: { flexDirection: "row-reverse", gap: 8 },
  langChip: { borderColor: Colors.warmOrange, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  langChipActive: { backgroundColor: Colors.warmOrange },
  input: { backgroundColor: "#1d2a29", color: Colors.light, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, margin: 12, textAlign: "right" },
  actionsRow: { paddingHorizontal: 12, gap: 8 },
  controlsGroup: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  wholeSurahBtn: { alignSelf: 'flex-start', backgroundColor: Colors.greenTeal, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  wholeSurahTxt: { color: Colors.light, fontWeight: '800' },
  rangeBar: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, backgroundColor: '#1d2a29', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  rangeText: { color: Colors.light, fontSize: 14 },
  saveRangeBtn: { backgroundColor: Colors.greenTeal, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginLeft: 8 },
  saveRangeTxt: { color: Colors.light, fontWeight: '800' },
  clearBtn: { backgroundColor: Colors.warmOrange, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginLeft: 8 },
  clearTxt: { color: Colors.dark, fontWeight: '700' },
  chipsWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  chip: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#23403d', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipTxt: { color: Colors.light },
  chipX: { marginHorizontal: 6 },
  chipXTxt: { color: Colors.warmOrange, fontWeight: '800' },
  clearAll: { backgroundColor: '#5a2e2e', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  clearAllTxt: { color: '#ffd7d7', fontWeight: '800' },
  qRow: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#1d2a29', padding: 12, borderRadius: 12, marginBottom: 8, gap: 8 },
  highlightedQuestion: { backgroundColor: '#2a3d1d', borderColor: Colors.warmOrange, borderWidth: 1 },
  qLabel: { color: Colors.light, fontWeight: '700', textAlign: 'right' },
  taskBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderColor: Colors.warmOrange, borderWidth: 1 },
  countRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: '#1d2a29', padding: 12, borderRadius: 12, marginBottom: 8 },
  countLabel: { color: Colors.light },
  countInput: { backgroundColor: '#263736', color: Colors.light, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, minWidth: 64 },
  spacer: { height: 80 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: "rgba(0,0,0,0.6)" },
  primaryBtn: { backgroundColor: Colors.warmOrange, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  primaryText: { color: Colors.dark, fontWeight: "800", fontSize: 16 },

  resultRow: { backgroundColor: "#1d2a29", padding: 12, borderRadius: 12, marginBottom: 8 },
  resultHeader: { marginBottom: 4 },
  verseRef: { color: Colors.warmOrange, fontWeight: "700", fontSize: 14 },
  arabicText: { color: Colors.light, fontSize: 16, textAlign: "right", marginBottom: 4 },
  translationText: { color: "#A6D3CF", fontSize: 14, textAlign: "right" },
  resultsContainer: { 
    marginHorizontal: 12, 
    marginBottom: 8,
    maxHeight: 400,
    backgroundColor: '#1d2a29',
    borderRadius: 12,
    padding: 12
  },
  resultsList: {
    maxHeight: 300,
  },
  resultsTitle: { 
    color: Colors.warmOrange, 
    fontWeight: "700", 
    fontSize: 16, 
    marginBottom: 8, 
    textAlign: "right" 
  },
  moreResults: { 
    color: "#A6D3CF", 
    fontSize: 14, 
    textAlign: "center", 
    marginTop: 8, 
    fontStyle: "italic" 
  },
});