import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Animated 
} from 'react-native';
import { Colors } from '../theme/colors';

interface VerseRange {
  surahNumber: number;
  nameAr: string;
  nameEn: string;
  fromAyah: number;
  toAyah: number;
  verses?: Array<{
    ayah: number;
    textAr: string;
  }>;
}

interface SelectedVersesDisplayProps {
  ranges: VerseRange[];
  maxLines?: number;
}

export default function SelectedVersesDisplay({ ranges, maxLines = 8 }: SelectedVersesDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTafseer, setShowTafseer] = useState(false);

  if (ranges.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>لم يتم اختيار آيات بعد</Text>
        <Text style={styles.emptySubText}>استخدم البحث أو "السورة كاملة" لاختيار الآيات</Text>
      </View>
    );
  }

  const renderRange = (range: VerseRange, index: number) => {
    const rangeText = range.fromAyah === range.toAyah 
      ? `الآية ${range.fromAyah}`
      : `الآيات ${range.fromAyah} - ${range.toAyah}`;
    
    return (
      <View key={index} style={styles.rangeContainer}>
        <Text style={styles.rangeHeader}>
          {range.nameAr} ({rangeText})
        </Text>
        {range.verses && range.verses.length > 0 ? (
          range.verses.map((verse, vIndex) => (
            <Text key={vIndex} style={styles.verseText}>
              ({verse.ayah}) {verse.textAr}
            </Text>
          ))
        ) : (
          <Text style={styles.placeholderText}>
            سيتم عرض النص عند الاتصال بقاعدة البيانات
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={() => setShowTafseer(!showTafseer)}
            style={[styles.actionButton, showTafseer && styles.actionButtonActive]}
          >
            <Text style={[styles.actionButtonText, showTafseer && styles.actionButtonTextActive]}>
              تفسير
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setIsExpanded(!isExpanded)}
            style={styles.actionButton}
          >
            <Text style={styles.actionButtonText}>
              {isExpanded ? 'طي' : 'توسيع'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>الآيات المختارة ({ranges.length})</Text>
      </View>

      <ScrollView 
        style={[
          styles.scrollContainer, 
          { 
            maxHeight: isExpanded ? 300 : 120,
            minHeight: 60
          }
        ]}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={false}
      >
        {ranges.map((range, index) => renderRange(range, index))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1d2a29',
    borderRadius: 12,
    margin: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 138, 88, 0.3)',
    overflow: 'hidden',
  },
  emptyContainer: {
    backgroundColor: '#1d2a29',
    borderRadius: 12,
    margin: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyText: {
    color: Colors.warmOrange,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySubText: {
    color: '#A6D3CF',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 138, 88, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 138, 88, 0.2)',
  },
  headerTitle: {
    color: Colors.warmOrange,
    fontSize: 14,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 138, 88, 0.2)',
    borderRadius: 6,
  },
  actionButtonActive: {
    backgroundColor: 'rgba(255, 138, 88, 0.4)',
  },
  actionButtonText: {
    color: Colors.warmOrange,
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  scrollContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rangeContainer: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  rangeHeader: {
    color: Colors.warmOrange,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'right',
  },
  verseText: {
    color: Colors.light,
    fontSize: 16,
    lineHeight: 28,
    textAlign: 'right',
    marginBottom: 4,
  },
  placeholderText: {
    color: '#A6D3CF',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'right',
    opacity: 0.7,
  },
});