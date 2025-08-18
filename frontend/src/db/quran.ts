import { Platform } from 'react-native';

// Facade module to avoid importing expo-sqlite on web.
// On native, use quran.native (expo-sqlite). On web, use quran.web (in-memory seed).

export * from './quran.index';

// Note: normalizeArabic is only needed internally. If needed externally, re-export via quran.native/web.