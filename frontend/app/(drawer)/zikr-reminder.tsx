import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { Colors } from '../../src/theme/colors';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface ZikrReminderSettings {
  isActive: boolean;
  interval: number; // in minutes
  selectedSound: string;
  customSoundUri?: string;
  volume: number;
  sleepEnabled: boolean;
  sleepTime: Date;
  wakeTime: Date;
}

const REMINDER_INTERVALS = [
  { label: 'كل دقيقة', labelEn: 'Every 1 minute', value: 1 },
  { label: 'كل 5 دقائق', labelEn: 'Every 5 minutes', value: 5 },
  { label: 'كل 10 دقائق', labelEn: 'Every 10 minutes', value: 10 },
  { label: 'كل 15 دقيقة', labelEn: 'Every 15 minutes', value: 15 },
  { label: 'كل 30 دقيقة', labelEn: 'Every 30 minutes', value: 30 },
  { label: 'كل ساعة', labelEn: 'Every 1 hour', value: 60 },
];

const PRESET_SOUNDS = [
  { id: 'sound1', name: 'نغمة 1', nameEn: 'Sound 1', path: 'zikr-sound-1.wav' },
  { id: 'sound2', name: 'نغمة 2', nameEn: 'Sound 2', uri: require('../../assets/sounds/zikr-sound-2.wav') },
  { id: 'sound3', name: 'نغمة 3', nameEn: 'Sound 3', uri: require('../../assets/sounds/zikr-sound-3.mp3') },
];

