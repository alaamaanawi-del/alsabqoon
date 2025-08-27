import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../src/theme/colors';

// Sample data - would come from backend in real app
const COUNTRIES = [
  { code: 'EG', name: 'مصر', nameEn: 'Egypt' },
  { code: 'SA', name: 'السعودية', nameEn: 'Saudi Arabia' },
  { code: 'AE', name: 'الإمارات', nameEn: 'UAE' },
  { code: 'QA', name: 'قطر', nameEn: 'Qatar' },
  { code: 'KW', name: 'الكويت', nameEn: 'Kuwait' },
  { code: 'BH', name: 'البحرين', nameEn: 'Bahrain' },
  { code: 'OM', name: 'عُمان', nameEn: 'Oman' },
  { code: 'JO', name: 'الأردن', nameEn: 'Jordan' },
  { code: 'LB', name: 'لبنان', nameEn: 'Lebanon' },
  { code: 'SY', name: 'سوريا', nameEn: 'Syria' },
  { code: 'IQ', name: 'العراق', nameEn: 'Iraq' },
  { code: 'MA', name: 'المغرب', nameEn: 'Morocco' },
  { code: 'TN', name: 'تونس', nameEn: 'Tunisia' },
  { code: 'DZ', name: 'الجزائر', nameEn: 'Algeria' },
  { code: 'LY', name: 'ليبيا', nameEn: 'Libya' },
];

const LANGUAGES = [
  { code: 'ar', name: 'العربية', nameEn: 'Arabic' },
  { code: 'en', name: 'الإنجليزية', nameEn: 'English' },
  { code: 'es', name: 'الإسبانية', nameEn: 'Spanish' },
  { code: 'fr', name: 'الفرنسية', nameEn: 'French' },
];

const DONATION_REASONS = [
  {
    title: 'تطوير الميزات الجديدة',
    description: 'مساعدتنا في إضافة ميزات جديدة وتحسين تجربة المستخدم بشكل مستمر.',
  },
  {
    title: 'دعم الخوادم والبنية التحتية',
    description: 'ضمان استمرارية الخدمة وسرعة الوصول للتطبيق في جميع أنحاء العالم.',
  },
  {
    title: 'المحتوى التعليمي المجاني',
    description: 'إنتاج المزيد من الدروس والمحتوى التعليمي الإسلامي عالي الجودة.',
  },
  {
    title: 'دعم الفريق التطويري',
    description: 'مساعدة فريق العمل المتخصص في التطوير والتحسين المستمر للتطبيق.',
  },
  {
    title: 'الوصول لمزيد من المسلمين',
    description: 'توسيع نطاق الوصول وترجمة التطبيق لمزيد من اللغات والثقافات.',
  },
];

interface BroadcastFilters {
  gender: 'all' | 'male' | 'female';
  countries: string[];
  languages: string[];
}

