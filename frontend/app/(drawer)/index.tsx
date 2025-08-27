import React from "react";
import { View, Text, StyleSheet, ScrollView, Image } from "react-native";
import { Link } from "expo-router";
import { Colors } from "../../../src/theme/colors";
// import { logoBase64 } from "../../../src/assets/logo";

export default function Home() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.hero}>
        {/* <Image source={{ uri: `data:image/png;base64,${logoBase64}` }} style={styles.heroLogo} /> */}
        <Text style={styles.title}>السابقون</Text>
        <Text style={styles.subtitle}>مرحبا بك! تتبّع صلاتك وابحث في القرآن</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>ابدأ الآن</Text>
        <Link href="/(drawer)/my-prayers" style={styles.linkText}>اذهب إلى صلاتي</Link>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>قصة مميزة</Text>
        <Text style={styles.body}>سيظهر هنا منشور مميز يمكن قراءته ومشاركته لاحقًا.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  hero: { alignItems: "center", paddingVertical: 24 },
  heroLogo: { width: 72, height: 72, marginBottom: 8 },
  title: { color: Colors.warmOrange, fontSize: 24, fontWeight: "800" },
  subtitle: { color: Colors.light, fontSize: 14, marginTop: 8 },
  card: { backgroundColor: Colors.greenTeal, borderRadius: 12, padding: 16, marginVertical: 8 },
  cardTitle: { color: Colors.light, fontSize: 18, fontWeight: "700", marginBottom: 8 },
  body: { color: Colors.light },
  linkText: { color: Colors.warmOrange, marginTop: 8 }
});