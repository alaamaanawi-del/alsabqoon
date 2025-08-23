import AsyncStorage from '@react-native-async-storage/async-storage';

export type Settings = {
  rememberSelectedDate: boolean;
  lastSelectedDate?: string; // YYYY-MM-DD
};

const KEY = 'app:settings';

export async function getSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw) return JSON.parse(raw);
  return { rememberSelectedDate: false };
}

export async function saveSettings(s: Settings) {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
}