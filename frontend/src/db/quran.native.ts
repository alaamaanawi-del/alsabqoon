import * as SQLite from 'expo-sqlite';
import seed from '../assets/quran_seed.json';

export type Bilingual = '' | 'en' | 'es';
export interface SearchItem {
  surahNumber: number;
  nameAr: string;
  nameEn: string;
  ayah: number;
  textAr: string;
  en?: string | null;
  es?: string | null;
}

let db: SQLite.SQLiteDatabase | null = null;

export function normalizeArabic(input: string): string {
  if (!input) return '';
  let s = input
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0629/g, '\u0647')
    .replace(/\u0649/g, '\u064A');
  return s;
}

export async function getDb() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('quran.db');
    await initDb(db);
  }
  return db!;
}

async function initDb(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS surahs (
      number INTEGER PRIMARY KEY NOT NULL,
      nameAr TEXT NOT NULL,
      nameEn TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ayahs (
      surahNumber INTEGER NOT NULL,
      ayah INTEGER NOT NULL,
      textAr TEXT NOT NULL,
      textArNorm TEXT,
      en TEXT,
      es TEXT,
      PRIMARY KEY (surahNumber, ayah),
      FOREIGN KEY (surahNumber) REFERENCES surahs(number)
    );
  `);

  const cols = await database.getAllAsync<any>(`PRAGMA table_info(ayahs);`);
  const hasNorm = cols.some((c: any) => c.name === 'textArNorm');
  if (!hasNorm) {
    await database.execAsync(`ALTER TABLE ayahs ADD COLUMN textArNorm TEXT;`);
  }

  const row = await database.getFirstAsync<{ c: number }>(`SELECT COUNT(1) as c FROM surahs;`);
  if (!row || row.c === 0) {
    await seedImport(database);
  } else {
    // Check if we have the new complete Quran data (103+ surahs)
    const surahCount = await database.getFirstAsync<{ c: number }>(`SELECT COUNT(1) as c FROM surahs;`);
    if (!surahCount || surahCount.c < 100) {
      // We have old limited data, need to re-import
      await database.execAsync(`DELETE FROM ayahs; DELETE FROM surahs;`);
      await seedImport(database);
    } else {
      const needs = await database.getFirstAsync<{ c: number }>(`SELECT COUNT(1) as c FROM ayahs WHERE textArNorm IS NULL;`);
      if (needs && needs.c > 0) {
        await normalizeAll(database);
      }
    }
  }
}

async function seedImport(database: SQLite.SQLiteDatabase) {
  await database.withTransactionAsync(async () => {
    for (const s of (seed as any).surahs) {
      // Handle both old format (nameAr, nameEn) and new format (surah)
      const nameAr = s.nameAr || s.surah || `Surah ${s.number}`;
      const nameEn = s.nameEn || `Surah ${s.number}`;
      
      await database.runAsync(`INSERT INTO surahs(number, nameAr, nameEn) VALUES(?,?,?)`, [s.number, nameAr, nameEn]);
      
      for (const a of s.ayahs) {
        // Handle both old format (textAr, ayah) and new format (text, ayah_number)
        const textAr = a.textAr || a.text || '';
        const ayahNumber = a.ayah || a.ayah_number || 1;
        const norm = normalizeArabic(textAr);
        
        await database.runAsync(`INSERT INTO ayahs(surahNumber, ayah, textAr, textArNorm, en, es) VALUES(?,?,?,?,?,?)`, [s.number, ayahNumber, textAr, norm, a.en || null, a.es || null]);
      }
    }
  });
}

async function normalizeAll(database: SQLite.SQLiteDatabase) {
  const rows = await database.getAllAsync<{ surahNumber: number; ayah: number; textAr: string }>(`SELECT surahNumber, ayah, textAr FROM ayahs WHERE textArNorm IS NULL`);
  await database.withTransactionAsync(async () => {
    for (const r of rows) {
      const norm = normalizeArabic(r.textAr);
      await database.runAsync(`UPDATE ayahs SET textArNorm=? WHERE surahNumber=? AND ayah=?`, [norm, r.surahNumber, r.ayah]);
    }
  });
}

export async function searchQuran(query: string, bilingual: Bilingual) {
  const database = await getDb();
  const q = (query || '').trim();
  if (!q) return [] as SearchItem[];
  const tokens = q.split(/\s+/).filter(Boolean);
  const tokensNorm = tokens.map(normalizeArabic);

  const conds: string[] = [];
  const params: any[] = [];
  tokens.forEach((t, i) => {
    conds.push(`(a.textAr LIKE ? OR a.textArNorm LIKE ?)`);
    params.push(`%${t}%`, `%${tokensNorm[i]}%`);
  });

  const enConds = tokens.map(() => `a.en LIKE ?`).join(' AND ');
  const esConds = tokens.map(() => `a.es LIKE ?`).join(' AND ');
  const allWhere = conds.length
    ? `( ${conds.join(' AND ')} ) OR ( ${enConds} ) OR ( ${esConds} )`
    : `(a.textAr LIKE ?)`;
  const transParams = [...tokens.map(t => `%${t}%`), ...tokens.map(t => `%${t}%`)];

  const rows = await database.getAllAsync<any>(
    `SELECT s.number as surahNumber, s.nameAr, s.nameEn, a.ayah, a.textAr,
            CASE WHEN ?='en' THEN a.en END as en,
            CASE WHEN ?='es' THEN a.es END as es
       FROM ayahs a
       JOIN surahs s ON s.number=a.surahNumber
      WHERE ${allWhere}`,
    [bilingual, bilingual, ...params, ...transParams]
  );
  return rows as SearchItem[];
}

export async function getSurahRange(surahNumber: number): Promise<{ fromAyah: number; toAyah: number } | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ max: number }>(`SELECT MAX(ayah) as max FROM ayahs WHERE surahNumber=?`, [surahNumber]);
  if (!row || !row.max) return null;
  return { fromAyah: 1, toAyah: row.max };
}

export async function getSurahVerses(surahNumber: number): Promise<any[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<any>(
    `SELECT a.ayah, a.textAr, a.en, a.es
     FROM ayahs a 
     WHERE a.surahNumber = ?
     ORDER BY a.ayah`,
    [surahNumber]
  );
  return rows.map(row => ({
    ayah: row.ayah,
    textAr: row.textAr || '',
    en: row.en || null,
    es: row.es || null,
    tafseer: null // Add tafseer support later if needed
  }));
}