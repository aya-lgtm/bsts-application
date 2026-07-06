// screens/student/StudentCourseExerciseScreen.tsx
// Vue 9 : Exercices de la leçon (QCM interactif)
// Vue 10 : Correction détaillée après réponse

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator, Alert,
  Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/auth.service';

// ─── COULEURS ─────────────────────────────────────────────────────────────────
const P  = '#0D6B5E';
const PL = '#E6F3F1';
const CA = '#FFFFFF';
const TX = '#111827';
const TM = '#6B7280';
const BD = '#E5E7EB';
const SU = '#16A34A';
const SL = '#DCFCE7';
const DA = '#EF4444';
const DL = '#FEE2E2';
const GO = '#D4A017';
const GL = '#FFF8E7';
const BG = '#F8FAFB';

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Exercise {
  id: string;
  texte: string;
  options: string[];
  correctAnswer: string;
  explication?: string;
  astuce?: string;
  ordre?: number;
}

interface NavigationProp {
  navigate: (s: string, p?: any) => void;
  goBack?: () => void;
}

interface Props {
  navigation: NavigationProp;
  route?: {
    params?: {
      chapterId?: string;
      chapterTitre?: string;
      lessonId?: string;
      lessonTitre?: string;
    };
  };
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function errMsg(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'response' in e) {
    const r = (e as any).response?.data?.message; if (r) return r;
  }
  if (e instanceof Error) return e.message;
  return 'Erreur';
}

function getLetterFromOption(option: string): string {
  const m = option.match(/^([A-D])[.)]\s/);
  return m ? m[1] : option.charAt(0).toUpperCase();
}

function isCorrect(exercise: Exercise, selected: string): boolean {
  return getLetterFromOption(selected) === getLetterFromOption(exercise.correctAnswer)
    || selected === exercise.correctAnswer;
}

// ─── API ─────────────────────────────────────────────────────────────────────
async function fetchExercises(chapterId: string, lessonId?: string): Promise<Exercise[]> {
  try {
    const endpoint = lessonId
      ? `/courses/lessons/${lessonId}/exercises`
      : `/courses/chapters/${chapterId}/exercises`;
    const res = await api.get(endpoint);
    return res.data?.exercises ?? res.data ?? [];
  } catch {
    // Fallback : tenter l'autre endpoint
    try {
      const res = await api.get(`/courses/chapters/${chapterId}/exercises`);
      return res.data?.exercises ?? res.data ?? [];
    } catch {
      return [];
    }
  }
}

async function submitExercises(
  chapterId: string,
  answers: Record<string, string>
): Promise<{ score: number; total: number; passed: boolean }> {
  try {
    const res = await api.post(`/courses/chapters/${chapterId}/exercises/submit`, { answers });
    return res.data;
  } catch {
    return { score: 0, total: 0, passed: false };
  }
}

// ─── COMPOSANT OPTION ────────────────────────────────────────────────────────
const OptionBtn = ({
  option, letter, state, onPress,
}: {
  option: string;
  letter: string;
  state: 'default' | 'selected' | 'correct' | 'wrong';
  onPress: () => void;
}) => {
  const bg =
    state === 'correct' ? SL :
    state === 'wrong'   ? DL :
    state === 'selected'? PL : CA;
  const borderColor =
    state === 'correct' ? SU :
    state === 'wrong'   ? DA :
    state === 'selected'? P  : BD;
  const letterBg =
    state === 'correct' ? SU :
    state === 'wrong'   ? DA :
    state === 'selected'? P  : BD;
  const optionText = option.replace(/^[A-D][.)]\s*/, '');

  return (
    <TouchableOpacity
      style={[ob.btn, { backgroundColor: bg, borderColor }]}
      onPress={onPress}
      activeOpacity={state === 'default' || state === 'selected' ? 0.75 : 1}
      disabled={state === 'correct' || state === 'wrong'}
    >
      <View style={[ob.letter, { backgroundColor: letterBg }]}>
        <Text style={[ob.letterText,
          (state === 'selected' || state === 'correct' || state === 'wrong') && { color: CA }
        ]}>
          {letter}
        </Text>
      </View>
      <Text style={[ob.text,
        state === 'correct' && { color: SU },
        state === 'wrong'   && { color: DA },
      ]}>
        {optionText}
      </Text>
      {state === 'correct' && <Ionicons name="checkmark-circle" size={20} color={SU} />}
      {state === 'wrong'   && <Ionicons name="close-circle"     size={20} color={DA} />}
    </TouchableOpacity>
  );
};

