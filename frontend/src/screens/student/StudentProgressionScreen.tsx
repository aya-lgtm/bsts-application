import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY = '#0D6B5E';
const BG = '#F9FAFB';
const CARD = '#FFFFFF';
const TEXT = '#111827';
const MUTED = '#6B7280';

type ViewTab = 'Vue d\'ensemble' | 'Cours' | 'SAT';

const subjectProgress = [
  { name: 'Mathématiques', progress: 72, color: '#3B82F6', icon: '📐' },
  { name: 'Reading & Writing', progress: 65, color: '#8B5CF6', icon: '📖' },
  { name: 'Writing', progress: 58, color: '#F59E0B', icon: '✏️' },
  { name: 'Grammar', progress: 70, color: '#10B981', icon: '🔤' },
  { name: 'Essays', progress: 45, color: '#EF4444', icon: '📝' },
];

export default function StudentProgressionScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<ViewTab>('Vue d\'ensemble');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ma progression</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* View tabs */}
      <View style={styles.tabsRow}>
        {(['Vue d\'ensemble', 'Cours', 'SAT'] as ViewTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overview stats */}
        {(activeTab === 'Vue d\'ensemble' || activeTab === 'SAT') && (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Score SAT estimé</Text>
              <Text style={styles.statBig}>1 320</Text>
              <Text style={styles.statDelta}>(+80)</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Cours complétés</Text>
              <Text style={styles.statBig}>18</Text>
              <Text style={styles.statSub}>sur 36</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Quiz réalisés</Text>
              <Text style={styles.statBig}>42</Text>
              <TouchableOpacity>
                <Ionicons name="chevron-forward" size={16} color={MUTED} />
              </TouchableOpacity>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Taux de réussite</Text>
              <Text style={styles.statBig}>78%</Text>
              <View style={styles.miniCircle}>
                <Text style={styles.miniCircleText}>●</Text>
              </View>
            </View>
          </View>
        )}

        {/* Subject progress */}
        {(activeTab === 'Vue d\'ensemble' || activeTab === 'Cours') && (
          <View>
            <Text style={styles.sectionTitle}>Progression par matière</Text>
            {subjectProgress.map(s => (
              <View key={s.name} style={styles.subjectCard}>
                <Text style={styles.subjectIcon}>{s.icon}</Text>
                <View style={styles.subjectInfo}>
                  <View style={styles.subjectRow}>
                    <Text style={styles.subjectName}>{s.name}</Text>
                    <Text style={[styles.subjectPct, { color: s.color }]}>{s.progress}%</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${s.progress}%`, backgroundColor: s.color }]} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: TEXT, fontFamily: 'Montserrat-Bold', textAlign: 'center' },
  tabsRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: PRIMARY },
  tabText: { fontSize: 13, color: MUTED, fontFamily: 'Montserrat-Medium' },
  tabTextActive: { color: PRIMARY, fontWeight: '700', fontFamily: 'Montserrat-Bold' },
  content: { padding: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  statLabel: { fontSize: 11, color: MUTED, fontFamily: 'Montserrat-Regular', marginBottom: 6 },
  statBig: { fontSize: 24, fontWeight: '800', color: PRIMARY, fontFamily: 'Montserrat-Bold' },
  statDelta: { fontSize: 13, color: '#10B981', fontFamily: 'Montserrat-Medium', marginTop: 2 },
  statSub: { fontSize: 12, color: MUTED, fontFamily: 'Montserrat-Regular', marginTop: 2 },
  miniCircle: { marginTop: 4 },
  miniCircleText: { color: '#10B981', fontSize: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: TEXT, fontFamily: 'Montserrat-Bold', marginBottom: 12 },
  subjectCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  subjectIcon: { fontSize: 22, marginRight: 12 },
  subjectInfo: { flex: 1 },
  subjectRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  subjectName: { fontSize: 14, fontWeight: '600', color: TEXT, fontFamily: 'Montserrat-SemiBold' },
  subjectPct: { fontSize: 13, fontWeight: '700', fontFamily: 'Montserrat-Bold' },
  progressBar: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3 },
  progressFill: { height: 6, borderRadius: 3 },
});