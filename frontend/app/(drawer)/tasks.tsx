import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  ScrollView,
  Alert,
  Dimensions 
} from 'react-native';
import { Colors } from '../../src/theme/colors';
import { loadTasks, saveTasks, TaskItem } from '../../src/storage/prayer';
import { Link } from 'expo-router';
import { usePrayerIcons } from '../../src/hooks/usePrayerIcons';
import TaskProgressBar from '../../src/components/TaskProgressBar';
import { Swipeable } from 'react-native-gesture-handler';

type GroupingType = 'date' | 'prayer' | 'type';
type TaskCategory = 'high' | 'medium' | 'low';

const getTaskCategory = (question: string): TaskCategory => {
  if (question.includes('علّمت')) return 'high'; // taught - highest priority
  if (question.includes('اتبعت')) return 'high'; // followed - high priority
  if (question.includes('دعوت')) return 'medium'; // dua - medium priority
  return 'low'; // understood - lowest priority
};

const getCategoryColor = (category: TaskCategory) => {
  switch (category) {
    case 'high': return '#FF4444';
    case 'medium': return Colors.warmOrange;
    case 'low': return Colors.greenTeal;
  }
};

export default function TasksScreen() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [grouping, setGrouping] = useState<GroupingType>('date');
  const { icons } = usePrayerIcons();

  const refresh = async () => {
    const list = await loadTasks();
    setTasks(list);
  };

  useEffect(() => { refresh(); }, []);

  const toggleComplete = async (id: string) => {
    const next = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTasks(next);
    await saveTasks(next);
  };

  const deleteTask = async (id: string) => {
    Alert.alert(
      'حذف المهمة',
      'هل تريد حذف هذه المهمة نهائياً؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'حذف', 
          style: 'destructive',
          onPress: async () => {
            const next = tasks.filter(t => t.id !== id);
            setTasks(next);
            await saveTasks(next);
          }
        }
      ]
    );
  };

  // Group tasks based on selected grouping type
  const groupedTasks = useMemo(() => {
    const groups: Record<string, TaskItem[]> = {};
    
    tasks.forEach(task => {
      let key: string;
      switch (grouping) {
        case 'date':
          key = task.date;
          break;
        case 'prayer':
          key = task.prayer;
          break;
        case 'type':
          key = task.questionLabel;
          break;
      }
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(task);
    });

    // Sort tasks within each group by category priority
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const categoryA = getTaskCategory(a.questionLabel);
        const categoryB = getTaskCategory(b.questionLabel);
        const priorities = { high: 3, medium: 2, low: 1 };
        return priorities[categoryB] - priorities[categoryA];
      });
    });

    return groups;
  }, [tasks, grouping]);

  // Calculate completion stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const byCategory = {
      high: tasks.filter(t => getTaskCategory(t.questionLabel) === 'high'),
      medium: tasks.filter(t => getTaskCategory(t.questionLabel) === 'medium'),
      low: tasks.filter(t => getTaskCategory(t.questionLabel) === 'low'),
    };
    
    return { total, completed, percentage, byCategory };
  }, [tasks]);

  const renderSwipeActions = (taskId: string) => (
    <View style={styles.swipeActions}>
      <TouchableOpacity 
        style={[styles.swipeAction, { backgroundColor: '#3ddc84' }]}
        onPress={() => toggleComplete(taskId)}
      >
        <Text style={styles.swipeActionText}>✓</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.swipeAction, { backgroundColor: '#FF4444' }]}
        onPress={() => deleteTask(taskId)}
      >
        <Text style={styles.swipeActionText}>🗑</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTask = (item: TaskItem) => {
    const category = getTaskCategory(item.questionLabel);
    const categoryColor = getCategoryColor(category);
    const prayerIcon = icons?.[item.prayer as keyof typeof icons];

    return (
      <Swipeable
        key={item.id}
        renderRightActions={() => renderSwipeActions(item.id)}
        rightThreshold={40}
      >
        <View style={[styles.taskCard, item.completed && styles.completedTask]}>
          {/* Priority Indicator */}
          <View style={[styles.priorityIndicator, { backgroundColor: categoryColor }]} />
          
          <View style={styles.taskContent}>
            {/* Prayer Icon */}
            <View style={styles.taskIconContainer}>
              {prayerIcon ? (
                <Image 
                  source={{ uri: `data:image/png;base64,${prayerIcon}` }} 
                  style={styles.taskIcon}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.placeholderTaskIcon} />
              )}
            </View>

            {/* Task Details */}
            <View style={styles.taskDetails}>
              <Text style={[styles.taskTitle, item.completed && styles.completedText]}>
                {item.questionLabel}
              </Text>
              <Text style={styles.taskMeta}>
                {item.prayer} • ر{item.rakka} • {item.date}
              </Text>
              <View style={styles.taskBadges}>
                <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
                  <Text style={styles.categoryText}>
                    {category === 'high' ? 'مهم' : category === 'medium' ? 'متوسط' : 'عادي'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.taskActions}>
              <Link asChild href={{ 
                pathname: '/(drawer)/my-prayers/record', 
                params: { prayer: item.prayer, focus: `${item.rakka}:${item.question}` } 
              }}>
                <TouchableOpacity style={styles.openBtn}>
                  <Text style={styles.openBtnText}>فتح</Text>
                </TouchableOpacity>
              </Link>
              
              <TouchableOpacity 
                onPress={() => toggleComplete(item.id)} 
                style={[styles.completeBtn, item.completed && styles.completedBtn]}
              >
                <Text style={styles.completeBtnText}>
                  {item.completed ? '✔' : 'تم'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Swipeable>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>📝</Text>
      <Text style={styles.emptyStateTitle}>لا توجد مهام</Text>
      <Text style={styles.emptyStateMessage}>
        ستظهر المهام هنا عند تسجيل الصلوات وإضافة الأسئلة كمهام
      </Text>
    </View>
  );

  if (tasks.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>المهام</Text>
        {renderEmptyState()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Stats */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>المهام</Text>
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {stats.completed} من {stats.total} مكتملة
          </Text>
          <TaskProgressBar score={stats.percentage} showPercentage={true} />
        </View>
      </View>

      {/* Category Overview */}
      <View style={styles.categoryOverview}>
        {Object.entries(stats.byCategory).map(([category, categoryTasks]) => {
          const completed = categoryTasks.filter(t => t.completed).length;
          const total = categoryTasks.length;
          const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
          
          if (total === 0) return null;
          
          return (
            <View key={category} style={styles.categoryCard}>
              <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(category as TaskCategory) }]} />
              <Text style={styles.categoryLabel}>
                {category === 'high' ? 'مهم' : category === 'medium' ? 'متوسط' : 'عادي'}
              </Text>
              <Text style={styles.categoryCount}>
                {completed}/{total}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Grouping Controls */}
      <View style={styles.groupingControls}>
        {(['date', 'prayer', 'type'] as GroupingType[]).map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.groupingBtn, grouping === type && styles.activeGroupingBtn]}
            onPress={() => setGrouping(type)}
          >
            <Text style={[styles.groupingBtnText, grouping === type && styles.activeGroupingText]}>
              {type === 'date' ? 'التاريخ' : type === 'prayer' ? 'الصلاة' : 'النوع'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Grouped Tasks List */}
      <ScrollView style={styles.tasksContainer} showsVerticalScrollIndicator={false}>
        {Object.entries(groupedTasks).map(([groupKey, groupTasks]) => (
          <View key={groupKey} style={styles.taskGroup}>
            <Text style={styles.groupHeader}>{groupKey}</Text>
            {groupTasks.map(renderTask)}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  header: { color: Colors.light, fontSize: 20, fontWeight: '800', padding: 16 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: '#1d2a29', marginBottom: 8, borderRadius: 12, padding: 12 },
  title: { color: Colors.light, fontWeight: '700' },
  sub: { color: '#A6D3CF', marginTop: 6 },
  linkBtn: { backgroundColor: Colors.warmOrange, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  linkTxt: { color: Colors.dark, fontWeight: '800' },
  doneBtn: { backgroundColor: '#555', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  doneTxt: { color: Colors.light, fontWeight: '800' },
});