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
  Pressable,
  Button,
  Dimensions 
} from 'react-native';
import { Colors } from '../../src/theme/colors';
import { loadTasks, saveTasks, TaskItem, loadPrayerRecord, savePrayerRecord } from '../../src/storage/prayer';
import { Link } from 'expo-router';
import { usePrayerIcons } from '../../src/hooks/usePrayerIcons';
import TaskProgressBar from '../../src/components/TaskProgressBar';
// Removed Swipeable import

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
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    if (task.completed) {
      // Unchecking a completed task - show confirmation
      Alert.alert(
        'إلغاء المهمة',
        'سيتم حذف هذه المهمة من القائمة وإلغاء تحديدها في الصلاة. هل تريد المتابعة؟',
        [
          { text: 'إلغاء', style: 'cancel' },
          { 
            text: 'موافق', 
            onPress: async () => {
              try {
                // Load the prayer record and uncheck the task button
                const prayerRecord = await loadPrayerRecord(task.prayer, task.date);
                prayerRecord.rakka[task.rakka].addToTask[task.question] = false;
                await savePrayerRecord(prayerRecord);
                
                // Remove from tasks list
                const next = tasks.filter(t => t.id !== id);
                setTasks(next);
                await saveTasks(next);
                
              } catch (error) {
                Alert.alert('Error', `❌ Error unchecking task: ${error}`);
              }
            }
          }
        ]
      );
    } else {
      // Checking an incomplete task - mark complete AND uncheck in prayer record
      try {
        // First mark the task as complete in the UI
        const next = tasks.map(t => t.id === id ? { ...t, completed: true } : t);
        setTasks(next);
        await saveTasks(next);
        
        // Then uncheck the task button in the prayer record (bidirectional sync)
        const prayerRecord = await loadPrayerRecord(task.prayer, task.date);
        prayerRecord.rakka[task.rakka].addToTask[task.question] = false;
        await savePrayerRecord(prayerRecord);
        
        Alert.alert('Success', '✅ Task completed and unchecked in prayer record');
        
      } catch (error) {
        Alert.alert('Error', `❌ Error completing task: ${error}`);
      }
    }
  };


  const deleteTask = async (id: string) => {
    // Use Alert instead of console.log for debugging
    Alert.alert('Debug', `🗑 Delete button pressed for task ID: ${id}`);
    
    Alert.alert(
      'حذف المهمة',
      'هل تريد حذف هذه المهمة نهائياً؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'حذف', 
          style: 'destructive',
          onPress: async () => {
            Alert.alert('Debug', `🗑 User confirmed deletion for task ID: ${id}`);
            
            try {
              // Find the task to get its details
              const task = tasks.find(t => t.id === id);
              
              if (task) {
                // Load the prayer record and uncheck the task button
                const prayerRecord = await loadPrayerRecord(task.prayer, task.date);
                prayerRecord.rakka[task.rakka].addToTask[task.question] = false;
                await savePrayerRecord(prayerRecord);
                Alert.alert('Debug', '✅ Unchecked task in prayer record');
              }
              
              // Remove from tasks list
              const next = tasks.filter(t => t.id !== id);
              setTasks(next);
              await saveTasks(next);
              Alert.alert('Success', '✅ Task deleted successfully');
              
            } catch (error) {
              Alert.alert('Error', `❌ Error deleting task: ${error}`);
            }
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
          {/* Removed Priority Indicator */}
          
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
              {/* Removed task badges with priority labels */}
            </View>

            {/* Actions - Three controls side by side horizontally */}
            <View style={styles.taskActions}>
              <Link asChild href={{ 
                pathname: '/(drawer)/my-prayers/record', 
                params: { 
                  prayer: item.prayer, 
                  date: item.date,
                  focus: `${item.rakka}:${item.question}` 
                } 
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

<View style={styles.deleteBtn}>
                <Button 
                  title="🗑"
                  color="#ff4444"
                  onPress={() => {
                    Alert.alert('Debug', `Delete button pressed for task: ${item.id}`);
                    deleteTask(item.id);
                  }}
                />
              </View>
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

      {/* Category Overview - Removed priority labels */}

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
  container: { 
    flex: 1, 
    backgroundColor: Colors.dark 
  },
  
  // Header & Stats
  headerContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: { 
    color: Colors.light, 
    fontSize: 24, 
    fontWeight: '800', 
    textAlign: 'right',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statsText: {
    color: Colors.warmOrange,
    fontSize: 14,
    fontWeight: '600',
    minWidth: 80,
  },
  
  // Grouping Controls
  groupingControls: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  groupingBtn: {
    flex: 1,
    backgroundColor: '#1a2626',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeGroupingBtn: {
    backgroundColor: Colors.greenTeal,
  },
  groupingBtnText: {
    color: '#A6D3CF',
    fontSize: 14,
    fontWeight: '600',
  },
  activeGroupingText: {
    color: Colors.light,
  },
  
  // Tasks Container
  tasksContainer: {
    flex: 1,
  },
  taskGroup: {
    marginBottom: 20,
  },
  groupHeader: {
    color: Colors.warmOrange,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 138, 88, 0.1)',
    marginBottom: 8,
  },
  
  // Task Cards
  taskCard: {
    flexDirection: 'row',
    backgroundColor: '#1d2a29',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  completedTask: {
    opacity: 0.7,
    backgroundColor: '#1a2421',
  },
  priorityIndicator: {
    width: 4,
  },
  taskContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    gap: 12,
  },
  
  // Task Icon
  taskIconContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskIcon: {
    width: 28,
    height: 28,
  },
  placeholderTaskIcon: {
    width: 28,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
  },
  
  // Task Details
  taskDetails: {
    flex: 1,
    gap: 4,
  },
  taskTitle: {
    color: Colors.light,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#A6D3CF',
  },
  taskMeta: {
    color: '#A6D3CF',
    fontSize: 12,
    textAlign: 'right',
  },
  taskBadges: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    color: Colors.light,
    fontSize: 10,
    fontWeight: '600',
  },
  
  // Task Actions
  taskActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  openBtn: {
    backgroundColor: Colors.warmOrange,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  openBtnText: {
    color: Colors.dark,
    fontSize: 12,
    fontWeight: '700',
  },
  completeBtn: {
    backgroundColor: '#555',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  completedBtn: {
    backgroundColor: '#3ddc84',
  },
  completeBtnText: {
    color: Colors.light,
    fontSize: 12,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: Colors.light,
    fontSize: 12,
    fontWeight: '700',
  },
  
  // Swipe Actions
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swipeAction: {
    width: 60,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeActionText: {
    color: Colors.light,
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    color: Colors.light,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateMessage: {
    color: '#A6D3CF',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});