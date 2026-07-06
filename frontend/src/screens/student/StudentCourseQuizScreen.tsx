// screens/student/StudentCourseQuizScreen.tsx
// Quiz de fin de chapitre — style SAT (question par question, score final)
//
// Endpoints utilisés :
//   GET /quiz/chapter/:chapterId         → questions du quiz
//   POST /quiz/:quizId/submit            → soumettre les réponses

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/auth.service';

// ─── COULEURS ──────────────────────────────────────────────────────────────────
const C = {
  primary: '#0D6B5E',
  primaryLight: '#E1F5EE',
  primaryDark: '#0A5449',
  gold: '#D4A017',
  goldLight: '#FFF8E7',
  white: '#FFFFFF',
  bg: '#F5F7F6',
  card: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  success: '#10B981',
  successLight: '#D1FAE5',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
};

// ─── TYPES ─────────────────────────────────────────────────────────────────────
interface QuizQuestion {
  id: string;
  texte: string;
  options: string[];        // ['A. ...', 'B. ...', 'C. ...', 'D. ...']
  correctAnswer: string;    // 'A' | 'B' | 'C' | 'D' ou texte complet
  explication?: string;
  ordre?: number;
}

interface NavigationProp {
  navigate: (screen: string, params?: Record<string, any>) => void;
  goBack?: () => void;
}

interface RouteProp {
  params?: {
    quizId?: string;
    quizTitre?: string;
    chapterId?: string;
    chapterTitre?: string;
  };
}

interface Props {
  navigation: NavigationProp;
  route: RouteProp;
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────
function getErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const e = err as { response?: { data?: { message?: string } } };
    if (e.response?.data?.message) return e.response.data.message;
  }
  if (err instanceof Error) return err.message;
  return 'Une erreur est survenue';
}

function getLetterFromOption(option: string): string {
  // Si l'option commence par "A.", "B.", etc.
  const match = option.match(/^([A-D])[.)]\s/);
  return match ? match[1] : option.charAt(0).toUpperCase();
}

function isCorrect(question: QuizQuestion, selectedOption: string): boolean {
  const selectedLetter = getLetterFromOption(selectedOption);
  const correctLetter = getLetterFromOption(question.correctAnswer);
  return selectedLetter === correctLetter || selectedOption === question.correctAnswer;
}

// ─── API ───────────────────────────────────────────────────────────────────────
async function fetchQuizQuestions(quizId: string, chapterId?: string): Promise<QuizQuestion[]> {
  try {
    // Essaie d'abord par quizId
    const res = await api.get(`/quiz/${quizId}/questions`);
    const data = res.data?.questions ?? res.data ?? [];
    return Array.isArray(data) ? data : [];
  } catch {
    if (!chapterId) return [];
    try {
      const res = await api.get(`/quiz/chapter/${chapterId}`);
      const quizData = res.data?.quiz ?? res.data;
      return quizData?.questions ?? [];
    } catch {
      return [];
    }
  }
}

async function submitQuizAnswers(
  quizId: string,
  answers: Record<string, string>
): Promise<{ score: number; total: number; passed: boolean; xp?: number }> {
  const res = await api.post(`/quiz/${quizId}/submit`, { answers });
  return res.data;
}

// ─── COMPOSANTS ────────────────────────────────────────────────────────────────

// Option de réponse
const OptionButton = ({
  option,
  letter,
  state,
  onPress,
}: {
  option: string;
  letter: string;
  state: 'default' | 'selected' | 'correct' | 'wrong';
  onPress: () => void;
}) => {
  const bg =
    state === 'correct' ? C.successLight :
    state === 'wrong' ? C.dangerLight :
    state === 'selected' ? C.primaryLight :
    C.white;
  const borderColor =
    state === 'correct' ? C.success :
    state === 'wrong' ? C.danger :
    state === 'selected' ? C.primary :
    C.border;
  const letterBg =
    state === 'correct' ? C.success :
    state === 'wrong' ? C.danger :
    state === 'selected' ? C.primary :
    C.border;

  // Texte de l'option sans le préfixe "A. "
  const optionText = option.replace(/^[A-D][.)]\s*/, '');

  return (
    <TouchableOpacity
      style={[opt.btn, { backgroundColor: bg, borderColor }]}
      onPress={onPress}
      activeOpacity={state === 'default' || state === 'selected' ? 0.75 : 1}
      disabled={state === 'correct' || state === 'wrong'}
    >
      <View style={[opt.letter, { backgroundColor: letterBg }]}>
        <Text style={[opt.letterText, (state === 'selected' || state === 'correct' || state === 'wrong') && { color: C.white }]}>
          {letter}
        </Text>
      </View>
      <Text style={[opt.text, state === 'correct' && { color: C.success }, state === 'wrong' && { color: C.danger }]}>
        {optionText}
      </Text>
      {state === 'correct' && <Ionicons name="checkmark-circle" size={20} color={C.success} />}
      {state === 'wrong' && <Ionicons name="close-circle" size={20} color={C.danger} />}
    </TouchableOpacity>
  );
};

