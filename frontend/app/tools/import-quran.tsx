import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '../../src/theme/colors';

const DEFAULT_URL = 'https://customer-assets.emergentagent.com/job_prayertracker/artifacts/py7wm3yr_hafs_smart_v8.json';

export default function ImportQuranScreen() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState<{total: number; inserted: number} | null>(null);

  const start = async () => {
    if (Platform.OS === 'web') {
      setStatus('الاستيراد متاح على الجوال فقط (Android / iOS).');
      return;
    }
    try {
      setStatus('جارٍ التحميل والاستيراد...');
      setProgress({ total: 0, inserted: 0 });
      const { importQuranFromUrl, isFullQuranImported } = await import('../../src/db/fullImport');
      await importQuranFromUrl(url, (p: any) => setProgress(p));
      const ok = await isFullQuranImported();
      setStatus(ok ? 'تم استيراد القرآن الكريم بالكامل' : 'انتهى الاستيراد (تحقق من العدد)');
    } catch (e: any) {
      setStatus('خطأ في الاستيراد: ' + (e?.message || ''));
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>استيراد القرآن الكريم</Text>
        <Text style={styles.body}>استخدم الرابط المسبق أو ألصق رابط JSON ثم اضغط استيراد (على الجوال فقط).</Text>
        {Platform.OS === 'web' && (
          <Text style={[styles.body, { color: '#ffb4b4' }]}>ملاحظة: الاستيراد غير متاح على الويب. الرجاء استخدام التطبيق على الجوال.</Text>
        )}
        <TextInput
          placeholder="رابط ملف JSON"
          placeholderTextColor="#888"
          value={url}
          onChangeText={setUrl}
          style={styles.input}
          textAlign="right"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity onPress={start} style={styles.btn}>
          <Text style={styles.btnText}>استيراد</Text>
        </TouchableOpacity>
        {!!status && <Text style={styles.status}>{status}</Text>}
        {!!progress && progress.total > 0 && (
          <Text style={styles.status}>تم إدخال {progress.inserted} / {progress.total}</Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark, padding: 16 },
  title: { color: Colors.warmOrange, fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'right' },
  body: { color: Colors.light, opacity: 0.9, marginBottom: 12, textAlign: 'right' },
  input: { backgroundColor: '#1d2a29', color: Colors.light, borderRadius: 12, padding: 12, marginBottom: 12 },
  btn: { backgroundColor: Colors.warmOrange, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnText: { color: Colors.dark, fontWeight: '800' },
  status: { color: Colors.light, marginTop: 10, textAlign: 'center' },
});