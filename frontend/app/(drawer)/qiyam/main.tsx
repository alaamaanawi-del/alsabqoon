import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../src/theme/colors';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  getQiyamHistory,
  getQiyamStats,
  QiyamEntry,
  QiyamStats,
} from '../../../src/api/client';

export default function QiyamMainScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<QiyamEntry[]>([]);
  const [stats, setStats] = useState<QiyamStats>({
    total_verses: 0,
    total_sessions: 0,
    progress_percentage: 0.0,
    last_entry: undefined,
  });
  const [loading, setLoading] = useState(true);

  const currentDate = date || new Date().toISOString().split('T')[0];

  const loadQiyamData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load history and stats
      const historyResponse = await getQiyamHistory(currentDate);
      const statsResponse = await getQiyamStats(currentDate);
      
      setHistory(historyResponse.entries || []);
      setStats(statsResponse);
      
    } catch (error) {
      console.error('Error loading Qiyam data:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل بيانات قيام الليل');
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadQiyamData();
    }, [loadQiyamData])
  );

  const navigateToVerse = (verseNumber?: number) => {
    const nextVerse = verseNumber || (history.length + 1);
    router.push({
      pathname: '/(drawer)/qiyam/verse',
      params: { 
        date: currentDate,
        verse: nextVerse.toString(),
      }
    });
  };

  const renderVerseButton = (verseNumber: number) => {
    const entry = history.find(h => h.verse_number === verseNumber);
    const isCompleted = entry !== undefined;
    
    return (
      <TouchableOpacity
        key={verseNumber}
        style={[
          styles.verseButton,
          isCompleted && styles.verseButtonCompleted
        ]}
        onPress={() => navigateToVerse(verseNumber)}
      >
        <Text style={[
          styles.verseButtonText,
          isCompleted && styles.verseButtonTextCompleted
        ]}>
          آية {verseNumber}
        </Text>
      </TouchableOpacity>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(20, insets.bottom) }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-forward" size={24} color={Colors.light} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>قيام الليل</Text>
        </View>

        {/* Date Display */}
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>{formatDate(currentDate)}</Text>
        </View>

        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.total_verses}</Text>
            <Text style={styles.statLabel}>آيات</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.total_sessions}</Text>
            <Text style={styles.statLabel}>جلسات</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.progress_percentage.toFixed(1)}%</Text>
            <Text style={styles.statLabel}>التقدم</Text>
          </View>
        </View>

        {/* Verse Navigation - Scrollable */}
        <View style={styles.verseNavigation}>
          <Text style={styles.verseNavTitle}>الآيات</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.verseButtonsContainer}
          >
            {/* Render existing verses */}
            {Array.from({ length: Math.max(history.length + 1, 7) }, (_, i) => renderVerseButton(i + 1))}
          </ScrollView>
        </View>

        {/* Add New Verse Button */}
        <TouchableOpacity
          style={styles.addVerseButton}
          onPress={() => navigateToVerse()}
        >
          <Ionicons name="add" size={24} color={Colors.dark} />
          <Text style={styles.addVerseButtonText}>إضافة آية جديدة</Text>
        </TouchableOpacity>

        {/* History Summary */}
        {history.length > 0 && (
          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>ملخص اليوم</Text>
            {history.map((entry) => (
              <View key={entry.id} style={styles.historyItem}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyVerseNumber}>آية {entry.verse_number}</Text>
                  <Text style={styles.historyVerseCount}>{entry.verses_count} آية</Text>
                </View>
                
                {entry.input_method === 'surah_selection' && entry.surah_names && (
                  <Text style={styles.historySurahs}>{entry.surah_names}</Text>
                )}
                
                {/* Progress indicators */}
                <View style={styles.progressIndicators}>
                  <View style={[styles.indicator, entry.understood && styles.indicatorActive]}>
                    <Text style={styles.indicatorText}>فهم</Text>
                  </View>
                  <View style={[styles.indicator, entry.made_dua && styles.indicatorActive]}>
                    <Text style={styles.indicatorText}>دعا</Text>
                  </View>
                  <View style={[styles.indicator, entry.practiced && styles.indicatorActive]}>
                    <Text style={styles.indicatorText}>عمل</Text>
                  </View>
                  <View style={[styles.indicator, entry.taught && styles.indicatorActive]}>
                    <Text style={styles.indicatorText}>علم</Text>
                  </View>
                </View>
                
                {entry.notes && (
                  <Text style={styles.historyNotes}>{entry.notes}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {history.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="moon-outline" size={64} color={Colors.warmOrange} />
            <Text style={styles.emptyStateTitle}>لم تبدأ قيام الليل بعد</Text>
            <Text style={styles.emptyStateSubtitle}>اضغط على "إضافة آية جديدة" للبدء</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.light,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.greenTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: Colors.light,
    fontSize: 24,
    fontWeight: '800',
    flex: 1,
    textAlign: 'right',
    marginRight: 16,
  },
  dateContainer: {
    backgroundColor: '#0e1615',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  dateText: {
    color: Colors.warmOrange,
    fontSize: 18,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statBox: {
    backgroundColor: Colors.greenTeal,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 80,
  },
  statNumber: {
    color: Colors.light,
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    color: Colors.light,
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
    marginTop: 4,
  },
  verseNavigation: {
    marginBottom: 20,
  },
  verseNavTitle: {
    color: Colors.warmOrange,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 12,
  },
  verseButtonsContainer: {
    paddingHorizontal: 8,
    gap: 12,
  },
  verseButton: {
    backgroundColor: '#1d2a29',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  verseButtonCompleted: {
    backgroundColor: Colors.warmOrange,
    borderColor: Colors.warmOrange,
  },
  verseButtonText: {
    color: Colors.light,
    fontSize: 14,
    fontWeight: '600',
  },
  verseButtonTextCompleted: {
    color: Colors.dark,
  },
  addVerseButton: {
    backgroundColor: Colors.warmOrange,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  addVerseButtonText: {
    color: Colors.dark,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  historyContainer: {
    marginTop: 20,
  },
  historyTitle: {
    color: Colors.warmOrange,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 12,
  },
  historyItem: {
    backgroundColor: Colors.greenTeal,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyVerseNumber: {
    color: Colors.warmOrange,
    fontSize: 16,
    fontWeight: '700',
  },
  historyVerseCount: {
    color: Colors.light,
    fontSize: 14,
    fontWeight: '600',
  },
  historySurahs: {
    color: Colors.light,
    fontSize: 14,
    opacity: 0.8,
    textAlign: 'right',
    marginBottom: 8,
  },
  progressIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  indicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  indicatorActive: {
    backgroundColor: Colors.warmOrange,
  },
  indicatorText: {
    color: Colors.light,
    fontSize: 12,
    fontWeight: '600',
  },
  historyNotes: {
    color: Colors.light,
    fontSize: 12,
    opacity: 0.8,
    textAlign: 'right',
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    color: Colors.light,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
  },
  emptyStateSubtitle: {
    color: Colors.light,
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 8,
  },
});