import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LessonProgress {
  understood: boolean;
  madeDua: boolean;
  practiced: boolean;
  shared: boolean;
}

export interface LessonRecord {
  id: string;
  lessonId: string;
  progress: LessonProgress;
  score: number; // 0-100 based on questions answered
  completedAt?: string;
  rating?: number; // 1-5 stars
  viewCount: number;
}

export interface LessonComment {
  id: string;
  lessonId: string;
  userId: string;
  username: string;
  content: string;
  likes: number;
  dislikes: number;
  replies: LessonComment[];
  createdAt: string;
}

export interface Lesson {
  id: string;
  categoryId: string;
  title: string;
  content: string;
  contentType: 'text' | 'video' | 'mixed';
  videoUrl?: string;
  imageUrls?: string[];
  totalViews: number;
  totalRatings: number;
  averageRating: number;
  order: number;
}

export interface LessonCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  lessons: Lesson[];
  totalLessons: number;
}

// Sample lesson data structure
export const LESSON_CATEGORIES: LessonCategory[] = [
  {
    id: 'fiqh',
    name: 'الفقه',
    icon: '📖',
    color: '#4CAF50',
    totalLessons: 30,
    lessons: [
      {
        id: 'fiqh-1',
        categoryId: 'fiqh',
        title: 'أحكام الصلاة الأساسية',
        content: `بسم الله الرحمن الرحيم

# أحكام الصلاة الأساسية

الصلاة هي الركن الثاني من أركان الإسلام وهي أهم العبادات بعد الشهادتين.

## شروط الصلاة:
1. **الطهارة** - الوضوء أو الغسل حسب الحاجة
2. **ستر العورة** - لبس الثياب المناسبة
3. **استقبال القبلة** - التوجه نحو مكة المكرمة
4. **دخول الوقت** - أداء كل صلاة في وقتها المحدد

## أركان الصلاة:
- التكبير (الله أكبر)
- قراءة الفاتحة
- الركوع والسجود
- التشهد والسلام

الصلاة تطهر النفس وتقرب العبد إلى ربه، فاحرص على أدائها في أوقاتها بخشوع وتدبر.`,
        contentType: 'text',
        totalViews: 150,
        totalRatings: 45,
        averageRating: 4.2,
        order: 1
      },
      {
        id: 'fiqh-2', 
        categoryId: 'fiqh',
        title: 'آداب الصيام',
        content: `بسم الله الرحمن الرحيم

# آداب الصيام في الإسلام

الصيام هو الركن الثالث من أركان الإسلام، وله آداب وأحكام يجب على المسلم معرفتها.

## آداب الصوم:
1. **السحور** - تناول الطعام قبل الفجر
2. **تعجيل الإفطار** - الإفطار عند المغرب مباشرة
3. **الدعاء عند الإفطار** - "اللهم لك صمت وعلى رزقك أفطرت"
4. **الإكثار من القرآن والذكر** - استغلال الوقت في العبادة

## فوائد الصيام:
- تقوية الإرادة والصبر
- تذكر الفقراء والمحتاجين  
- تطهير النفس من المعاصي
- زيادة التقوى والخشية من الله

فاحرص أخي المسلم على صيام رمضان بآدابه وأحكامه لتنال الأجر العظيم.`,
        contentType: 'text',
        totalViews: 89,
        totalRatings: 23,
        averageRating: 4.5,
        order: 2
      }
    ]
  },
  {
    id: 'aqeedah',
    name: 'العقيدة',
    icon: '🕌',
    color: '#2196F3', 
    totalLessons: 25,
    lessons: [
      {
        id: 'aqeedah-1',
        categoryId: 'aqeedah',
        title: 'أركان الإيمان الستة',
        content: `بسم الله الرحمن الرحيم

# أركان الإيمان الستة

الإيمان له ستة أركان أساسية يجب على كل مسلم الإيمان بها.

## الأركان الستة:
1. **الإيمان بالله** - وحدانيته وربوبيته وألوهيته
2. **الإيمان بالملائكة** - جبريل وميكائيل وإسرافيل وغيرهم
3. **الإيمان بالكتب** - القرآن والتوراة والإنجيل والزبور
4. **الإيمان بالرسل** - محمد وعيسى وموسى وإبراهيم وغيرهم
5. **الإيمان باليوم الآخر** - يوم القيامة والبعث والحساب
6. **الإيمان بالقدر** - خيره وشره من الله تعالى

هذه الأركان هي أساس العقيدة الإسلامية الصحيحة.`,
        contentType: 'text',
        totalViews: 230,
        totalRatings: 67,
        averageRating: 4.7,
        order: 1
      }
    ]
  },
  {
    id: 'tafseer',
    name: 'التفسير',
    icon: '📜',
    color: '#FF9800',
    totalLessons: 45,
    lessons: [
      {
        id: 'tafseer-1',
        categoryId: 'tafseer',
        title: 'تفسير سورة الفاتحة',
        content: `بسم الله الرحمن الرحيم

# تفسير سورة الفاتحة - أم الكتاب

سورة الفاتحة هي أعظم سورة في القرآن الكريم وتسمى "أم الكتاب".

## معاني الآيات:

**بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ**
- نبدأ باسم الله الذي له الأسماء الحسنى

**الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ**  
- الثناء والشكر لله رب جميع المخلوقات

**الرَّحْمَٰنِ الرَّحِيمِ**
- الرحمن في الدنيا، الرحيم في الآخرة

**مَالِكِ يَوْمِ الدِّينِ**
- مالك يوم القيامة والحساب

**إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ**
- إقرار بالعبودية والاستعانة بالله وحده

**اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ**
- دعاء بالهداية إلى الطريق المستقيم

**صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ**
- طريق الأنبياء والصالحين، وليس طريق المغضوب عليهم أو الضالين

هذه السورة تحوي جميع معاني القرآن الكريم.`,
        contentType: 'text',
        totalViews: 312,
        totalRatings: 89,
        averageRating: 4.8,
        order: 1
      }
    ]
  }
];

