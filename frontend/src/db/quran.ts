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
      en TEXT,
      es TEXT,
      PRIMARY KEY (surahNumber, ayah),
      FOREIGN KEY (surahNumber) REFERENCES surahs(number)
    );
  `);
  const row = await database.getFirstAsync<{ c: number }>(`SELECT COUNT(1) as c FROM surahs;`);
  if (!row || row.c === 0) {
    await seedImport(database);
  }
}

async function seedImport(database: SQLite.SQLiteDatabase) {
  await database.withTransactionAsync(async () => {
    for (const s of (seed as any).surahs) {
      await database.runAsync(`INSERT INTO surahs(number, nameAr, nameEn) VALUES(?,?,?)`, [s.number, s.nameAr, s.nameEn]);
      for (const a of s.ayahs) {
        await database.runAsync(`INSERT INTO ayahs(surahNumber, ayah, textAr, en, es) VALUES(?,?,?,?,?)`, [s.number, a.ayah, a.textAr, a.en || null, a.es || null]);
      }
    }
  });
}

export async function searchQuran(query: string, bilingual: Bilingual): Promise<SearchItem[]> {
  const database = await getDb();
  const q = (query || '').trim();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const makeConds = (col: string) => tokens.map(() => `${col} LIKE ?`).join(' AND ');
  const paramsAr: any[] = tokens.map(t => `%${t}%`);
  const paramsEn: any[] = tokens.map(t => `%${t}%`);
  const paramsEs: any[] = tokens.map(t => `%${t}%`);

  const where = `(( ${makeConds('a.textAr')} ) OR ( ${makeConds('a.en')} ) OR ( ${makeConds('a.es')} ))`;
  const params = [...paramsAr, ...paramsEn, ...paramsEs];

  const rows = await database.getAllAsync<any>(
    `SELECT s.number as surahNumber, s.nameAr, s.nameEn, a.ayah, a.textAr,
            CASE WHEN ?='en' THEN a.en END as en,
            CASE WHEN ?='es' THEN a.es END as es
       FROM ayahs a
       JOIN surahs s ON s.number=a.surahNumber
      WHERE ${where}
      LIMIT 100`,
    [bilingual, bilingual, ...params]
  );
  return rows as SearchItem[];
}