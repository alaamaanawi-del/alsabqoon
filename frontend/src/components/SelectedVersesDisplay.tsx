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
}

interface SelectedVersesDisplayProps {
  ranges: VerseRange[];
  maxLines?: number;
}

export default function SelectedVersesDisplay({ ranges, maxLines = 8 }: SelectedVersesDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [animatedHeight] = useState(new Animated.Value(0));

  if (ranges.length === 0) {
    return null;
  }

  const toggleExpanded = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.spring(animatedHeight, {
      toValue,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
    setIsExpanded(!isExpanded);
  };

  const renderRange = (range: VerseRange) => {
    const rangeText = range.fromAyah === range.toAyah 
      ? `الآية ${range.fromAyah}`
      : `الآيات ${range.fromAyah} - ${range.toAyah}`;
    
    return `${range.nameAr} (${rangeText})`;
  };

  const allRangesText = ranges.map(renderRange).join(' • ');
  const shouldShowToggle = ranges.length > 2; // Show toggle if more than 2 ranges

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>الآيات المختارة</Text>
        {shouldShowToggle && (
          <TouchableOpacity onPress={toggleExpanded} style={styles.toggleButton}>
            <Text style={styles.toggleText}>
              {isExpanded ? 'اقل ←' : 'اكثر →'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.contentContainer, { maxHeight: isExpanded ? 200 : 120 }]}>
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={isExpanded}
          nestedScrollEnabled={true}
        >
          <Text style={styles.versesText} numberOfLines={isExpanded ? undefined : maxLines}>
            {allRangesText}
          </Text>
        </ScrollView>
      </View>

      {/* Fixed overlay for non-expanded state */}
      {!isExpanded && ranges.length > 2 && (
        <View style={styles.fadeOverlay} />
      )}
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