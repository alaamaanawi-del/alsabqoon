import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Alert,
  Share,
  Linking,
} from "react-native";
import { Colors } from "../../../src/theme/colors";
import {
  AppSettings,
  loadSettings,
  updateFontSettings,
  updateNotificationSettings,
  updateThemeSettings,
  updateLanguageSettings,
  updatePrayerSettings,
  performBackup,
  restoreFromBackup,
  scheduleAutoBackup,
  PRAYER_CALCULATION_METHODS,
  ASR_CALCULATION_METHODS,
  THEME_COLORS,
  FONT_SIZE_MULTIPLIERS
} from "../../../src/storage/settings";

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettingsData();
    scheduleAutoBackup(); // Initialize auto-backup system
  }, []);

  const loadSettingsData = async () => {
    try {
      const loadedSettings = await loadSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFontSizeChange = async (type: 'appInterface' | 'lessonsReading', size: 'small' | 'medium' | 'large') => {
    if (!settings) return;
    
    await updateFontSettings({ [type]: size });
    setSettings({
      ...settings,
      fonts: { ...settings.fonts, [type]: size }
    });
  };

  const handleNotificationToggle = async (type: 'newLessons' | 'appUpdates', value: boolean) => {
    if (!settings) return;
    
    await updateNotificationSettings({ [type]: value });
    setSettings({
      ...settings,
      notifications: { ...settings.notifications, [type]: value }
    });
  };

  const handleThemeChange = async (theme: 'light' | 'dark' | 'pink' | 'blue' | 'islamicGreen') => {
    if (!settings) return;
    
    await updateThemeSettings(theme);
    setSettings({
      ...settings,
      theme: { theme }
    });
  };

  const handleLanguageChange = async (language: 'ar' | 'en' | 'es') => {
    if (!settings) return;
    
    await updateLanguageSettings(language);
    setSettings({
      ...settings,
      language: { language }
    });
  };

  const handlePrayerSettingChange = async (
    type: 'calculationMethod' | 'asrMethod', 
    value: string
  ) => {
    if (!settings) return;
    
    await updatePrayerSettings({ [type]: value });
    setSettings({
      ...settings,
      prayer: { ...settings.prayer, [type]: value }
    });
  };

  const handleBackup = async () => {
    try {
      const success = await performBackup();
      if (success) {
        Alert.alert('نجح النسخ الاحتياطي', 'تم حفظ بياناتك بنجاح');
        loadSettingsData(); // Refresh to show new backup time
      } else {
        Alert.alert('خطأ', 'فشل في إنشاء النسخ الاحتياطي');
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ أثناء النسخ الاحتياطي');
    }
  };

  const handleRestore = async () => {
    Alert.alert(
      'استعادة البيانات',
      'هل أنت متأكد من استعادة البيانات؟ سيتم حذف جميع البيانات الحالية.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'استعادة',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await restoreFromBackup();
              if (success) {
                Alert.alert('تمت الاستعادة', 'تم استعادة بياناتك بنجاح');
                loadSettingsData();
              } else {
                Alert.alert('خطأ', 'لا توجد نسخ احتياطية للاستعادة');
              }
            } catch (error) {
              Alert.alert('خطأ', 'فشل في استعادة البيانات');
            }
          }
        }
      ]
    );
  };

  const handleShareApp = async (platform: 'whatsapp' | 'facebook') => {
    const appUrl = 'https://alsabqon.app'; // Replace with actual app URL
    const message = `جرب تطبيق السابقون - تطبيق شامل للصلاة والتعلم الإسلامي\n${appUrl}`;

    try {
      if (platform === 'whatsapp') {
        const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
        const canOpen = await Linking.canOpenURL(whatsappUrl);
        if (canOpen) {
          await Linking.openURL(whatsappUrl);
        } else {
          // Fallback to regular share
          await Share.share({ message });
        }
      } else if (platform === 'facebook') {
        // Facebook sharing requires specific setup, fallback to regular share
        await Share.share({ message });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('خطأ', 'فشل في مشاركة التطبيق');
    }
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const renderOptionButton = (
    title: string, 
    options: { label: string; value: string }[], 
    currentValue: string, 
    onSelect: (value: string) => void
  ) => (
    <View style={styles.optionContainer}>
      <Text style={styles.optionTitle}>{title}</Text>
      <View style={styles.buttonGroup}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              currentValue === option.value && styles.optionButtonActive
            ]}
            onPress={() => onSelect(option.value)}
          >
            <Text style={[
              styles.optionButtonText,
              currentValue === option.value && styles.optionButtonTextActive
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderToggle = (title: string, value: boolean, onToggle: (value: boolean) => void) => (
    <View style={styles.toggleContainer}>
      <Text style={styles.toggleTitle}>{title}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.lightGray, true: Colors.warmOrange }}
        thumbColor={value ? Colors.light : Colors.dark}
      />
    </View>
  );

  if (loading || !settings) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>جاري تحميل الإعدادات...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        
        {/* Font Size Settings */}
        {renderSection('حجم الخط', (
          <>
            {renderOptionButton(
              'واجهة التطبيق',
              [
                { label: 'صغير', value: 'small' },
                { label: 'متوسط', value: 'medium' },
                { label: 'كبير', value: 'large' }
              ],
              settings.fonts.appInterface,
              (value) => handleFontSizeChange('appInterface', value as any)
            )}
            {renderOptionButton(
              'قراءة الدروس',
              [
                { label: 'صغير', value: 'small' },
                { label: 'متوسط', value: 'medium' },
                { label: 'كبير', value: 'large' }
              ],
              settings.fonts.lessonsReading,
              (value) => handleFontSizeChange('lessonsReading', value as any)
            )}
          </>
        ))}

        {/* Notifications */}
        {renderSection('الإشعارات', (
          <>
            {renderToggle(
              'دروس جديدة',
              settings.notifications.newLessons,
              (value) => handleNotificationToggle('newLessons', value)
            )}
            {renderToggle(
              'تحديثات التطبيق',
              settings.notifications.appUpdates,
              (value) => handleNotificationToggle('appUpdates', value)
            )}
          </>
        ))}

        {/* Theme Selection */}
        {renderSection('اختيار الثيم', (
          <View style={styles.themeContainer}>
            {Object.entries(THEME_COLORS).map(([key, colors]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.themeOption,
                  { backgroundColor: colors.primary },
                  settings.theme.theme === key && styles.themeOptionActive
                ]}
                onPress={() => handleThemeChange(key as any)}
              >
                <View style={[styles.themePreview, { backgroundColor: colors.surface }]}>
                  <View style={[styles.themeAccent, { backgroundColor: colors.accent }]} />
                </View>
                <Text style={[styles.themeLabel, { color: colors.text }]}>
                  {key === 'light' ? 'فاتح' :
                   key === 'dark' ? 'داكن' :
                   key === 'pink' ? 'وردي' :
                   key === 'blue' ? 'أزرق' : 'أخضر إسلامي'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Language Preferences */}
        {renderSection('تفضيلات اللغة', (
          renderOptionButton(
            'لغة التطبيق',
            [
              { label: 'العربية', value: 'ar' },
              { label: 'English', value: 'en' },
              { label: 'Español', value: 'es' }
            ],
            settings.language.language,
            (value) => handleLanguageChange(value as any)
          )
        ))}

        {/* Share App */}
        {renderSection('مشاركة التطبيق', (
          <View style={styles.shareContainer}>
            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: '#25D366' }]}
              onPress={() => handleShareApp('whatsapp')}
            >
              <Text style={styles.shareButtonText}>مشاركة على واتساب</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: '#1877F2' }]}
              onPress={() => handleShareApp('facebook')}
            >
              <Text style={styles.shareButtonText}>مشاركة على فيسبوك</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Prayer Settings */}
        {renderSection('إعدادات الصلاة', (
          <>
            <View style={styles.prayerSettingContainer}>
              <Text style={styles.prayerSettingTitle}>طريقة حساب الصلاة</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.prayerMethodsContainer}>
                  {Object.entries(PRAYER_CALCULATION_METHODS).map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.prayerMethodButton,
                        settings.prayer.calculationMethod === key && styles.prayerMethodButtonActive
                      ]}
                      onPress={() => handlePrayerSettingChange('calculationMethod', key)}
                    >
                      <Text style={[
                        styles.prayerMethodText,
                        settings.prayer.calculationMethod === key && styles.prayerMethodTextActive
                      ]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            
            {renderOptionButton(
              'طريقة حساب العصر',
              [
                { label: 'حنفي', value: 'hanafi' },
                { label: 'شافعي', value: 'shafi' }
              ],
              settings.prayer.asrMethod,
              (value) => handlePrayerSettingChange('asrMethod', value)
            )}
          </>
        ))}

        {/* Data Backup & Restore */}
        {renderSection('النسخ الاحتياطي واستعادة البيانات', (
          <>
            <View style={styles.backupContainer}>
              <TouchableOpacity style={styles.backupButton} onPress={handleBackup}>
                <Text style={styles.backupButtonText}>نسخ احتياطي للبيانات</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
                <Text style={styles.restoreButtonText}>استعادة البيانات</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.backupInfo}>
              <Text style={styles.backupInfoTitle}>معلومات النسخ الاحتياطي:</Text>
              <Text style={styles.backupInfoText}>
                • النسخ الاحتياطي التلقائي: مفعل (كل 24 ساعة في الساعة 2:00 ص)
              </Text>
              {settings.backup.lastBackupTime && (
                <Text style={styles.backupInfoText}>
                  • آخر نسخ احتياطي: {new Date(settings.backup.lastBackupTime).toLocaleDateString('ar-SA')}
                </Text>
              )}
              <Text style={styles.backupInfoText}>
                • يتم النسخ الاحتياطي تلقائياً عند توفر الإنترنت
              </Text>
            </View>
          </>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.dark,
    textAlign: 'center',
  },
  section: {
    backgroundColor: Colors.light,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.deepGreen,
    marginBottom: 16,
    textAlign: 'center',
  },
  optionContainer: {
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 8,
    textAlign: 'right',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  optionButton: {
    flex: 1,
    padding: 10,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: Colors.deepGreen,
  },
  optionButtonText: {
    fontSize: 14,
    color: Colors.dark,
    fontWeight: '500',
  },
  optionButtonTextActive: {
    color: Colors.light,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  toggleTitle: {
    fontSize: 16,
    color: Colors.dark,
    flex: 1,
    textAlign: 'right',
  },
  themeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  themeOption: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    padding: 8,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionActive: {
    borderWidth: 3,
    borderColor: Colors.warmOrange,
  },
  themePreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeAccent: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  themeLabel: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  shareContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shareButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  shareButtonText: {
    color: Colors.light,
    fontSize: 14,
    fontWeight: 'bold',
  },
  prayerSettingContainer: {
    marginBottom: 16,
  },
  prayerSettingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 8,
    textAlign: 'right',
  },
  prayerMethodsContainer: {
    flexDirection: 'row',
  },
  prayerMethodButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 6,
    backgroundColor: Colors.lightGray,
    minWidth: 120,
    alignItems: 'center',
  },
  prayerMethodButtonActive: {
    backgroundColor: Colors.deepGreen,
  },
  prayerMethodText: {
    fontSize: 12,
    color: Colors.dark,
    textAlign: 'center',
  },
  prayerMethodTextActive: {
    color: Colors.light,
  },
  backupContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backupButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.deepGreen,
    marginRight: 8,
    alignItems: 'center',
  },
  backupButtonText: {
    color: Colors.light,
    fontSize: 14,
    fontWeight: 'bold',
  },
  restoreButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.warmOrange,
    marginLeft: 8,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: Colors.light,
    fontSize: 14,
    fontWeight: 'bold',
  },
  backupInfo: {
    backgroundColor: Colors.lightGray,
    padding: 12,
    borderRadius: 8,
  },
  backupInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 8,
    textAlign: 'right',
  },
  backupInfoText: {
    fontSize: 12,
    color: Colors.dark,
    lineHeight: 18,
    textAlign: 'right',
    marginBottom: 4,
  },
});