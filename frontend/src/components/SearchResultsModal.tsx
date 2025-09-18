import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Modal,
  SafeAreaView,
  TextInput
} from 'react-native';
import { Colors } from '../theme/colors';
import HighlightedText from './HighlightedText';

interface SearchItem {
  surahNumber: number;
  nameAr: string;
  nameEn: string;
  ayah: number;
  textAr: string;
  en?: string;
  es?: string;
  tafseer?: string;
}

interface SearchResultsModalProps {
  visible: boolean;
  onClose: () => void;
  results: SearchItem[];
  searchTerm: string;
  onVersePress: (item: SearchItem) => void;
  onSearchChange?: (text: string) => void;
  onSelectedVersesConfirm?: (selectedVerses: SearchItem[]) => void;
}

export default function SearchResultsModal({ 
  visible, 
  onClose, 
  results, 
  searchTerm, 
  onVersePress,
  onSearchChange,
  onSelectedVersesConfirm
}: SearchResultsModalProps) {
  const [selectedVerses, setSelectedVerses] = useState<SearchItem[]>([]);
  
  const handleVersePress = (item: SearchItem) => {
    // Toggle verse selection instead of immediately opening sura viewer
    const isSelected = selectedVerses.some(v => v.surahNumber === item.surahNumber && v.ayah === item.ayah);
    
    if (isSelected) {
      // Remove from selection
      setSelectedVerses(prev => prev.filter(v => !(v.surahNumber === item.surahNumber && v.ayah === item.ayah)));
    } else {
      // Add to selection
      setSelectedVerses(prev => [...prev, item]);
    }
  };

  const handleConfirmSelection = () => {
    if (selectedVerses.length > 0 && onSelectedVersesConfirm) {
      onSelectedVersesConfirm(selectedVerses);
      setSelectedVerses([]); // Clear selection
      onClose(); // Close modal
    }
  };

  const handleLongPress = (item: SearchItem) => {
    // Long press opens sura viewer at that verse
    onVersePress(item);
  };

  const isVerseSelected = (item: SearchItem) => {
    return selectedVerses.some(v => v.surahNumber === item.surahNumber && v.ayah === item.ayah);
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
          <Text style={styles.title}>
            نتائج البحث ({results.length})
          </Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.searchInfo}>
          <TextInput
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={onSearchChange}
            placeholder="ابحث في القرآن الكريم..."
            placeholderTextColor="#888"
            textAlign="right"
          />
          <Text style={styles.resultCount}>النتائج: {results.length}</Text>
        </View>

        <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={true}>
          {results.map((item, idx) => {
            const isSelected = isVerseSelected(item);
            return (
              <TouchableOpacity
                key={`${item.surahNumber}-${item.ayah}-${idx}`}
                style={[
                  styles.resultRow,
                  isSelected && styles.resultRowSelected
                ]}
                onPress={() => handleVersePress(item)}
                onLongPress={() => handleLongPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.resultHeader}>
                  <Text style={[
                    styles.verseRef,
                    isSelected && styles.verseRefSelected
                  ]}>
                    {item.nameAr} {item.surahNumber}:{item.ayah}
                  </Text>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <HighlightedText 
                  text={item.textAr}
                  searchTerm={searchTerm}
                  style={[
                    styles.arabicText,
                    isSelected && styles.arabicTextSelected
                  ]}
                />
                {item.en && (
                  <Text style={styles.englishText}>{item.en}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Selection Footer with تم Button */}
        {selectedVerses.length > 0 && (
          <View style={styles.selectionFooter}>
            <Text style={styles.selectedCount}>
              تم اختيار {selectedVerses.length} آية
            </Text>
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={handleConfirmSelection}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>تم</Text>
            </TouchableOpacity>
          </View>
        )}

        {results.length === 0 && searchTerm && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>لم يتم العثور على نتائج</Text>
            <Text style={styles.emptySubtext}>جرب كلمات بحث أخرى</Text>
            <Text style={styles.instructionText}>اضغط طويلاً لفتح السورة</Text>
          </View>
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
  title: {
    color: Colors.warmOrange,
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
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
  placeholder: {
    width: 60, // Same width as close button for centering
  },
  searchInfo: {
    backgroundColor: '#1d2a29',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchInput: {
    backgroundColor: '#2a3d3c',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.light,
    textAlign: 'right',
    marginBottom: 8,
  },
  resultCount: {
    color: Colors.warmOrange,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultRow: {
    backgroundColor: '#1d2a29',
    borderRadius: 12,
    marginBottom: 8,
    marginTop: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 138, 88, 0.2)',
  },
  resultHeader: {
    marginBottom: 8,
  },
  verseRef: {
    color: Colors.warmOrange,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  arabicText: {
    color: Colors.light,
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'right',
  },
  englishText: {
    color: '#A6D3CF',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'left',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.warmOrange,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#A6D3CF',
    fontSize: 14,
  },
  resultRowSelected: {
    backgroundColor: 'rgba(255, 138, 88, 0.15)',
    borderColor: Colors.warmOrange,
    borderWidth: 2,
  },
  verseRefSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  arabicTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  checkmark: {
    color: Colors.warmOrange,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});