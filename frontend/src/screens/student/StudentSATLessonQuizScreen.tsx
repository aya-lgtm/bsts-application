/**
 * StudentSATLessonQuizScreen.tsx
 * Quiz lié à une leçon — questions une par une
 * Après soumission : affiche les corrections avec explications
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/auth.service';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const PRIMARY       = '#0D6B5E';
const PRIMARY_LIGHT = '#E6F3F1';
const BG            = '#F8FAFB';
const CARD          = '#FFFFFF';
const TEXT          = '#111827';
const TEXT_MUTED    = '#6B7280';
const BORDER        = '#E5E7EB';
const SUCCESS       = '#16A34A';
const SUCCESS_LIGHT = '#DCFCE7';
const DANGER        = '#EF4444';
const DANGER_LIGHT  = '#FEF2F2';

// ─── Types ────────────────────────────────────────────────────────────────────
type ChoiceLetter = 'A' | 'B' | 'C' | 'D';

type QuizQuestion = {
  id: string;
  enonce: string;
  choixA: string;
  choixB?: string;
  choixC?: string;
  choixD?: string;
};

type Correction = {
  reponseEleve: string;
  bonneReponse: string;
  estCorrecte: boolean;
  explication?: string;
};

type LessonDetail = {
  id: string;
  titre: string;
};

type Unit = {
  id: string;
  titre: string;
  domaine: 'MATH' | 'READING' | 'WRITING';
};

type Props = {
  route: { params: { lesson: LessonDetail; unit: Unit } };
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
};

const DOMAIN_COLOR: Record<string, string> = {
  MATH:    '#3B82F6',
  READING: '#7C3AED',
  WRITING: '#EC4899',
};

const CHOICES: ChoiceLetter[] = ['A', 'B', 'C', 'D'];

// ─── Phase 1 : Quiz question par question ─────────────────────────────────────
type QuizPhaseProps = {
  questions: QuizQuestion[];
  domainColor: string;
  onSubmit: (reponses: Record<string, string>) => void;
  submitting: boolean;
};

function QuizPhase({ questions, domainColor, onSubmit, submitting }: QuizPhaseProps) {
  const [current, setCurrent]   = useState(0);
  const [selected, setSelected] = useState<ChoiceLetter | null>(null);
  const [answers, setAnswers]   = useState<Record<string, string>>({});

  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: ((current + 1) / questions.length) * 100,
      duration: 350,
      useNativeDriver: false,
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
    if (!selected) return;
    const q = questions[current];
    const newAnswers = { ...answers, [q.id]: selected };
    setAnswers(newAnswers);
    setSelected(null);

    if (current < questions.length - 1) {
      animateNext();
      setCurrent(prev => prev + 1);
    } else {
      onSubmit(newAnswers);
    }
  };

  const q = questions[current];
  const isLast = current === questions.length - 1;

  const choiceMap: Record<ChoiceLetter, string | undefined> = {
    A: q.choixA,
    B: q.choixB,
    C: q.choixC,
    D: q.choixD,
  };

  const progressPct = progressAnim.interpolate({
    inputRange: [0, 100], outputRange: ['0%', '100%'],
  });

  return (
    <View style={qp.root}>
      {/* Progression */}
      <View style={qp.topBar}>
        <View style={qp.stepsRow}>
          {questions.map((_, i) => (
            <View
              key={i}
              style={[
                qp.stepDot,
                i < current    && { backgroundColor: domainColor + '50' },
                i === current  && { backgroundColor: domainColor },
              ]}
            />
          ))}
        </View>
        <View style={qp.progressTrack}>
          <Animated.View style={[qp.progressFill, { width: progressPct, backgroundColor: domainColor }]} />
        </View>
        <Text style={qp.counter}>
          <Text style={[qp.counterCurrent, { color: domainColor }]}>{current + 1}</Text>
          <Text style={qp.counterTotal}> / {questions.length}</Text>
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={qp.scroll} keyboardShouldPersistTaps="handled">
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Question */}
          <View style={qp.questionCard}>
            <Text style={qp.questionText}>{q.enonce}</Text>
          </View>

          {/* Choix */}
          <View style={qp.choicesWrap}>
            {CHOICES.map((letter) => {
              const label = choiceMap[letter];
              if (!label) return null;
              const isSelected = selected === letter;
              return (
                <TouchableOpacity
                  key={letter}
                  style={[
                    qp.choice,
                    isSelected && { borderColor: domainColor, backgroundColor: domainColor + '10' },
                  ]}
                  onPress={() => setSelected(letter)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    qp.letterBox,
                    isSelected && { backgroundColor: domainColor, borderColor: domainColor },
                  ]}>
                    <Text style={[qp.letterText, isSelected && { color: '#FFF' }]}>{letter}</Text>
                  </View>
                  <Text style={[qp.choiceLabel, isSelected && { color: domainColor, fontWeight: '700' }]} numberOfLines={3}>
                    {label}
                  </Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color={domainColor} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Bouton suivant */}
          <TouchableOpacity
            style={[qp.nextBtn, { backgroundColor: selected ? domainColor : BORDER }]}
            onPress={handleNext}
            disabled={!selected || submitting}
            activeOpacity={0.85}
          >
            {submitting && isLast
              ? <ActivityIndicator color="#FFF" />
              : <>
                  <Text style={[qp.nextBtnText, !selected && { color: TEXT_MUTED }]}>
                    {isLast ? 'Terminer le quiz' : 'Question suivante'}
                  </Text>
                  <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={18} color={selected ? '#FFF' : TEXT_MUTED} />
                </>
            }
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const qp = StyleSheet.create({
  root:   { flex: 1 },
  topBar: { backgroundColor: CARD, paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  stepsRow: { flexDirection: 'row', gap: 4 },
  stepDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: BORDER },
  progressTrack: { height: 3, backgroundColor: BORDER, borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: 3, borderRadius: 2 },
  counter:        { textAlign: 'right' },
  counterCurrent: { fontSize: 18, fontWeight: '900' },
  counterTotal:   { fontSize: 14, color: TEXT_MUTED },
  scroll:        { padding: 16, paddingBottom: 40 },
  questionCard:  { backgroundColor: CARD, borderRadius: 18, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  questionText:  { fontSize: 16, fontWeight: '600', color: TEXT, lineHeight: 26 },
  choicesWrap:   { gap: 10, marginBottom: 24 },
  choice: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 14, padding: 14, gap: 12, borderWidth: 1.5, borderColor: BORDER },
  letterBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: BORDER, flexShrink: 0 },
  letterText:  { fontSize: 14, fontWeight: '800', color: TEXT_MUTED },
  choiceLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: TEXT, lineHeight: 20 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 17, gap: 8 },
  nextBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
});

