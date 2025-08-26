import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Modal,
  SafeAreaView,
  TextInput,
  Alert
} from 'react-native';
import { Colors } from '../theme/colors';
import { searchQuran } from '../db/quran.index';

// All 114 Surahs - we'll expand this later with complete data
const ALL_SURAHS = [
  { number: 1, nameAr: "الفاتحة", nameEn: "Al-Fatiha" },
  { number: 2, nameAr: "البقرة", nameEn: "Al-Baqarah" },
  { number: 3, nameAr: "آل عمران", nameEn: "Ali 'Imran" },
  { number: 4, nameAr: "النساء", nameEn: "An-Nisa" },
  { number: 5, nameAr: "المائدة", nameEn: "Al-Ma'idah" },
  { number: 6, nameAr: "الأنعام", nameEn: "Al-An'am" },
  { number: 7, nameAr: "الأعراف", nameEn: "Al-A'raf" },
  { number: 8, nameAr: "الأنفال", nameEn: "Al-Anfal" },
  { number: 9, nameAr: "التوبة", nameEn: "At-Tawbah" },
  { number: 10, nameAr: "يونس", nameEn: "Yunus" },
  { number: 11, nameAr: "هود", nameEn: "Hud" },
  { number: 12, nameAr: "يوسف", nameEn: "Yusuf" },
  { number: 13, nameAr: "الرعد", nameEn: "Ar-Ra'd" },
  { number: 14, nameAr: "إبراهيم", nameEn: "Ibrahim" },
  { number: 15, nameAr: "الحجر", nameEn: "Al-Hijr" },
  { number: 16, nameAr: "النحل", nameEn: "An-Nahl" },
  { number: 17, nameAr: "الإسراء", nameEn: "Al-Isra" },
  { number: 18, nameAr: "الكهف", nameEn: "Al-Kahf" },
  { number: 19, nameAr: "مريم", nameEn: "Maryam" },
  { number: 20, nameAr: "طه", nameEn: "Taha" },
  { number: 21, nameAr: "الأنبياء", nameEn: "Al-Anbya" },
  { number: 22, nameAr: "الحج", nameEn: "Al-Hajj" },
  { number: 23, nameAr: "المؤمنون", nameEn: "Al-Mu'minun" },
  { number: 24, nameAr: "النور", nameEn: "An-Nur" },
  { number: 25, nameAr: "الفرقان", nameEn: "Al-Furqan" },
  { number: 26, nameAr: "الشعراء", nameEn: "Ash-Shu'ara" },
  { number: 27, nameAr: "النمل", nameEn: "An-Naml" },
  { number: 28, nameAr: "القصص", nameEn: "Al-Qasas" },
  { number: 29, nameAr: "العنكبوت", nameEn: "Al-'Ankabut" },
  { number: 30, nameAr: "الروم", nameEn: "Ar-Rum" },
  { number: 31, nameAr: "لقمان", nameEn: "Luqman" },
  { number: 32, nameAr: "السجدة", nameEn: "As-Sajdah" },
  { number: 33, nameAr: "الأحزاب", nameEn: "Al-Ahzab" },
  { number: 34, nameAr: "سبأ", nameEn: "Saba" },
  { number: 35, nameAr: "فاطر", nameEn: "Fatir" },
  { number: 36, nameAr: "يس", nameEn: "Ya-Sin" },
  { number: 37, nameAr: "الصافات", nameEn: "As-Saffat" },
  { number: 38, nameAr: "ص", nameEn: "Sad" },
  { number: 39, nameAr: "الزمر", nameEn: "Az-Zumar" },
  { number: 40, nameAr: "غافر", nameEn: "Ghafir" },
  { number: 41, nameAr: "فصلت", nameEn: "Fussilat" },
  { number: 42, nameAr: "الشورى", nameEn: "Ash-Shuraa" },
  { number: 43, nameAr: "الزخرف", nameEn: "Az-Zukhruf" },
  { number: 44, nameAr: "الدخان", nameEn: "Ad-Dukhan" },
  { number: 45, nameAr: "الجاثية", nameEn: "Al-Jathiyah" },
  { number: 46, nameAr: "الأحقاف", nameEn: "Al-Ahqaf" },
  { number: 47, nameAr: "محمد", nameEn: "Muhammad" },
  { number: 48, nameAr: "الفتح", nameEn: "Al-Fath" },
  { number: 49, nameAr: "الحجرات", nameEn: "Al-Hujurat" },
  { number: 50, nameAr: "ق", nameEn: "Qaf" },
  { number: 51, nameAr: "الذاريات", nameEn: "Adh-Dhariyat" },
  { number: 52, nameAr: "الطور", nameEn: "At-Tur" },
  { number: 53, nameAr: "النجم", nameEn: "An-Najm" },
  { number: 54, nameAr: "القمر", nameEn: "Al-Qamar" },
  { number: 55, nameAr: "الرحمن", nameEn: "Ar-Rahman" },
  { number: 56, nameAr: "الواقعة", nameEn: "Al-Waqi'ah" },
  { number: 57, nameAr: "الحديد", nameEn: "Al-Hadid" },
  { number: 58, nameAr: "المجادلة", nameEn: "Al-Mujadila" },
  { number: 59, nameAr: "الحشر", nameEn: "Al-Hashr" },
  { number: 60, nameAr: "الممتحنة", nameEn: "Al-Mumtahanah" },
  { number: 61, nameAr: "الصف", nameEn: "As-Saff" },
  { number: 62, nameAr: "الجمعة", nameEn: "Al-Jumu'ah" },
  { number: 63, nameAr: "المنافقون", nameEn: "Al-Munafiqun" },
  { number: 64, nameAr: "التغابن", nameEn: "At-Taghabun" },
  { number: 65, nameAr: "الطلاق", nameEn: "At-Talaq" },
  { number: 66, nameAr: "التحريم", nameEn: "At-Tahrim" },
  { number: 67, nameAr: "الملك", nameEn: "Al-Mulk" },
  { number: 68, nameAr: "القلم", nameEn: "Al-Qalam" },
  { number: 69, nameAr: "الحاقة", nameEn: "Al-Haqqah" },
  { number: 70, nameAr: "المعارج", nameEn: "Al-Ma'arij" },
  { number: 71, nameAr: "نوح", nameEn: "Nuh" },
  { number: 72, nameAr: "الجن", nameEn: "Al-Jinn" },
  { number: 73, nameAr: "المزمل", nameEn: "Al-Muzzammil" },
  { number: 74, nameAr: "المدثر", nameEn: "Al-Muddaththir" },
  { number: 75, nameAr: "القيامة", nameEn: "Al-Qiyamah" },
  { number: 76, nameAr: "الإنسان", nameEn: "Al-Insan" },
  { number: 77, nameAr: "المرسلات", nameEn: "Al-Mursalat" },
  { number: 78, nameAr: "النبأ", nameEn: "An-Naba" },
  { number: 79, nameAr: "النازعات", nameEn: "An-Nazi'at" },
  { number: 80, nameAr: "عبس", nameEn: "Abasa" },
  { number: 81, nameAr: "التكوير", nameEn: "At-Takwir" },
  { number: 82, nameAr: "الانفطار", nameEn: "Al-Infitar" },
  { number: 83, nameAr: "المطففين", nameEn: "Al-Mutaffifin" },
  { number: 84, nameAr: "الانشقاق", nameEn: "Al-Inshiqaq" },
  { number: 85, nameAr: "البروج", nameEn: "Al-Buruj" },
  { number: 86, nameAr: "الطارق", nameEn: "At-Tariq" },
  { number: 87, nameAr: "الأعلى", nameEn: "Al-A'la" },
  { number: 88, nameAr: "الغاشية", nameEn: "Al-Ghashiyah" },
  { number: 89, nameAr: "الفجر", nameEn: "Al-Fajr" },
  { number: 90, nameAr: "البلد", nameEn: "Al-Balad" },
  { number: 91, nameAr: "الشمس", nameEn: "Ash-Shams" },
  { number: 92, nameAr: "الليل", nameEn: "Al-Layl" },
  { number: 93, nameAr: "الضحى", nameEn: "Ad-Duhaa" },
  { number: 94, nameAr: "الشرح", nameEn: "Ash-Sharh" },
  { number: 95, nameAr: "التين", nameEn: "At-Tin" },
  { number: 96, nameAr: "العلق", nameEn: "Al-Alaq" },
  { number: 97, nameAr: "القدر", nameEn: "Al-Qadr" },
  { number: 98, nameAr: "البينة", nameEn: "Al-Bayyinah" },
  { number: 99, nameAr: "الزلزلة", nameEn: "Az-Zalzalah" },
  { number: 100, nameAr: "العاديات", nameEn: "Al-Adiyat" },
  { number: 101, nameAr: "القارعة", nameEn: "Al-Qari'ah" },
  { number: 102, nameAr: "التكاثر", nameEn: "At-Takathur" },
  { number: 103, nameAr: "العصر", nameEn: "Al-Asr" },
  { number: 104, nameAr: "الهمزة", nameEn: "Al-Humazah" },
  { number: 105, nameAr: "الفيل", nameEn: "Al-Fil" },
  { number: 106, nameAr: "قريش", nameEn: "Quraysh" },
  { number: 107, nameAr: "الماعون", nameEn: "Al-Ma'un" },
  { number: 108, nameAr: "الكوثر", nameEn: "Al-Kawthar" },
  { number: 109, nameAr: "الكافرون", nameEn: "Al-Kafirun" },
  { number: 110, nameAr: "النصر", nameEn: "An-Nasr" },
  { number: 111, nameAr: "المسد", nameEn: "Al-Masad" },
  { number: 112, nameAr: "الإخلاص", nameEn: "Al-Ikhlas" },
  { number: 113, nameAr: "الفلق", nameEn: "Al-Falaq" },
  { number: 114, nameAr: "الناس", nameEn: "An-Nas" }
];

