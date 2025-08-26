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
        <Text style={styles.title}>الآيات المختارة ({ranges.length})</Text>
        {ranges.length > 1 && (
          <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} style={styles.toggleButton}>
            <Text style={styles.toggleText}>
              {isExpanded ? 'طي ↑' : 'توسيع ↓'}
            </Text>
          </TouchableOpacity>
        )}
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
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 138, 88, 0.1)',
  },
  title: {
    color: Colors.warmOrange,
    fontSize: 14,
    fontWeight: '700',
  },
  toggleButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  toggleText: {
    color: Colors.warmOrange,
    fontSize: 12,
    fontWeight: '600',
  },
  contentContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  versesText: {
    color: Colors.light,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'right',
  },
  fadeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: 'rgba(29, 42, 41, 0.8)',
    pointerEvents: 'none',
  },
});