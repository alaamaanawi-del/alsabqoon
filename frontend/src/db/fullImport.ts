import { Platform } from 'react-native';

export type ImportProgress = { total: number; inserted: number };

export async function importQuranFromUrl(url: string, onProgress?: (p: ImportProgress) => void) {
  if (Platform.OS === 'web') throw new Error('الاستيراد متاح على الجوال فقط (Android / iOS).');
  const mod = await import('./fullImport.native');
  return mod.importQuranFromUrl(url, onProgress as any);
}

export async function importQuranFull(data: any, onProgress?: (p: ImportProgress) => void) {
  if (Platform.OS === 'web') throw new Error('الاستيراد متاح على الجوال فقط (Android / iOS).');
  const mod = await import('./fullImport.native');
  return mod.importQuranFull(data, onProgress as any);
}

export async function isFullQuranImported(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const mod = await import('./fullImport.native');
  return mod.isFullQuranImported();
}