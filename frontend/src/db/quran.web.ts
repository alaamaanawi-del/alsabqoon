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

function normalizeArabic(input: string): string {
  if (!input) return '';
  let s = input
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0629/g, '\u0647')
    .replace(/\u0649/g, '\u064A');
  return s;
}

export async function searchQuran(query: string, bilingual: Bilingual): Promise<SearchItem[]> {
  const q = (query || '').trim();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const tokensNorm = tokens.map(normalizeArabic);

  const results: SearchItem[] = [];
  for (const s of (seed as any).surahs) {
    for (const a of s.ayahs) {
      const ar = a.textAr;
      const matchAr = tokens.every((t, i) => ar.includes(t) || normalizeArabic(ar).includes(tokensNorm[i]));
      const matchEn = tokens.length ? tokens.every(t => (a.en || '').toLowerCase().includes(t.toLowerCase())) : false;
      const matchEs = tokens.length ? tokens.every(t => (a.es || '').toLowerCase().includes(t.toLowerCase())) : false;
      if (matchAr || matchEn || matchEs) {
        results.push({
          surahNumber: s.number,
          nameAr: s.nameAr,
          nameEn: s.nameEn,
          ayah: a.ayah,
          textAr: a.textAr,
          en: bilingual === 'en' ? a.en : undefined,
          es: bilingual === 'es' ? a.es : undefined,
        });
        if (results.length >= 100) return results;
      }
    }
  }
  return results;
}

export async function getSurahRange(surahNumber: number) {
  const surah = (seed as any).surahs.find((s: any) => s.number === surahNumber);
  if (!surah) return null;
  const max = Math.max(...surah.ayahs.map((a: any) => a.ayah));
  return { fromAyah: 1, toAyah: max };
}