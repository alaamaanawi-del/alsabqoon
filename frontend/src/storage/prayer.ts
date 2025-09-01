import AsyncStorage from '@react-native-async-storage/async-storage';

export type QuestionKey = 'understood' | 'dua' | 'followed' | 'taught';
export type RakkaIndex = 1 | 2;

export type VerseRange = {
  surahNumber: number;
  nameAr: string;
  nameEn: string;
  fromAyah: number;
  toAyah: number;
};

export type RakkaRecord = {
  ranges: VerseRange[];
  questions: {
    understood: boolean;
    dua: boolean;
    followed: boolean;
    taught: boolean;
  };
  taughtCount: number; // number of people taught (if taught=true)
  addToTask: {
    understood: boolean;
    dua: boolean;
    followed: boolean;
    taught: boolean;
  };
  comments: string; // comments for this rakka
};

export type PrayerRecord = {
  prayer: string; // fajr, dhuhr, asr, maghrib, isha
  date: string; // YYYY-MM-DD
  rakka: Record<RakkaIndex, RakkaRecord>;
};

export type TaskItem = {
  id: string;
  prayer: string;
  date: string;
  rakka: RakkaIndex;
  question: QuestionKey;
  questionLabel: string;
  completed: boolean;
};

const KEY = (prayer: string, date: string) => `prayer:${prayer}:${date}`;
const TASKS_KEY = 'tasks:list';

export async function loadPrayerRecord(prayer: string, date: string): Promise<PrayerRecord> {
  const raw = await AsyncStorage.getItem(KEY(prayer, date));
  if (raw) return JSON.parse(raw);
  return {
    prayer,
    date,
    rakka: {
      1: {
        ranges: [],
        questions: { understood: false, dua: false, followed: false, taught: false },
        taughtCount: 0,
        addToTask: { understood: false, dua: false, followed: false, taught: false },
        comments: '',
      },
      2: {
        ranges: [],
        questions: { understood: false, dua: false, followed: false, taught: false },
        taughtCount: 0,
        addToTask: { understood: false, dua: false, followed: false, taught: false },
        comments: '',
      },
    },
  };
}

export async function savePrayerRecord(record: PrayerRecord) {
  await AsyncStorage.setItem(KEY(record.prayer, record.date), JSON.stringify(record));
}

export function computeScore(r: PrayerRecord) {
  const scoreRakka = (rk: RakkaRecord) => {
    const q = rk.questions;
    let s = 0;
    if (q.understood) s += 12.5;
    if (q.dua) s += 12.5;
    if (q.followed) s += 12.5;
    if (q.taught) s += 12.5;
    return s;
  };
  const r1 = scoreRakka(r.rakka[1]);
  const r2 = scoreRakka(r.rakka[2]);
  const total = Math.round((r1 + r2));
  return { r1, r2, total };
}

export async function loadTasks(): Promise<TaskItem[]> {
  const raw = await AsyncStorage.getItem(TASKS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveTasks(list: TaskItem[]) {
  await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(list));
}

export async function syncTasksFromRecord(record: PrayerRecord) {
  const list = await loadTasks();
  const mapLabel: Record<QuestionKey, string> = {
    understood: 'فهمت الآيات؟',
    dua: 'هل دعوت؟',
    followed: 'هل اتبعت الآيات؟',
    taught: 'هل علّمت الآيات؟',
  };
  const idFor = (q: QuestionKey, rakka: RakkaIndex) => `${record.prayer}:${record.date}:r${rakka}:${q}`;

  // Ensure tasks reflect addToTask toggles
  for (const rakka of [1, 2] as RakkaIndex[]) {
    for (const q of ['understood', 'dua', 'followed', 'taught'] as QuestionKey[]) {
      const add = record.rakka[rakka].addToTask[q];
      const id = idFor(q, rakka);
      const existingIndex = list.findIndex(t => t.id === id);
      if (add && existingIndex === -1) {
        list.push({ id, prayer: record.prayer, date: record.date, rakka, question: q, questionLabel: mapLabel[q], completed: false });
      } else if (!add && existingIndex !== -1) {
        list.splice(existingIndex, 1);
      }
    }
  }
  await saveTasks(list);
}