const ob = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 10,
  },
  letter: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  letterText: { fontSize: 14, fontWeight: '800', color: TM },
  text: { flex: 1, fontSize: 14, fontWeight: '500', color: TX, lineHeight: 20 },
});

// ─── ÉCRAN RÉSULTATS ────────────────────────────────────────────────────────
const ResultScreen = ({
  score, total, exercises, answers, onRetry, onBack,
}: {
  score: number; total: number;
  exercises: Exercise[]; answers: Record<string, string>;
  onRetry: () => void; onBack: () => void;
}) => {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const passed = pct >= 60;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }).start();
  }, []);

  return (
    <ScrollView contentContainerStyle={rs.scroll} showsVerticalScrollIndicator={false}>
      {/* Résumé score */}
      <Animated.View style={[rs.circleWrap, { transform: [{ scale: scaleAnim }] }]}>
        <View style={[rs.circle, { borderColor: passed ? SU : DA }]}>
          <Text style={[rs.circlePct, { color: passed ? SU : DA }]}>{pct}%</Text>
          <Text style={rs.circleLabel}>{score}/{total}</Text>
        </View>
        <Text style={rs.circleEmoji}>{passed ? '🎉' : '💪'}</Text>
      </Animated.View>

      <Text style={rs.title}>{passed ? 'Bravo !' : 'Continue tes efforts !'}</Text>
      <Text style={rs.subtitle}>
        {score} bonne{score > 1 ? 's' : ''} réponse{score > 1 ? 's' : ''} sur {total}
      </Text>

      {/* Stats */}
      <View style={rs.statsRow}>
        <View style={rs.statBox}>
          <Text style={[rs.statNum, { color: SU }]}>{score}</Text>
          <Text style={rs.statLabel}>Bonnes</Text>
        </View>
        <View style={rs.statDivider} />
        <View style={rs.statBox}>
          <Text style={[rs.statNum, { color: DA }]}>{total - score}</Text>
          <Text style={rs.statLabel}>Erreurs</Text>
        </View>
        <View style={rs.statDivider} />
        <View style={rs.statBox}>
          <Text style={[rs.statNum, { color: GO }]}>{pct}%</Text>
          <Text style={rs.statLabel}>Score</Text>
        </View>
      </View>

      {/* Boutons */}
      <View style={rs.actions}>
        <TouchableOpacity style={rs.retryBtn} onPress={onRetry}>
          <Ionicons name="refresh" size={18} color={P} />
          <Text style={rs.retryText}>Recommencer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={rs.backBtn} onPress={onBack}>
          <Text style={rs.backText}>Retour</Text>
        </TouchableOpacity>
      </View>

      {/* Correction détaillée */}
      <Text style={rs.correctionTitle}>Voir les corrections</Text>
      {exercises.map((ex, i) => {
        const selected = answers[ex.id];
        const correct = selected ? isCorrect(ex, selected) : false;
        const correctOption = ex.options.find(o => isCorrect(ex, o)) ?? ex.correctAnswer;
        return (
          <View key={ex.id} style={[rs.correctionCard, correct ? rs.correctionCardOk : rs.correctionCardErr]}>
            {/* Header */}
            <View style={rs.correctionHeader}>
              <View style={[rs.correctionBadge, { backgroundColor: correct ? SU : DA }]}>
                <Ionicons name={correct ? 'checkmark' : 'close'} size={14} color={CA} />
              </View>
              <Text style={rs.correctionQ}>Question {i + 1}/{total}</Text>
            </View>

            <Text style={rs.correctionTexte}>{ex.texte}</Text>

            {/* Bonne réponse */}
            <View style={[rs.answerRow, { backgroundColor: SL, borderColor: SU }]}>
              <Ionicons name="checkmark-circle" size={16} color={SU} />
              <Text style={rs.answerLabel}>Bonne réponse :</Text>
              <Text style={rs.answerText}>{correctOption.replace(/^[A-D][.)]\s*/, '')}</Text>
            </View>

            {/* Explication */}
            {ex.explication && (
              <View style={rs.explication}>
                <Text style={rs.explicationTitle}>Explication</Text>
                <Text style={rs.explicationText}>{ex.explication}</Text>
              </View>
            )}

            {/* Astuce */}
            {ex.astuce && (
              <View style={rs.astuce}>
                <Ionicons name="bulb-outline" size={14} color={GO} />
                <Text style={rs.astuceText}>Astuce : {ex.astuce}</Text>
              </View>
            )}
          </View>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const rs = StyleSheet.create({
  scroll: { padding: 20 },
  circleWrap: { alignItems: 'center', marginBottom: 16, position: 'relative' },
  circle: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 4, backgroundColor: CA,
    alignItems: 'center', justifyContent: 'center',
  },
  circlePct: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  circleLabel: { fontSize: 13, color: TM, fontWeight: '600' },
  circleEmoji: { position: 'absolute', top: -10, right: '30%', fontSize: 28 },
  title: { fontSize: 24, fontWeight: '900', color: TX, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: TM, textAlign: 'center', marginBottom: 20 },
  statsRow: {
    flexDirection: 'row', backgroundColor: CA, borderRadius: 18,
    padding: 20, marginBottom: 20, borderWidth: 1, borderColor: BD,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 26, fontWeight: '900', marginBottom: 2 },
  statLabel: { fontSize: 12, color: TM },
  statDivider: { width: 1, backgroundColor: BD, marginHorizontal: 4 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  retryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 2, borderColor: P, borderRadius: 14, paddingVertical: 14,
  },
  retryText: { fontSize: 15, fontWeight: '700', color: P },
  backBtn: { flex: 1, backgroundColor: P, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  backText: { fontSize: 15, fontWeight: '700', color: CA },
  correctionTitle: { fontSize: 16, fontWeight: '800', color: TX, marginBottom: 14 },
  correctionCard: {
    backgroundColor: CA, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1.5,
  },
  correctionCardOk:  { borderColor: SU + '50' },
  correctionCardErr: { borderColor: DA + '50' },
  correctionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  correctionBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  correctionQ: { fontSize: 12, fontWeight: '700', color: TM },
  correctionTexte: { fontSize: 14, fontWeight: '700', color: TX, marginBottom: 12, lineHeight: 20 },
  answerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 10,
  },
  answerLabel: { fontSize: 12, fontWeight: '700', color: SU },
  answerText: { fontSize: 13, fontWeight: '600', color: TX, flex: 1 },
  explication: { backgroundColor: PL, borderRadius: 10, padding: 12, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: P },
  explicationTitle: { fontSize: 12, fontWeight: '800', color: P, marginBottom: 4 },
  explicationText: { fontSize: 13, color: TX, lineHeight: 19 },
  astuce: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: GL, borderRadius: 10, padding: 10 },
  astuceText: { fontSize: 12, color: TX, flex: 1, lineHeight: 18 },
});

// ─── ÉCRAN PRINCIPAL ──────────────────────────────────────────────────────────
export default function StudentCourseExerciseScreen({ navigation, route }: Props) {
  const { chapterId, chapterTitre, lessonId, lessonTitre } = route?.params ?? {};

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<'exercise' | 'result'>('exercise');
  const [score, setScore] = useState(0);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!chapterId) { setLoading(false); return; }
    fetchExercises(chapterId, lessonId).then(data => {
      setExercises(data);
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }).catch(e => {
      Alert.alert('Erreur', errMsg(e));
      setLoading(false);
    });
  }, [chapterId, lessonId]);

  useEffect(() => {
    if (exercises.length === 0) return;
    Animated.timing(progressAnim, {
      toValue: (currentIndex + (answered ? 1 : 0)) / exercises.length,
      duration: 300, useNativeDriver: false,
    }).start();
  }, [currentIndex, answered, exercises.length]);

  const handleSelect = (option: string) => {
    if (answered) return;
    setSelectedOption(option);
    setAnswered(true);
    const ex = exercises[currentIndex];
    setAnswers(prev => ({ ...prev, [ex.id]: option }));
  };

  const handleNext = async () => {
    const isLast = currentIndex === exercises.length - 1;
    if (isLast) {
      // Calcul score local
      let correct = 0;
      for (const ex of exercises) {
        const ans = { ...answers, [exercises[currentIndex].id]: selectedOption ?? '' };
        if (ans[ex.id] && isCorrect(ex, ans[ex.id])) correct++;
      }
      setScore(correct);
      if (chapterId) {
        await submitExercises(chapterId, answers).catch(() => {});
      }
      setPhase('result');
    } else {
      setCurrentIndex(i => i + 1);
      setSelectedOption(null);
      setAnswered(false);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  };

  const handleRetry = () => {
    setCurrentIndex(0); setSelectedOption(null); setAnswered(false);
    setAnswers({}); setPhase('exercise'); setScore(0);
    progressAnim.setValue(0); fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  const handleBack = () => { if (navigation.goBack) navigation.goBack(); };

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const letters = ['A', 'B', 'C', 'D', 'E'];

  // ── Loading ──
  if (loading) return (
    <SafeAreaView style={s.safe}>
      <View style={s.centered}>
        <ActivityIndicator size="large" color={P} />
        <Text style={s.loadingText}>Chargement des exercices…</Text>
      </View>
    </SafeAreaView>
  );

  // ── Pas d'exercices ──
  if (exercises.length === 0) return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={handleBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={TX} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Exercices</Text>
        <View style={{ width: 36 }} />
      </View>
      <View style={s.centered}>
        <Text style={{ fontSize: 40 }}>📝</Text>
        <Text style={s.emptyTitle}>Aucun exercice disponible</Text>
        <Text style={s.emptyDesc}>Les exercices pour ce chapitre arrivent bientôt.</Text>
        <TouchableOpacity style={s.backToChapterBtn} onPress={handleBack}>
          <Text style={s.backToChapterText}>Retour au chapitre</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  // ── Résultats ──
  if (phase === 'result') return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={s.header}>
        <TouchableOpacity onPress={handleBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={TX} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Correction</Text>
        <View style={{ width: 36 }} />
      </View>
      <ResultScreen
        score={score} total={exercises.length}
        exercises={exercises} answers={answers}
        onRetry={handleRetry} onBack={handleBack}
      />
    </SafeAreaView>
  );

  // ── Exercice ──
  const ex = exercises[currentIndex];
  const getOptionState = (option: string): 'default' | 'selected' | 'correct' | 'wrong' => {
    if (!answered) return selectedOption === option ? 'selected' : 'default';
    if (isCorrect(ex, option)) return 'correct';
    if (option === selectedOption && !isCorrect(ex, option)) return 'wrong';
    return 'default';
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleBack} style={s.backBtn}>
          <Ionicons name="close" size={24} color={TX} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerSub}>{chapterTitre ?? 'Exercices'}</Text>
          <Text style={s.headerMeta}>Exercice {currentIndex + 1}/{exercises.length}</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={s.lessonLabel}>Leçon {currentIndex + 1} sur {exercises.length}</Text>
        </View>
      </View>

      {/* Barre de progression */}
      <View style={s.progressBg}>
        <Animated.View style={[s.progressFill, { width: progressWidth }]} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Numéro exercice */}
          <View style={s.exerciseNumRow}>
            <View style={s.exerciseNumBadge}>
              <Text style={s.exerciseNumText}>Exercice {currentIndex + 1}/{exercises.length}</Text>
            </View>
            {lessonTitre && <Text style={s.lessonTitreTag}>{lessonTitre}</Text>}
          </View>

          {/* Question */}
          <Text style={s.questionText}>{ex.texte}</Text>

          {/* Options */}
          <View style={{ marginTop: 8 }}>
            {ex.options.map((option, i) => (
              <OptionBtn
                key={i}
                option={option}
                letter={letters[i] ?? String(i + 1)}
                state={getOptionState(option)}
                onPress={() => handleSelect(option)}
              />
            ))}
          </View>

          {/* Correction immédiate après réponse */}
          {answered && (
            <View style={[
              s.feedbackCard,
              isCorrect(ex, selectedOption ?? '') ? s.feedbackOk : s.feedbackErr
            ]}>
              <View style={s.feedbackHeader}>
                <View style={[s.feedbackBadge, { backgroundColor: isCorrect(ex, selectedOption ?? '') ? SU : DA }]}>
                  <Ionicons
                    name={isCorrect(ex, selectedOption ?? '') ? 'checkmark' : 'close'}
                    size={16} color={CA}
                  />
                </View>
                <Text style={[s.feedbackTitle, { color: isCorrect(ex, selectedOption ?? '') ? SU : DA }]}>
                  {isCorrect(ex, selectedOption ?? '') ? 'Bonne réponse ! 🎉' : 'Mauvaise réponse'}
                </Text>
              </View>

              {!isCorrect(ex, selectedOption ?? '') && (
                <View style={s.correctAnswerRow}>
                  <Text style={s.correctAnswerLabel}>Réponse correcte : </Text>
                  <Text style={s.correctAnswerText}>
                    {ex.options.find(o => isCorrect(ex, o))?.replace(/^[A-D][.)]\s*/, '') ?? ex.correctAnswer}
                  </Text>
                </View>
              )}

              {ex.explication && (
                <View style={s.explicationBox}>
                  <Text style={s.explicationTitle}>Explication</Text>
                  <Text style={s.explicationText}>{ex.explication}</Text>
                </View>
              )}

              {ex.astuce && (
                <View style={s.astuceBox}>
                  <Ionicons name="bulb-outline" size={14} color={GO} />
                  <Text style={s.astuceText}>Astuce : {ex.astuce}</Text>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 120 }} />
        </Animated.View>
      </ScrollView>

      {/* Bouton Suivant */}
      {answered && (
        <View style={s.bottomBar}>
          <TouchableOpacity style={s.nextBtn} onPress={handleNext} activeOpacity={0.85}>
            <Text style={s.nextBtnText}>
              {currentIndex === exercises.length - 1 ? 'Voir la correction' : 'Question suivante'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={CA} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CA },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 14, color: TM },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: TX },
  emptyDesc: { fontSize: 14, color: TM, textAlign: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: BD,
  },
  backBtn: { width: 36, alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: TX },
  headerCenter: { flex: 1 },
  headerSub: { fontSize: 13, fontWeight: '700', color: TX, textAlign: 'center' },
  headerMeta: { fontSize: 11, color: TM, textAlign: 'center', marginTop: 2 },
  headerRight: { width: 80, alignItems: 'flex-end' },
  lessonLabel: { fontSize: 11, color: TM, fontWeight: '600' },

  // Progress
  progressBg: { height: 5, backgroundColor: BD, overflow: 'hidden' },
  progressFill: { height: 5, backgroundColor: P },

  scrollContent: { padding: 20 },

  exerciseNumRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  exerciseNumBadge: { backgroundColor: PL, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  exerciseNumText: { fontSize: 12, fontWeight: '700', color: P },
  lessonTitreTag: { fontSize: 12, color: TM, fontWeight: '600' },

  questionText: { fontSize: 17, fontWeight: '800', color: TX, lineHeight: 26, marginBottom: 20 },

  // Feedback
  feedbackCard: {
    borderRadius: 16, padding: 16, marginTop: 8,
    borderWidth: 1.5,
  },
  feedbackOk: { backgroundColor: SL, borderColor: SU + '60' },
  feedbackErr: { backgroundColor: DL, borderColor: DA + '60' },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  feedbackBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  feedbackTitle: { fontSize: 15, fontWeight: '800' },
  correctAnswerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  correctAnswerLabel: { fontSize: 13, color: TM, fontWeight: '600' },
  correctAnswerText: { fontSize: 13, fontWeight: '800', color: SU },
  explicationBox: {
    backgroundColor: CA, borderRadius: 10, padding: 12,
    marginBottom: 8, borderLeftWidth: 3, borderLeftColor: P,
  },
  explicationTitle: { fontSize: 12, fontWeight: '800', color: P, marginBottom: 4 },
  explicationText: { fontSize: 13, color: TX, lineHeight: 19 },
  astuceBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: GL, borderRadius: 10, padding: 10,
  },
  astuceText: { fontSize: 12, color: TX, flex: 1, lineHeight: 18 },

  // Bottom
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: CA, borderTopWidth: 1, borderTopColor: BD,
    padding: 16, paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  nextBtn: {
    backgroundColor: P, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 15,
  },
  nextBtnText: { fontSize: 16, fontWeight: '800', color: CA },

  backToChapterBtn: { backgroundColor: P, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  backToChapterText: { fontSize: 15, fontWeight: '700', color: CA },
});