/**
 * StudentSATUnitTestScreen.tsx
 * Utilisé pour : SAT Blanc d'unité ET sessions rapides (Quiz rapide, Exercices, SAT Simulé, Mes erreurs)
 * Si sessionOverride est passé → utilise la session déjà créée
 * Sinon → crée une nouvelle session MINI pour l'unité
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

type Unit = { id: string; titre: string; domaine: string; niveau: string };

type Props = {
  route: {
    params: {
      unit: Unit;
      sessionOverride?: {
        sessionId: string;
        questions: Question[];
        timeMinutes?: number;
      };
    };
  };
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
};

const DIFF_CONFIG: Record<Difficulty, { label: string; color: string; emoji: string }> = {
  EASY:   { label: 'Facile',        color: '#10B981', emoji: '🟢' },
  MEDIUM: { label: 'Intermédiaire', color: '#F59E0B', emoji: '🟡' },
  HARD:   { label: 'Difficile',     color: '#EF4444', emoji: '🔴' },
};

const DOMAIN_COLOR: Record<string, string> = {
  MATH: '#0D6B5E', READING: '#7C3AED', WRITING: '#EC4899',
  ALL: '#0D6B5E', MATH_READING: '#3B82F6',
};

const CHOICES: ChoiceLetter[] = ['A', 'B', 'C', 'D'];
const DEFAULT_QUESTIONS = 20;
const DEFAULT_TIME      = 25; // minutes

function useTimer(totalSeconds: number, onEnd: () => void) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const intervalRef  = useRef<any>(null);
  const endCalledRef = useRef(false);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          if (!endCalledRef.current) { endCalledRef.current = true; onEnd(); }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const stop = () => clearInterval(intervalRef.current);
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const pct       = (remaining / totalSeconds) * 100;
  const isWarning = remaining < 5 * 60;
  const isDanger  = remaining < 2 * 60;
  return { display: `${mm}:${ss}`, pct, isWarning, isDanger, stop };
}

// ── Question Card ──────────────────────────────────────────────────────────────
function QuestionCard({ question, selected, onSelect, onNext, isLast, submitting, domainColor, fadeAnim, slideAnim }: {
  question: Question; selected: ChoiceLetter | null;
  onSelect: (l: ChoiceLetter) => void; onNext: () => void;
  isLast: boolean; submitting: boolean; domainColor: string;
  fadeAnim: Animated.Value; slideAnim: Animated.Value;
}) {
  const diff = DIFF_CONFIG[question.difficulte] || DIFF_CONFIG.EASY;
  const choiceMap: Record<ChoiceLetter, string | undefined> = {
    A: question.choixA, B: question.choixB, C: question.choixC, D: question.choixD,
  };

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View style={qc.metaRow}>
        <View style={[qc.diffBadge, { backgroundColor: diff.color + '18' }]}>
          <Text style={{ fontSize: 11 }}>{diff.emoji}</Text>
          <Text style={[qc.diffLabel, { color: diff.color }]}>{diff.label}</Text>
        </View>
        <View style={[qc.domainBadge, { backgroundColor: domainColor + '18' }]}>
          <Text style={[qc.domainText, { color: domainColor }]}>{question.domaine}</Text>
        </View>
      </View>
      <View style={qc.card}>
        <Text style={qc.enonce}>{question.enonce}</Text>
      </View>
      <View style={qc.choices}>
        {CHOICES.map(letter => {
          const label = choiceMap[letter];
          if (!label) return null;
          const isSelected = selected === letter;
          return (
            <TouchableOpacity key={letter}
              style={[qc.choice, isSelected && { borderColor: domainColor, backgroundColor: domainColor + '0D' }]}
              onPress={() => onSelect(letter)} activeOpacity={0.7}
            >
              <View style={[qc.letterBox, isSelected && { backgroundColor: domainColor, borderColor: domainColor }]}>
                <Text style={[qc.letterText, isSelected && { color: '#FFF' }]}>{letter}</Text>
              </View>
              <Text style={[qc.choiceLabel, isSelected && { color: domainColor, fontWeight: '700' }]} numberOfLines={3}>{label}</Text>
              {isSelected && <Ionicons name="checkmark-circle" size={20} color={domainColor} />}
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity
        style={[qc.nextBtn, { backgroundColor: selected ? domainColor : BORDER }]}
        onPress={onNext} disabled={!selected || submitting} activeOpacity={0.85}
      >
        {submitting && isLast ? <ActivityIndicator color="#FFF" /> : (
          <>
            <Text style={[qc.nextBtnText, !selected && { color: TEXT_MUTED }]}>
              {isLast ? 'Terminer le test' : 'Question suivante'}
            </Text>
            <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={18} color={selected ? '#FFF' : TEXT_MUTED} />
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const qc = StyleSheet.create({
  metaRow:    { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  diffBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  diffLabel:  { fontSize: 11, fontWeight: '700' },
  domainBadge:{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  domainText: { fontSize: 11, fontWeight: '700' },
  card:       { marginHorizontal: 16, backgroundColor: CARD, borderRadius: 18, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  enonce:     { fontSize: 16, fontWeight: '600', color: TEXT, lineHeight: 26 },
  choices:    { paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  choice:     { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 14, padding: 14, gap: 12, borderWidth: 1.5, borderColor: BORDER },
  letterBox:  { width: 36, height: 36, borderRadius: 10, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: BORDER, flexShrink: 0 },
  letterText: { fontSize: 14, fontWeight: '800', color: TEXT_MUTED },
  choiceLabel:{ flex: 1, fontSize: 14, fontWeight: '500', color: TEXT, lineHeight: 20 },
  nextBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, borderRadius: 16, paddingVertical: 17, gap: 8, marginBottom: 24 },
  nextBtnText:{ fontSize: 16, fontWeight: '800', color: '#FFF' },
});

// ── Écran principal ────────────────────────────────────────────────────────────
export default function StudentSATUnitTestScreen({ route, navigation }: Props) {
  const { unit, sessionOverride } = route.params;

  const domainColor   = DOMAIN_COLOR[unit.domaine] || PRIMARY;
  const timeMinutes   = sessionOverride?.timeMinutes ?? DEFAULT_TIME;

  const [loading, setLoading]       = useState(!sessionOverride);
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions]   = useState<Question[]>(sessionOverride?.questions || []);
  const [sessionId, setSessionId]   = useState<string | null>(sessionOverride?.sessionId || null);
  const [current, setCurrent]       = useState(0);
  const [selected, setSelected]     = useState<ChoiceLetter | null>(null);
  const [answers, setAnswers]       = useState<Record<string, string>>({});
  const startTimeRef                = useRef(Date.now());

  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim     = useRef(new Animated.Value(1)).current;
  const slideAnim    = useRef(new Animated.Value(0)).current;

  const { display: timerDisplay, pct: timerPct, isWarning, isDanger, stop: stopTimer } = useTimer(
    timeMinutes * 60,
    () => handleSubmit(answers),
  );

  // Charger session si pas de sessionOverride
  useEffect(() => {
    if (sessionOverride) return;
    (async () => {
      try {
        const { data } = await api.post('/sat/sessions/start', {
          mode: 'MINI', domaine: unit.domaine, totalQuestions: DEFAULT_QUESTIONS,
        });
        if (!data.questions?.length) {
          Alert.alert('Pas encore de questions', 'Pas assez de questions pour ce domaine.', [
            { text: 'Retour', onPress: () => navigation.goBack() }
          ]);
          return;
        }
        setQuestions(data.questions);
        setSessionId(data.session.id);
      } catch {
        Alert.alert('Erreur', 'Impossible de démarrer le test.', [
          { text: 'Retour', onPress: () => navigation.goBack() }
        ]);
      } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!questions.length) return;
    Animated.timing(progressAnim, {
      toValue: ((current + 1) / questions.length) * 100,
      duration: 350, useNativeDriver: false,
    }).start();
  }, [current, questions.length]);

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

  const handleNext = async () => {
    if (!selected) return;
    const q = questions[current];
    const newAnswers = { ...answers, [q.id]: selected };
    setAnswers(newAnswers);
    setSelected(null);
    if (current < questions.length - 1) { animateNext(); setCurrent(p => p + 1); }
    else { await handleSubmit(newAnswers); }
  };

  const handleSubmit = async (finalAnswers: Record<string, string>) => {
    if (!sessionId || submitting) return;
    stopTimer();
    setSubmitting(true);
    const tempsTotal = Math.round((Date.now() - startTimeRef.current) / 1000);
    try {
      const { data } = await api.post(`/sat/sessions/${sessionId}/submit`, {
        reponses: finalAnswers, tempsTotal,
      });
      navigation.navigate('StudentSATUnitResult', {
        result: { ...data, unitTitre: unit.titre, domaine: unit.domaine },
        unit,
      });
    } catch {
      Alert.alert('Erreur', 'Impossible de soumettre le test.');
    } finally { setSubmitting(false); }
  };

  const handleQuit = () => {
    Alert.alert('Quitter le test ?', 'Ta progression sera perdue.',
      [
        { text: 'Continuer', style: 'cancel' },
        { text: 'Quitter', style: 'destructive', onPress: () => { stopTimer(); navigation.goBack(); } },
      ]
    );
  };

  if (loading) {
    return (
      <View style={s.loadingView}>
        <ActivityIndicator size="large" color={domainColor} />
        <Text style={s.loadingText}>Préparation du test...</Text>
      </View>
    );
  }

  const q = questions[current];
  if (!q) return null;

  const timerColor = isDanger ? '#EF4444' : isWarning ? '#F59E0B' : domainColor;
  const pctWidth   = progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleQuit} style={s.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={22} color={TEXT_MUTED} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerUnit} numberOfLines={1}>{unit.titre}</Text>
          <View style={s.counterRow}>
            <Text style={[s.counterCurrent, { color: domainColor }]}>{current + 1}</Text>
            <Text style={s.counterTotal}> / {questions.length}</Text>
          </View>
        </View>
        <View style={[s.timerBox, { borderColor: timerColor + '40', backgroundColor: timerColor + '12' }]}>
          <Ionicons name="timer-outline" size={13} color={timerColor} />
          <Text style={[s.timerText, { color: timerColor }]}>{timerDisplay}</Text>
        </View>
      </View>

      {/* Barres */}
      <View style={s.progressTrack}>
        <Animated.View style={[s.progressFill, { width: pctWidth, backgroundColor: domainColor }]} />
      </View>
      <View style={[s.timerTrack, { backgroundColor: timerColor + '20' }]}>
        <View style={[s.timerFill, { width: `${timerPct}%` as any, backgroundColor: timerColor }]} />
      </View>

      {/* Pastilles */}
      <View style={s.stepsRow}>
        {questions.map((_, i) => (
          <View key={i} style={[
            s.stepDot,
            i < current   && { backgroundColor: domainColor + '50' },
            i === current && { backgroundColor: domainColor },
          ]} />
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <QuestionCard
          question={q} selected={selected} onSelect={setSelected}
          onNext={handleNext} isLast={current === questions.length - 1}
          submitting={submitting} domainColor={domainColor}
          fadeAnim={fadeAnim} slideAnim={slideAnim}
        />
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: BG },
  loadingView: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: BG },
  loadingText: { fontSize: 14, color: TEXT_MUTED, fontWeight: '600' },
  header:      { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 12 },
  closeBtn:    { padding: 4 },
  headerCenter:{ flex: 1, alignItems: 'center' },
  headerUnit:  { fontSize: 11, fontWeight: '600', color: TEXT_MUTED },
  counterRow:  { flexDirection: 'row', alignItems: 'baseline' },
  counterCurrent: { fontSize: 20, fontWeight: '900' },
  counterTotal:   { fontSize: 15, color: TEXT_MUTED },
  timerBox:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  timerText:   { fontSize: 14, fontWeight: '800' },
  progressTrack: { height: 3, backgroundColor: BORDER },
  progressFill:  { height: 3 },
  timerTrack:  { height: 2 },
  timerFill:   { height: 2 },
  stepsRow:    { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingVertical: 8, gap: 4, backgroundColor: CARD },
  stepDot:     { flex: 1, minWidth: 8, height: 4, borderRadius: 2, backgroundColor: BORDER },
});