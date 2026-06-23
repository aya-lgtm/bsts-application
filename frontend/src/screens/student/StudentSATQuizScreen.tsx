import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/auth.service';

const PRIMARY = '#0D6B5E';
const BG = '#FFFFFF';
const CARD = '#FFFFFF';
const TEXT = '#111827';
const MUTED = '#6B7280';

type SATQuestion = {
  id: string;
  domaine: string;
  difficulte: string;
  enonce: string;
  choixA: string;
  choixB: string;
  choixC?: string | null;
  choixD?: string | null;
};

type RouteParams = {
  sessionId: string;
  questions: SATQuestion[];
  modeId: string;
};

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function StudentSATQuizScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { sessionId, questions, modeId } = route.params as RouteParams;

  const [currentIndex, setCurrentIndex] = useState(0);
  // answers: { [questionId]: 'A' | 'B' | 'C' | 'D' }
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const currentQuestion = questions[currentIndex];

  const choices = useMemo(() => {
    if (!currentQuestion) return [];
    const list = [
      { id: 'A', text: currentQuestion.choixA },
      { id: 'B', text: currentQuestion.choixB },
    ];
    if (currentQuestion.choixC) list.push({ id: 'C', text: currentQuestion.choixC });
    if (currentQuestion.choixD) list.push({ id: 'D', text: currentQuestion.choixD });
    return list;
  }, [currentQuestion]);

  const selected = currentQuestion ? answers[currentQuestion.id] ?? null : null;
  const flagged = currentQuestion ? flaggedIds.has(currentQuestion.id) : false;
  const progressPercent = ((currentIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentIndex === questions.length - 1;

  const selectChoice = (choiceId: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: choiceId }));
  };

  const toggleFlag = () => {
    if (!currentQuestion) return;
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(currentQuestion.id)) {
        next.delete(currentQuestion.id);
      } else {
        next.add(currentQuestion.id);
      }
      return next;
    });
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const goNext = async () => {
    if (!selected) return;

    if (!isLastQuestion) {
      setCurrentIndex((i) => i + 1);
      return;
    }

    // Dernière question -> soumission de la session
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSubmitting(true);
    try {
      const { data } = await api.post(`/sat/sessions/${sessionId}/submit`, {
        reponses: answers,
        tempsTotal: elapsedSeconds,
      });

      navigation.replace('StudentSATResults', { results: data, tempsTotal: elapsedSeconds });
    } catch (error: any) {
      console.log('Erreur soumission session SAT', error?.response?.data || error);
      Alert.alert(
        'Erreur',
        error?.response?.data?.message || 'Impossible de soumettre tes réponses pour le moment.'
      );
      // On relance le chrono si la soumission a échoué, pour ne pas bloquer l'élève
      intervalRef.current = setInterval(() => setElapsedSeconds((prev) => prev + 1), 1000);
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentQuestion) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.questionMeta}>Aucune question disponible.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={submitting}>
          <Ionicons name="chevron-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SAT {currentQuestion.domaine} · {currentQuestion.difficulte}</Text>
        <View style={styles.timer}>
          <Ionicons name="time-outline" size={16} color={TEXT} />
          <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Question info */}
        <Text style={styles.questionMeta}>
          Question {currentIndex + 1} / {questions.length}
        </Text>
        <Text style={styles.questionSubject}>{currentQuestion.domaine}</Text>
        <Text style={styles.questionText}>{currentQuestion.enonce}</Text>

        {/* Choices */}
        <View style={styles.choicesContainer}>
          {choices.map((choice) => (
            <TouchableOpacity
              key={choice.id}
              style={[styles.choiceCard, selected === choice.id && styles.choiceSelected]}
              onPress={() => selectChoice(choice.id)}
              disabled={submitting}
            >
              <View style={[styles.choiceLetter, selected === choice.id && styles.choiceLetterSelected]}>
                <Text
                  style={[styles.choiceLetterText, selected === choice.id && styles.choiceLetterTextSelected]}
                >
                  {choice.id}
                </Text>
              </View>
              <Text style={[styles.choiceText, selected === choice.id && styles.choiceTextSelected]}>
                {choice.text}
              </Text>
              {selected === choice.id && <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Flag */}
        <TouchableOpacity style={styles.flagRow} onPress={toggleFlag} disabled={submitting}>
          <Ionicons name={flagged ? 'bookmark' : 'bookmark-outline'} size={18} color={MUTED} />
          <Text style={styles.flagText}>Marquer pour revoir</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Navigation buttons */}
      <View style={styles.navButtons}>
        <TouchableOpacity
          style={[styles.prevBtn, currentIndex === 0 && styles.btnDisabledOutline]}
          onPress={goPrev}
          disabled={currentIndex === 0 || submitting}
        >
          <Text style={styles.prevBtnText}>Précédente</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, (!selected || submitting) && styles.nextBtnDisabled]}
          onPress={goNext}
          disabled={!selected || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.nextBtnText}>{isLastQuestion ? 'Terminer' : 'Suivante'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { alignItems: 'center', justifyContent: 'center' },
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
  headerTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: TEXT, fontFamily: 'Montserrat-Bold', textAlign: 'center' },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timerText: { fontSize: 14, fontWeight: '600', color: TEXT, fontFamily: 'Montserrat-SemiBold' },
  progressBar: { height: 4, backgroundColor: '#E5E7EB' },
  progressFill: { height: 4, backgroundColor: PRIMARY },
  content: { padding: 20 },
  questionMeta: { fontSize: 13, color: MUTED, fontFamily: 'Montserrat-Regular', marginBottom: 2 },
  questionSubject: { fontSize: 13, color: PRIMARY, fontFamily: 'Montserrat-SemiBold', marginBottom: 12 },
  questionText: { fontSize: 16, fontWeight: '600', color: TEXT, fontFamily: 'Montserrat-SemiBold', lineHeight: 24, marginBottom: 24 },
  choicesContainer: { gap: 10 },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  choiceSelected: { borderColor: PRIMARY, backgroundColor: '#F0FAF8' },
  choiceLetter: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceLetterSelected: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  choiceLetterText: { fontSize: 14, fontWeight: '700', color: MUTED, fontFamily: 'Montserrat-Bold' },
  choiceLetterTextSelected: { color: '#FFFFFF' },
  choiceText: { flex: 1, fontSize: 15, color: TEXT, fontFamily: 'Montserrat-Regular' },
  choiceTextSelected: { fontWeight: '600', color: PRIMARY, fontFamily: 'Montserrat-SemiBold' },
  flagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 },
  flagText: { fontSize: 13, color: MUTED, fontFamily: 'Montserrat-Regular' },
  navButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  prevBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#D1D5DB', alignItems: 'center' },
  btnDisabledOutline: { opacity: 0.4 },
  prevBtnText: { fontSize: 14, fontWeight: '600', color: TEXT, fontFamily: 'Montserrat-SemiBold' },
  nextBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: PRIMARY, alignItems: 'center' },
  nextBtnDisabled: { backgroundColor: '#9CA3AF' },
  nextBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Montserrat-Bold' },
});