// Storage functions
const LESSON_RECORDS_KEY = 'lesson_records';
const LESSON_COMMENTS_KEY = 'lesson_comments';

export const loadLessonRecord = async (lessonId: string): Promise<LessonRecord | null> => {
  try {
    const stored = await AsyncStorage.getItem(LESSON_RECORDS_KEY);
    const records: LessonRecord[] = stored ? JSON.parse(stored) : [];
    return records.find(r => r.lessonId === lessonId) || null;
  } catch (error) {
    console.error('Error loading lesson record:', error);
    return null;
  }
};

export const saveLessonRecord = async (record: LessonRecord): Promise<void> => {
  try {
    const stored = await AsyncStorage.getItem(LESSON_RECORDS_KEY);
    const records: LessonRecord[] = stored ? JSON.parse(stored) : [];
    const existingIndex = records.findIndex(r => r.lessonId === record.lessonId);
    
    if (existingIndex >= 0) {
      records[existingIndex] = record;
    } else {
      records.push(record);
    }
    
    await AsyncStorage.setItem(LESSON_RECORDS_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('Error saving lesson record:', error);
  }
};

export const getAllLessonRecords = async (): Promise<LessonRecord[]> => {
  try {
    const stored = await AsyncStorage.getItem(LESSON_RECORDS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading lesson records:', error);
    return [];
  }
};

export const calculateLessonScore = (progress: LessonProgress): number => {
  const questions = [progress.understood, progress.madeDua, progress.practiced, progress.shared];
  const answeredCount = questions.filter(Boolean).length;
  return (answeredCount * 12.5); // Each question worth 12.5 points
};

export const calculateKnowledgeScore = async (): Promise<{ 
  totalScore: number; 
  totalLessons: number; 
  completedLessons: number; 
  percentage: number 
}> => {
  const records = await getAllLessonRecords();
  const totalLessons = LESSON_CATEGORIES.reduce((sum, cat) => sum + cat.totalLessons, 0);
  const completedLessons = records.filter(r => r.score === 100).length;
  const totalScore = records.reduce((sum, r) => sum + r.score, 0);
  const percentage = totalLessons > 0 ? Math.round((totalScore / (totalLessons * 100)) * 100) : 0;
  
  return { totalScore, totalLessons, completedLessons, percentage };
};

// Comment functions
export const loadLessonComments = async (lessonId: string): Promise<LessonComment[]> => {
  try {
    const stored = await AsyncStorage.getItem(LESSON_COMMENTS_KEY);
    const allComments: LessonComment[] = stored ? JSON.parse(stored) : [];
    return allComments.filter(c => c.lessonId === lessonId);
  } catch (error) {
    console.error('Error loading lesson comments:', error);
    return [];
  }
};

export const saveLessonComment = async (comment: LessonComment): Promise<void> => {
  try {
    const stored = await AsyncStorage.getItem(LESSON_COMMENTS_KEY);
    const comments: LessonComment[] = stored ? JSON.parse(stored) : [];
    comments.push(comment);
    await AsyncStorage.setItem(LESSON_COMMENTS_KEY, JSON.stringify(comments));
  } catch (error) {
    console.error('Error saving lesson comment:', error);
  }
};