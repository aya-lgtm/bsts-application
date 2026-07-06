/**
 * StudentSATRevisionScreen.tsx
 * Centre de révision — remplace "Mes Erreurs" dans StudentSATHomeScreen
 * Utilise les routes existantes + GET /sat/revision/stats (nouvelle route)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/auth.service';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const PRIMARY       = '#0F7A65';
const PRIMARY_LIGHT = '#E8F5F2';
const BG            = '#F8FAFB';
const CARD          = '#FFFFFF';
const TEXT          = '#111827';
const TEXT_MUTED    = '#6B7280';
const BORDER        = '#E5E7EB';
const SUCCESS       = '#16A34A';
const WARNING       = '#F5A623';
const DANGER        = '#E24B4A';

// ─── Types ────────────────────────────────────────────────────────────────────
type RevisionStats = {
  totalARevoir: number;
  maitrise: number;
  serie: number;
  objectifJour: number;
  questionsDuJour: number;
  parDomaine: {
    MATH:    { erreurs: number; maitrise: number };
    READING: { erreurs: number; maitrise: number };
    WRITING: { erreurs: number; maitrise: number };
  };
};

type Props = {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
};

// ─── Barre de progression animée ─────────────────────────────────────────────
function AnimBar({ value, color, height = 6 }: { value: number; color: string; height?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration: 700, useNativeDriver: false }).start();
  }, [value]);
  const width = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <View style={{ height, backgroundColor: BORDER, borderRadius: height, overflow: 'hidden' }}>
      <Animated.View style={{ height, borderRadius: height, backgroundColor: color, width }} />
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────
export default function StudentSATRevisionScreen({ navigation }: Props) {
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting]     = useState(false);
  const [stats, setStats]           = useState<RevisionStats | null>(null);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/sat/revision/stats');
      setStats(data);
    } catch {
      // Fallback sur getMistakes si la nouvelle route n'existe pas encore
      try {
        const [mistakesRes, statsRes] = await Promise.all([
          api.get('/sat/mistakes'),
          api.get('/sat/stats'),
        ]);
        const mistakes = mistakesRes.data.mistakes || [];
        const sessions = statsRes.data.sessions   || [];

        // Calculer série
        let serie = 0;
        const today = new Date(); today.setHours(0,0,0,0);
        for (let i = 0; i < 30; i++) {
          const day = new Date(today); day.setDate(day.getDate() - i);
          const has = sessions.some((s: any) => {
            const d = new Date(s.createdAt); d.setHours(0,0,0,0);
            return d.getTime() === day.getTime();
          });
          if (has) serie++; else break;
        }

        // Progression du jour
        const startDay = new Date(); startDay.setHours(0,0,0,0);
        const todayQ = sessions
          .filter((s: any) => new Date(s.createdAt) >= startDay)
          .reduce((sum: number, s: any) => sum + (s.bonnesReponses || 0), 0);

        // Erreurs par domaine
        const mathE    = mistakes.filter((m: any) => m.domaine === 'MATH').length;
        const readingE = mistakes.filter((m: any) => m.domaine === 'READING').length;
        const writingE = mistakes.filter((m: any) => m.domaine === 'WRITING').length;
        const total    = mistakes.length;
        const maitrise = total > 0 ? Math.round(((total - total) / total) * 100) : 0;

        setStats({
          totalARevoir:    total,
          maitrise:        statsRes.data.sessions?.[0]?.score || 0,
          serie,
          objectifJour:    10,
          questionsDuJour: Math.min(todayQ, 10),
          parDomaine: {
            MATH:    { erreurs: mathE,    maitrise: 0 },
            READING: { erreurs: readingE, maitrise: 0 },
            WRITING: { erreurs: writingE, maitrise: 0 },
          },
        });
      } catch {}
    } finally {
      setLoading(false);
      setRefreshing(false);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]).start();
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startRevision = async (mode: string, nb: number = 10) => {
    if (starting) return;
    if (stats?.totalARevoir === 0 && mode === 'MISTAKES') {
      Alert.alert('Aucune erreur', 'Tu n\'as pas encore de questions à revoir. Fais d\'abord quelques quiz !');
      return;
    }
    setStarting(true);
    try {
      const { data } = await api.post('/sat/sessions/start', {
        mode,
        domaine: 'ALL',
        totalQuestions: nb,
      });
      if (!data.questions || data.questions.length === 0) {
        Alert.alert('Aucune question', 'Pas encore de questions disponibles pour ce mode.');
        return;
      }
      navigation.navigate('StudentSATUnitTest', {
        unit: { id: 'revision', titre: modeLabel(mode), domaine: 'ALL', niveau: 'BEGINNER' },
        sessionOverride: { sessionId: data.session.id, questions: data.questions },
      });
    } catch {
      Alert.alert('Erreur', 'Impossible de démarrer la révision. Réessaie.');
    } finally {
      setStarting(false);
    }
  };

  const modeLabel = (mode: string) => {
    const map: Record<string, string> = {
      MISTAKES:  'Révision des erreurs',
      REVIEW:    'Révision rapide',
      CHALLENGE: 'Questions difficiles',
    };
    return map[mode] || mode;
  };

  if (loading) {
    return (
      <View style={s.loadingView}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={s.loadingText}>Chargement du centre de révision…</Text>
      </View>
    );
  }

  const progressJour = stats ? Math.round((stats.questionsDuJour / stats.objectifJour) * 100) : 0;

  return (
    <View style={s.root}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={navigation.goBack}
          style={s.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerEyebrow}>SAT · BSTS</Text>
          <Text style={s.headerTitle}>Centre de révision</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={PRIMARY} />}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={s.headerSub}>
            Révise les notions à maîtriser pour améliorer ton score.
          </Text>

          {/* ── Carte statistiques ── */}
          <View style={s.statsCard}>
            <View style={s.statsRow}>
              <View style={[s.statItem, s.statBorderRight]}>
                <Text style={[s.statNum, { color: DANGER }]}>{stats?.totalARevoir ?? 0}</Text>
                <Text style={s.statLabel}>À revoir</Text>
                <Text style={s.statSub}>questions à revoir</Text>
              </View>
              <View style={s.statItem}>
                <Text style={[s.statNum, { color: PRIMARY }]}>{stats?.maitrise ?? 0}%</Text>
                <Text style={s.statLabel}>Progression</Text>
                <Text style={s.statSub}>de maîtrise</Text>
              </View>
            </View>
            <View style={s.statsDivider} />
            <View style={s.statsRow}>
              <View style={[s.statItem, s.statBorderRight]}>
                <Text style={[s.statNum, { color: WARNING }]}>{stats?.serie ?? 0} jours</Text>
                <Text style={s.statLabel}>Série 🔥</Text>
                <Text style={s.statSub}>consécutifs</Text>
              </View>
              <View style={s.statItem}>
                <Text style={[s.statNum, { color: TEXT }]}>{stats?.objectifJour ?? 10}</Text>
                <Text style={s.statLabel}>Objectif</Text>
                <Text style={s.statSub}>questions aujourd'hui</Text>
              </View>
            </View>
          </View>

          {/* ── Section 1 : À revoir aujourd'hui ── */}
          <Text style={s.sectionTitle}>À revoir aujourd'hui</Text>
          <View style={s.todayCard}>
            <View style={s.todayTop}>
              <View style={[s.priorityBadge]}>
                <Ionicons name="star" size={11} color={PRIMARY} />
                <Text style={s.priorityText}>Priorité</Text>
              </View>
            </View>
            <Text style={s.todayCardTitle}>Révision du jour</Text>
            <Text style={s.todayCardDesc}>
              Le système a sélectionné automatiquement les questions les plus importantes à revoir aujourd'hui.
            </Text>
            <View style={s.chipsRow}>
              <View style={s.chip}>
                <Ionicons name="help-circle-outline" size={12} color={TEXT_MUTED} />
                <Text style={s.chipText}>10 questions</Text>
              </View>
              <View style={s.chip}>
                <Ionicons name="time-outline" size={12} color={TEXT_MUTED} />
                <Text style={s.chipText}>8 min</Text>
              </View>
              <View style={[s.chip, s.chipXP]}>
                <Ionicons name="flash" size={12} color={PRIMARY} />
                <Text style={[s.chipText, { color: PRIMARY }]}>+40 XP</Text>
              </View>
            </View>
            {/* Progression du jour */}
            <View style={s.progressSection}>
              <View style={s.progressLabelRow}>
                <Text style={s.progressLabel}>Progression du jour</Text>
                <Text style={[s.progressVal, { color: PRIMARY }]}>
                  {stats?.questionsDuJour ?? 0} / {stats?.objectifJour ?? 10}
                </Text>
              </View>
              <AnimBar value={progressJour} color={PRIMARY} />
            </View>
            <TouchableOpacity
              style={[s.btnPrimary, starting && { opacity: 0.7 }]}
              onPress={() => startRevision('MISTAKES', 10)}
              disabled={starting}
              activeOpacity={0.85}
            >
              {starting
                ? <ActivityIndicator color="#FFF" size="small" />
                : <>
                    <Ionicons name="play" size={16} color="#FFF" />
                    <Text style={s.btnPrimaryText}>Commencer la révision</Text>
                  </>
              }
            </TouchableOpacity>
          </View>

          {/* ── Section 2 : Par matière ── */}
          <Text style={s.sectionTitle}>Révision par matière</Text>
          <View style={s.subjectsRow}>
            {[
              { key: 'MATH',    label: 'Math',    icon: 'calculator-outline', color: PRIMARY,   bg: PRIMARY_LIGHT,  erreurs: stats?.parDomaine?.MATH?.erreurs ?? 0,    pct: stats?.parDomaine?.MATH?.maitrise ?? 68 },
              { key: 'READING', label: 'Reading', icon: 'book-outline',       color: '#5B7BE8', bg: '#EEF2FF',      erreurs: stats?.parDomaine?.READING?.erreurs ?? 0, pct: stats?.parDomaine?.READING?.maitrise ?? 55 },
              { key: 'WRITING', label: 'Writing', icon: 'pencil-outline',     color: WARNING,   bg: '#FFF8EC',      erreurs: stats?.parDomaine?.WRITING?.erreurs ?? 0, pct: stats?.parDomaine?.WRITING?.maitrise ?? 82 },
            ].map(sub => (
              <TouchableOpacity
                key={sub.key}
                style={s.subjectCard}
                onPress={() => startRevision('MISTAKES', 5)}
                activeOpacity={0.8}
              >
                <View style={[s.subjectIcon, { backgroundColor: sub.bg }]}>
                  <Ionicons name={sub.icon as any} size={18} color={sub.color} />
                </View>
                <Text style={s.subjectName}>{sub.label}</Text>
                <Text style={s.subjectErrors}>{sub.erreurs} erreurs</Text>
                <AnimBar value={sub.pct} color={sub.color} height={4} />
                <Text style={[s.subjectPct, { color: sub.color }]}>{sub.pct}% maîtrisé</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Section 3 : Catégories intelligentes ── */}
          <Text style={s.sectionTitle}>Catégories intelligentes</Text>
          <View style={s.catsGrid}>
            {[
              { label: 'Questions difficiles', sub: 'Celles ratées plusieurs fois',   badge: 'Priorité',   iconBg: '#FEECEC', badgeBg: '#FEECEC', badgeColor: '#A32D2D', iconColor: DANGER,   icon: 'alert-circle-outline', onPress: () => startRevision('CHALLENGE', 10) },
              { label: 'Questions favorites',  sub: 'Enregistrées par toi',           badge: 'Favoris',    iconBg: '#FFF8EC', badgeBg: '#FFF8EC', badgeColor: '#854F0B', iconColor: WARNING,  icon: 'heart-outline',        onPress: () => Alert.alert('Bientôt', 'Les favoris arrivent bientôt !') },
              { label: 'Révision programmée', sub: 'Sélection automatique',          badge: "Aujourd'hui",iconBg: PRIMARY_LIGHT, badgeBg: PRIMARY_LIGHT, badgeColor: '#0F6E56', iconColor: PRIMARY, icon: 'calendar-outline', onPress: () => startRevision('REVIEW', 10) },
              { label: 'Historique des révisions', sub: 'Voir ta progression',       badge: 'Historique', iconBg: '#EEF2FF', badgeBg: '#EEF2FF', badgeColor: '#185FA5', iconColor: '#5B7BE8', icon: 'time-outline',         onPress: () => Alert.alert('Bientôt', 'L\'historique arrive bientôt !') },
            ].map((cat, i) => (
              <TouchableOpacity key={i} style={s.catCard} onPress={cat.onPress} activeOpacity={0.8}>
                <View style={[s.catIcon, { backgroundColor: cat.iconBg }]}>
                  <Ionicons name={cat.icon as any} size={16} color={cat.iconColor} />
                </View>
                <View style={[s.catBadge, { backgroundColor: cat.badgeBg }]}>
                  <Text style={[s.catBadgeText, { color: cat.badgeColor }]}>{cat.badge}</Text>
                </View>
                <Text style={s.catTitle}>{cat.label}</Text>
                <Text style={s.catSub}>{cat.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Section 4 : Quiz personnalisé ── */}
          <Text style={s.sectionTitle}>Quiz personnalisé</Text>
          <View style={s.quizCard}>
            <View style={s.quizHeader}>
              <Text style={s.quizTitle}>Quiz personnalisé</Text>
              <View style={s.quizBadge}>
                <Ionicons name="sparkles" size={10} color={PRIMARY} />
                <Text style={s.quizBadgeText}>Intelligent</Text>
              </View>
            </View>
            <Text style={s.quizDesc}>
              Un quiz généré automatiquement à partir de tes erreurs récentes.
            </Text>
            <View style={s.chipsRow}>
              <View style={s.chip}>
                <Ionicons name="help-circle-outline" size={12} color={TEXT_MUTED} />
                <Text style={s.chipText}>15 questions</Text>
              </View>
              <View style={s.chip}>
                <Ionicons name="options-outline" size={12} color={TEXT_MUTED} />
                <Text style={s.chipText}>Difficulté adaptative</Text>
              </View>
              <View style={s.chip}>
                <Ionicons name="time-outline" size={12} color={TEXT_MUTED} />
                <Text style={s.chipText}>12 min</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[s.btnPrimary, starting && { opacity: 0.7 }]}
              onPress={() => startRevision('MISTAKES', 15)}
              disabled={starting}
              activeOpacity={0.85}
            >
              {starting
                ? <ActivityIndicator color="#FFF" size="small" />
                : <>
                    <Ionicons name="flash" size={16} color="#FFF" />
                    <Text style={s.btnPrimaryText}>Générer le quiz</Text>
                  </>
              }
            </TouchableOpacity>
          </View>

        </Animated.View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: BG },
  loadingView: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: BG },
  loadingText: { fontSize: 14, color: TEXT_MUTED, fontWeight: '500' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 12,
  },
  backBtn:       { padding: 4 },
  headerCenter:  { flex: 1 },
  headerEyebrow: { fontSize: 11, fontWeight: '700', color: PRIMARY, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  headerTitle:   { fontSize: 20, fontWeight: '800', color: TEXT, letterSpacing: -0.3 },

  scroll:    { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
  headerSub: { fontSize: 13, color: TEXT_MUTED, lineHeight: 19, marginBottom: 20 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 12, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Stats
  statsCard: {
    backgroundColor: CARD, borderRadius: 20, padding: 20,
    marginBottom: 24, borderWidth: 1, borderColor: BORDER,
    shadowColor: PRIMARY, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  statsRow:       { flexDirection: 'row' },
  statItem:       { flex: 1, paddingHorizontal: 4 },
  statBorderRight:{ borderRightWidth: 1, borderRightColor: BORDER, marginRight: 4, paddingRight: 16 },
  statNum:        { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 2 },
  statLabel:      { fontSize: 12, fontWeight: '600', color: TEXT, marginBottom: 2 },
  statSub:        { fontSize: 11, color: TEXT_MUTED },
  statsDivider:   { height: 1, backgroundColor: BORDER, marginVertical: 16 },

  // Carte aujourd'hui
  todayCard: {
    backgroundColor: CARD, borderRadius: 20, padding: 18,
    marginBottom: 24, borderWidth: 1, borderColor: BORDER,
    shadowColor: PRIMARY, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    borderTopWidth: 3, borderTopColor: PRIMARY,
  },
  todayTop:       { marginBottom: 8 },
  priorityBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: PRIMARY_LIGHT, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  priorityText:   { fontSize: 11, fontWeight: '700', color: PRIMARY },
  todayCardTitle: { fontSize: 16, fontWeight: '800', color: TEXT, marginBottom: 6 },
  todayCardDesc:  { fontSize: 13, color: TEXT_MUTED, lineHeight: 19, marginBottom: 14 },
  chipsRow:       { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 14 },
  chip:           { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 0.5, borderColor: BORDER },
  chipXP:         { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY + '40' },
  chipText:       { fontSize: 11, color: TEXT_MUTED, fontWeight: '500' },
  progressSection:{ marginBottom: 14 },
  progressLabelRow:{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel:  { fontSize: 12, color: TEXT_MUTED },
  progressVal:    { fontSize: 12, fontWeight: '700' },

  // Bouton
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 15, gap: 8,
  },
  btnPrimaryText: { fontSize: 15, fontWeight: '800', color: '#FFF' },

  // Sujets
  subjectsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  subjectCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: BORDER, gap: 4,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  subjectIcon:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  subjectName:   { fontSize: 12, fontWeight: '700', color: TEXT },
  subjectErrors: { fontSize: 10, color: TEXT_MUTED, marginBottom: 4 },
  subjectPct:    { fontSize: 10, fontWeight: '700', marginTop: 4 },

  // Catégories
  catsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  catCard: {
    width: '47.5%', backgroundColor: CARD, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  catIcon:      { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  catBadge:     { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6 },
  catBadgeText: { fontSize: 9, fontWeight: '700' },
  catTitle:     { fontSize: 12, fontWeight: '700', color: TEXT, marginBottom: 3, lineHeight: 16 },
  catSub:       { fontSize: 10, color: TEXT_MUTED, lineHeight: 14 },

  // Quiz
  quizCard: {
    backgroundColor: CARD, borderRadius: 20, padding: 18,
    marginBottom: 8, borderWidth: 1, borderColor: BORDER,
    shadowColor: PRIMARY, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  quizHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  quizTitle:     { fontSize: 16, fontWeight: '800', color: TEXT },
  quizBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: PRIMARY_LIGHT, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  quizBadgeText: { fontSize: 10, fontWeight: '700', color: PRIMARY },
  quizDesc:      { fontSize: 13, color: TEXT_MUTED, lineHeight: 19, marginBottom: 14 },
});