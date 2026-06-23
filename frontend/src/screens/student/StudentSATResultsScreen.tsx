import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api, { getStoredUser } from '../../services/auth.service';

const PRIMARY = '#0D6B5E';
const BG = '#FFFFFF';
const CARD = '#FFFFFF';
const TEXT = '#111827';
const MUTED = '#6B7280';

type SubmitResult = {
  score: number; // pourcentage de bonnes réponses
  scoreSAT: number; // score sur 1600
  bonnesReponses: number;
  totalQuestions: number;
  corrections: Record<string, any>;
  pointsGagnes: number;
};

type SectionData = {
  name: string;
  score: number;
  maxScore: number;
  color: string;
};

function formatTime(totalSeconds?: number) {
  if (!totalSeconds) return '--:--';
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function StudentSATResultsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { results, tempsTotal } = route.params as { results: SubmitResult; tempsTotal?: number };

  const [sections, setSections] = useState<SectionData[]>([]);
  const [history, setHistory] = useState<{ date: string; score: number }[]>([]);
  const [scoreDelta, setScoreDelta] = useState<number | null>(null);
  const [loadingExtra, setLoadingExtra] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const user = await getStoredUser();
        const userId = user?.id;
        if (!userId) {
          setLoadingExtra(false);
          return;
        }

        const [sectionsRes, progressRes] = await Promise.all([
          api.get(`/sat/sections/${userId}`),
          api.get(`/sat/progress/${userId}`),
        ]);

        setSections(sectionsRes.data.sections || []);

        const satHistory = progressRes.data.satHistory || [];
        setHistory(satHistory);

        if (satHistory.length >= 2) {
          const last = satHistory[satHistory.length - 1].score;
          const prev = satHistory[satHistory.length - 2].score;
          setScoreDelta(last - prev);
        }
      } catch (error) {
        console.log('Erreur chargement détails résultats SAT', error);
      } finally {
        setLoadingExtra(false);
      }
    })();
  }, []);

  const erreurs = results.totalQuestions - results.bonnesReponses;
  const bonnesPct = Math.round((results.bonnesReponses / results.totalQuestions) * 100);
  const erreursPct = 100 - bonnesPct;

  const chartValues = history.length > 0 ? history.map((h) => h.score) : [results.scoreSAT];
  const chartLabels = history.length > 0 ? history.map((h) => h.date) : ["Aujourd'hui"];
  const maxChartVal = Math.max(...chartValues, 800);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.popToTop()}>
          <Ionicons name="chevron-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Résultats</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Score card */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Score SAT estimé</Text>
          <Text style={styles.scoreValue}>{results.scoreSAT}</Text>
          {scoreDelta !== null && (
            <Text style={[styles.scoreDelta, scoreDelta < 0 && { color: '#EF4444' }]}>
              {scoreDelta >= 0 ? `(+${scoreDelta})` : `(${scoreDelta})`}
            </Text>
          )}
          <Text style={styles.scoreBravo}>
            {bonnesPct >= 70 ? 'Bravo ! Tu progresses 🎉' : 'Continue, tu vas progresser 💪'}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{results.bonnesReponses}</Text>
              <Text style={styles.statLabel}>Bonnes réponses</Text>
              <Text style={styles.statPct}>{bonnesPct}%</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>{erreurs}</Text>
              <Text style={styles.statLabel}>Erreurs</Text>
              <Text style={styles.statPct}>{erreursPct}%</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatTime(tempsTotal)}</Text>
              <Text style={styles.statLabel}>Temps total</Text>
              <Text style={styles.statPct}>min</Text>
            </View>
          </View>
        </View>

        {/* Section breakdown */}
        <Text style={styles.sectionTitle}>Analyse par section</Text>
        {loadingExtra ? (
          <ActivityIndicator size="small" color={PRIMARY} style={{ marginBottom: 20 }} />
        ) : (
          sections.map((s) => (
            <View key={s.name} style={styles.sectionCard}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionName}>{s.name}</Text>
                <Text style={styles.sectionScore}>
                  {s.score} / {s.maxScore}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(s.score / s.maxScore) * 100}%`, backgroundColor: s.color },
                  ]}
                />
              </View>
            </View>
          ))
        )}

        {/* Score evolution graph */}
        <Text style={styles.sectionTitle}>Évolution de ton score SAT</Text>
        <View style={styles.chartCard}>
          {loadingExtra ? (
            <ActivityIndicator size="small" color={PRIMARY} />
          ) : (
            <>
              <View style={styles.chartPlaceholder}>
                {chartValues.map((val, idx) => (
                  <View key={idx} style={styles.chartBar}>
                    <View
                      style={[
                        styles.chartBarFill,
                        { height: Math.max((val / maxChartVal) * 80, 4) },
                      ]}
                    />
                  </View>
                ))}
              </View>
              <View style={styles.chartLabels}>
                {chartLabels.map((label, idx) => (
                  <Text key={idx} style={styles.chartLabel}>
                    {label}
                  </Text>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => navigation.navigate('StudentSATQuiz', { mode: 'errors' })}
          >
            <Ionicons name="refresh" size={18} color={PRIMARY} />
            <Text style={styles.retryBtnText}>Réviser les erreurs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newBtn} onPress={() => navigation.popToTop()}>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827', fontFamily: 'Montserrat-Bold', textAlign: 'center' },
  content: { padding: 16 },
  scoreCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 20,
  },
  scoreLabel: { fontSize: 13, color: MUTED, fontFamily: 'Montserrat-Regular' },
  scoreValue: { fontSize: 48, fontWeight: '800', color: PRIMARY, fontFamily: 'Montserrat-Bold', marginTop: 4 },
  scoreDelta: { fontSize: 18, fontWeight: '700', color: '#10B981', fontFamily: 'Montserrat-Bold' },
  scoreBravo: { fontSize: 14, color: MUTED, fontFamily: 'Montserrat-Regular', marginTop: 4, marginBottom: 16 },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#111827', fontFamily: 'Montserrat-Bold' },
  statLabel: { fontSize: 11, color: MUTED, fontFamily: 'Montserrat-Regular', marginTop: 2 },
  statPct: { fontSize: 12, color: MUTED, fontFamily: 'Montserrat-Medium' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', fontFamily: 'Montserrat-Bold', marginBottom: 10 },
  sectionCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sectionName: { fontSize: 14, fontWeight: '600', color: '#111827', fontFamily: 'Montserrat-SemiBold' },
  sectionScore: { fontSize: 14, fontWeight: '700', color: PRIMARY, fontFamily: 'Montserrat-Bold' },
  progressBar: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3 },
  progressFill: { height: 6, borderRadius: 3 },
  chartCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  chartPlaceholder: { flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 8, justifyContent: 'space-around' },
  chartBar: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 4, justifyContent: 'flex-end' },
  chartBarFill: { backgroundColor: PRIMARY, borderRadius: 4, opacity: 0.7 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  chartLabel: { fontSize: 10, color: MUTED, fontFamily: 'Montserrat-Regular' },
  actions: { gap: 10 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    backgroundColor: '#F0FAF8',
  },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: PRIMARY, fontFamily: 'Montserrat-Bold' },
  newBtn: { padding: 14, borderRadius: 12, backgroundColor: PRIMARY, alignItems: 'center' },
  newBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Montserrat-Bold' },
});