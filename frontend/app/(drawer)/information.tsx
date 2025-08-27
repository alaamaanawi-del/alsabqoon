import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Animated,
  LayoutAnimation 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { 
  LESSON_CATEGORIES, 
  LessonCategory, 
  calculateKnowledgeScore,
  getAllLessonRecords 
} from '../../src/storage/lessons';
import TaskProgressBar from '../../src/components/TaskProgressBar';

export default function InformationScreen() {
  const router = useRouter();
  const [knowledgeStats, setKnowledgeStats] = useState({
    totalScore: 0,
    totalLessons: 0, 
    completedLessons: 0,
    percentage: 0
  });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [lessonRecords, setLessonRecords] = useState<any[]>([]);

  useEffect(() => {
    loadKnowledgeProgress();
  }, []);

  const loadKnowledgeProgress = async () => {
    const stats = await calculateKnowledgeScore();
    const records = await getAllLessonRecords();
    setKnowledgeStats(stats);
    setLessonRecords(records);
  };

  const toggleCategory = (categoryId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const getCategoryProgress = (category: LessonCategory) => {
    const categoryRecords = lessonRecords.filter(r => 
      category.lessons.some(l => l.id === r.lessonId)
    );
    const completed = categoryRecords.filter(r => r.score === 100).length;
    const total = category.totalLessons;
    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const getLessonProgress = (lessonId: string) => {
    const record = lessonRecords.find(r => r.lessonId === lessonId);
    return record ? record.score : 0;
  };

  return (
    <View style={styles.container}>
      {/* Header with Overall Knowledge Progress */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>المعلومات</Text>
        
        {/* Total Knowledge Score */}
        <View style={styles.knowledgeScoreContainer}>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreTitle}>النتيجة الإجمالية للمعرفة</Text>
            <Text style={styles.scoreText}>
              {knowledgeStats.completedLessons}/{knowledgeStats.totalLessons} درس مكتمل
            </Text>
          </View>
          <TaskProgressBar score={knowledgeStats.percentage} showPercentage={true} />
          <Text style={styles.scoreDetails}>
            {knowledgeStats.totalScore} نقطة من {knowledgeStats.totalLessons * 100} نقطة
          </Text>
        </View>
      </View>

      {/* Categories and Lessons */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {LESSON_CATEGORIES.map(category => {
          const isExpanded = expandedCategories.has(category.id);
          const categoryProgress = getCategoryProgress(category);
          
          return (
            <View key={category.id} style={styles.categoryContainer}>
              {/* Category Header */}
              <TouchableOpacity 
                style={styles.categoryHeader}
                onPress={() => toggleCategory(category.id)}
                activeOpacity={0.8}
              >
                <View style={styles.categoryInfo}>
                  <View style={styles.categoryIcon}>
                    <Text style={styles.categoryIconText}>{category.icon}</Text>
                  </View>
                  <View style={styles.categoryDetails}>
                    <Text style={styles.categoryTitle}>{category.name}</Text>
                    <Text style={styles.categoryProgress}>
                      {categoryProgress.completed}/{categoryProgress.total} مكتمل
                    </Text>
                  </View>
                </View>
                
                <View style={styles.categoryActions}>
                  <View style={styles.categoryProgressContainer}>
                    <TaskProgressBar 
                      score={categoryProgress.percentage} 
                      showPercentage={false} 
                    />
                  </View>
                  <Text style={[styles.expandArrow, isExpanded && styles.expandedArrow]}>
                    ▼
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Lessons List (Expandable) */}
              {isExpanded && (
                <View style={styles.lessonsContainer}>
                  {category.lessons.map(lesson => {
                    const lessonProgress = getLessonProgress(lesson.id);
                    const isCompleted = lessonProgress === 100;
                    
                    return (
                      <TouchableOpacity
                        key={lesson.id}
                        style={[styles.lessonRow, isCompleted && styles.completedLesson]}
                        onPress={() => router.push({
                          pathname: '/lesson-detail',
                          params: { 
                            lessonId: lesson.id,
                            categoryId: category.id 
                          }
                        })}
                        activeOpacity={0.7}
                      >
                        <View style={styles.lessonContent}>
                          <View style={styles.lessonHeader}>
                            <Text style={[styles.lessonTitle, isCompleted && styles.completedText]}>
                              {lesson.title}
                            </Text>
                            {isCompleted && (
                              <Text style={styles.completedIcon}>✓</Text>
                            )}
                          </View>
                          
                          <View style={styles.lessonMeta}>
                            <Text style={styles.lessonStats}>
                              {lesson.totalViews} مشاهدة • {lesson.totalRatings} تقييم • ⭐ {lesson.averageRating}
                            </Text>
                          </View>
                          
                          <View style={styles.lessonProgressContainer}>
                            <TaskProgressBar score={lessonProgress} showPercentage={lessonProgress > 0} />
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {/* Achievement Section */}
        <View style={styles.achievementContainer}>
          <Text style={styles.achievementTitle}>الإنجازات</Text>
          <View style={styles.achievementGrid}>
            {knowledgeStats.completedLessons >= 10 && (
              <View style={styles.achievementBadge}>
                <Text style={styles.badgeIcon}>🏆</Text>
                <Text style={styles.badgeTitle}>باحث مبتدئ</Text>
                <Text style={styles.badgeDesc}>أكمل 10 دروس</Text>
              </View>
            )}
            
            {knowledgeStats.percentage >= 50 && (
              <View style={styles.achievementBadge}>
                <Text style={styles.badgeIcon}>📚</Text>
                <Text style={styles.badgeTitle}>طالب علم</Text>
                <Text style={styles.badgeDesc}>50% من الدروس</Text>
              </View>
            )}
            
            {knowledgeStats.completedLessons >= 50 && (
              <View style={styles.achievementBadge}>
                <Text style={styles.badgeIcon}>⭐</Text>
                <Text style={styles.badgeTitle}>عالم متميز</Text>
                <Text style={styles.badgeDesc}>أكمل 50 درساً</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  
  // Header
  headerContainer: {
    padding: 16,
    backgroundColor: Colors.deepGreen,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    color: Colors.light,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'right',
    marginBottom: 16,
  },
  knowledgeScoreContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreTitle: {
    color: Colors.warmOrange,
    fontSize: 16,
    fontWeight: '700',
  },
  scoreText: {
    color: Colors.light,
    fontSize: 14,
    fontWeight: '600',
  },
  scoreDetails: {
    color: '#A6D3CF',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  
  // Content
  content: {
    flex: 1,
  },
  
  // Categories
  categoryContainer: {
    marginBottom: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2626',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
  },
  categoryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIconText: {
    fontSize: 24,
  },
  categoryDetails: {
    flex: 1,
  },
  categoryTitle: {
    color: Colors.light,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
  },
  categoryProgress: {
    color: '#A6D3CF',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 2,
  },
  categoryActions: {
    alignItems: 'center',
    gap: 8,
  },
  categoryProgressContainer: {
    width: 60,
  },
  expandArrow: {
    color: Colors.warmOrange,
    fontSize: 16,
    fontWeight: '800',
    transform: [{ rotate: '-90deg' }],
  },
  expandedArrow: {
    transform: [{ rotate: '0deg' }],
  },
  
  // Lessons
  lessonsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 8,
  },
  lessonRow: {
    backgroundColor: '#1d2a29',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  completedLesson: {
    backgroundColor: '#1a2421',
    borderLeftWidth: 4,
    borderLeftColor: Colors.greenTeal,
  },
  lessonContent: {
    gap: 8,
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lessonTitle: {
    color: Colors.light,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
  },
  completedText: {
    color: '#A6D3CF',
  },
  completedIcon: {
    color: Colors.greenTeal,
    fontSize: 18,
    fontWeight: '800',
  },
  lessonMeta: {
    alignItems: 'flex-end',
  },
  lessonStats: {
    color: '#A6D3CF',
    fontSize: 12,
    textAlign: 'right',
  },
  lessonProgressContainer: {
    marginTop: 4,
  },
  
  // Achievements
  achievementContainer: {
    padding: 16,
    marginTop: 16,
  },
  achievementTitle: {
    color: Colors.warmOrange,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'right',
    marginBottom: 12,
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  achievementBadge: {
    backgroundColor: '#1a2626',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '30%',
    minHeight: 100,
  },
  badgeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  badgeTitle: {
    color: Colors.light,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeDesc: {
    color: '#A6D3CF',
    fontSize: 11,
    textAlign: 'center',
  },
});