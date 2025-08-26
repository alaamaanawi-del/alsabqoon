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
