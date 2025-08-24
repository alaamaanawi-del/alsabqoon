import AsyncStorage from '@react-native-async-storage/async-storage';

// Settings interfaces
export interface FontSettings {
  appInterface: 'small' | 'medium' | 'large';
  lessonsReading: 'small' | 'medium' | 'large';
}

export interface NotificationSettings {
  newLessons: boolean;
  appUpdates: boolean;
}

export interface ThemeSettings {
  theme: 'light' | 'dark' | 'pink' | 'blue' | 'islamicGreen';
}

export interface LanguageSettings {
  language: 'ar' | 'en' | 'es';
}

export interface PrayerSettings {
  calculationMethod: 'mwl' | 'isna' | 'egypt' | 'makkah' | 'karachi' | 'tehran' | 'jafari';
  asrMethod: 'hanafi' | 'shafi';
}

export interface BackupSettings {
  lastBackupTime: string | null;
  autoBackupEnabled: boolean; // Always true, cannot be disabled
  backupData: any | null;
}

export interface AppSettings {
  fonts: FontSettings;
  notifications: NotificationSettings;
  theme: ThemeSettings;
  language: LanguageSettings;
  prayer: PrayerSettings;
  backup: BackupSettings;
}

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  fonts: {
    appInterface: 'medium',
    lessonsReading: 'medium'
  },
  notifications: {
    newLessons: true,
    appUpdates: true
  },
  theme: {
    theme: 'islamicGreen'
  },
  language: {
    language: 'ar'
  },
  prayer: {
    calculationMethod: 'mwl',
    asrMethod: 'shafi'
  },
  backup: {
    lastBackupTime: null,
    autoBackupEnabled: true,
    backupData: null
  }
};

// Storage keys
const SETTINGS_KEY = 'app_settings';
const BACKUP_KEY = 'app_backup_data';

// Settings management functions
export const loadSettings = async (): Promise<AppSettings> => {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsedSettings = JSON.parse(stored);
      // Merge with defaults to ensure all properties exist
      return {
        ...DEFAULT_SETTINGS,
        ...parsedSettings,
        fonts: { ...DEFAULT_SETTINGS.fonts, ...parsedSettings.fonts },
        notifications: { ...DEFAULT_SETTINGS.notifications, ...parsedSettings.notifications },
        theme: { ...DEFAULT_SETTINGS.theme, ...parsedSettings.theme },
        language: { ...DEFAULT_SETTINGS.language, ...parsedSettings.language },
        prayer: { ...DEFAULT_SETTINGS.prayer, ...parsedSettings.prayer },
        backup: { ...DEFAULT_SETTINGS.backup, ...parsedSettings.backup }
      };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error loading settings:', error);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (settings: AppSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
};

export const updateFontSettings = async (fonts: Partial<FontSettings>): Promise<void> => {
  const currentSettings = await loadSettings();
  const updatedSettings = {
    ...currentSettings,
    fonts: { ...currentSettings.fonts, ...fonts }
  };
  await saveSettings(updatedSettings);
};

export const updateNotificationSettings = async (notifications: Partial<NotificationSettings>): Promise<void> => {
  const currentSettings = await loadSettings();
  const updatedSettings = {
    ...currentSettings,
    notifications: { ...currentSettings.notifications, ...notifications }
  };
  await saveSettings(updatedSettings);
};

export const updateThemeSettings = async (theme: ThemeSettings['theme']): Promise<void> => {
  const currentSettings = await loadSettings();
  const updatedSettings = {
    ...currentSettings,
    theme: { theme }
  };
  await saveSettings(updatedSettings);
};

export const updateLanguageSettings = async (language: LanguageSettings['language']): Promise<void> => {
  const currentSettings = await loadSettings();
  const updatedSettings = {
    ...currentSettings,
    language: { language }
  };
  await saveSettings(updatedSettings);
};

export const updatePrayerSettings = async (prayer: Partial<PrayerSettings>): Promise<void> => {
  const currentSettings = await loadSettings();
  const updatedSettings = {
    ...currentSettings,
    prayer: { ...currentSettings.prayer, ...prayer }
  };
  await saveSettings(updatedSettings);
};

