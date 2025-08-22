import * as FileSystem from 'expo-file-system';
import { getDb, normalizeArabic } from './quran.native';

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
  const raw = JSON.parse(jsonStr);
  const data = normalizeToFullQuranJson(raw);
  await importQuranFull(data, onProgress);
}

export async function importQuranFull(data: FullQuranJson, onProgress?: (p: ImportProgress) => void) {
  const db = await getDb();
  const total = data.surahs.reduce((acc, s) => acc + s.ayahs.length, 0);
  let inserted = 0;
  onProgress?.({ total, inserted });

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
        if (inserted % 200 === 0) onProgress?.({ total, inserted });
      }
    }
  });
  onProgress?.({ total, inserted });
}

export async function isFullQuranImported(): Promise<boolean> {
  const db = await getDb();
  const s = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(1) as c FROM surahs`);
  const a = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(1) as c FROM ayahs`);
  return (s?.c ?? 0) >= 114 && (a?.c ?? 0) >= 6200;
}

// Try to normalize different common JSON formats to our FullQuranJson
function normalizeToFullQuranJson(raw: any): FullQuranJson {
  // Case 1: Already in expected shape
  if (raw && Array.isArray(raw.surahs)) {
    return raw as FullQuranJson;
  }

  // Case 2: Object keyed by surah numbers: { "1": { nameAr, nameEn, ayahs: [...] }, ... }
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && raw['1']) {
    const surahs = Object.keys(raw).map((k) => {
      const s = raw[k];
      const ayahs = (s.ayahs || s.ayat || s.aya || s.verses || []).map((a: any, idx: number) => ({
        ayah: a.ayah || a.number || a.id || a.aya || a.verse || idx + 1,
        textAr: a.textAr || a.text || a.ar || a.arabic || a.content || '',
        en: a.en || a.english || a.tr || a.translation || undefined,
        es: a.es || a.spanish || undefined,
      }));
      return {
        number: Number(k),
        nameAr: s.nameAr || s.name || s.ar || s.arabic || `سورة ${k}`,
        nameEn: s.nameEn || s.en || s.english || s.translation || `Surah ${k}`,
        ayahs,
      };
    });
    return { surahs };
  }

  // Case 3: Array of surahs under another key like chapters, data, etc.
  const containerKeys = ['chapters', 'data', 'quran', 'suras', 'surah', 'list'];
  for (const key of containerKeys) {
    if (raw && Array.isArray(raw[key])) {
      const surahs = raw[key].map((s: any, idx: number) => {
        const number = s.number || s.index || s.id || s.surah || idx + 1;
        const nameAr = s.nameAr || s.name || s.arabic || s.ar || s.title || `سورة ${number}`;
        const nameEn = s.nameEn || s.english || s.en || s.translation || `Surah ${number}`;
        const aySrc = s.ayahs || s.ayat || s.aya || s.verses || s.verse || s.text || [];
        const ayahs = (Array.isArray(aySrc) ? aySrc : []).map((a: any, j: number) => ({
          ayah: a.ayah || a.number || a.id || a.aya || a.verse || j + 1,
          textAr: a.textAr || a.text || a.ar || a.arabic || a.content || '',
          en: a.en || a.english || a.tr || a.translation || undefined,
          es: a.es || a.spanish || undefined,
        }));
        return { number, nameAr, nameEn, ayahs };
      });
      return { surahs };
    }
  }

  // Case 4: Raw is array of surahs
  if (Array.isArray(raw)) {
    const surahs = raw.map((s: any, idx: number) => {
      const number = s.number || s.index || s.id || idx + 1;
      const nameAr = s.nameAr || s.name || s.arabic || s.ar || s.title || `سورة ${number}`;
      const nameEn = s.nameEn || s.english || s.en || s.translation || `Surah ${number}`;
      const aySrc = s.ayahs || s.ayat || s.aya || s.verses || s.verse || s.text || [];
      const ayahs = (Array.isArray(aySrc) ? aySrc : []).map((a: any, j: number) => ({
        ayah: a.ayah || a.number || a.id || a.aya || a.verse || j + 1,
        textAr: a.textAr || a.text || a.ar || a.arabic || a.content || '',
        en: a.en || a.english || a.tr || a.translation || undefined,
        es: a.es || a.spanish || undefined,
      }));
      return { number, nameAr, nameEn, ayahs };
    });
    return { surahs };
  }

  throw new Error('Unsupported Qur\u2019an JSON format.');
}