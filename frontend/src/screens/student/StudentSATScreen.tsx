import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/auth.service';

const PRIMARY = '#0D6B5E';
const BG = '#FFFFFF';
const CARD = '#FFFFFF';
const MUTED = '#6B7280';

// Mapping entre l'identifiant utilisé côté UI et l'enum `mode` du modèle SATSession
// (FREE | SIMULATED | REVIEW | MISTAKES). Réutilisé par l'écran Quiz.
export const MODE_MAP: Record<string, { backendMode: string; totalQuestions: number; domaine: string }> = {
  free: { backendMode: 'FREE', totalQuestions: 10, domaine: 'ALL' },
  simulated: { backendMode: 'SIMULATED', totalQuestions: 20, domaine: 'ALL' }, // ⚠️ ajuster le nb de questions réel d'un SAT simulé avec le backend
  rapid: { backendMode: 'REVIEW', totalQuestions: 10, domaine: 'ALL' },
  errors: { backendMode: 'MISTAKES', totalQuestions: 10, domaine: 'ALL' }, // nécessite le fix backend (cf. point 5)
};

const modes = [
  {
    id: 'free',
    icon: 'shuffle-outline',
    iconColor: '#3B82F6',
    bgColor: '#EFF6FF',
    title: 'Entraînement libre',
    desc: 'Choisis ta matière, le nombre de questions et la difficulté.',
  },
  {
    id: 'simulated',
    icon: 'time-outline',
    iconColor: '#F59E0B',
    bgColor: '#FFFBEB',
    title: 'SAT Simulé',
    desc: 'Examen complet en conditions réelles.',
  },
  {
    id: 'rapid',
    icon: 'flash-outline',
    iconColor: '#EF4444',
    bgColor: '#FEF2F2',
    title: 'Révision rapide',
    desc: '10 questions quotidiennes pour rester affûté(e).',
  },
  {
    id: 'errors',
    icon: 'close-circle-outline',
    iconColor: '#EC4899',
    bgColor: '#FDF2F8',
    title: 'Mode Erreurs',
    desc: 'Refais uniquement tes questions ratées.',
  },
];

type Props = {
  navigation: { navigate: (screen: string, params?: any) => void };
};

type StatsBanner = {
  scoreEstime: number;
  quizRealises: number;
  tauxReussite: number;
};

export default function StudentSATScreen({ navigation }: Props) {
  const [stats, setStats] = useState<StatsBanner | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startingMode, setStartingMode] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/sat/stats');
      const sessions = data.sessions || [];

      const scoreEstime = sessions.length > 0 ? sessions[0].scoreSAT || 0 : 0;

      const validScores = sessions.filter((s: any) => typeof s.score === 'number');
      const tauxReussite =
        validScores.length > 0
          ? Math.round(validScores.reduce((sum: number, s: any) => sum + s.score, 0) / validScores.length)
          : 0;

      setStats({
        scoreEstime,
        quizRealises: sessions.length, // ⚠️ limité aux 10 dernières sessions (cf. note backend optionnelle)
        tauxReussite,
      });
    } catch (error) {
      console.log('Erreur chargement stats SAT', error);
    } finally {
      setLoadingStats(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const startQuiz = async (modeId: string) => {
    const config = MODE_MAP[modeId];
    if (!config) return;

    setStartingMode(modeId);
    try {
      const { data } = await api.post('/sat/sessions/start', {
        mode: config.backendMode,
        domaine: config.domaine,
        totalQuestions: config.totalQuestions,
      });

      // data = { session, questions }
      if (!data.questions || data.questions.length === 0) {
        Alert.alert('Aucune question disponible', 'Il n\'y a pas encore de questions pour ce mode.');
        return;
      }

      navigation.navigate('StudentSATQuiz', {
        sessionId: data.session.id,
        questions: data.questions,
        modeId,
      });
    } catch (error: any) {
      console.log('Erreur démarrage session SAT', error?.response?.data || error);
      Alert.alert(
        'Erreur',
        error?.response?.data?.message || 'Impossible de démarrer ce quiz pour le moment.'
      );
    } finally {
      setStartingMode(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SAT</Text>
        <Text style={styles.headerSubtitle}>Choisis ton mode d'entraînement</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY]} />}
      >
        {modes.map((mode) => {
          const isStarting = startingMode === mode.id;
          return (
            <TouchableOpacity
              key={mode.id}
              style={styles.card}
              disabled={startingMode !== null}
              onPress={() => startQuiz(mode.id)}
            >
              <View style={[styles.iconContainer, { backgroundColor: mode.bgColor }]}>
                <Ionicons name={mode.icon as any} size={28} color={mode.iconColor} />
              </View>
              <View style={styles.info}>
                <Text style={styles.modeTitle}>{mode.title}</Text>
                <Text style={styles.modeDesc}>{mode.desc}</Text>
              </View>
              {isStarting ? (
                <ActivityIndicator size="small" color={PRIMARY} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={MUTED} />
              )}
            </TouchableOpacity>
          );
        })}

        {/* Stats Banner */}
        <View style={styles.statsBanner}>
          {loadingStats ? (
            <ActivityIndicator size="small" color={PRIMARY} style={{ flex: 1 }} />
          ) : (
            <>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats?.scoreEstime ?? 0}</Text>
                <Text style={styles.statLabel}>Score estimé</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats?.quizRealises ?? 0}</Text>
                <Text style={styles.statLabel}>Quiz réalisés</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats?.tauxReussite ?? 0}%</Text>
                <Text style={styles.statLabel}>Taux de réussite</Text>
              </View>
            </>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827', fontFamily: 'Montserrat-Bold' },
  headerSubtitle: { fontSize: 14, color: MUTED, marginTop: 4, fontFamily: 'Montserrat-Regular' },
  content: { padding: 16 },
  card: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  info: { flex: 1 },
  modeTitle: { fontSize: 15, fontWeight: '700', color: '#111827', fontFamily: 'Montserrat-Bold' },
  modeDesc: { fontSize: 13, color: MUTED, marginTop: 3, lineHeight: 18, fontFamily: 'Montserrat-Regular' },
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 70,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: PRIMARY, fontFamily: 'Montserrat-Bold' },
  statLabel: { fontSize: 11, color: MUTED, marginTop: 3, textAlign: 'center', fontFamily: 'Montserrat-Regular' },
  statDivider: { width: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },
});