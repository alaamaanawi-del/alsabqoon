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

export default function TasksScreen() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);

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

  return (
    <View style={styles.container}>
      <Text style={styles.header}>المهام</Text>
      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.questionLabel}</Text>
              <Text style={styles.sub}>{item.prayer} • r{item.rakka} • {item.date}</Text>
            </View>
            <Link asChild href={{ pathname: '/(drawer)/my-prayers/record', params: { prayer: item.prayer, focus: `${item.rakka}:${item.question}` } }}>
              <TouchableOpacity style={styles.linkBtn}><Text style={styles.linkTxt}>فتح</Text></TouchableOpacity>
            </Link>
            <TouchableOpacity onPress={() => toggleComplete(item.id)} style={[styles.doneBtn, item.completed && { backgroundColor: '#3ddc84' }]}>
              <Text style={styles.doneTxt}>{item.completed ? '✔' : 'تم'}</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={{ padding: 12 }}
      />
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