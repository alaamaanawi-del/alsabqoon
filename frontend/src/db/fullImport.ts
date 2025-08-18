import * as FileSystem from 'expo-file-system';
import { getDb, normalizeArabic } from './quran';

export type ImportProgress = { total: number; inserted: number };

export type FullQuranJson = {
  surahs: {
    number: number;
    nameAr: string;
    nameEn: string;
    ayahs: { ayah: number; textAr: string; en?: string; es?: string }[];
  }[];
};

export async function importQuranFromUrl(url: string, onProgress?: (p: ImportProgress) => void) {
  const download = await FileSystem.downloadAsync(url, FileSystem.cacheDirectory + 'quran_full.json');
  const jsonStr = await FileSystem.readAsStringAsync(download.uri, { encoding: FileSystem.EncodingType.UTF8 });
  const data = JSON.parse(jsonStr) as FullQuranJson;
  await importQuranFull(data, onProgress);
}

export async function importQuranFull(data: FullQuranJson, onProgress?: (p: ImportProgress) => void) {
  const db = await getDb();
  const total = data.surahs.reduce((acc, s) => acc + s.ayahs.length, 0);
  let inserted = 0;
  if (onProgress) onProgress({ total, inserted });

  await db.withTransactionAsync(async () => {
    await db.execAsync(`DELETE FROM ayahs; DELETE FROM surahs;`);
    for (const s of data.surahs) {
      await db.runAsync(`INSERT INTO surahs(number, nameAr, nameEn) VALUES(?,?,?)`, [s.number, s.nameAr, s.nameEn]);
      for (const a of s.ayahs) {
        await db.runAsync(
          `INSERT INTO ayahs(surahNumber, ayah, textAr, textArNorm, en, es) VALUES(?,?,?,?,?,?)`,
          [s.number, a.ayah, a.textAr, normalizeArabic(a.textAr), a.en || null, a.es || null]
        );
        inserted++;
        if (onProgress && inserted % 50 === 0) onProgress({ total, inserted });
      }
    }
  });
  if (onProgress) onProgress({ total, inserted });
}

export async function isFullQuranImported(): Promise<boolean> {
  const db = await getDb();
  const s = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(1) as c FROM surahs`);
  const a = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(1) as c FROM ayahs`);
  return (s?.c ?? 0) >= 114 && (a?.c ?? 0) >= 6200; // rough threshold
}