import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
} from "react-native";
import { Colors } from "../../../src/theme/colors";
import { 
  LESSON_CATEGORIES, 
  LessonCategory, 
  Lesson, 
  calculateKnowledgeScore 
} from "../../../src/storage/lessons";
import { router } from "expo-router";

export default function LessonsScreen() {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [knowledgeStats, setKnowledgeStats] = useState({
    totalScore: 0,
    totalLessons: 0,
    completedLessons: 0,
    percentage: 0
  });

  useEffect(() => {
    loadKnowledgeStats();
  }, []);

  const loadKnowledgeStats = async () => {
    const stats = await calculateKnowledgeScore();
    setKnowledgeStats(stats);
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const navigateToLesson = (lesson: Lesson) => {
    router.push(`/lessons/${lesson.id}`);
  };

  const renderProgressBar = (percentage: number) => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBackground}>
        <View style={[styles.progressFill, { width: `${percentage}%` }]} />
      </View>
      <Text style={styles.progressText}>{percentage}%</Text>
    </View>
  );

  const renderCategory = (category: LessonCategory) => {
    const isExpanded = expandedCategories.has(category.id);
    
    return (
      <View key={category.id} style={styles.categoryContainer}>
        <TouchableOpacity
          style={[styles.categoryHeader, { borderColor: category.color }]}
          onPress={() => toggleCategory(category.id)}
        >
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <View style={styles.categoryTextContainer}>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryCount}>
                {category.totalLessons} درس
              </Text>
            </View>
          </View>
          <Text style={[styles.expandIcon, { color: category.color }]}>
            {isExpanded ? "−" : "+"}
          </Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.lessonsContainer}>
            {category.lessons.map((lesson, index) => (
              <TouchableOpacity
                key={lesson.id}
                style={styles.lessonItem}
                onPress={() => navigateToLesson(lesson)}
              >
                <View style={styles.lessonHeader}>
                  <Text style={styles.lessonTitle}>{lesson.title}</Text>
                  <View style={styles.lessonStats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statIcon}>👁</Text>
                      <Text style={styles.statText}>{lesson.totalViews}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statIcon}>⭐</Text>
                      <Text style={styles.statText}>
                        {lesson.averageRating.toFixed(1)} ({lesson.totalRatings})
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.lessonMeta}>
                  <Text style={styles.lessonType}>
                    {lesson.contentType === 'video' ? '🎥 فيديو' : 
                     lesson.contentType === 'mixed' ? '📖📹 مختلط' : '📖 نص'}
                  </Text>
                  <Text style={styles.lessonArrow}>←</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>الدروس التعليمية</Text>
          <Text style={styles.subtitle}>منظومة التعلم الإسلامي الشاملة</Text>
        </View>

        {/* Overall Progress */}
        <View style={styles.progressSection}>
          <Text style={styles.progressTitle}>إجمالي التقدم المعرفي</Text>
          {renderProgressBar(knowledgeStats.percentage)}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{knowledgeStats.completedLessons}</Text>
              <Text style={styles.statLabel}>دروس مكتملة</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{knowledgeStats.totalLessons}</Text>
              <Text style={styles.statLabel}>إجمالي الدروس</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{knowledgeStats.totalScore}</Text>
              <Text style={styles.statLabel}>النقاط المكتسبة</Text>
            </View>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>الفئات التعليمية</Text>
          {LESSON_CATEGORIES.map(renderCategory)}
        </View>
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
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: Colors.deepGreen,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light,
    textAlign: 'center',
    opacity: 0.9,
  },
  progressSection: {
    margin: 16,
    padding: 20,
    backgroundColor: Colors.light,
    borderRadius: 12,
    elevation: 2,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.deepGreen,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.dark,
    textAlign: 'center',
    marginTop: 4,
  },
  categoriesSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 16,
  },
  categoryContainer: {
    marginBottom: 16,
    backgroundColor: Colors.light,
    borderRadius: 12,
    elevation: 2,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderLeftWidth: 4,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  categoryCount: {
    fontSize: 14,
    color: Colors.dark,
    opacity: 0.7,
    marginTop: 2,
  },
  expandIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  lessonsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  lessonItem: {
    backgroundColor: Colors.lightGray,
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
    flex: 1,
    marginRight: 12,
  },
  lessonStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  statIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  statText: {
    fontSize: 12,
    color: Colors.dark,
    opacity: 0.7,
  },
  lessonMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lessonType: {
    fontSize: 14,
    color: Colors.deepGreen,
    fontWeight: '500',
  },
  lessonArrow: {
    fontSize: 16,
    color: Colors.warmOrange,
    fontWeight: 'bold',
  },
});