export default function MessagesSupport() {
  // Admin broadcast state
  const [isAdmin] = useState(true); // Would be determined by user role
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastFilters, setBroadcastFilters] = useState<BroadcastFilters>({
    gender: 'all',
    countries: [],
    languages: ['ar'],
  });
  const [showFilters, setShowFilters] = useState(false);

  // User messaging state
  const [userMessage, setUserMessage] = useState('');

  // Donations state
  const [showDonationReasons, setShowDonationReasons] = useState(false);

  const handleWhatsAppPress = () => {
    const phoneNumber = '+201009991805';
    const message = encodeURIComponent('السلام عليكم، لدي سؤال حول تطبيق السابقون');
    const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${message}`;
    
    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(whatsappUrl);
        } else {
          // Fallback to web WhatsApp
          const webUrl = `https://wa.me/${phoneNumber.replace('+', '')}?text=${message}`;
          Linking.openURL(webUrl);
        }
      })
      .catch((err) => {
        console.error('Error opening WhatsApp:', err);
        Alert.alert('خطأ', 'لا يمكن فتح واتساب الآن');
      });
  };

  const handleSendInAppMessage = () => {
    if (!userMessage.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة رسالتك أولاً');
      return;
    }

    // Here you would send the message to your backend
    Alert.alert(
      'تم إرسال الرسالة',
      'شكراً لك! سنرد عليك في أقرب وقت ممكن.',
      [
        {
          text: 'موافق',
          onPress: () => setUserMessage(''),
        },
      ]
    );
  };

  const handleSendBroadcast = () => {
    if (!broadcastMessage.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة الرسالة أولاً');
      return;
    }

    const filterSummary = `الجنس: ${broadcastFilters.gender === 'all' ? 'الكل' : broadcastFilters.gender === 'male' ? 'ذكور' : 'إناث'}\nالدول: ${broadcastFilters.countries.length ? broadcastFilters.countries.join(', ') : 'الكل'}\nاللغات: ${broadcastFilters.languages.join(', ')}`;

    Alert.alert(
      'تأكيد الإرسال',
      `هل أنت متأكد من إرسال هذه الرسالة؟\n\nالفلاتر:\n${filterSummary}`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إرسال',
          onPress: () => {
            // Here you would send the broadcast to your backend
            Alert.alert('تم الإرسال', 'تم إرسال الرسالة للمستخدمين المحددين');
            setBroadcastMessage('');
          },
        },
      ]
    );
  };

  const toggleCountrySelection = (countryCode: string) => {
    setBroadcastFilters(prev => ({
      ...prev,
      countries: prev.countries.includes(countryCode)
        ? prev.countries.filter(c => c !== countryCode)
        : [...prev.countries, countryCode]
    }));
  };

  const toggleLanguageSelection = (langCode: string) => {
    setBroadcastFilters(prev => ({
      ...prev,
      languages: prev.languages.includes(langCode)
        ? prev.languages.filter(l => l !== langCode)
        : [...prev.languages, langCode]
    }));
  };

  const handleContactForDonation = () => {
    Alert.alert(
      'التبرع',
      'للتبرع، يرجى التواصل معنا عبر واتساب أو الرسائل الداخلية وسنوضح لك الطرق المتاحة.',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'واتساب', onPress: handleWhatsAppPress },
        { text: 'رسالة داخلية', onPress: () => setUserMessage('أود التبرع للتطبيق، كيف يمكنني ذلك؟') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>الرسائل والدعم</Text>
          <Text style={styles.headerSubtitle}>
            لديك سؤال حول التطبيق أو سؤال ديني؟ راسلنا هنا — نحن سعداء لمساعدتك
          </Text>
        </View>

        {/* Admin Broadcast Section */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>إرسال رسالة جماعية (المدير)</Text>
            
            <TextInput
              style={styles.broadcastInput}
              placeholder="اكتب رسالتك هنا..."
              placeholderTextColor="#888"
              value={broadcastMessage}
              onChangeText={setBroadcastMessage}
              multiline
              numberOfLines={4}
              textAlign="right"
            />

            <TouchableOpacity
              style={styles.filtersToggle}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Text style={styles.filtersToggleText}>
                {showFilters ? 'إخفاء الفلاتر ↑' : 'إظهار الفلاتر ↓'}
              </Text>
            </TouchableOpacity>

            {showFilters && (
              <View style={styles.filtersContainer}>
                {/* Gender Filter */}
                <View style={styles.filterGroup}>
                  <Text style={styles.filterTitle}>الجنس:</Text>
                  <View style={styles.genderButtons}>
                    {[
                      { key: 'all', label: 'الكل' },
                      { key: 'male', label: 'ذكور' },
                      { key: 'female', label: 'إناث' },
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.genderButton,
                          broadcastFilters.gender === option.key && styles.genderButtonActive,
                        ]}
                        onPress={() => setBroadcastFilters(prev => ({ ...prev, gender: option.key as any }))}
                      >
                        <Text
                          style={[
                            styles.genderButtonText,
                            broadcastFilters.gender === option.key && styles.genderButtonTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Countries Filter */}
                <View style={styles.filterGroup}>
                  <Text style={styles.filterTitle}>الدول:</Text>
                  <View style={styles.countriesGrid}>
                    {COUNTRIES.map((country) => (
                      <TouchableOpacity
                        key={country.code}
                        style={[
                          styles.countryChip,
                          broadcastFilters.countries.includes(country.code) && styles.countryChipActive,
                        ]}
                        onPress={() => toggleCountrySelection(country.code)}
                      >
                        <Text
                          style={[
                            styles.countryChipText,
                            broadcastFilters.countries.includes(country.code) && styles.countryChipTextActive,
                          ]}
                        >
                          {country.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Languages Filter */}
                <View style={styles.filterGroup}>
                  <Text style={styles.filterTitle}>اللغات:</Text>
                  <View style={styles.languagesGrid}>
                    {LANGUAGES.map((language) => (
                      <TouchableOpacity
                        key={language.code}
                        style={[
                          styles.languageChip,
                          broadcastFilters.languages.includes(language.code) && styles.languageChipActive,
                        ]}
                        onPress={() => toggleLanguageSelection(language.code)}
                      >
                        <Text
                          style={[
                            styles.languageChipText,
                            broadcastFilters.languages.includes(language.code) && styles.languageChipTextActive,
                          ]}
                        >
                          {language.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.sendBroadcastBtn} onPress={handleSendBroadcast}>
              <Text style={styles.sendBroadcastBtnText}>إرسال الرسالة الجماعية</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* User Messaging Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>راسلنا</Text>
          
          <TextInput
            style={styles.messageInput}
            placeholder="اكتب رسالتك أو سؤالك هنا..."
            placeholderTextColor="#888"
            value={userMessage}
            onChangeText={setUserMessage}
            multiline
            numberOfLines={4}
            textAlign="right"
          />

          <View style={styles.messageButtons}>
            <TouchableOpacity style={styles.inAppBtn} onPress={handleSendInAppMessage}>
              <Text style={styles.inAppBtnText}>📧 إرسال رسالة داخلية</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsAppPress}>
              <Text style={styles.whatsappBtnText}>💬 واتساب</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.whatsappNumber}>+201009991805</Text>
        </View>

        {/* Donations Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>التبرعات</Text>
          
          <TouchableOpacity
            style={styles.donationToggle}
            onPress={() => setShowDonationReasons(!showDonationReasons)}
          >
            <Text style={styles.donationToggleText}>
              {showDonationReasons ? 'إخفاء أسباب التبرع ↑' : 'لماذا نحتاج للتبرعات؟ ↓'}
            </Text>
          </TouchableOpacity>

          {showDonationReasons && (
            <View style={styles.donationReasons}>
              {DONATION_REASONS.map((reason, index) => (
                <View key={index} style={styles.donationReason}>
                  <Text style={styles.donationReasonTitle}>• {reason.title}</Text>
                  <Text style={styles.donationReasonDesc}>{reason.description}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.donateBtn} onPress={handleContactForDonation}>
            <Text style={styles.donateBtnText}>💝 تواصل معنا للتبرع</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    padding: 20,
    backgroundColor: '#1d2a29',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    color: Colors.light,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'right',
    marginBottom: 8,
  },
  headerSubtitle: {
    color: Colors.warmOrange,
    fontSize: 16,
    textAlign: 'right',
    lineHeight: 24,
  },
  section: {
    backgroundColor: '#1d2a29',
    margin: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    color: Colors.warmOrange,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 16,
  },
  
  // Broadcast styles
  broadcastInput: {
    backgroundColor: '#2a3f3e',
    borderRadius: 8,
    padding: 12,
    color: Colors.light,
    fontSize: 16,
    textAlign: 'right',
    minHeight: 100,
    marginBottom: 12,
  },
  filtersToggle: {
    backgroundColor: 'rgba(255, 138, 88, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  filtersToggleText: {
    color: Colors.warmOrange,
    fontSize: 14,
    fontWeight: '600',
  },
  filtersContainer: {
    backgroundColor: '#2a3f3e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterTitle: {
    color: Colors.light,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 8,
  },
  genderButtons: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  genderButton: {
    flex: 1,
    backgroundColor: '#1d2a29',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: Colors.warmOrange,
  },
  genderButtonText: {
    color: Colors.light,
    fontSize: 14,
    fontWeight: '600',
  },
  genderButtonTextActive: {
    color: Colors.dark,
  },
  countriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  countryChip: {
    backgroundColor: '#1d2a29',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  countryChipActive: {
    backgroundColor: Colors.warmOrange,
  },
  countryChipText: {
    color: Colors.light,
    fontSize: 12,
    fontWeight: '600',
  },
  countryChipTextActive: {
    color: Colors.dark,
  },
  languagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageChip: {
    backgroundColor: '#1d2a29',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  languageChipActive: {
    backgroundColor: Colors.warmOrange,
  },
  languageChipText: {
    color: Colors.light,
    fontSize: 12,
    fontWeight: '600',
  },
  languageChipTextActive: {
    color: Colors.dark,
  },
  sendBroadcastBtn: {
    backgroundColor: Colors.greenTeal,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sendBroadcastBtnText: {
    color: Colors.dark,
    fontSize: 16,
    fontWeight: '700',
  },

  // User messaging styles
  messageInput: {
    backgroundColor: '#2a3f3e',
    borderRadius: 8,
    padding: 12,
    color: Colors.light,
    fontSize: 16,
    textAlign: 'right',
    minHeight: 100,
    marginBottom: 16,
  },
  messageButtons: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 8,
  },
  inAppBtn: {
    flex: 1,
    backgroundColor: Colors.greenTeal,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  inAppBtnText: {
    color: Colors.dark,
    fontSize: 14,
    fontWeight: '700',
  },
  whatsappBtn: {
    flex: 1,
    backgroundColor: '#25D366',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  whatsappBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  whatsappNumber: {
    color: '#A6D3CF',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },

  // Donations styles
  donationToggle: {
    backgroundColor: 'rgba(255, 138, 88, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  donationToggleText: {
    color: Colors.warmOrange,
    fontSize: 14,
    fontWeight: '600',
  },
  donationReasons: {
    backgroundColor: '#2a3f3e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  donationReason: {
    marginBottom: 12,
  },
  donationReasonTitle: {
    color: Colors.warmOrange,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 4,
  },
  donationReasonDesc: {
    color: Colors.light,
    fontSize: 14,
    textAlign: 'right',
    lineHeight: 20,
  },
  donateBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  donateBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});