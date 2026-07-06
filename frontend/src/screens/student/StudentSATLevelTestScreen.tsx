/**
 * StudentSATLevelTestScreen.tsx
 * Fix : closure stale sur le timer + soumission automatique correcte
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Platform,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/auth.service';

const PRIMARY       = '#0D6B5E';
const PRIMARY_LIGHT = '#E6F3F1';
const BG            = '#FFFFFF';
const CARD          = '#FFFFFF';
const TEXT          = '#111827';
const TEXT_MUTED    = '#6B7280';
const BORDER        = '#E5E7EB';

type ChoiceLetter = 'A' | 'B' | 'C' | 'D';
type Difficulty   = 'EASY' | 'MEDIUM' | 'HARD';

type Question = {
  id: string; enonce: string;
  choixA: string; choixB?: string; choixC?: string; choixD?: string;
  difficulte: Difficulty; domaine: string;
};

type Props = {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
};

const DIFF_CONFIG: Record<Difficulty, { label: string; color: string; emoji: string; bgColor: string }> = {
  EASY:   { label: 'Facile',        color: '#10B981', emoji: '🟢', bgColor: '#ECFDF5' },
  MEDIUM: { label: 'Intermédiaire', color: '#F59E0B', emoji: '🟡', bgColor: '#FFFBEB' },
  HARD:   { label: 'Difficile',     color: '#EF4444', emoji: '🔴', bgColor: '#FEF2F2' },
};

const CHOICES: ChoiceLetter[] = ['A', 'B', 'C', 'D'];
const TIME_SECONDS = 25 * 60;

// ─── Phase INTRO ─────────────────────────────────────────────────────────────
function IntroPhase({ onStart, loading }: { onStart: () => void; loading: boolean }) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.93)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 7,   useNativeDriver: true }),
    ]).start();
  }, []);

  const STEPS = [
    { emoji: '🎯', title: '20 questions',     desc: 'Easy, Medium, Hard pour cerner ton niveau réel' },
    { emoji: '⏱️', title: '25 minutes',       desc: 'Chronomètre comme lors de l\'examen officiel' },
    { emoji: '📊', title: 'Résultat immédiat', desc: 'Ton niveau SAT personnalisé dès la fin du test' },
    { emoji: '🚀', title: 'Parcours adapté',   desc: 'Tes cours et exercices s\'adaptent à ton score' },
  ];

  const LEVELS = [
    { emoji: '🌱', label: 'Débutant',      color: '#6B7280', range: '400–800'   },
    { emoji: '📘', label: 'Intermédiaire', color: '#3B82F6', range: '800–1100'  },
    { emoji: '🔥', label: 'Avancé',        color: '#F59E0B', range: '1100–1400' },
    { emoji: '🏆', label: 'Expert',        color: PRIMARY,   range: '1400–1600' },
  ];

  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ip.scroll}>
        <Animated.View style={[ip.hero, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={ip.heroBadge}>
            <Text style={ip.heroBadgeText}>TEST DE NIVEAU OBLIGATOIRE</Text>
          </View>
          <Text style={ip.heroEmoji}>🧠</Text>
          <Text style={ip.heroTitle}>Quel est ton niveau SAT ?</Text>
          <Text style={ip.heroSub}>
            Réponds à 20 questions en 25 minutes pour qu'on adapte ton parcours à ton vrai niveau.
          </Text>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={ip.sectionLabel}>DÉROULEMENT DU TEST</Text>
          {STEPS.map((step, i) => (
            <View key={i} style={ip.stepRow}>
              <View style={ip.stepIcon}><Text style={{ fontSize: 20 }}>{step.emoji}</Text></View>
              <View style={ip.stepBody}>
                <Text style={ip.stepTitle}>{step.title}</Text>
                <Text style={ip.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={[ip.sectionLabel, { marginTop: 28 }]}>LES 4 NIVEAUX POSSIBLES</Text>
          <View style={ip.levelsGrid}>
            {LEVELS.map((lvl, i) => (
              <View key={i} style={[ip.levelCard, { borderColor: lvl.color + '40' }]}>
                <Text style={ip.levelEmoji}>{lvl.emoji}</Text>
                <Text style={[ip.levelLabel, { color: lvl.color }]}>{lvl.label}</Text>
                <Text style={ip.levelRange}>{lvl.range}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={[ip.warningBox, { opacity: fadeAnim }]}>
          <Ionicons name="timer-outline" size={18} color="#F59E0B" />
          <Text style={ip.warningText}>
            Une fois le test commencé, le chronomètre se déclenche. Si le temps s'écoule, tes réponses actuelles sont soumises automatiquement.
          </Text>
        </Animated.View>

        <View style={{ height: 140 }} />
      </ScrollView>

      <View style={ip.footer}>
        <TouchableOpacity style={ip.startBtn} onPress={onStart} disabled={loading} activeOpacity={0.85}>
          {loading
            ? <ActivityIndicator color="#FFF" />
            : <>
                <Ionicons name="timer-outline" size={20} color="#FFF" />
                <Text style={ip.startBtnText}>Commencer le test (25 min)</Text>
              </>
          }
        </TouchableOpacity>
      </View>
    </>
  );
}

const ip = StyleSheet.create({
  scroll:        { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20 },
  hero:          { alignItems: 'center', marginBottom: 36 },
  heroBadge:     { backgroundColor: '#FEF3C7', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 20 },
  heroBadgeText: { fontSize: 10, fontWeight: '800', color: '#D97706', letterSpacing: 1.2 },
  heroEmoji:     { fontSize: 72, marginBottom: 16 },
  heroTitle:     { fontSize: 26, fontWeight: '900', color: TEXT, textAlign: 'center', letterSpacing: -0.5, marginBottom: 12 },
  heroSub:       { fontSize: 14, color: TEXT_MUTED, textAlign: 'center', lineHeight: 21 },
  sectionLabel:  { fontSize: 11, fontWeight: '800', color: TEXT_MUTED, letterSpacing: 1.5, marginBottom: 16 },
  stepRow:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 14 },
  stepIcon:      { width: 46, height: 46, borderRadius: 13, backgroundColor: PRIMARY_LIGHT, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepBody:      { flex: 1, paddingTop: 4 },
  stepTitle:     { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 3 },
  stepDesc:      { fontSize: 13, color: TEXT_MUTED, lineHeight: 19 },
  levelsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  levelCard:     { width: '47%', borderRadius: 14, borderWidth: 1.5, padding: 14, alignItems: 'center', gap: 4, backgroundColor: CARD },
  levelEmoji:    { fontSize: 26, marginBottom: 4 },
  levelLabel:    { fontSize: 13, fontWeight: '800' },
  levelRange:    { fontSize: 11, color: TEXT_MUTED, fontWeight: '600' },
  warningBox:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 28, backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#FDE68A' },
  warningText:   { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 19 },
  footer:        { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: CARD, paddingHorizontal: 24, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 40 : 24, borderTopWidth: 1, borderTopColor: BORDER },
  startBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: PRIMARY, borderRadius: 16, paddingVertical: 18, gap: 10 },
  startBtnText:  { fontSize: 17, fontWeight: '800', color: '#FFF' },
});

// ─── Phase QUIZ ───────────────────────────────────────────────────────────────
type QuizPhaseProps = {
  questions: Question[];
  sessionId: string;
  onSubmitDone: (data: any) => void;
  onQuit: () => void;
};

function QuizPhase({ questions, sessionId, onSubmitDone, onQuit }: QuizPhaseProps) {
  const [current, setCurrent]     = useState(0);
  const [selected, setSelected]   = useState<ChoiceLetter | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ✅ FIX PRINCIPAL : on utilise un ref pour les réponses
  // comme ça le timer a toujours accès aux réponses à jour
  // même depuis l'intérieur du setInterval (closure stale évitée)
  const answersRef    = useRef<Record<string, string>>({});
  const selectedRef   = useRef<ChoiceLetter | null>(null);
  const currentRef    = useRef(0);
  const submittingRef = useRef(false);
  const startTimeRef  = useRef(Date.now());

  // Sync les refs à chaque render
  selectedRef.current = selected;
  currentRef.current  = current;

  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim     = useRef(new Animated.Value(1)).current;
  const slideAnim    = useRef(new Animated.Value(0)).current;
  const intervalRef  = useRef<any>(null);
  const [remaining, setRemaining]   = useState(TIME_SECONDS);
  const [timeExpired, setTimeExpired] = useState(false); // ✅ temps écoulé

  // ── Timer ──────────────────────────────
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          // ✅ Compter les réponses données
          const nbReponses = Object.keys(answersRef.current).length;
          if (nbReponses > 0) {
            // Au moins une réponse → soumettre normalement
            submitAnswers(answersRef.current);
          } else {
            // Zéro réponse → afficher écran "Temps écoulé"
            setTimeExpired(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const stopTimer = () => clearInterval(intervalRef.current);

  // ── Soumission (partagée entre "fin timer" et "dernière question") ─────────
  const submitAnswers = async (finalAnswers: Record<string, string>) => {
    if (submittingRef.current) return; // évite double soumission
    submittingRef.current = true;
    setSubmitting(true);
    stopTimer();

    const tempsTotal = Math.round((Date.now() - startTimeRef.current) / 1000);

    try {
      const { data } = await api.post('/sat/level/submit', {
        sessionId,
        reponses: finalAnswers,
        tempsTotal,
      });
      onSubmitDone(data);
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Erreur réseau. Vérifie ta connexion.';
      Alert.alert('Erreur de soumission', msg, [{ text: 'OK' }]);
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // ── Animation progression ─────────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: ((current + 1) / questions.length) * 100,
      duration: 350, useNativeDriver: false,
    }).start();
  }, [current]);

  const animateNext = useCallback(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 0,   duration: 150, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -20, duration: 150, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleNext = () => {
    if (!selected || submitting) return;
    const q = questions[current];

    // ✅ Mettre à jour le ref EN PREMIER (synchrone)
    answersRef.current = { ...answersRef.current, [q.id]: selected };
    setSelected(null);

    if (current < questions.length - 1) {
      animateNext();
      setCurrent(prev => prev + 1);
    } else {
      // Dernière question → soumettre
      submitAnswers(answersRef.current);
    }
  };

  const handleQuit = () => {
    Alert.alert(
      'Quitter le test ?',
      'Ta progression sera perdue et tu devras recommencer depuis le début.',
      [
        { text: 'Continuer le test', style: 'cancel' },
        { text: 'Quitter', style: 'destructive', onPress: () => { stopTimer(); onQuit(); } },
      ]
    );
  };

  // ── Écran Temps Écoulé ───────────────────────────────────────────────────
  if (timeExpired) {
    return (
      <View style={qz.expiredRoot}>
        <View style={qz.expiredCard}>
          {/* Icône */}
          <View style={qz.expiredIconWrap}>
            <Ionicons name="timer-outline" size={56} color="#EF4444" />
          </View>
          <Text style={qz.expiredTitle}>Temps écoulé !</Text>
          <Text style={qz.expiredDesc}>
            Tu n'as pas eu le temps de répondre. Pas de panique, réessaie en étant plus rapide !
          </Text>
          {/* Stats */}
          <View style={qz.expiredStats}>
            <View style={qz.expiredStatItem}>
              <Text style={qz.expiredStatValue}>0</Text>
              <Text style={qz.expiredStatLabel}>Réponses données</Text>
            </View>
            <View style={qz.expiredStatDivider} />
            <View style={qz.expiredStatItem}>
              <Text style={qz.expiredStatValue}>{questions.length}</Text>
              <Text style={qz.expiredStatLabel}>Questions totales</Text>
            </View>
          </View>
          {/* Bouton Réessayer */}
          <TouchableOpacity style={qz.expiredRetryBtn} onPress={onQuit} activeOpacity={0.85}>
            <Ionicons name="refresh" size={20} color="#FFF" />
            <Text style={qz.expiredRetryText}>Réessayer le test</Text>
          </TouchableOpacity>
          {/* Bouton Retour */}
          <TouchableOpacity style={qz.expiredBackBtn} onPress={onQuit} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={18} color="#6B7280" />
            <Text style={qz.expiredBackText}>Retour à l'accueil SAT</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const q         = questions[current];
  const isLast    = current === questions.length - 1;
  const diff      = DIFF_CONFIG[q.difficulte] || DIFF_CONFIG.MEDIUM;
  const mm        = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss        = String(remaining % 60).padStart(2, '0');
  const timerPct  = (remaining / TIME_SECONDS) * 100;
  const isWarning = remaining < 5 * 60;
  const isDanger  = remaining < 2 * 60;
  const timerColor = isDanger ? '#EF4444' : isWarning ? '#F59E0B' : PRIMARY;
  const pctWidth   = progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  const choiceMap: Record<ChoiceLetter, string | undefined> = {
    A: q.choixA, B: q.choixB, C: q.choixC, D: q.choixD,
  };

  return (
    <View style={qz.root}>
      {/* ── Header ── */}
      <View style={qz.header}>
        <TouchableOpacity onPress={handleQuit} style={qz.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={22} color={TEXT_MUTED} />
        </TouchableOpacity>
        <View style={qz.headerCenter}>
          <Text style={qz.headerLabel}>Test de niveau</Text>
          <View style={qz.counterRow}>
            <Text style={qz.counterCurrent}>{current + 1}</Text>
            <Text style={qz.counterTotal}> / {questions.length}</Text>
          </View>
        </View>
        <View style={[qz.timerBox, { borderColor: timerColor + '40', backgroundColor: timerColor + '12' }]}>
          <Ionicons name="timer-outline" size={13} color={timerColor} />
          <Text style={[qz.timerText, { color: timerColor }]}>{mm}:{ss}</Text>
        </View>
      </View>

      {/* ── Barres ── */}
      <View style={qz.progressTrack}>
        <Animated.View style={[qz.progressFill, { width: pctWidth }]} />
      </View>
      <View style={[qz.timerTrack, { backgroundColor: timerColor + '20' }]}>
        <View style={[qz.timerFill, { width: `${timerPct}%` as any, backgroundColor: timerColor }]} />
      </View>

      {/* ── Pastilles étapes ── */}
      <View style={qz.stepsRow}>
        {questions.map((_, i) => (
          <View key={i} style={[
            qz.stepDot,
            i < current   && qz.stepDotDone,
            i === current && qz.stepDotActive,
          ]} />
        ))}
      </View>

      {/* ── Question ── */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          <View style={qz.metaRow}>
            <View style={[qz.diffBadge, { backgroundColor: diff.bgColor }]}>
              <Text style={{ fontSize: 11 }}>{diff.emoji}</Text>
              <Text style={[qz.diffLabel, { color: diff.color }]}>{diff.label}</Text>
            </View>
            <View style={qz.domainBadge}>
              <Ionicons name="library-outline" size={11} color={PRIMARY} />
              <Text style={qz.domainText}>{q.domaine}</Text>
            </View>
          </View>

          <View style={qz.questionCard}>
            <Text style={qz.questionText}>{q.enonce}</Text>
          </View>

          <View style={qz.choices}>
            {CHOICES.map(letter => {
              const label = choiceMap[letter];
              if (!label) return null;
              const isSelected = selected === letter;
              return (
                <TouchableOpacity
                  key={letter}
                  style={[qz.choice, isSelected && qz.choiceSelected]}
                  onPress={() => setSelected(letter)}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  <View style={[qz.letterBox, isSelected && qz.letterBoxSelected]}>
                    <Text style={[qz.letterText, isSelected && { color: '#FFF' }]}>{letter}</Text>
                  </View>
                  <Text style={[qz.choiceLabel, isSelected && qz.choiceLabelSelected]} numberOfLines={3}>
                    {label}
                  </Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[qz.nextBtn, (!selected || submitting) && qz.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!selected || submitting}
            activeOpacity={0.85}
          >
            {submitting && isLast
              ? <ActivityIndicator color="#FFF" />
              : <>
                  <Text style={[qz.nextBtnText, !selected && { color: TEXT_MUTED }]}>
                    {isLast ? 'Voir mon résultat' : 'Question suivante'}
                  </Text>
                  <Ionicons
                    name={isLast ? 'trophy' : 'arrow-forward'}
                    size={18}
                    color={selected && !submitting ? '#FFF' : TEXT_MUTED}
                  />
                </>
            }
          </TouchableOpacity>

        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Overlay de soumission */}
      {submitting && (
        <View style={qz.submittingOverlay}>
          <View style={qz.submittingCard}>
            <ActivityIndicator size="large" color={PRIMARY} />
            <Text style={qz.submittingText}>Calcul de ton niveau...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const qz = StyleSheet.create({
  root:          { flex: 1, backgroundColor: BG },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 12 },
  closeBtn:      { padding: 4 },
  headerCenter:  { flex: 1, alignItems: 'center' },
  headerLabel:   { fontSize: 11, color: TEXT_MUTED, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  counterRow:    { flexDirection: 'row', alignItems: 'baseline' },
  counterCurrent:{ fontSize: 22, fontWeight: '900', color: PRIMARY },
  counterTotal:  { fontSize: 16, fontWeight: '400', color: TEXT_MUTED },
  timerBox:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  timerText:     { fontSize: 14, fontWeight: '800' },
  progressTrack: { height: 4, backgroundColor: BORDER },
  progressFill:  { height: 4, backgroundColor: PRIMARY, borderRadius: 2 },
  timerTrack:    { height: 3 },
  timerFill:     { height: 3 },
  stepsRow:      { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingVertical: 10, gap: 4, backgroundColor: CARD },
  stepDot:       { flex: 1, minWidth: 8, height: 4, borderRadius: 2, backgroundColor: BORDER },
  stepDotDone:   { backgroundColor: PRIMARY_LIGHT },
  stepDotActive: { backgroundColor: PRIMARY },
  metaRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  diffBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  diffLabel:     { fontSize: 11, fontWeight: '700' },
  domainBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: PRIMARY_LIGHT },
  domainText:    { fontSize: 11, fontWeight: '700', color: PRIMARY },
  questionCard:  { marginHorizontal: 16, backgroundColor: CARD, borderRadius: 18, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  questionText:  { fontSize: 16, fontWeight: '600', color: TEXT, lineHeight: 26 },
  choices:       { paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  choice:        { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 14, padding: 14, gap: 12, borderWidth: 1.5, borderColor: BORDER },
  choiceSelected:{ borderColor: PRIMARY, backgroundColor: PRIMARY_LIGHT },
  letterBox:         { width: 36, height: 36, borderRadius: 10, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: BORDER, flexShrink: 0 },
  letterBoxSelected: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  letterText:          { fontSize: 14, fontWeight: '800', color: TEXT_MUTED },
  choiceLabel:         { flex: 1, fontSize: 14, fontWeight: '500', color: TEXT, lineHeight: 20 },
  choiceLabelSelected: { color: PRIMARY, fontWeight: '700' },
  nextBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, backgroundColor: PRIMARY, borderRadius: 16, paddingVertical: 17, gap: 8 },
  nextBtnDisabled: { backgroundColor: BORDER },
  nextBtnText:     { fontSize: 16, fontWeight: '800', color: '#FFF' },
  submittingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  submittingCard:    { backgroundColor: CARD, borderRadius: 20, padding: 32, alignItems: 'center', gap: 16 },
  submittingText:    { fontSize: 16, fontWeight: '700', color: TEXT },

  // ── Temps écoulé ──
  expiredRoot:      { flex: 1, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', padding: 24 },
  expiredCard:      { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 32, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  expiredIconWrap:  { width: 96, height: 96, borderRadius: 48, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  expiredTitle:     { fontSize: 26, fontWeight: '900', color: '#EF4444', marginBottom: 12, letterSpacing: -0.5 },
  expiredDesc:      { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  expiredStats:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFB', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 8, width: '100%', marginBottom: 28 },
  expiredStatItem:  { flex: 1, alignItems: 'center' },
  expiredStatValue: { fontSize: 28, fontWeight: '900', color: '#111827' },
  expiredStatLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600', marginTop: 4, textAlign: 'center' },
  expiredStatDivider: { width: 1, height: 36, backgroundColor: '#E5E7EB' },
  expiredRetryBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D6B5E', borderRadius: 16, paddingVertical: 16, width: '100%', gap: 10, marginBottom: 12 },
  expiredRetryText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  expiredBackBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  expiredBackText:  { fontSize: 14, color: '#6B7280', fontWeight: '600' },
});

// ─── Écran principal ──────────────────────────────────────────────────────────
export default function StudentSATLevelTestScreen({ navigation }: Props) {
  const [phase, setPhase]           = useState<'intro' | 'quiz'>('intro');
  const [loading, setLoading]       = useState(false);
  const [questions, setQuestions]   = useState<Question[]>([]);
  const [sessionId, setSessionId]   = useState<string>('');
  const [quizReady, setQuizReady]   = useState(false); // ✅ évite le mount prématuré

  const handleStart = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/sat/level/start');
      if (!data.questions || data.questions.length === 0) {
        Alert.alert(
          'Aucune question disponible',
          'Les questions du test ne sont pas encore disponibles. Contacte un administrateur.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }
      // ✅ On set tout AVANT de changer la phase
      // pour que QuizPhase reçoive les bonnes valeurs dès son premier render
      setQuestions(data.questions);
      setSessionId(data.session.id);
      setQuizReady(true);
      setPhase('quiz');
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Impossible de charger le test. Vérifie ta connexion.';
      Alert.alert('Erreur', msg, [{ text: 'Retour', onPress: () => navigation.goBack() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDone = (data: any) => {
    navigation.navigate('StudentSATLevelResult', { result: data });
  };

  return (
    <View style={s.root}>
      {phase === 'intro' && (
        <View style={s.introHeader}>
          <TouchableOpacity
            onPress={navigation.goBack}
            style={s.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={TEXT} />
          </TouchableOpacity>
          <Text style={s.introHeaderTitle}>Test de niveau SAT</Text>
          <View style={{ width: 34 }} />
        </View>
      )}

      {phase === 'intro' && (
        <IntroPhase onStart={handleStart} loading={loading} />
      )}

      {/* ✅ QuizPhase monté UNE SEULE FOIS quand tout est prêt */}
      {phase === 'quiz' && quizReady && questions.length > 0 && sessionId !== '' && (
        <QuizPhase
          key={sessionId} // ← key stable = pas de re-mount
          questions={questions}
          sessionId={sessionId}
          onSubmitDone={handleSubmitDone}
          onQuit={() => navigation.goBack()}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  introHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn:          { padding: 4 },
  introHeaderTitle: { fontSize: 16, fontWeight: '800', color: TEXT },
});