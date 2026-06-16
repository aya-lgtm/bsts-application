import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const PRIMARY = '#0D6B5E';
const GOLD = '#D4A017';
const BG = '#F9FAFB';
const CARD = '#FFFFFF';
const TEXT = '#111827';
const MUTED = '#6B7280';
const { width } = Dimensions.get('window');

// ─── Mock data ────────────────────────────────────────────────────────────────
const student = {
  name: 'Aya',
  level: 'Explorer',
  nextLevel: 'Scholar',
  points: 2450,
  pointsRequired: 3500,
  streak: 12,
  satScore: 1240,
  satDelta: '+60',
};

const recentCourses = [
  { id: '1', subject: 'Mathématiques', chapter: 'Chapitre 3 – Algèbre', progress: 75, icon: '📐' },
  { id: '2', subject: 'Reading & Writing', chapter: 'Chapitre 1 – Comprehension', progress: 60, icon: '📖' },
];

const upcomingQuizzes = [
  { id: '1', title: 'SAT Math – Niveau Moyen', questions: 20, type: 'SAT' },
];

type Props = {
  navigation: { navigate: (screen: string, params?: any) => void }
  onLogout?: () => void // seulement dans StudentProfilScreen
}

export default function StudentHomeScreen({ navigation }: Props) {
  

  const progressPercent = Math.round((student.points / student.pointsRequired) * 100);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* ── Header ── */}
      <LinearGradient colors={[PRIMARY, '#0A5248']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Bonjour, {student.name} 👋</Text>
            <Text style={styles.subGreeting}>Reste concentré(e), tu vas y arriver !</Text>
          </View>
          <View style={styles.avatar}>
  <Ionicons name="person-circle" size={48} color="rgba(255,255,255,0.9)" />
</View>
        </View>

        {/* Level card */}
        <View style={styles.levelCard}>
          <View style={styles.levelRow}>
            <View>
              <Text style={styles.levelLabel}>Niveau actuel</Text>
              <Text style={styles.levelValue}>{student.level}</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={GOLD} />
            <View>
              <Text style={styles.levelLabel}>Niveau suivant</Text>
              <Text style={styles.levelValue}>{student.nextLevel}</Text>
            </View>
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsText}>{student.points.toLocaleString()}</Text>
              <Ionicons name="trophy" size={14} color={GOLD} />
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <View style={styles.levelFooter}>
            <Text style={styles.levelFooterText}>{student.points} / {student.pointsRequired} pts</Text>
            <Text style={styles.streakText}>🔥 {student.streak} jours</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Recent courses ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Derniers cours consultés</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CoursTab')}>
            <Text style={styles.seeAll}>Voir tout &gt;</Text>
          </TouchableOpacity>
        </View>
        {recentCourses.map(course => (
          <TouchableOpacity
            key={course.id}
            style={styles.courseCard}
            onPress={() => navigation.navigate('CoursTab', { screen: 'StudentLesson', params: { courseId: course.id } })}
          >
            <Text style={styles.courseIcon}>{course.icon}</Text>
            <View style={styles.courseInfo}>
              <Text style={styles.courseName}>{course.subject}</Text>
              <Text style={styles.courseChapter}>{course.chapter}</Text>
              <View style={styles.miniProgressBar}>
                <View style={[styles.miniProgressFill, { width: `${course.progress}%` }]} />
              </View>
            </View>
            <TouchableOpacity style={styles.playBtn} onPress={() => {}}>
              <Ionicons name="play-circle" size={32} color={PRIMARY} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Upcoming quizzes ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prochains quiz à faire</Text>
        {upcomingQuizzes.map(quiz => (
          <TouchableOpacity
            key={quiz.id}
            style={styles.quizCard}
            onPress={() => navigation.navigate('SATTab', { screen: 'StudentSATQuiz', params: { quizId: quiz.id } })}
          >
            <Ionicons name="document-text-outline" size={24} color={PRIMARY} />
            <View style={styles.quizInfo}>
              <Text style={styles.quizTitle}>{quiz.title}</Text>
              <Text style={styles.quizMeta}>{quiz.questions} questions</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={MUTED} />
          </TouchableOpacity>
        ))}
      </View>

      {/* ── SAT Score card ── */}
      <TouchableOpacity
        style={styles.satCard}
        onPress={() => navigation.navigate('SATTab', { screen: 'StudentSATResults' })}
      >
        <View>
          <Text style={styles.satLabel}>Dernier score SAT</Text>
          <Text style={styles.satScore}>{student.satScore}</Text>
          <Text style={styles.satDelta}>Score estimé ({student.satDelta})</Text>
        </View>
        <View style={styles.satChart}>
          {/* Placeholder mini chart */}
          <Ionicons name="trending-up" size={40} color={GOLD} />
        </View>
      </TouchableOpacity>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { paddingBottom: 20 },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Montserrat-Bold' },
  subGreeting: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2, fontFamily: 'Montserrat-Regular' },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: GOLD,  alignItems: 'center', justifyContent: 'center' },
  levelCard: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 14 },
  levelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  levelLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontFamily: 'Montserrat-Regular' },
  levelValue: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Montserrat-Bold' },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(212,160,23,0.2)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, gap: 4 },
  pointsText: { fontSize: 14, fontWeight: '700', color: GOLD, fontFamily: 'Montserrat-Bold' },
  progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: GOLD, borderRadius: 3 },
  levelFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  levelFooterText: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontFamily: 'Montserrat-Regular' },
  streakText: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontFamily: 'Montserrat-Regular' },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: TEXT, fontFamily: 'Montserrat-Bold' },
  seeAll: { fontSize: 13, color: PRIMARY, fontFamily: 'Montserrat-Medium' },
  courseCard: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 12, padding: 14, marginBottom: 10, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  courseIcon: { fontSize: 28, marginRight: 12 },
  courseInfo: { flex: 1 },
  courseName: { fontSize: 14, fontWeight: '700', color: TEXT, fontFamily: 'Montserrat-Bold' },
  courseChapter: { fontSize: 12, color: MUTED, marginTop: 2, fontFamily: 'Montserrat-Regular' },
  miniProgressBar: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, marginTop: 6 },
  miniProgressFill: { height: 4, backgroundColor: PRIMARY, borderRadius: 2 },
  playBtn: { marginLeft: 10 },
  quizCard: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 12, padding: 14, marginBottom: 8, alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  quizInfo: { flex: 1 },
  quizTitle: { fontSize: 14, fontWeight: '600', color: TEXT, fontFamily: 'Montserrat-SemiBold' },
  quizMeta: { fontSize: 12, color: MUTED, marginTop: 2, fontFamily: 'Montserrat-Regular' },
  satCard: { marginHorizontal: 16, marginTop: 20, backgroundColor: CARD, borderRadius: 14, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  satLabel: { fontSize: 12, color: MUTED, fontFamily: 'Montserrat-Regular' },
  satScore: { fontSize: 36, fontWeight: '800', color: PRIMARY, fontFamily: 'Montserrat-Bold', marginTop: 2 },
  satDelta: { fontSize: 12, color: '#10B981', marginTop: 2, fontFamily: 'Montserrat-Medium' },
  satChart: { alignItems: 'center', justifyContent: 'center' },
});