// Backup functions
export const performBackup = async (): Promise<boolean> => {
  try {
    // Get all app data
    const keys = await AsyncStorage.getAllKeys();
    const allData: { [key: string]: string } = {};
    
    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        allData[key] = value;
      }
    }

    // Save backup data
    const backupData = {
      timestamp: new Date().toISOString(),
      data: allData
    };

    await AsyncStorage.setItem(BACKUP_KEY, JSON.stringify(backupData));

    // Update settings with backup time
    const currentSettings = await loadSettings();
    const updatedSettings = {
      ...currentSettings,
      backup: {
        ...currentSettings.backup,
        lastBackupTime: new Date().toISOString(),
        backupData: backupData
      }
    };
    await saveSettings(updatedSettings);

    return true;
  } catch (error) {
    console.error('Error performing backup:', error);
    return false;
  }
};

export const restoreFromBackup = async (): Promise<boolean> => {
  try {
    const backupDataString = await AsyncStorage.getItem(BACKUP_KEY);
    if (!backupDataString) {
      return false;
    }

    const backupData = JSON.parse(backupDataString);
    
    // Clear existing data
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys);

    // Restore backup data
    const { data } = backupData;
    const keyValuePairs = Object.entries(data).map(([key, value]) => [key, value as string]);
    await AsyncStorage.multiSet(keyValuePairs);

    return true;
  } catch (error) {
    console.error('Error restoring from backup:', error);
    return false;
  }
};

// Auto-backup scheduler (runs every 24 hours at 2 AM)
export const scheduleAutoBackup = () => {
  const checkBackup = async () => {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Check if it's 2 AM
    if (currentHour === 2) {
      const settings = await loadSettings();
      const lastBackup = settings.backup.lastBackupTime;
      
      if (!lastBackup) {
        // First backup
        await performBackup();
        return;
      }

      const lastBackupDate = new Date(lastBackup);
      const timeDiff = now.getTime() - lastBackupDate.getTime();
      const hoursDiff = timeDiff / (1000 * 3600);

      // If more than 23 hours since last backup
      if (hoursDiff >= 23) {
        await performBackup();
      }
    }
  };

  // Check every hour
  setInterval(checkBackup, 60 * 60 * 1000);
  
  // Also check on app start
  setTimeout(checkBackup, 5000);
};

// Prayer calculation methods
export const PRAYER_CALCULATION_METHODS = {
  mwl: 'Muslim World League',
  isna: 'Islamic Society of North America',
  egypt: 'Egyptian General Authority',
  makkah: 'Umm Al-Qura University, Makkah',
  karachi: 'University of Islamic Sciences, Karachi',
  tehran: 'Institute of Geophysics, Tehran',
  jafari: 'Shia Ithna-Ashari (Jafari)'
};

export const ASR_CALCULATION_METHODS = {
  hanafi: 'Hanafi (Shadow length = 2x object + Fajr shadow)',
  shafi: 'Shafi/Maliki/Hanbali (Shadow length = 1x object + Fajr shadow)'
};

// Theme colors
export const THEME_COLORS = {
  light: {
    primary: '#3F6663',
    secondary: '#457C76',
    accent: '#F4BD24',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#0B0F0E',
    textSecondary: '#666666'
  },
  dark: {
    primary: '#457C76',
    secondary: '#3F6663',
    accent: '#F4BD24',
    background: '#121212',
    surface: '#1E1E1E',
    text: '#F2F2F2',
    textSecondary: '#CCCCCC'
  },
  pink: {
    primary: '#E91E63',
    secondary: '#F06292',
    accent: '#FFC107',
    background: '#FCE4EC',
    surface: '#FFFFFF',
    text: '#0B0F0E',
    textSecondary: '#666666'
  },
  blue: {
    primary: '#2196F3',
    secondary: '#64B5F6',
    accent: '#FF9800',
    background: '#E3F2FD',
    surface: '#FFFFFF',
    text: '#0B0F0E',
    textSecondary: '#666666'
  },
  islamicGreen: {
    primary: '#3F6663',
    secondary: '#457C76',
    accent: '#F4BD24',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#0B0F0E',
    textSecondary: '#666666'
  }
};

// Font size multipliers
export const FONT_SIZE_MULTIPLIERS = {
  small: 0.85,
  medium: 1.0,
  large: 1.2
};