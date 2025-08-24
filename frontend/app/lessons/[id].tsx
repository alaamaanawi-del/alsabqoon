import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Colors } from "../../src/theme/colors";
import { 
  LESSON_CATEGORIES, 
  Lesson, 
  LessonRecord, 
  LessonProgress,
  LessonComment,
  loadLessonRecord,
  saveLessonRecord,
  calculateLessonScore,
  loadLessonComments,
  saveLessonComment
} from "../../src/storage/lessons";

export default function LessonDetailScreen() {
  const { id, title, categoryId } = useLocalSearchParams<{
    id: string;
    title: string;
    categoryId: string;
  }>();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonRecord, setLessonRecord] = useState<LessonRecord | null>(null);
  const [userRating, setUserRating] = useState<number>(0);
  const [progress, setProgress] = useState<LessonProgress>({
    understood: false,
    madeDua: false,
    practiced: false,
    shared: false
  });
  const [comments, setComments] = useState<LessonComment[]>([]);
  const [newComment, setNewComment] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLessonData();
    incrementViewCount();
  }, [id]);

  const loadLessonData = async () => {
    try {
      // Find the lesson from categories
      let foundLesson: Lesson | null = null;
      for (const category of LESSON_CATEGORIES) {
        const lessonInCategory = category.lessons.find(l => l.id === id);
        if (lessonInCategory) {
          foundLesson = lessonInCategory;
          break;
        }
      }

      if (foundLesson) {
        setLesson(foundLesson);
        
        // Load user progress
        const record = await loadLessonRecord(id);
        if (record) {
          setLessonRecord(record);
          setProgress(record.progress);
          setUserRating(record.rating || 0);
        }

        // Load comments
        const lessonComments = await loadLessonComments(id);
        setComments(lessonComments);
      }
    } catch (error) {
      console.error('Error loading lesson data:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = () => {
    // In a real app, this would call an API to increment view count
    // For now, we'll just simulate it locally
  };

  const updateProgress = async (key: keyof LessonProgress, value: boolean) => {
    const newProgress = { ...progress, [key]: value };
    setProgress(newProgress);

    const score = calculateLessonScore(newProgress);
    const isCompleted = score === 100;

    const updatedRecord: LessonRecord = {
      id: lessonRecord?.id || `${id}_${Date.now()}`,
      lessonId: id,
      progress: newProgress,
      score,
      completedAt: isCompleted ? new Date().toISOString() : lessonRecord?.completedAt,
      rating: userRating || lessonRecord?.rating,
      viewCount: (lessonRecord?.viewCount || 0) + 1
    };

    await saveLessonRecord(updatedRecord);
    setLessonRecord(updatedRecord);
  };

  const updateRating = async (rating: number) => {
    setUserRating(rating);

    const updatedRecord: LessonRecord = {
      id: lessonRecord?.id || `${id}_${Date.now()}`,
      lessonId: id,
      progress,
      score: lessonRecord?.score || calculateLessonScore(progress),
      completedAt: lessonRecord?.completedAt,
      rating,
      viewCount: (lessonRecord?.viewCount || 0) + 1
    };

    await saveLessonRecord(updatedRecord);
    setLessonRecord(updatedRecord);
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    const comment: LessonComment = {
      id: `comment_${Date.now()}`,
      lessonId: id,
      userId: 'user_1', // In a real app, get from auth
      username: 'المستخدم',
      content: newComment.trim(),
      likes: 0,
      dislikes: 0,
      replies: [],
      createdAt: new Date().toISOString()
    };

    await saveLessonComment(comment);
    setComments([...comments, comment]);
    setNewComment("");
  };

  const renderProgressBar = (percentage: number) => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBackground}>
        <View style={[styles.progressFill, { width: `${percentage}%` }]} />
      </View>
      <Text style={styles.progressText}>{percentage}%</Text>
    </View>
  );

  const renderStarRating = () => (
    <View style={styles.ratingContainer}>
      <Text style={styles.ratingLabel}>قيم هذا الدرس:</Text>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => updateRating(star)}
            style={styles.starButton}
          >
            <Text style={[
              styles.star,
              { color: star <= userRating ? Colors.warmOrange : Colors.lightGray }
            ]}>
              ⭐
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderEngagementQuestions = () => (
    <View style={styles.questionsContainer}>
      <Text style={styles.questionsTitle}>أسئلة التفاعل والتطبيق</Text>
      
      {[
        { key: 'understood' as keyof LessonProgress, label: 'هل فهمت الدرس؟', icon: '🧠' },
        { key: 'madeDua' as keyof LessonProgress, label: 'هل دعوت الله بما تعلمت؟', icon: '🤲' },
        { key: 'practiced' as keyof LessonProgress, label: 'هل طبقت ما تعلمت؟', icon: '✨' },
        { key: 'shared' as keyof LessonProgress, label: 'هل شاركت المعرفة مع آخرين؟', icon: '📢' }
      ].map((question) => (
        <View key={question.key} style={styles.questionItem}>
          <View style={styles.questionHeader}>
            <Text style={styles.questionIcon}>{question.icon}</Text>
            <Text style={styles.questionLabel}>{question.label}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.questionButton,
              { backgroundColor: progress[question.key] ? Colors.deepGreen : Colors.lightGray }
            ]}
            onPress={() => updateProgress(question.key, !progress[question.key])}
          >
            <Text style={[
              styles.questionButtonText,
              { color: progress[question.key] ? Colors.light : Colors.dark }
            ]}>
              {progress[question.key] ? '✓ نعم' : 'لا'}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const renderComments = () => (
    <View style={styles.commentsContainer}>
      <Text style={styles.commentsTitle}>التعليقات ({comments.length})</Text>
      
      {/* Add Comment */}
      <View style={styles.addCommentContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="أضف تعليقك..."
          value={newComment}
          onChangeText={setNewComment}
          multiline
          textAlign="right"
        />
        <TouchableOpacity
          style={[
            styles.commentButton,
            { opacity: !newComment.trim() ? 0.5 : 1 }
          ]}
          onPress={addComment}
          disabled={!newComment.trim()}
        >
          <Text style={styles.commentButtonText}>إرسال</Text>
        </TouchableOpacity>
      </View>

      {/* Comments List */}
      {comments.map((comment) => (
        <View key={comment.id} style={styles.commentItem}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentUsername}>{comment.username}</Text>
            <Text style={styles.commentDate}>
              {new Date(comment.createdAt).toLocaleDateString('ar-SA')}
            </Text>
          </View>
          <Text style={styles.commentContent}>{comment.content}</Text>
          <View style={styles.commentActions}>
            <TouchableOpacity style={styles.commentAction}>
              <Text style={styles.commentActionText}>👍 {comment.likes}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.commentAction}>
              <Text style={styles.commentActionText}>👎 {comment.dislikes}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.deepGreen} />
          <Text style={styles.loadingText}>جاري تحميل الدرس...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!lesson) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>لم يتم العثور على الدرس</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>العودة</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const completionPercentage = Math.round((lessonRecord?.score || 0));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← العودة</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{lesson.title}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>👁</Text>
            <Text style={styles.statText}>{lesson.totalViews} مشاهدة</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>⭐</Text>
            <Text style={styles.statText}>
              {lesson.averageRating.toFixed(1)} ({lesson.totalRatings} تقييم)
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>📋</Text>
            <Text style={styles.statText}>
              {lesson.contentType === 'video' ? 'فيديو' : 
               lesson.contentType === 'mixed' ? 'مختلط' : 'نص'}
            </Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressSection}>
          <Text style={styles.progressTitle}>تقدمك في هذا الدرس</Text>
          {renderProgressBar(completionPercentage)}
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.content}>{lesson.content}</Text>
        </View>

        {/* Rating */}
        {renderStarRating()}

        {/* Engagement Questions */}
        {renderEngagementQuestions()}

        {/* Comments */}
        {renderComments()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.dark,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 20,
  },
  header: {
    backgroundColor: Colors.deepGreen,
    padding: 20,
    paddingTop: 10,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: Colors.light,
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.light,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: Colors.light,
    marginBottom: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  statText: {
    fontSize: 14,
    color: Colors.dark,
    opacity: 0.8,
  },
  progressSection: {
    padding: 16,
    backgroundColor: Colors.light,
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBackground: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.lightGray,
    borderRadius: 4,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.warmOrange,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
    minWidth: 40,
    textAlign: 'right',
  },
  contentContainer: {
    padding: 16,
    backgroundColor: Colors.light,
    marginBottom: 8,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.dark,
    textAlign: 'right',
  },
  ratingContainer: {
    padding: 16,
    backgroundColor: Colors.light,
    marginBottom: 8,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  starButton: {
    padding: 4,
  },
  star: {
    fontSize: 32,
  },
  questionsContainer: {
    padding: 16,
    backgroundColor: Colors.light,
    marginBottom: 8,
  },
  questionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 16,
  },
  questionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  questionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  questionLabel: {
    fontSize: 16,
    color: Colors.dark,
    flex: 1,
  },
  questionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
  },
  questionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  commentsContainer: {
    padding: 16,
    backgroundColor: Colors.light,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 16,
  },
  addCommentContainer: {
    marginBottom: 20,
  },
  commentInput: {
    backgroundColor: Colors.lightGray,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    minHeight: 80,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  commentButton: {
    backgroundColor: Colors.deepGreen,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  commentButtonText: {
    color: Colors.light,
    fontSize: 16,
    fontWeight: 'bold',
  },
  commentItem: {
    backgroundColor: Colors.lightGray,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.deepGreen,
  },
  commentDate: {
    fontSize: 12,
    color: Colors.dark,
    opacity: 0.6,
  },
  commentContent: {
    fontSize: 14,
    color: Colors.dark,
    lineHeight: 20,
    marginBottom: 8,
    textAlign: 'right',
  },
  commentActions: {
    flexDirection: 'row',
  },
  commentAction: {
    marginRight: 16,
  },
  commentActionText: {
    fontSize: 12,
    color: Colors.dark,
    opacity: 0.7,
  },
});