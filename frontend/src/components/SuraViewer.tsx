import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Modal,
  SafeAreaView,
  Alert
} from 'react-native';
import { Colors } from '../theme/colors';

interface Verse {
  ayah: number;
  textAr: string;
}

interface SuraViewerProps {
  visible: boolean;
  onClose: () => void;
  surahNumber: number;
  surahNameAr: string;
  surahNameEn: string;
  initialVerse?: number;
  onRangeSelected: (startVerse: number, endVerse: number, verses: Verse[]) => void;
}

export default function SuraViewer({ 
  visible, 
  onClose, 
  surahNumber, 
  surahNameAr, 
  surahNameEn, 
  initialVerse = 1,
  onRangeSelected 
}: SuraViewerProps) {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [rangeEnd, setRangeEnd] = useState<number | null>(null);

  // Load verses when modal opens
  useEffect(() => {
    if (visible && surahNumber) {
      loadSuraVerses();
    }
  }, [visible, surahNumber]);

  const loadSuraVerses = async () => {
    setLoading(true);
    try {
      // Import the appropriate quran module based on platform
      const mod = Platform.OS === 'web' 
        ? await import("../db/quran.web") 
        : await import("../db/quran.native");
      
      // For now, we'll create mock verses - in real implementation, we'd load from the database
      // This is a simplified version for the demo
      const mockVerses: Verse[] = [];
      
      // Generate some mock verses for demonstration
      // In real implementation, this would query the actual Quran database
      for (let i = 1; i <= 7; i++) { // Al-Fatiha has 7 verses
        mockVerses.push({
          ayah: i,
          textAr: `آية ${i} من ${surahNameAr} - هذا نص تجريبي للآية رقم ${i}`
        });
      }
      
      setVerses(mockVerses);
    } catch (error) {
      console.error('Error loading sura verses:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل آيات السورة');
    } finally {
      setLoading(false);
    }
  };

  const handleVersePress = (verseNumber: number) => {
    if (!rangeStart) {
      // First selection - set as start
      setRangeStart(verseNumber);
      setRangeEnd(null);
    } else if (!rangeEnd) {
      // Second selection - set as end
      if (verseNumber === rangeStart) {
        // Same verse clicked - select single verse
        setRangeEnd(verseNumber);
      } else if (verseNumber > rangeStart) {
        setRangeEnd(verseNumber);
      } else {
        // Clicked earlier verse - make it the new start
        setRangeEnd(rangeStart);
        setRangeStart(verseNumber);
      }
    } else {
      // Range already selected - start new selection
      setRangeStart(verseNumber);
      setRangeEnd(null);
    }
  };

  const isVerseInRange = (verseNumber: number): boolean => {
    if (!rangeStart) return false;
    if (!rangeEnd) return verseNumber === rangeStart;
    
    const min = Math.min(rangeStart, rangeEnd);
    const max = Math.max(rangeStart, rangeEnd);
    return verseNumber >= min && verseNumber <= max;
  };

  const handleDone = () => {
    if (!rangeStart) {
      Alert.alert('تنبيه', 'يرجى اختيار آية واحدة على الأقل');
      return;
    }

    const start = rangeStart;
    const end = rangeEnd || rangeStart;
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    
    // Get selected verses
    const selectedVerses = verses.filter(v => v.ayah >= min && v.ayah <= max);
    
    onRangeSelected(min, max, selectedVerses);
    onClose();
  };

  const handleSelectWholeSura = () => {
    if (verses.length === 0) return;
    
    setRangeStart(1);
    setRangeEnd(verses[verses.length - 1].ayah);
  };

  const getRangeText = (): string => {
    if (!rangeStart) return 'اختر الآيات';
    if (!rangeEnd) return `الآية ${rangeStart}`;
    if (rangeStart === rangeEnd) return `الآية ${rangeStart}`;
    
    const min = Math.min(rangeStart, rangeEnd);
    const max = Math.max(rangeStart, rangeEnd);
    return `الآيات ${min} - ${max}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>إغلاق</Text>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{surahNameAr}</Text>
            <Text style={styles.subtitle}>{surahNameEn}</Text>
          </View>
          <TouchableOpacity onPress={handleDone} style={styles.doneButton}>
            <Text style={styles.doneButtonText}>تم</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.selectionInfo}>
          <Text style={styles.selectionText}>{getRangeText()}</Text>
          <TouchableOpacity onPress={handleSelectWholeSura} style={styles.wholeSuraButton}>
            <Text style={styles.wholeSuraButtonText}>السورة كاملة</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>جارٍ التحميل...</Text>
          </View>
        ) : (
          <ScrollView style={styles.versesContainer} showsVerticalScrollIndicator={true}>
            {verses.map((verse) => (
              <TouchableOpacity
                key={verse.ayah}
                style={[
                  styles.verseItem,
                  isVerseInRange(verse.ayah) && styles.verseItemSelected
                ]}
                onPress={() => handleVersePress(verse.ayah)}
                activeOpacity={0.7}
              >
                <View style={styles.verseHeader}>
                  <Text style={[
                    styles.verseNumber,
                    isVerseInRange(verse.ayah) && styles.verseNumberSelected
                  ]}>
                    {verse.ayah}
                  </Text>
                </View>
                <Text style={[
                  styles.verseText,
                  isVerseInRange(verse.ayah) && styles.verseTextSelected
                ]}>
                  {verse.textAr}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: Colors.light,
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: '#A6D3CF',
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    backgroundColor: '#666',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  closeButtonText: {
    color: Colors.light,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: Colors.deepGreen,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  doneButtonText: {
    color: Colors.light,
    fontWeight: '700',
  },
  selectionInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1d2a29',
  },
  selectionText: {
    color: Colors.warmOrange,
    fontSize: 16,
    fontWeight: '600',
  },
  wholeSuraButton: {
    backgroundColor: Colors.deepGreen,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  wholeSuraButtonText: {
    color: Colors.light,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.light,
    fontSize: 16,
  },
  versesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  verseItem: {
    backgroundColor: '#1d2a29',
    borderRadius: 12,
    marginBottom: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  verseItemSelected: {
    backgroundColor: '#2d4a3a',
    borderColor: Colors.deepGreen,
  },
  verseHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 8,
  },
  verseNumber: {
    color: Colors.warmOrange,
    fontSize: 16,
    fontWeight: '800',
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 32,
    textAlign: 'center',
  },
  verseNumberSelected: {
    backgroundColor: Colors.deepGreen,
    color: Colors.light,
  },
  verseText: {
    color: Colors.light,
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'right',
  },
  verseTextSelected: {
    color: '#E8F5E8',
    fontWeight: '500',
  },
});