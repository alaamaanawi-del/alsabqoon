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
  
  try {
    for (const s of (seed as any).surahs) {
      // Handle different data structure formats
      const surahNameAr = s.nameAr || s.surah || `Surah ${s.number}`;
      const surahNameEn = s.nameEn || `Surah ${s.number}`;
      
      for (const a of s.ayahs) {
        // Handle different data structure formats
        const textAr = a.textAr || a.text || '';
        const ayahNumber = a.ayah || a.ayah_number || 1;
        const enText = a.en || '';
        const esText = a.es || '';
        
        if (!textAr) continue; // Skip if no Arabic text
        
        // Arabic text matching
        const matchAr = tokens.every((t, i) => 
          textAr.includes(t) || normalizeArabic(textAr).includes(tokensNorm[i])
        );
        
        // English text matching (safe)
        const matchEn = tokens.length && enText ? tokens.every(t => 
          enText.toLowerCase().includes(t.toLowerCase())
        ) : false;
        
        // Spanish text matching (safe)
        const matchEs = tokens.length && esText ? tokens.every(t => 
          esText.toLowerCase().includes(t.toLowerCase())
        ) : false;
        
        if (matchAr || matchEn || matchEs) {
          results.push({
            surahNumber: s.number,
            nameAr: surahNameAr,
            nameEn: surahNameEn,
            ayah: ayahNumber,
            textAr: textAr,
            en: bilingual === 'en' ? enText : undefined,
            es: bilingual === 'es' ? esText : undefined,
          });
          // Remove the 100 limit - show all results
          if (results.length >= 1000) return results; // Only limit at 1000 for performance
        }
      }
    }
  } catch (error) {
    console.error('Search error:', error);
  }
  
  return results;
}

export async function getSurahRange(surahNumber: number) {
  const surah = (seed as any).surahs.find((s: any) => s.number === surahNumber);
  if (!surah) return null;
  const max = Math.max(...surah.ayahs.map((a: any) => a.ayah));
  return { fromAyah: 1, toAyah: max };
}