/**
 * StudentSATUnitResultScreen.tsx
 * Résultats du SAT Blanc d'une unité
 * Score SAT estimé + breakdown par difficulté + corrections détaillées
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const PRIMARY       = '#0D6B5E';
const PRIMARY_LIGHT = '#E6F3F1';
const BG            = '#FFFFFF';
const CARD          = '#F8FAFB';
const TEXT          = '#111827';
const TEXT_MUTED    = '#6B7280';
const BORDER        = '#E5E7EB';
const SUCCESS       = '#16A34A';
const SUCCESS_LIGHT = '#DCFCE7';
const DANGER        = '#EF4444';
const DANGER_LIGHT  = '#FEF2F2';
const WARNING       = '#F59E0B';

// ─── Types ────────────────────────────────────────────────────────────────────
type Correction = {
  reponseEleve: string;
  bonneReponse: string;
  estCorrecte: boolean;
  explication?: string;
};

type Result = {
  score: number;
  scoreSAT: number;
  bonnesReponses: number;
  totalQuestions: number;
  corrections: Record<string, Correction>;
  pointsGagnes: number;
  unitTitre: string;
  domaine: 'MATH' | 'READING' | 'WRITING';
};

type Unit = {
  id: string;
  titre: string;
  domaine: 'MATH' | 'READING' | 'WRITING';
};

type Props = {
  route: { params: { result: Result; unit: Unit } };
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
};

// ─── Config ───────────────────────────────────────────────────────────────────
const DOMAIN_COLOR: Record<string, string> = {
  MATH:    '#3B82F6',
  READING: '#7C3AED',
  WRITING: '#EC4899',
};

const DOMAIN_LABEL: Record<string, string> = {
  MATH: 'Math', READING: 'Reading & Writing', WRITING: 'Writing',
};

// ─── Barre de progression animée ─────────────────────────────────────────────
function AnimatedBar({ value, color, delay = 0 }: { value: number; color: string; delay?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: value, duration: 700, delay,
      useNativeDriver: false,
    }).start();
  }, [value]);
  const width = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <View style={{ height: 8, backgroundColor: BORDER, borderRadius: 4, overflow: 'hidden' }}>
      <Animated.View style={{ height: 8, borderRadius: 4, backgroundColor: color, width }} />
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────
export default function StudentSATUnitResultScreen({ route, navigation }: Props) {
  const { result, unit } = route.params;
  const domainColor = DOMAIN_COLOR[unit.domaine] || PRIMARY;

  const isPassed  = result.score >= 60;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // Calculer breakdown depuis les corrections
  const corrections = result.corrections || {};
  const corrEntries = Object.values(corrections) as Correction[];
  const totalCorrect = corrEntries.filter(c => c.estCorrecte).length;
  const totalWrong   = corrEntries.length - totalCorrect;

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Hero ── */}
        <Animated.View style={[s.hero, { opacity: fadeAnim, backgroundColor: isPassed ? SUCCESS_LIGHT : DANGER_LIGHT }]}>
          <Animated.Text style={[s.heroEmoji, { transform: [{ scale: scaleAnim }] }]}>
            {isPassed ? '🏆' : '💪'}
          </Animated.Text>

          <View style={[s.domainPill, { backgroundColor: domainColor + '20' }]}>
            <Text style={[s.domainPillText, { color: domainColor }]}>
              SAT Blanc · {DOMAIN_LABEL[unit.domaine]}
            </Text>
          </View>

          <Text style={[s.heroTitle, { color: isPassed ? SUCCESS : DANGER }]}>
            {isPassed ? 'Excellent !' : 'Courage !'}
          </Text>
          <Text style={s.heroSub}>
            {isPassed
              ? 'Tu maîtrises bien ce domaine. Continue !'
              : 'Revois les leçons et réessaie pour progresser.'}
          </Text>

          {/* Score SAT */}
          <View style={[s.satScoreBox, { borderColor: (isPassed ? SUCCESS : DANGER) + '40' }]}>
            <Text style={[s.satScoreValue, { color: isPassed ? SUCCESS : DANGER }]}>{result.scoreSAT}</Text>
            <Text style={s.satScoreLabel}>Score SAT estimé / 1600</Text>
          </View>
        </Animated.View>

        {/* ── Stats globales ── */}
        <Animated.View style={[s.statsRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: domainColor }]}>{result.score}%</Text>
            <Text style={s.statLabel}>Score global</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: SUCCESS }]}>{totalCorrect}</Text>
            <Text style={s.statLabel}>Bonnes réponses</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: DANGER }]}>{totalWrong}</Text>
            <Text style={s.statLabel}>Erreurs</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: WARNING }]}>+{result.pointsGagnes}</Text>
            <Text style={s.statLabel}>XP gagnés</Text>
          </View>
        </Animated.View>

        {/* ── Barre de score ── */}
        <Animated.View style={[s.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={s.sectionLabel}>PERFORMANCE</Text>
          <View style={s.performCard}>
            <View style={s.performRow}>
              <View style={[s.performDot, { backgroundColor: SUCCESS }]} />
              <Text style={s.performDotLabel}>Bonnes</Text>
              <Text style={[s.performPct, { color: SUCCESS }]}>
                {Math.round((totalCorrect / (corrEntries.length || 1)) * 100)}%
              </Text>
            </View>
            <AnimatedBar
              value={Math.round((totalCorrect / (corrEntries.length || 1)) * 100)}
              color={SUCCESS}
              delay={200}
            />
            <View style={[s.performRow, { marginTop: 14 }]}>
              <View style={[s.performDot, { backgroundColor: DANGER }]} />
              <Text style={s.performDotLabel}>Erreurs</Text>
              <Text style={[s.performPct, { color: DANGER }]}>
                {Math.round((totalWrong / (corrEntries.length || 1)) * 100)}%
              </Text>
            </View>
            <AnimatedBar
              value={Math.round((totalWrong / (corrEntries.length || 1)) * 100)}
              color={DANGER}
              delay={400}
            />
          </View>
        </Animated.View>

        {/* ── Corrections ── */}
        <Animated.View style={[s.section, { opacity: fadeAnim }]}>
          <Text style={s.sectionLabel}>CORRECTIONS ({corrEntries.length} questions)</Text>

          {corrEntries.length === 0 ? (
            <View style={s.noCorrections}>
              <Text style={s.noCorrectionsText}>Aucune correction disponible.</Text>
            </View>
          ) : (
            Object.entries(corrections).map(([questionId, corr], i) => {
              const c = corr as Correction;
              const isOk = c.estCorrecte;
              return (
                <View key={questionId} style={[s.corrCard, { borderColor: isOk ? '#BBF7D0' : '#FECACA' }]}>
                  {/* Header correction */}
                  <View style={[s.corrHeader, { backgroundColor: isOk ? SUCCESS_LIGHT : DANGER_LIGHT }]}>
                    <View style={s.corrHeaderLeft}>
                      <Ionicons
                        name={isOk ? 'checkmark-circle' : 'close-circle'}
                        size={16}
                        color={isOk ? SUCCESS : DANGER}
                      />
                      <Text style={[s.corrStatus, { color: isOk ? SUCCESS : DANGER }]}>
                        {isOk ? 'Correct' : 'Incorrect'}
                      </Text>
                    </View>
                    <Text style={s.corrIndex}>Q{i + 1}</Text>
                  </View>

                  {/* Body correction */}
                  <View style={s.corrBody}>
                    {/* Réponses */}
                    <View style={s.corrAnswersRow}>
                      <View style={s.corrAnswerItem}>
                        <Text style={s.corrAnswerLabel}>Ta réponse</Text>
                        <View style={[
                          s.corrAnswerBadge,
                          { backgroundColor: isOk ? SUCCESS_LIGHT : DANGER_LIGHT,
                            borderColor: isOk ? SUCCESS : DANGER },
                        ]}>
                          <Text style={[s.corrAnswerLetter, { color: isOk ? SUCCESS : DANGER }]}>
                            {c.reponseEleve}
                          </Text>
                        </View>
                      </View>
                      {!isOk && (
                        <>
                          <Ionicons name="arrow-forward" size={16} color={TEXT_MUTED} />
                          <View style={s.corrAnswerItem}>
                            <Text style={s.corrAnswerLabel}>Bonne réponse</Text>
                            <View style={[s.corrAnswerBadge, { backgroundColor: SUCCESS_LIGHT, borderColor: SUCCESS }]}>
                              <Text style={[s.corrAnswerLetter, { color: SUCCESS }]}>{c.bonneReponse}</Text>
                            </View>
                          </View>
                        </>
                      )}
                    </View>

                    {/* Explication */}
                    {c.explication && (
                      <View style={[s.explication, { borderColor: domainColor + '30', backgroundColor: domainColor + '08' }]}>
                        <Ionicons name="bulb-outline" size={14} color={domainColor} />
                        <Text style={[s.explicationText, { color: TEXT }]}>{c.explication}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </Animated.View>

        {/* ── Actions ── */}
        <Animated.View style={[s.actionsBox, { opacity: fadeAnim }]}>
          {!isPassed && (
            <TouchableOpacity
              style={[s.retryBtn, { borderColor: domainColor + '50' }]}
              onPress={() => navigation.navigate('StudentSATUnitTest', { unit })}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={18} color={domainColor} />
              <Text style={[s.retryText, { color: domainColor }]}>Réessayer le test</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[s.homeBtn, { backgroundColor: domainColor }]}
            onPress={() => navigation.navigate('StudentSATUnit', { unit })}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={18} color="#FFF" />
            <Text style={s.homeBtnText}>Retour à l'unité</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.satHomeBtn}
            onPress={() => navigation.navigate('StudentSATHome')}
          >
            <Text style={s.satHomeBtnText}>Voir tous les domaines</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: CARD },
  scroll: { paddingBottom: 20 },

  // Hero
  hero: {
    alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 70 : 54,
    paddingBottom: 32, paddingHorizontal: 24, gap: 10,
  },
  heroEmoji:   { fontSize: 72, marginBottom: 4 },
  domainPill:  { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  domainPillText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  heroTitle:   { fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  heroSub:     { fontSize: 14, color: TEXT_MUTED, textAlign: 'center', lineHeight: 20 },
  satScoreBox: {
    alignItems: 'center', borderWidth: 1.5, borderRadius: 20,
    paddingVertical: 16, paddingHorizontal: 44,
    backgroundColor: BG, marginTop: 8,
  },
  satScoreValue:{ fontSize: 42, fontWeight: '900', letterSpacing: -1 },
  satScoreLabel:{ fontSize: 12, color: TEXT_MUTED, fontWeight: '600', marginTop: 2 },

  // Stats
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: CARD, borderRadius: 18,
    paddingVertical: 20, paddingHorizontal: 4,
    borderWidth: 1, borderColor: BORDER,
  },
  statItem:    { flex: 1, alignItems: 'center' },
  statValue:   { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  statLabel:   { fontSize: 10, color: TEXT_MUTED, fontWeight: '600', marginTop: 3, textAlign: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: BORDER },

  // Section
  section:      { paddingHorizontal: 16, marginTop: 24 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: TEXT_MUTED, letterSpacing: 1.5, marginBottom: 12 },

  // Performance
  performCard: { backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER },
  performRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  performDot:  { width: 10, height: 10, borderRadius: 5 },
  performDotLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: TEXT_MUTED },
  performPct:  { fontSize: 14, fontWeight: '800' },

  // Corrections
  noCorrections:     { alignItems: 'center', paddingVertical: 20 },
  noCorrectionsText: { fontSize: 13, color: TEXT_MUTED },
  corrCard:   { marginBottom: 10, borderRadius: 14, borderWidth: 1.5, overflow: 'hidden', backgroundColor: CARD },
  corrHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  corrHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  corrStatus: { fontSize: 13, fontWeight: '800' },
  corrIndex:  { fontSize: 12, fontWeight: '700', color: TEXT_MUTED },
  corrBody:   { padding: 14, gap: 10 },
  corrAnswersRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  corrAnswerItem:  { alignItems: 'center', gap: 4 },
  corrAnswerLabel: { fontSize: 10, fontWeight: '600', color: TEXT_MUTED },
  corrAnswerBadge: { width: 40, height: 40, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  corrAnswerLetter:{ fontSize: 18, fontWeight: '900' },
  explication:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: 10, padding: 12 },
  explicationText: { flex: 1, fontSize: 13, lineHeight: 19 },

  // Actions
  actionsBox: { paddingHorizontal: 16, marginTop: 28, gap: 10 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1.5, borderRadius: 16, paddingVertical: 16,
    backgroundColor: BG,
  },
  retryText:    { fontSize: 15, fontWeight: '800' },
  homeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 16, paddingVertical: 16,
  },
  homeBtnText:  { fontSize: 16, fontWeight: '800', color: '#FFF' },
  satHomeBtn:   { alignItems: 'center', paddingVertical: 10 },
  satHomeBtnText:{ fontSize: 13, color: TEXT_MUTED, fontWeight: '600' },
});