const opt = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderRadius: 14,
    padding: 14, marginBottom: 10,
  },
  letter: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  letterText: { fontSize: 14, fontWeight: '700', color: C.textSecondary },
  text: { flex: 1, fontSize: 14, fontWeight: '500', color: C.textPrimary, lineHeight: 20 },
});

// Écran de résultat
const ResultScreen = ({
  score,
  total,
  passed,
  xp,
  quizTitre,
  onRetry,
  onBack,
}: {
  score: number;
  total: number;
  passed: boolean;
  xp?: number;
  quizTitre: string;
  onRetry: () => void;
  onBack: () => void;
}) => {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 60,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={res.wrap}>
      <Animated.View style={[res.circle, passed ? res.circlePassed : res.circleFailed, { transform: [{ scale: scaleAnim }] }]}>
        <Ionicons name={passed ? 'trophy' : 'close'} size={40} color={C.white} />
      </Animated.View>

      <Text style={res.title}>{passed ? 'Félicitations !' : 'Pas encore…'}</Text>
      <Text style={res.subtitle}>{quizTitre}</Text>

      {/* Score */}
      <View style={res.scoreCard}>
        <View style={res.scoreItem}>
          <Text style={res.scoreNum}>{score}</Text>
          <Text style={res.scoreLabel}>Correctes</Text>
        </View>
        <View style={res.scoreDivider} />
        <View style={res.scoreItem}>
          <Text style={res.scoreNum}>{total - score}</Text>
          <Text style={res.scoreLabel}>Incorrectes</Text>
        </View>
        <View style={res.scoreDivider} />
        <View style={res.scoreItem}>
          <Text style={[res.scoreNum, passed ? { color: C.success } : { color: C.danger }]}>{pct}%</Text>
          <Text style={res.scoreLabel}>Score</Text>
        </View>
      </View>

      {xp && passed ? (
        <View style={res.xpBadge}>
          <Ionicons name="flash" size={16} color={C.gold} />
          <Text style={res.xpText}>+{xp} XP gagnés</Text>
        </View>
      ) : null}

      <Text style={res.feedbackText}>
        {passed
          ? 'Tu maîtrises bien ce chapitre. Continue comme ça !'
          : 'Relis les leçons et réessaie. Tu vas y arriver !'}
      </Text>

      <View style={res.actions}>
        {!passed && (
          <TouchableOpacity style={res.retryBtn} onPress={onRetry}>
            <Ionicons name="refresh" size={18} color={C.primary} />
            <Text style={res.retryText}>Réessayer</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={res.backBtn} onPress={onBack}>
          <Text style={res.backText}>{passed ? 'Continuer' : 'Retour'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const res = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  circle: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  circlePassed: { backgroundColor: C.success },
  circleFailed: { backgroundColor: C.danger },
  title: { fontSize: 26, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: C.textSecondary, marginBottom: 24 },
  scoreCard: {
    flexDirection: 'row', backgroundColor: C.card,
    borderRadius: 18, padding: 20, gap: 0,
    borderWidth: 1, borderColor: C.border, marginBottom: 16, width: '100%',
  },
  scoreItem: { flex: 1, alignItems: 'center' },
  scoreNum: { fontSize: 26, fontWeight: '800', color: C.textPrimary, marginBottom: 3 },
  scoreLabel: { fontSize: 12, color: C.textSecondary },
  scoreDivider: { width: 1, backgroundColor: C.border, marginHorizontal: 4 },
  xpBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.goldLight, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8, marginBottom: 16,
  },
  xpText: { fontSize: 14, fontWeight: '700', color: C.gold },
  feedbackText: {
    fontSize: 14, color: C.textSecondary, textAlign: 'center',
    lineHeight: 21, marginBottom: 32, paddingHorizontal: 12,
  },
  actions: { flexDirection: 'row', gap: 12, width: '100%' },
  retryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 2, borderColor: C.primary, borderRadius: 14, paddingVertical: 14,
  },
  retryText: { fontSize: 15, fontWeight: '700', color: C.primary },
  backBtn: {
    flex: 1, backgroundColor: C.primary, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  backText: { fontSize: 15, fontWeight: '700', color: C.white },
});

// ─── ÉCRAN PRINCIPAL ───────────────────────────────────────────────────────────
export default function StudentCourseQuizScreen({ navigation, route }: Props) {
  const { quizId, quizTitre = 'Quiz', chapterId, chapterTitre } = route.params ?? {};

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId → selectedOption
  const [phase, setPhase] = useState<'quiz' | 'result'>('quiz');
  const [result, setResult] = useState<{ score: number; total: number; passed: boolean; xp?: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!quizId) { Alert.alert('Erreur', 'Quiz introuvable'); return; }
    fetchQuizQuestions(quizId, chapterId).then((q) => {
      setQuestions(q);
      setLoading(false);
    }).catch((err) => {
      Alert.alert('Erreur', getErrorMessage(err));
      setLoading(false);
    });
  }, [quizId, chapterId]);

  // Animer la barre de progression
  useEffect(() => {
    if (questions.length === 0) return;
    Animated.timing(progressAnim, {
      toValue: (currentIndex + (answered ? 1 : 0)) / questions.length,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentIndex, answered, questions.length]);

  const handleSelectOption = (option: string) => {
    if (answered) return;
    setSelectedOption(option);
    setAnswered(true);

    const q = questions[currentIndex];
    setAnswers((prev) => ({ ...prev, [q.id]: option }));
  };

  const handleNext = async () => {
    const isLast = currentIndex === questions.length - 1;

    if (isLast) {
      // Soumettre
      setSubmitting(true);
      try {
        const serverResult = await submitQuizAnswers(quizId!, answers);
        setResult(serverResult);
      } catch {
        // Calcul local si le backend échoue
        let correct = 0;
        for (const q of questions) {
          const ans = answers[q.id];
          if (ans && isCorrect(q, ans)) correct++;
        }
        const pct = Math.round((correct / questions.length) * 100);
        setResult({ score: correct, total: questions.length, passed: pct >= 60 });
      } finally {
        setSubmitting(false);
        setPhase('result');
      }
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setAnswered(false);
    }
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setAnswered(false);
    setAnswers({});
    setPhase('quiz');
    setResult(null);
    progressAnim.setValue(0);
  };

  const handleBack = () => {
    if (navigation.goBack) navigation.goBack();
    else navigation.navigate('StudentCourses');
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // ── Chargement ──
  if (loading) {
    return (
      <SafeAreaView style={sc.safe}>
        <View style={sc.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={sc.loadingText}>Chargement du quiz…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Pas de questions ──
  if (questions.length === 0) {
    return (
      <SafeAreaView style={sc.safe}>
        <View style={sc.header}>
          <TouchableOpacity onPress={handleBack} style={sc.backBtn}>
            <Ionicons name="arrow-back" size={24} color={C.textPrimary} />
          </TouchableOpacity>
          <Text style={sc.headerTitle}>{quizTitre}</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={sc.centered}>
          <Ionicons name="help-circle-outline" size={52} color={C.textMuted} />
          <Text style={sc.emptyText}>Aucune question disponible pour ce quiz.</Text>
          <TouchableOpacity style={sc.backToChapter} onPress={handleBack}>
            <Text style={sc.backToChapterText}>Retour au chapitre</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Résultats ──
  if (phase === 'result' && result) {
    return (
      <SafeAreaView style={sc.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={C.white} />
        <View style={sc.header}>
          <TouchableOpacity onPress={handleBack} style={sc.backBtn}>
            <Ionicons name="arrow-back" size={24} color={C.textPrimary} />
          </TouchableOpacity>
          <Text style={sc.headerTitle}>Résultats</Text>
          <View style={{ width: 36 }} />
        </View>
        <ResultScreen
          score={result.score}
          total={result.total}
          passed={result.passed}
          xp={result.xp}
          quizTitre={quizTitre ?? 'Quiz'}
          onRetry={handleRetry}
          onBack={handleBack}
        />
      </SafeAreaView>
    );
  }

  // ── Quiz ──
  const q = questions[currentIndex];
  const letters = ['A', 'B', 'C', 'D', 'E'];

  const getOptionState = (option: string): 'default' | 'selected' | 'correct' | 'wrong' => {
    if (!answered) return selectedOption === option ? 'selected' : 'default';
    const correct = isCorrect(q, option);
    if (correct) return 'correct';
    if (option === selectedOption && !correct) return 'wrong';
    return 'default';
  };

  return (
    <SafeAreaView style={sc.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      {/* Header */}
      <View style={sc.header}>
        <TouchableOpacity onPress={handleBack} style={sc.backBtn}>
          <Ionicons name="close" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={sc.headerTitle}>{quizTitre}</Text>
        <Text style={sc.counter}>{currentIndex + 1}/{questions.length}</Text>
      </View>

      {/* Barre de progression */}
      <View style={sc.progressBg}>
        <Animated.View style={[sc.progressFill, { width: progressWidth }]} />
      </View>

      <ScrollView
        style={sc.scroll}
        contentContainerStyle={sc.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Chapitre info */}
        {chapterTitre && (
          <View style={sc.chapterTag}>
            <Ionicons name="book-outline" size={13} color={C.primary} />
            <Text style={sc.chapterTagText}>{chapterTitre}</Text>
          </View>
        )}

        {/* Question */}
        <Text style={sc.questionText}>{q.texte}</Text>

        {/* Options */}
        <View style={sc.optionsWrap}>
          {q.options.map((option, i) => (
            <OptionButton
              key={i}
              option={option}
              letter={letters[i] ?? String(i + 1)}
              state={getOptionState(option)}
              onPress={() => handleSelectOption(option)}
            />
          ))}
        </View>

        {/* Explication après réponse */}
        {answered && q.explication && (
          <View style={sc.explication}>
            <View style={sc.explicationHeader}>
              <Ionicons name="information-circle" size={18} color={C.primary} />
              <Text style={sc.explicationTitle}>Explication</Text>
            </View>
            <Text style={sc.explicationText}>{q.explication}</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bouton Suivant */}
      {answered && (
        <View style={sc.bottomBar}>
          <TouchableOpacity
            style={[sc.nextBtn, submitting && sc.nextBtnDisabled]}
            onPress={handleNext}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <>
                <Text style={sc.nextBtnText}>
                  {currentIndex === questions.length - 1 ? 'Voir les résultats' : 'Question suivante'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color={C.white} />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const sc = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.white },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  loadingText: { fontSize: 14, color: C.textSecondary },
  emptyText: { fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 21 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { width: 36, alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: C.textPrimary },
  counter: { width: 36, textAlign: 'right', fontSize: 13, fontWeight: '600', color: C.textSecondary },

  progressBg: { height: 6, backgroundColor: C.border, marginHorizontal: 16, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: 6, backgroundColor: C.primary, borderRadius: 6 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  chapterTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.primaryLight, alignSelf: 'flex-start',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 16,
  },
  chapterTagText: { fontSize: 12, fontWeight: '600', color: C.primary },

  questionText: {
    fontSize: 18, fontWeight: '700', color: C.textPrimary,
    lineHeight: 27, marginBottom: 24,
  },
  optionsWrap: { gap: 0 },

  explication: {
    backgroundColor: C.primaryLight, borderRadius: 14,
    padding: 16, marginTop: 8,
    borderLeftWidth: 3, borderLeftColor: C.primary,
  },
  explicationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  explicationTitle: { fontSize: 13, fontWeight: '700', color: C.primary },
  explicationText: { fontSize: 13, color: C.textPrimary, lineHeight: 20 },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border,
    padding: 16, paddingBottom: 28,
  },
  nextBtn: {
    backgroundColor: C.primary, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 15,
  },
  nextBtnDisabled: { opacity: 0.65 },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: C.white },

  backToChapter: {
    backgroundColor: C.primary, borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 12, marginTop: 8,
  },
  backToChapterText: { fontSize: 15, fontWeight: '700', color: C.white },
});