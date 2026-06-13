import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, FlatList
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const COLORS = {
  primary: '#0D6B5E',
  primaryLight: '#E8F5F3',
  accent: '#F4A936',
  purple: '#7C3AED',
  bg: '#F7F8FA',
  white: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
  danger: '#EF4444',
  orange: '#F97316',
}

const LEVEL_COLORS: Record<string, string> = {
  'Avancé': COLORS.success,
  'Intermédiaire': COLORS.orange,
  'Débutant': COLORS.danger,
  'Expert': COLORS.purple,
}

const students = [
  { id: '1', name: 'Adam Khan', level: 'Avancé', score: 1320, progress: 68, streak: 12, initials: 'AK' },
  { id: '2', name: 'Lina Khan', level: 'Intermédiaire', score: 1180, progress: 54, streak: 8, initials: 'LK' },
  { id: '3', name: 'Yassine Khan', level: 'Débutant', score: 980, progress: 42, streak: 5, initials: 'YK' },
  { id: '4', name: 'Zara Ahmed', level: 'Expert', score: 1460, progress: 82, streak: 15, initials: 'ZA' },
  { id: '5', name: 'Mehdi Rami', level: 'Intermédiaire', score: 1100, progress: 60, streak: 3, initials: 'MR' },
  { id: '6', name: 'Sara Idrissi', level: 'Avancé', score: 1280, progress: 74, streak: 9, initials: 'SI' },
]

interface Props {
  onNavigate: (screen: string, params?: any) => void
}

export default function ProfessorStudentsScreen({ onNavigate }: Props) {
  const [activeFilter, setActiveFilter] = useState('Tous')
  const filters = ['Tous', 'Avancé (1200+)', 'Intermédiaire', 'Débutant']

  const filtered = activeFilter === 'Tous'
    ? students
    : students.filter(s => {
        if (activeFilter === 'Avancé (1200+)') return s.score >= 1200
        if (activeFilter === 'Intermédiaire') return s.level === 'Intermédiaire'
        if (activeFilter === 'Débutant') return s.level === 'Débutant'
        return true
      })

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mes étudiants</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn}><Text style={styles.iconText}>🔍</Text></TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}><Text style={styles.iconText}>⚙️</Text></TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContainer}>
        {filters.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Students List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => onNavigate('student_profile', item)}>
            <View style={[styles.avatar, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.avatarText}>{item.initials}</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardTop}>
                <Text style={styles.studentName}>{item.name}</Text>
                <View style={styles.scoreContainer}>
                  <Text style={styles.scoreLabel}>Score SAT</Text>
                  <Text style={styles.score}>{item.score}</Text>
                </View>
              </View>
              <View style={styles.levelRow}>
                <View style={[styles.levelBadge, { backgroundColor: LEVEL_COLORS[item.level] + '20' }]}>
                  <Text style={[styles.levelText, { color: LEVEL_COLORS[item.level] }]}>Niveau {item.level}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>
              {/* Progress bar */}
              <View style={styles.progressRow}>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${item.progress}%` as any }]} />
                </View>
                <Text style={styles.progressText}>{item.progress}%</Text>
                <Text style={styles.streak}>🔥 {item.streak} jours</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <TouchableOpacity style={styles.addBtn}>
            <Text style={styles.addBtnIcon}>+</Text>
          </TouchableOpacity>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  headerIcons: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 6 },
  iconText: { fontSize: 20 },
  filterScroll: { backgroundColor: COLORS.white, maxHeight: 56 },
  filterContainer: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: COLORS.bg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  filterTextActive: { color: COLORS.white, fontWeight: '600' },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    borderRadius: 16, padding: 14, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  studentName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  scoreContainer: { alignItems: 'flex-end' },
  scoreLabel: { fontSize: 10, color: COLORS.textSecondary },
  score: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  levelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  levelText: { fontSize: 12, fontWeight: '600' },
  chevron: { fontSize: 20, color: COLORS.textSecondary },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  progressBg: { flex: 1, height: 5, backgroundColor: COLORS.border, borderRadius: 3 },
  progressFill: { height: 5, backgroundColor: COLORS.primary, borderRadius: 3 },
  progressText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  streak: { fontSize: 12, color: COLORS.orange },
  addBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-end', marginTop: 8,
    shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  addBtnIcon: { color: COLORS.white, fontSize: 28, fontWeight: '300', marginTop: -2 },
})