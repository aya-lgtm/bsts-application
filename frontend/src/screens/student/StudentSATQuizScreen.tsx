import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY = '#0D6B5E';
const BG = '#F9FAFB';
const CARD = '#FFFFFF';
const TEXT = '#111827';
const MUTED = '#6B7280';

const mockQuestion = {
  number: 12,
  total: 20,
  subject: 'Algèbre',
  timeLeft: '32:45',
  question: 'Si 2x + 5 = 15, quelle est la valeur de x ?',
  choices: [
    { id: 'A', text: 'x = 5', correct: true },
    { id: 'B', text: 'x = 10', correct: false },
    { id: 'C', text: 'x = 15', correct: false },
    { id: 'D', text: 'x = 20', correct: false },
  ],
};

export default function StudentSATQuizScreen() {
  const navigation = useNavigation<any>();
  const [selected, setSelected] = useState<string | null>(null);
  const [flagged, setFlagged] = useState(false);

  const progressPercent = (mockQuestion.number / mockQuestion.total) * 100;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SAT Math · Moyen</Text>
        <View style={styles.timer}>
          <Ionicons name="time-outline" size={16} color={TEXT} />
          <Text style={styles.timerText}>{mockQuestion.timeLeft}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Question info */}
        <Text style={styles.questionMeta}>Question {mockQuestion.number} / {mockQuestion.total}</Text>
        <Text style={styles.questionSubject}>{mockQuestion.subject}</Text>
        <Text style={styles.questionText}>{mockQuestion.question}</Text>

        {/* Choices */}
        <View style={styles.choicesContainer}>
          {mockQuestion.choices.map(choice => (
            <TouchableOpacity
              key={choice.id}
              style={[
                styles.choiceCard,
                selected === choice.id && styles.choiceSelected,
              ]}
              onPress={() => setSelected(choice.id)}
            >
              <View style={[styles.choiceLetter, selected === choice.id && styles.choiceLetterSelected]}>
                <Text style={[styles.choiceLetterText, selected === choice.id && styles.choiceLetterTextSelected]}>
                  {choice.id}
                </Text>
              </View>
              <Text style={[styles.choiceText, selected === choice.id && styles.choiceTextSelected]}>
                {choice.text}
              </Text>
              {selected === choice.id && (
                <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Flag */}
        <TouchableOpacity style={styles.flagRow} onPress={() => setFlagged(!flagged)}>
          <Ionicons name={flagged ? 'bookmark' : 'bookmark-outline'} size={18} color={MUTED} />
          <Text style={styles.flagText}>Marquer pour revoir</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Navigation buttons */}
      <View style={styles.navButtons}>
        <TouchableOpacity style={styles.prevBtn} onPress={() => {}}>
          <Text style={styles.prevBtnText}>Précédente</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, !selected && styles.nextBtnDisabled]}
          onPress={() => selected && navigation.navigate('StudentSATResults')}
        >
          <Text style={styles.nextBtnText}>Suivante</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
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
  choiceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#E5E7EB', gap: 12 },
  choiceSelected: { borderColor: PRIMARY, backgroundColor: '#F0FAF8' },
  choiceLetter: { width: 32, height: 32, borderRadius: 8, borderWidth: 1.5, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  choiceLetterSelected: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  choiceLetterText: { fontSize: 14, fontWeight: '700', color: MUTED, fontFamily: 'Montserrat-Bold' },
  choiceLetterTextSelected: { color: '#FFFFFF' },
  choiceText: { flex: 1, fontSize: 15, color: TEXT, fontFamily: 'Montserrat-Regular' },
  choiceTextSelected: { fontWeight: '600', color: PRIMARY, fontFamily: 'Montserrat-SemiBold' },
  flagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 },
  flagText: { fontSize: 13, color: MUTED, fontFamily: 'Montserrat-Regular' },
  navButtons: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  prevBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#D1D5DB', alignItems: 'center' },
  prevBtnText: { fontSize: 14, fontWeight: '600', color: TEXT, fontFamily: 'Montserrat-SemiBold' },
  nextBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: PRIMARY, alignItems: 'center' },
  nextBtnDisabled: { backgroundColor: '#9CA3AF' },
  nextBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Montserrat-Bold' },
});