export default function ZikrReminderScreen() {
  const [settings, setSettings] = useState<ZikrReminderSettings>({
    isActive: false,
    interval: 15, // Default 15 minutes
    selectedSound: 'sound1',
    volume: 0.5,
    sleepEnabled: false,
    sleepTime: new Date(new Date().setHours(22, 0, 0, 0)), // Default 10 PM
    wakeTime: new Date(new Date().setHours(6, 0, 0, 0)), // Default 6 AM
  });

  const [showSleepPicker, setShowSleepPicker] = useState(false);
  const [showWakePicker, setShowWakePicker] = useState(false);
  const [soundObject, setSoundObject] = useState<Audio.Sound | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<'ar' | 'en'>('ar');

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    requestPermissions();
    return () => {
      if (soundObject) {
        soundObject.unloadAsync();
      }
    };
  }, []);

  // Save settings whenever they change
  useEffect(() => {
    saveSettings();
    if (settings.isActive) {
      scheduleNotifications();
    } else {
      cancelAllNotifications();
    }
  }, [settings]);

  const requestPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'تحتاج إذن',
        'هذا التطبيق يحتاج إذن الإشعارات لتذكيرك بالأذكار',
        [{ text: 'موافق' }]
      );
    }
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('zikrReminderSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({
          ...parsed,
          sleepTime: new Date(parsed.sleepTime),
          wakeTime: new Date(parsed.wakeTime),
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('zikrReminderSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const scheduleNotifications = async () => {
    await cancelAllNotifications();
    
    if (!settings.isActive) return;

    // Schedule notifications for the next 24 hours
    const now = new Date();
    const intervalMs = settings.interval * 60 * 1000;
    const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next 24 hours

    let nextNotificationTime = new Date(now.getTime() + intervalMs);

    while (nextNotificationTime < endTime) {
      // Check if notification should be skipped due to sleep time
      if (!shouldSkipDueToSleep(nextNotificationTime)) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'تذكير الأذكار',
            body: 'حان وقت الذكر والدعاء 🤲',
            sound: getSoundForNotification(),
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            date: nextNotificationTime,
          },
        });
      }
      
      nextNotificationTime = new Date(nextNotificationTime.getTime() + intervalMs);
    }
  };

  const shouldSkipDueToSleep = (time: Date): boolean => {
    if (!settings.sleepEnabled) return false;
    
    const timeHours = time.getHours() * 60 + time.getMinutes();
    const sleepHours = settings.sleepTime.getHours() * 60 + settings.sleepTime.getMinutes();
    const wakeHours = settings.wakeTime.getHours() * 60 + settings.wakeTime.getMinutes();
    
    if (sleepHours <= wakeHours) {
      // Sleep time is on the same day (e.g., 10 PM to 6 AM next day)
      return timeHours >= sleepHours || timeHours < wakeHours;
    } else {
      // Sleep time crosses midnight (e.g., 2 AM to 6 AM)
      return timeHours >= sleepHours && timeHours < wakeHours;
    }
  };

  const getSoundForNotification = () => {
    if (settings.customSoundUri) {
      return settings.customSoundUri;
    }
    
    const selectedPreset = PRESET_SOUNDS.find(s => s.id === settings.selectedSound);
    return selectedPreset ? selectedPreset.uri : PRESET_SOUNDS[0].uri;
  };

  const cancelAllNotifications = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  };

  const playPreviewSound = async (soundId: string, customUri?: string) => {
    try {
      // Stop current preview if playing
      if (soundObject) {
        await soundObject.unloadAsync();
        setSoundObject(null);
      }

      setIsPreviewPlaying(true);

      let soundUri;
      if (customUri) {
        soundUri = { uri: customUri };
      } else {
        const preset = PRESET_SOUNDS.find(s => s.id === soundId);
        soundUri = preset ? preset.uri : PRESET_SOUNDS[0].uri;
      }

      const { sound } = await Audio.loadAsync(soundUri);
      setSoundObject(sound);
      
      await sound.setVolumeAsync(settings.volume);
      await sound.playAsync();
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPreviewPlaying(false);
        }
      });
    } catch (error) {
      console.error('Error playing preview:', error);
      setIsPreviewPlaying(false);
    }
  };

  const selectCustomSound = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSettings(prev => ({
          ...prev,
          selectedSound: 'custom',
          customSoundUri: asset.uri,
        }));
        Alert.alert('نجح', 'تم تحديد الصوت المخصص بنجاح');
      }
    } catch (error) {
      console.error('Error selecting custom sound:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحديد الصوت');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(currentLanguage === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderIntervalSelector = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>
        {currentLanguage === 'ar' ? 'فترة التذكير' : 'Reminder Interval'}
      </Text>
      <View style={styles.intervalGrid}>
        {REMINDER_INTERVALS.map((interval) => (
          <TouchableOpacity
            key={interval.value}
            style={[
              styles.intervalButton,
              settings.interval === interval.value && styles.intervalButtonSelected
            ]}
            onPress={() => setSettings(prev => ({ ...prev, interval: interval.value }))}
          >
            <Text style={[
              styles.intervalButtonText,
              settings.interval === interval.value && styles.intervalButtonTextSelected
            ]}>
              {currentLanguage === 'ar' ? interval.label : interval.labelEn}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSoundSelector = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>
        {currentLanguage === 'ar' ? 'اختيار الصوت' : 'Sound Selection'}
      </Text>
      
      {/* Preset Sounds */}
      {PRESET_SOUNDS.map((sound) => (
        <View key={sound.id} style={styles.soundOption}>
          <TouchableOpacity
            style={[
              styles.soundSelector,
              settings.selectedSound === sound.id && styles.soundSelectorSelected
            ]}
            onPress={() => setSettings(prev => ({ ...prev, selectedSound: sound.id }))}
          >
            <View style={styles.soundInfo}>
              <Text style={styles.soundName}>
                {currentLanguage === 'ar' ? sound.name : sound.nameEn}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => playPreviewSound(sound.id)}
              disabled={isPreviewPlaying}
            >
              <Ionicons 
                name={isPreviewPlaying ? "pause" : "play"} 
                size={20} 
                color={Colors.light} 
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      ))}

      {/* Custom Sound */}
      <View style={styles.soundOption}>
        <TouchableOpacity
          style={[
            styles.soundSelector,
            settings.selectedSound === 'custom' && styles.soundSelectorSelected
          ]}
          onPress={selectCustomSound}
        >
          <View style={styles.soundInfo}>
            <Text style={styles.soundName}>
              {currentLanguage === 'ar' ? 'صوت مخصص' : 'Custom Sound'}
            </Text>
            {settings.customSoundUri && (
              <Text style={styles.soundPath} numberOfLines={1}>
                {settings.customSoundUri.split('/').pop()}
              </Text>
            )}
          </View>
          <View style={styles.buttonGroup}>
            {settings.customSoundUri && (
              <TouchableOpacity
                style={[styles.playButton, { marginRight: 8 }]}
                onPress={() => playPreviewSound('custom', settings.customSoundUri)}
                disabled={isPreviewPlaying}
              >
                <Ionicons 
                  name={isPreviewPlaying ? "pause" : "play"} 
                  size={20} 
                  color={Colors.light} 
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.selectButton}>
              <Ionicons name="folder-open" size={20} color={Colors.deepGreen} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderVolumeControl = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>
        {currentLanguage === 'ar' ? 'مستوى الصوت' : 'Volume Level'}
      </Text>
      <View style={styles.volumeContainer}>
        <Ionicons name="volume-low" size={24} color={Colors.darkGray} />
        <Slider
          style={styles.volumeSlider}
          minimumValue={0}
          maximumValue={1}
          value={settings.volume}
          onValueChange={(value) => setSettings(prev => ({ ...prev, volume: value }))}
          minimumTrackTintColor={Colors.deepGreen}
          maximumTrackTintColor={Colors.lightGray}
          thumbStyle={{ backgroundColor: Colors.deepGreen }}
        />
        <Ionicons name="volume-high" size={24} color={Colors.darkGray} />
      </View>
      <Text style={styles.volumeText}>
        {Math.round(settings.volume * 100)}%
      </Text>
    </View>
  );

  const renderSleepSettings = () => (
    <View style={styles.sectionContainer}>
      <View style={styles.sleepHeader}>
        <Text style={styles.sectionTitle}>
          {currentLanguage === 'ar' ? 'أوقات النوم والاستيقاظ' : 'Sleep & Wake Times'}
        </Text>
        <Switch
          value={settings.sleepEnabled}
          onValueChange={(value) => setSettings(prev => ({ ...prev, sleepEnabled: value }))}
          trackColor={{ false: Colors.lightGray, true: Colors.deepGreen }}
          thumbColor={Colors.light}
        />
      </View>

      {settings.sleepEnabled && (
        <View style={styles.timeContainer}>
          <TouchableOpacity
            style={styles.timeSelector}
            onPress={() => setShowSleepPicker(true)}
          >
            <Text style={styles.timeLabel}>
              {currentLanguage === 'ar' ? 'وقت النوم' : 'Sleep Time'}
            </Text>
            <Text style={styles.timeValue}>{formatTime(settings.sleepTime)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.timeSelector}
            onPress={() => setShowWakePicker(true)}
          >
            <Text style={styles.timeLabel}>
              {currentLanguage === 'ar' ? 'وقت الاستيقاظ' : 'Wake Time'}
            </Text>
            <Text style={styles.timeValue}>{formatTime(settings.wakeTime)}</Text>
          </TouchableOpacity>
        </View>
      )}

      {showSleepPicker && (
        <DateTimePicker
          value={settings.sleepTime}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={(event, selectedTime) => {
            setShowSleepPicker(Platform.OS === 'ios');
            if (selectedTime) {
              setSettings(prev => ({ ...prev, sleepTime: selectedTime }));
            }
          }}
        />
      )}

      {showWakePicker && (
        <DateTimePicker
          value={settings.wakeTime}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={(event, selectedTime) => {
            setShowWakePicker(Platform.OS === 'ios');
            if (selectedTime) {
              setSettings(prev => ({ ...prev, wakeTime: selectedTime }));
            }
          }}
        />
      )}
    </View>
  );

  const renderMainToggle = () => (
    <View style={styles.mainToggleContainer}>
      <View style={styles.toggleContent}>
        <View>
          <Text style={styles.toggleTitle}>
            {currentLanguage === 'ar' ? 'تفعيل تذكير الأذكار' : 'Activate Zikr Reminders'}
          </Text>
          <Text style={styles.toggleSubtitle}>
            {settings.isActive 
              ? (currentLanguage === 'ar' ? 'التذكير مفعل' : 'Reminders Active')
              : (currentLanguage === 'ar' ? 'التذكير متوقف' : 'Reminders Inactive')
            }
          </Text>
        </View>
        <Switch
          value={settings.isActive}
          onValueChange={(value) => setSettings(prev => ({ ...prev, isActive: value }))}
          trackColor={{ false: Colors.lightGray, true: Colors.deepGreen }}
          thumbColor={Colors.light}
          style={styles.mainSwitch}
        />
      </View>
    </View>
  );

  const renderInfoSection = () => (
    <View style={styles.infoContainer}>
      <View style={styles.infoHeader}>
        <Ionicons name="information-circle" size={24} color={Colors.deepGreen} />
        <Text style={styles.infoTitle}>
          {currentLanguage === 'ar' ? 'معلومات حول هذه الميزة' : 'About This Feature'}
        </Text>
      </View>
      <Text style={styles.infoText}>
        {currentLanguage === 'ar' 
          ? 'هذه الميزة ستساعدك على تذكر الأذكار بانتظام حتى لو كنت مشغولاً. ستصلك تنبيهات لطيفة بأصوات هادئة لن يلاحظها من حولك، مما يساعدك على الحفاظ على ذكر الله تعالى طوال اليوم.' 
          : 'This feature will help you remember to do zikr regularly even when you\'re busy. You\'ll receive gentle notifications with soft sounds that won\'t be noticed by people around you, helping you maintain remembrance of Allah throughout the day.'
        }
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {currentLanguage === 'ar' ? 'تذكير الأذكار' : 'Zikr Reminders'}
        </Text>
        <TouchableOpacity 
          style={styles.languageButton}
          onPress={() => setCurrentLanguage(prev => prev === 'ar' ? 'en' : 'ar')}
        >
          <Text style={styles.languageButtonText}>
            {currentLanguage === 'ar' ? 'EN' : 'عر'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {renderInfoSection()}
        {renderMainToggle()}
        {renderIntervalSelector()}
        {renderSoundSelector()}
        {renderVolumeControl()}
        {renderSleepSettings()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.deepGreen,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light,
  },
  languageButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  languageButtonText: {
    color: Colors.light,
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionContainer: {
    backgroundColor: Colors.light,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 16,
  },
  intervalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  intervalButton: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  intervalButtonSelected: {
    backgroundColor: Colors.deepGreen,
  },
  intervalButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.darkText,
    textAlign: 'center',
  },
  intervalButtonTextSelected: {
    color: Colors.light,
  },
  soundOption: {
    marginBottom: 8,
  },
  soundSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.lightGray,
  },
  soundSelectorSelected: {
    borderColor: Colors.deepGreen,
    backgroundColor: '#f0f8ff',
  },
  soundInfo: {
    flex: 1,
  },
  soundName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  soundPath: {
    fontSize: 12,
    color: Colors.darkGray,
    marginTop: 2,
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: Colors.deepGreen,
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectButton: {
    backgroundColor: Colors.background,
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.deepGreen,
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  volumeSlider: {
    flex: 1,
    marginHorizontal: 16,
    height: 40,
  },
  volumeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.deepGreen,
    textAlign: 'center',
  },
  sleepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeSelector: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 14,
    color: Colors.darkGray,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.deepGreen,
  },
  mainToggleContainer: {
    backgroundColor: Colors.light,
    marginVertical: 8,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  toggleSubtitle: {
    fontSize: 14,
    color: Colors.darkGray,
    marginTop: 4,
  },
  mainSwitch: {
    transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
  },
  infoContainer: {
    backgroundColor: Colors.light,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.deepGreen,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.darkGray,
    lineHeight: 22,
    textAlign: 'justify',
  },
});