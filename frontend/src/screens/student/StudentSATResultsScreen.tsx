import React from 'react';
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
const GOLD = '#D4A017';
const BG = '#F9FAFB';
const CARD = '#FFFFFF';
const TEXT = '#111827';
const MUTED = '#6B7280';

const sectionScores = [
  { name: 'Math', score: 720, max: 800, color: '#3B82F6' },
  { name: 'Reading & Writing', score: 600, max: 800, color: '#8B5CF6' },
];

export default function StudentSATResultsScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Résultats</Text>
        <TouchableOpacity>
          <Ionicons name="share-outline" size={22} color={MUTED} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Score card */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Score SAT estimé</Text>
          <Text style={styles.scoreValue}>1 320</Text>
          <Text style={styles.scoreDelta}>(+80)</Text>
          <Text style={styles.scoreBravo}>Bravo ! Tu progressas 🎉</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>28</Text>
              <Text style={styles.statLabel}>Bonnes réponses</Text>
              <Text style={styles.statPct}>70%</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>12</Text>
              <Text style={styles.statLabel}>Erreurs</Text>
              <Text style={styles.statPct}>30%</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>38:45</Text>
              <Text style={styles.statLabel}>Temps total</Text>
              <Text style={styles.statPct}>min</Text>
            </View>
          </View>
        </View>

        {/* Section breakdown */}
        <Text style={styles.sectionTitle}>Analyse par section</Text>
        {sectionScores.map(s => (
          <View key={s.name} style={styles.sectionCard}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionName}>{s.name}</Text>
              <Text style={styles.sectionScore}>{s.score} / {s.max}</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(s.score / s.max) * 100}%`, backgroundColor: s.color }]} />
            </View>
          </View>
        ))}

        {/* Score evolution graph placeholder */}
        <Text style={styles.sectionTitle}>Évolution de ton score SAT</Text>
        <View style={styles.chartCard}>
          <View style={styles.chartPlaceholder}>
            {[1000, 1000, 1100, 1200, 1240, 1320].map((val, idx) => (
              <View key={idx} style={styles.chartBar}>
                <View style={[styles.chartBarFill, { height: ((val - 800) / 800) * 80 }]} />
              </View>
            ))}
          </View>
          <View style={styles.chartLabels}>
            {['05/04', '12/04', '18/04', '26/04', 'Aujourd\'hui'].map((label, idx) => (
              <Text key={idx} style={styles.chartLabel}>{label}</Text>
            ))}
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.navigate('StudentSATQuiz', { mode: 'errors' })}>
            <Ionicons name="refresh" size={18} color={PRIMARY} />
            <Text style={styles.retryBtnText}>Réviser les erreurs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newBtn} onPress={() => navigation.navigate('StudentSAT')}>
            <Text style={styles.newBtnText}>Nouvel entraînement</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827', fontFamily: 'Montserrat-Bold', textAlign: 'center' },
  content: { padding: 16 },
  scoreCard: { backgroundColor: CARD, borderRadius: 16, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 3, marginBottom: 20 },
  scoreLabel: { fontSize: 13, color: MUTED, fontFamily: 'Montserrat-Regular' },
  scoreValue: { fontSize: 48, fontWeight: '800', color: PRIMARY, fontFamily: 'Montserrat-Bold', marginTop: 4 },
  scoreDelta: { fontSize: 18, fontWeight: '700', color: '#10B981', fontFamily: 'Montserrat-Bold' },
  scoreBravo: { fontSize: 14, color: MUTED, fontFamily: 'Montserrat-Regular', marginTop: 4, marginBottom: 16 },
  statsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#111827', fontFamily: 'Montserrat-Bold' },
  statLabel: { fontSize: 11, color: MUTED, fontFamily: 'Montserrat-Regular', marginTop: 2 },
  statPct: { fontSize: 12, color: MUTED, fontFamily: 'Montserrat-Medium' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', fontFamily: 'Montserrat-Bold', marginBottom: 10 },
  sectionCard: { backgroundColor: CARD, borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sectionName: { fontSize: 14, fontWeight: '600', color: '#111827', fontFamily: 'Montserrat-SemiBold' },
  sectionScore: { fontSize: 14, fontWeight: '700', color: PRIMARY, fontFamily: 'Montserrat-Bold' },
  progressBar: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3 },
  progressFill: { height: 6, borderRadius: 3 },
  chartCard: { backgroundColor: CARD, borderRadius: 14, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  chartPlaceholder: { flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 8, justifyContent: 'space-around' },
  chartBar: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 4, justifyContent: 'flex-end' },
  chartBarFill: { backgroundColor: PRIMARY, borderRadius: 4, opacity: 0.7 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  chartLabel: { fontSize: 10, color: MUTED, fontFamily: 'Montserrat-Regular' },
  actions: { gap: 10 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: PRIMARY, backgroundColor: '#F0FAF8' },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: PRIMARY, fontFamily: 'Montserrat-Bold' },
  newBtn: { padding: 14, borderRadius: 12, backgroundColor: PRIMARY, alignItems: 'center' },
  newBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Montserrat-Bold' },
});