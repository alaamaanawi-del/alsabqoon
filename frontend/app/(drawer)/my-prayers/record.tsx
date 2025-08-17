import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Keyboard } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Colors } from "../../../src/theme/colors";
import { searchQuran, type SearchItem as DBItem } from "../../../src/db/quran";

interface SearchItem extends DBItem {}

export default function RecordPrayer() {
  const { prayer } = useLocalSearchParams<{ prayer?: string }>();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [lang, setLang] = useState<"ar" | "ar_en" | "ar_es">("ar");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]); // key: surah:ayah

  const bilingualParam = useMemo(() => (lang === "ar_en" ? "en" : lang === "ar_es" ? "es" : ""), [lang]);

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

  const toggle = (item: SearchItem) => {
    const key = `${item.surahNumber}:${item.ayah}`;
    setSelected((prev) => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.header}>تسجيل - {prayer || "صلاة"}</Text>
        <View style={styles.langRow}>
          <LangChip active={lang === "ar"} label="عربي" onPress={() => setLang("ar")} />
          <LangChip active={lang === "ar_en"} label="عربي + English" onPress={() => setLang("ar_en")} />
          <LangChip active={lang === "ar_es"} label="عربي + Español" onPress={() => setLang("ar_es")} />
        </View>
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
        <FlatList
          data={results}
          keyExtractor={(it) => `${it.surahNumber}:${it.ayah}`}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => toggle(item)} style={[styles.item, selected.includes(`${item.surahNumber}:${item.ayah}`) && styles.itemActive]}>
              <Text style={styles.ayahAr}>{item.textAr}</Text>
              <Text style={styles.meta}>{item.nameAr} • {item.nameEn} • {item.surahNumber}:{item.ayah}</Text>
              {lang === "ar_en" && !!item.en && <Text style={styles.tr}>{item.en}</Text>}
              {lang === "ar_es" && !!item.es && <Text style={styles.tr}>{item.es}</Text>}
            </TouchableOpacity>
          )}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        />
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.primaryBtn}><Text style={styles.primaryText}>تم</Text></TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function LangChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.langChip, active && styles.langChipActive]}>
      <Text style={{ color: active ? Colors.dark : Colors.light, fontWeight: "700" }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  header: { color: Colors.light, fontSize: 18, fontWeight: "800", padding: 16 },
  langRow: { flexDirection: "row-reverse", paddingHorizontal: 16, gap: 8 },
  langChip: { borderColor: Colors.warmOrange, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  langChipActive: { backgroundColor: Colors.warmOrange },
  input: { backgroundColor: "#1d2a29", color: Colors.light, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, margin: 12, textAlign: "right" },
  item: { backgroundColor: "#1d2a29", borderRadius: 12, padding: 12, marginBottom: 8 },
  itemActive: { borderColor: Colors.warmOrange, borderWidth: 1 },
  ayahAr: { color: Colors.light, fontSize: 16, lineHeight: 28 },
  meta: { color: "#A6D3CF", marginTop: 6, fontSize: 12 },
  tr: { color: "#d7d7d7", marginTop: 6, fontSize: 13 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: "rgba(0,0,0,0.6)" },
  primaryBtn: { backgroundColor: Colors.warmOrange, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  primaryText: { color: Colors.dark, fontWeight: "800", fontSize: 16 },
});