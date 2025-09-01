import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { Colors } from "../../src/theme/colors";
import { Link } from "expo-router";

export default function Home() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.headerSection}>
        <Text style={styles.welcomeText}>أهلاً وسهلاً</Text>
        <Text style={styles.appTitle}>ALSABQON</Text>
        <Text style={styles.subtitle}>تطبيق تتبع الصلاة ودراسة القرآن</Text>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>الإجراءات السريعة</Text>
        
        <View style={styles.actionsGrid}>
          <Link href="/my-prayers" asChild>
            <TouchableOpacity style={styles.actionCard}>
              <Text style={styles.actionIcon}>🕌</Text>
              <Text style={styles.actionTitle}>صلاتي</Text>
              <Text style={styles.actionDesc}>تسجيل وتتبع الصلوات</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/my-azkar" asChild>
            <TouchableOpacity style={styles.actionCard}>
              <Text style={styles.actionIcon}>📿</Text>
              <Text style={styles.actionTitle}>أذكاري</Text>
              <Text style={styles.actionDesc}>تسجيل الأذكار اليومية</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/my-charities" asChild>
            <TouchableOpacity style={styles.actionCard}>
              <Text style={styles.actionIcon}>💝</Text>
              <Text style={styles.actionTitle}>صدقاتي</Text>
              <Text style={styles.actionDesc}>تتبع الأعمال الخيرية</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/zikr-reminder" asChild>
            <TouchableOpacity style={styles.actionCard}>
              <Text style={styles.actionIcon}>⏰</Text>
              <Text style={styles.actionTitle}>تذكير الأذكار</Text>
              <Text style={styles.actionDesc}>تذكيرات دورية للذكر</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/lessons" asChild>
            <TouchableOpacity style={styles.actionCard}>
              <Text style={styles.actionIcon}>📚</Text>
              <Text style={styles.actionTitle}>الدروس</Text>
              <Text style={styles.actionDesc}>دروس وتعليم</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/tasks" asChild>
            <TouchableOpacity style={styles.actionCard}>
              <Text style={styles.actionIcon}>✅</Text>
              <Text style={styles.actionTitle}>المهام</Text>
              <Text style={styles.actionDesc}>قائمة المهام</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>إحصائيات سريعة</Text>
        <View style={styles.statsCard}>
          <Text style={styles.statsText}>مرحباً بك في رحلة التتبع الروحي</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 20,
  },
  welcomeText: {
    color: Colors.light,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  appTitle: {
    color: Colors.warmOrange,
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.light,
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
  quickActions: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: Colors.light,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCard: {
    backgroundColor: Colors.greenTeal,
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    color: Colors.light,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionDesc: {
    color: Colors.light,
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
  statsSection: {
    marginBottom: 32,
  },
  statsCard: {
    backgroundColor: Colors.greenTeal,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  statsText: {
    color: Colors.light,
    fontSize: 16,
    textAlign: 'center',
  },
});