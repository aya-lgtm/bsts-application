/**
 * StudentSATLevelResultScreen.tsx
 * Résultat du test de niveau SAT
 * Affiche : niveau détecté + score SAT estimé + breakdown + prochaine étape
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

// ─── Types ────────────────────────────────────────────────────────────────────
type LevelKey = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
type DiffKey  = 'easy' | 'medium' | 'hard';

type BreakdownItem = { correct: number; total: number; rate: number };

type Result = {
  satLevel: LevelKey;
  score: number;
  scoreSAT: number;
  totalCorrect: number;
  totalQuestions: number;
  breakdown: {
    easy:   BreakdownItem;
    medium: BreakdownItem;
    hard:   BreakdownItem;
  };
};

type Props = {
  route: { params: { result: Result } };
  navigation: { navigate: (screen: string, params?: any) => void };
};

// ─── Config niveaux ───────────────────────────────────────────────────────────
const LEVEL_CONFIG: Record<LevelKey, {
  emoji: string; label: string; sublabel: string;
  color: string; bgColor: string; desc: string; nextStep: string;
}> = {
  BEGINNER: {
    emoji: '🌱', label: 'Débutant', sublabel: 'Tu poses les bases',
    color: '#6B7280', bgColor: '#F9FAFB',
    desc: 'Pas d\'inquiétude, tout le monde commence quelque part ! On va construire des bases solides avec des cours adaptés et des exercices progressifs.',
    nextStep: 'Cours fondamentaux  •  Questions faciles  •  Explications détaillées',
  },
  INTERMEDIATE: {
    emoji: '📘', label: 'Intermédiaire', sublabel: 'Tu as de bonnes bases',
    color: '#3B82F6', bgColor: '#EFF6FF',
    desc: 'Bon niveau de départ ! Tu maîtrises les bases, il faut maintenant consolider et passer au niveau supérieur avec des exercices ciblés.',
    nextStep: 'Mix facile + moyen  •  Entraînement ciblé  •  Montée progressive',
  },
  ADVANCED: {
    emoji: '🔥', label: 'Avancé', sublabel: 'Tu es bien parti(e)',
    color: '#F59E0B', bgColor: '#FFFBEB',
    desc: 'Excellent niveau ! Tu es au-dessus de la moyenne. Quelques entraînements ciblés sur les points difficiles et tu vises le top.',
    nextStep: 'Questions moyennes + difficiles  •  Challenges  •  Mini SAT',
  },
  EXPERT: {
    emoji: '🏆', label: 'Expert', sublabel: 'Tu es au top !',
    color: PRIMARY, bgColor: PRIMARY_LIGHT,
    desc: 'Niveau exceptionnel ! Tu es prêt(e) à viser un score parfait. On va te challenger avec les questions les plus difficiles du SAT.',
    nextStep: 'Questions difficiles uniquement  •  SAT Simulé  •  Score parfait en vue',
  },
};

// ─── Config breakdown difficulté ─────────────────────────────────────────────
const DIFF_CONFIG: Record<DiffKey, { label: string; color: string; emoji: string }> = {
  easy:   { label: 'Facile',        color: '#10B981', emoji: '🟢' },
  medium: { label: 'Intermédiaire', color: '#F59E0B', emoji: '🟡' },
  hard:   { label: 'Difficile',     color: '#EF4444', emoji: '🔴' },
};
const DIFF_KEYS: DiffKey[] = ['easy', 'medium', 'hard'];

// ─── Barre animée ─────────────────────────────────────────────────────────────
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
export default function StudentSATLevelResultScreen({ route, navigation }: Props) {
  const { result } = route.params;
  const lvl        = LEVEL_CONFIG[result.satLevel];

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(150),
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Hero niveau ── */}
        <Animated.View style={[s.hero, { backgroundColor: lvl.bgColor, opacity: fadeAnim }]}>
          <Animated.Text style={[s.heroEmoji, { transform: [{ scale: scaleAnim }] }]}>
            {lvl.emoji}
          </Animated.Text>
          <Text style={s.heroEyebrow}>TON NIVEAU SAT</Text>
          <Text style={[s.heroLevel, { color: lvl.color }]}>{lvl.label}</Text>
          <Text style={s.heroSublabel}>{lvl.sublabel}</Text>

          {/* Score SAT estimé */}
          <View style={[s.scoreBox, { borderColor: lvl.color + '30' }]}>
            <Text style={[s.scoreValue, { color: lvl.color }]}>{result.scoreSAT}</Text>
            <Text style={s.scoreLabel}>Score SAT estimé / 1600</Text>
          </View>
        </Animated.View>

        {/* ── Description ── */}
        <Animated.View style={[s.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={s.desc}>{lvl.desc}</Text>
        </Animated.View>

        {/* ── Stats globales ── */}
        <Animated.View style={[s.globalScore, { opacity: fadeAnim }]}>
          <View style={s.globalScoreItem}>
            <Text style={[s.globalScoreValue, { color: lvl.color }]}>
              {result.totalCorrect}/{result.totalQuestions}
            </Text>
            <Text style={s.globalScoreLabel}>Bonnes réponses</Text>
          </View>
          <View style={s.globalScoreDivider} />
          <View style={s.globalScoreItem}>
            <Text style={[s.globalScoreValue, { color: lvl.color }]}>{result.score}%</Text>
            <Text style={s.globalScoreLabel}>Score global</Text>
          </View>
        </Animated.View>

        {/* ── Breakdown par difficulté ── */}
        <Animated.View style={[s.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={s.sectionLabel}>DÉTAIL PAR DIFFICULTÉ</Text>
          <View style={s.breakdownCard}>
            {DIFF_KEYS.map((key, i) => {
              const data = result.breakdown[key];
              const cfg  = DIFF_CONFIG[key];
              return (
                <View key={key} style={[s.breakdownRow, i < 2 && s.breakdownRowBorder]}>
                  <View style={s.breakdownLeft}>
                    <Text style={{ fontSize: 14 }}>{cfg.emoji}</Text>
                    <Text style={s.breakdownLabel}>{cfg.label}</Text>
                  </View>
                  <View style={s.breakdownRight}>
                    <Text style={[s.breakdownScore, { color: cfg.color }]}>
                      {data.correct}/{data.total}
                    </Text>
                    <View style={s.breakdownBarWrap}>
                      <AnimatedBar value={data.rate} color={cfg.color} delay={i * 150} />
                    </View>
                    <Text style={[s.breakdownPct, { color: cfg.color }]}>{data.rate}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* ── Ce qui t'attend ── */}
        <Animated.View style={[s.section, { opacity: fadeAnim }]}>
          <Text style={s.sectionLabel}>CE QUI T'ATTEND</Text>
          <View style={[s.nextStepBox, { backgroundColor: lvl.bgColor, borderColor: lvl.color + '30' }]}>
            <Ionicons name="sparkles" size={18} color={lvl.color} />
            <Text style={[s.nextStepText, { color: lvl.color }]}>{lvl.nextStep}</Text>
          </View>
        </Animated.View>

        {/* ── Tip ── */}
        <Animated.View style={[s.tipBox, { opacity: fadeAnim }]}>
          <Ionicons name="information-circle-outline" size={16} color={TEXT_MUTED} />
          <Text style={s.tipText}>
            Tu pourras repasser ce test depuis ton profil si tu estimes avoir progressé.
          </Text>
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Footer CTA ── */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.ctaBtn, { backgroundColor: lvl.color }]}
          onPress={() => navigation.navigate('StudentSATHome')}
          activeOpacity={0.85}
        >
          <Text style={s.ctaBtnText}>Commencer ma préparation</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: CARD },
  scroll: { paddingBottom: 20 },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 70 : 54,
    paddingBottom: 36, paddingHorizontal: 24,
  },
  heroEmoji:    { fontSize: 80, marginBottom: 16 },
  heroEyebrow:  { fontSize: 11, fontWeight: '800', color: TEXT_MUTED, letterSpacing: 2, marginBottom: 8 },
  heroLevel:    { fontSize: 36, fontWeight: '900', letterSpacing: -1, marginBottom: 4 },
  heroSublabel: { fontSize: 16, color: TEXT_MUTED, fontWeight: '500', marginBottom: 24 },
  scoreBox: {
    alignItems: 'center', borderWidth: 1.5, borderRadius: 20,
    paddingVertical: 16, paddingHorizontal: 44, backgroundColor: BG,
  },
  scoreValue: { fontSize: 40, fontWeight: '900', letterSpacing: -1 },
  scoreLabel: { fontSize: 12, color: TEXT_MUTED, fontWeight: '600', marginTop: 2 },

  // Section
  section:      { paddingHorizontal: 20, marginTop: 24 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: TEXT_MUTED, letterSpacing: 1.5, marginBottom: 14 },
  desc:         { fontSize: 15, color: TEXT_MUTED, lineHeight: 24 },

  // Stats globales
  globalScore: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginTop: 20,
    backgroundColor: CARD, borderRadius: 18,
    paddingVertical: 22, borderWidth: 1, borderColor: BORDER,
  },
  globalScoreItem:    { flex: 1, alignItems: 'center' },
  globalScoreValue:   { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  globalScoreLabel:   { fontSize: 12, color: TEXT_MUTED, fontWeight: '600', marginTop: 4 },
  globalScoreDivider: { width: 1, height: 40, backgroundColor: BORDER },

  // Breakdown
  breakdownCard:      { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  breakdownRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  breakdownRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  breakdownLeft:      { flexDirection: 'row', alignItems: 'center', gap: 8, width: 120 },
  breakdownLabel:     { fontSize: 13, fontWeight: '700', color: TEXT },
  breakdownRight:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  breakdownScore:     { fontSize: 13, fontWeight: '800', width: 36 },
  breakdownBarWrap:   { flex: 1 },
  breakdownPct:       { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },

  // Next step
  nextStepBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderWidth: 1.5, borderRadius: 16, padding: 16,
  },
  nextStepText: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 22 },

  // Tip
  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: 20, marginTop: 20,
    backgroundColor: CARD, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: BORDER,
  },
  tipText: { flex: 1, fontSize: 12, color: TEXT_MUTED, lineHeight: 18 },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: BG, paddingHorizontal: 20,
    paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, paddingVertical: 18, gap: 8,
  },
  ctaBtnText: { fontSize: 17, fontWeight: '800', color: '#FFF' },
});