interface SurahSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectSurah: (surah: { number: number; nameAr: string; nameEn: string }) => void;
  onSelectWholeSurah: (surah: { number: number; nameAr: string; nameEn: string }) => void;
}

export default function SurahSelector({ visible, onClose, onSelectSurah, onSelectWholeSurah }: SurahSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSurahs, setFilteredSurahs] = useState(ALL_SURAHS);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSurahs(ALL_SURAHS);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = ALL_SURAHS.filter(surah => 
      surah.nameAr.includes(searchQuery) ||
      surah.nameEn.toLowerCase().includes(query) ||
      surah.number.toString().includes(query)
    );
    setFilteredSurahs(filtered);
  }, [searchQuery]);

  const handleSelectSurah = (surah: { number: number; nameAr: string; nameEn: string }) => {
    Alert.alert(
      `${surah.nameAr} - ${surah.nameEn}`,
      'اختر طريقة التحديد',
      [
        {
          text: 'إلغاء',
          style: 'cancel'
        },
        {
          text: 'السورة كاملة',
          onPress: () => {
            onSelectWholeSurah(surah);
            onClose();
          }
        },
        {
          text: 'تحديد نطاق',
          onPress: () => {
            onSelectSurah(surah);
            onClose();
          }
        }
      ]
    );
  };

  const renderSurahItem = ({ item }: { item: typeof ALL_SURAHS[0] }) => (
    <TouchableOpacity 
      style={styles.surahItem}
      onPress={() => handleSelectSurah(item)}
      activeOpacity={0.7}
    >
      <View style={styles.surahContent}>
        <Text style={styles.surahNumber}>{item.number}</Text>
        <View style={styles.surahNames}>
          <Text style={styles.surahNameAr}>{item.nameAr}</Text>
          <Text style={styles.surahNameEn}>{item.nameEn}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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
          <Text style={styles.title}>اختر السورة</Text>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="ابحث عن السورة..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
            textAlign="right"
          />
        </View>

        <ScrollView 
          style={styles.list}
          showsVerticalScrollIndicator={true}
        >
          {filteredSurahs.map((item) => (
            <TouchableOpacity 
              key={item.number.toString()}
              style={styles.surahItem}
              onPress={() => handleSelectSurah(item)}
              activeOpacity={0.7}
            >
              <View style={styles.surahContent}>
                <Text style={styles.surahNumber}>{item.number}</Text>
                <View style={styles.surahNames}>
                  <Text style={styles.surahNameAr}>{item.nameAr}</Text>
                  <Text style={styles.surahNameEn}>{item.nameEn}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
    color: Colors.light,
    fontSize: 20,
    fontWeight: '800',
  },
  closeButton: {
    backgroundColor: Colors.warmOrange,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeButtonText: {
    color: Colors.dark,
    fontWeight: '700',
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    backgroundColor: '#1d2a29',
    color: Colors.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlign: 'right',
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  surahItem: {
    backgroundColor: '#1d2a29',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  surahContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  surahNumber: {
    color: Colors.warmOrange,
    fontSize: 18,
    fontWeight: '800',
    minWidth: 40,
    textAlign: 'center',
  },
  surahNames: {
    flex: 1,
  },
  surahNameAr: {
    color: Colors.light,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 4,
  },
  surahNameEn: {
    color: '#A6D3CF',
    fontSize: 14,
    textAlign: 'right',
  },
});