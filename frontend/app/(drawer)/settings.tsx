import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Colors } from '../../src/theme/colors';
import { getSettings, saveSettings, type Settings } from '../../src/storage/settings';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<Settings>({ rememberSelectedDate: false });

  useEffect(() => { (async () => { setSettings(await getSettings()); })(); }, []);

  const toggleRemember = async () => {
    const next = { ...settings, rememberSelectedDate: !settings.rememberSelectedDate };
    setSettings(next);
    await saveSettings(next);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>الإعدادات</Text>

      <View style={styles.row}>
        <Text style={styles.label}>تذكر آخر تاريخ محدد</Text>
        <Switch value={settings.rememberSelectedDate} onValueChange={toggleRemember} thumbColor={settings.rememberSelectedDate ? Colors.warmOrange : '#ccc'} trackColor={{ true: '#705100', false: '#666' }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark, padding: 16 },
  header: { color: Colors.light, fontSize: 20, fontWeight: '800', marginBottom: 12 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1d2a29', padding: 12, borderRadius: 12 },
  label: { color: Colors.light, fontWeight: '700' },
});