// ─── Phase 2 : Résultats + corrections ───────────────────────────────────────
type ResultPhaseProps = {
  score: number;
  correct: number;
  total: number;
  corrections: Record<string, Correction>;
  questions: QuizQuestion[];
  domainColor: string;
  onRetry: () => void;
  onContinue: () => void;
};

function ResultPhase({ score, correct, total, corrections, questions, domainColor, onRetry, onContinue }: ResultPhaseProps) {
  const isPassed = score >= 60;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={rp.scroll}>

      {/* Score hero */}
      <Animated.View style={[rp.hero, { opacity: fadeAnim, backgroundColor: isPassed ? SUCCESS_LIGHT : DANGER_LIGHT }]}>
        <Animated.Text style={[rp.heroEmoji, { transform: [{ scale: scaleAnim }] }]}>
          {isPassed ? '🎉' : '💪'}
        </Animated.Text>
        <Text style={[rp.heroTitle, { color: isPassed ? SUCCESS : DANGER }]}>
          {isPassed ? 'Bravo !' : 'Continue !'}
        </Text>
        <Text style={rp.heroSub}>
          {isPassed
            ? 'Quiz réussi ! La leçon suivante est déverrouillée 🔓'
            : `Score minimum requis : 60% — Relis la leçon et réessaie !`}
        </Text>
        <View style={[rp.scoreBox, { borderColor: (isPassed ? SUCCESS : DANGER) + '30' }]}>
          <Text style={[rp.scoreValue, { color: isPassed ? SUCCESS : DANGER }]}>{score}%</Text>
          <Text style={rp.scoreLabel}>{correct}/{total} bonnes réponses</Text>
        </View>
      </Animated.View>

      {/* Corrections */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={rp.sectionTitle}>CORRECTIONS</Text>

        {questions.map((q, i) => {
          const corr = corrections[q.id];
          if (!corr) return null;
          const isOk = corr.estCorrecte;

          const choiceMap: Record<string, string | undefined> = {
            A: q.choixA, B: q.choixB, C: q.choixC, D: q.choixD,
          };

          return (
            <View key={q.id} style={[rp.corrCard, { borderColor: isOk ? '#BBF7D0' : '#FECACA' }]}>
              {/* En-tête */}
              <View style={[rp.corrHeader, { backgroundColor: isOk ? SUCCESS_LIGHT : DANGER_LIGHT }]}>
                <View style={rp.corrHeaderLeft}>
                  <Ionicons
                    name={isOk ? 'checkmark-circle' : 'close-circle'}
                    size={18}
                    color={isOk ? SUCCESS : DANGER}
                  />
                  <Text style={[rp.corrStatus, { color: isOk ? SUCCESS : DANGER }]}>
                    {isOk ? 'Correct' : 'Incorrect'}
                  </Text>
                </View>
                <Text style={rp.corrIndex}>Q{i + 1}</Text>
              </View>

              <View style={rp.corrBody}>
                {/* Énoncé */}
                <Text style={rp.corrQuestion}>{q.enonce}</Text>

                {/* Réponses */}
                {CHOICES.map(letter => {
                  const label = choiceMap[letter];
                  if (!label) return null;
                  const isCorrectAnswer = letter === corr.bonneReponse;
                  const isUserAnswer    = letter === corr.reponseEleve;
                  const showCorrect     = isCorrectAnswer;
                  const showWrong       = isUserAnswer && !isOk;

                  return (
                    <View key={letter} style={[
                      rp.corrChoice,
                      showCorrect && rp.corrChoiceCorrect,
                      showWrong   && rp.corrChoiceWrong,
                    ]}>
                      <View style={[
                        rp.corrLetter,
                        showCorrect && { backgroundColor: SUCCESS, borderColor: SUCCESS },
                        showWrong   && { backgroundColor: DANGER,  borderColor: DANGER  },
                      ]}>
                        <Text style={[rp.corrLetterText, (showCorrect || showWrong) && { color: '#FFF' }]}>
                          {letter}
                        </Text>
                      </View>
                      <Text style={[
                        rp.corrChoiceLabel,
                        showCorrect && { color: SUCCESS, fontWeight: '700' },
                        showWrong   && { color: DANGER,  fontWeight: '700' },
                      ]} numberOfLines={3}>
                        {label}
                      </Text>
                      {showCorrect && <Ionicons name="checkmark-circle" size={16} color={SUCCESS} />}
                      {showWrong   && <Ionicons name="close-circle"     size={16} color={DANGER}  />}
                    </View>
                  );
                })}

                {/* Explication */}
                {corr.explication && (
                  <View style={[rp.explication, { borderColor: domainColor + '30', backgroundColor: domainColor + '08' }]}>
                    <Ionicons name="bulb-outline" size={15} color={domainColor} />
                    <Text style={[rp.explicationText, { color: domainColor }]}>{corr.explication}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </Animated.View>

      {/* Boutons */}
      <Animated.View style={[rp.btnRow, { opacity: fadeAnim }]}>
        {!isPassed && (
          <TouchableOpacity style={rp.retryBtn} onPress={onRetry} activeOpacity={0.8}>
            <Ionicons name="refresh" size={18} color={domainColor} />
            <Text style={[rp.retryText, { color: domainColor }]}>Réessayer</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[rp.continueBtn, { backgroundColor: domainColor, flex: isPassed ? 1 : undefined }]}
          onPress={onContinue}
          activeOpacity={0.85}
        >
          <Text style={rp.continueBtnText}>{isPassed ? 'Leçon suivante →' : 'Retour à la leçon'}</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const rp = StyleSheet.create({
  scroll: { paddingBottom: 20 },
  hero:   { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 8 },
  heroEmoji: { fontSize: 64, marginBottom: 8 },
  heroTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  heroSub:   { fontSize: 14, color: TEXT_MUTED, fontWeight: '500' },
  scoreBox:  { alignItems: 'center', borderWidth: 1.5, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 36, backgroundColor: CARD, marginTop: 8 },
  scoreValue:{ fontSize: 38, fontWeight: '900', letterSpacing: -1 },
  scoreLabel:{ fontSize: 13, color: TEXT_MUTED, fontWeight: '600', marginTop: 2 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: TEXT_MUTED, letterSpacing: 1.5, marginHorizontal: 16, marginTop: 24, marginBottom: 12 },
  corrCard:  { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, borderWidth: 1.5, overflow: 'hidden', backgroundColor: CARD },
  corrHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  corrHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  corrStatus:{ fontSize: 13, fontWeight: '800' },
  corrIndex: { fontSize: 12, fontWeight: '700', color: TEXT_MUTED },
  corrBody:  { padding: 14, gap: 8 },
  corrQuestion: { fontSize: 14, fontWeight: '600', color: TEXT, lineHeight: 21, marginBottom: 4 },
  corrChoice: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 10, gap: 10, borderWidth: 1, borderColor: BORDER, backgroundColor: BG },
  corrChoiceCorrect: { borderColor: '#BBF7D0', backgroundColor: SUCCESS_LIGHT },
  corrChoiceWrong:   { borderColor: '#FECACA', backgroundColor: DANGER_LIGHT },
  corrLetter: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: BORDER, backgroundColor: CARD, flexShrink: 0 },
  corrLetterText:  { fontSize: 13, fontWeight: '800', color: TEXT_MUTED },
  corrChoiceLabel: { flex: 1, fontSize: 13, fontWeight: '500', color: TEXT, lineHeight: 18 },
  explication: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 4 },
  explicationText: { flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 19 },
  btnRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 20 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 20, borderWidth: 1.5, borderColor: BORDER, backgroundColor: CARD },
  retryText: { fontSize: 15, fontWeight: '800' },
  continueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 20 },
  continueBtnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
});

// ─── Écran principal ──────────────────────────────────────────────────────────
export default function StudentSATLessonQuizScreen({ route, navigation }: Props) {
  const { lesson, unit } = route.params;
  const domainColor = DOMAIN_COLOR[unit.domaine] || PRIMARY;

  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions]   = useState<QuizQuestion[]>([]);
  const [phase, setPhase]           = useState<'quiz' | 'result'>('quiz');
  const [result, setResult]         = useState<{
    score: number; correct: number; total: number;
    corrections: Record<string, Correction>;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/sat/lessons/${lesson.id}/quiz`);
        setQuestions(data.questions || []);
      } catch {
        Alert.alert('Erreur', 'Impossible de charger le quiz.', [
          { text: 'Retour', onPress: () => navigation.goBack() },
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, [lesson.id]);

  const handleSubmit = async (reponses: Record<string, string>) => {
    setSubmitting(true);
    try {
      const { data } = await api.post(`/sat/lessons/${lesson.id}/quiz/submit`, { reponses });
      setResult({
        score:       data.score,
        correct:     data.correct,
        total:       data.total,
        corrections: data.corrections,
      });
      setPhase('result');
    } catch {
      Alert.alert('Erreur', 'Impossible de soumettre le quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setPhase('quiz');
    setResult(null);
  };

  const handleContinue = () => {
    if (result && result.score >= 60) {
      // ✅ Quiz réussi → retour à l'unité pour voir la leçon suivante déverrouillée
      navigation.navigate('StudentSATUnit', { unit });
    } else {
      // ❌ Quiz échoué → retour à la leçon pour réviser
      navigation.goBack();
    }
  };

  if (loading) {
    return (
      <View style={s.loadingView}>
        <ActivityIndicator size="large" color={domainColor} />
        <Text style={s.loadingText}>Chargement du quiz...</Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={navigation.goBack} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={TEXT} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Quiz</Text>
        </View>
        <View style={s.emptyView}>
          <Text style={{ fontSize: 48 }}>📭</Text>
          <Text style={s.emptyTitle}>Pas encore de quiz</Text>
          <Text style={s.emptyDesc}>Le quiz de cette leçon n'est pas encore disponible.</Text>
          <TouchableOpacity style={[s.backBtnFull, { borderColor: domainColor + '40' }]} onPress={navigation.goBack}>
            <Text style={[s.backBtnText, { color: domainColor }]}>Retour à la leçon</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={navigation.goBack} style={s.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerSub} numberOfLines={1}>{lesson.titre}</Text>
          <Text style={s.headerTitle}>Quiz</Text>
        </View>
        <View style={[s.domainDot, { backgroundColor: domainColor }]} />
      </View>

      {/* ── Barre colorée ── */}
      <View style={[s.domainBar, { backgroundColor: domainColor }]} />

      {/* ── Phases ── */}
      {phase === 'quiz' && (
        <QuizPhase
          questions={questions}
          domainColor={domainColor}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}
      {phase === 'result' && result && (
        <ResultPhase
          score={result.score}
          correct={result.correct}
          total={result.total}
          corrections={result.corrections}
          questions={questions}
          domainColor={domainColor}
          onRetry={handleRetry}
          onContinue={handleContinue}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: BG },
  loadingView: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: BG },
  loadingText: { fontSize: 14, color: TEXT_MUTED, fontWeight: '600' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 12,
  },
  backBtn:      { padding: 4 },
  headerCenter: { flex: 1 },
  headerSub:    { fontSize: 11, fontWeight: '600', color: TEXT_MUTED },
  headerTitle:  { fontSize: 17, fontWeight: '800', color: TEXT },
  domainDot:    { width: 10, height: 10, borderRadius: 5 },
  domainBar:    { height: 3 },

  emptyView:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: TEXT },
  emptyDesc:  { fontSize: 14, color: TEXT_MUTED, textAlign: 'center', lineHeight: 21 },
  backBtnFull:{ marginTop: 12, borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  backBtnText:{ fontSize: 15, fontWeight: '700' },
});