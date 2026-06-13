import React, { useState } from 'react'
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const COLORS = {
  primary: '#0D6B5E',
  primaryLight: '#E8F5F3',
  purple: '#7C3AED',
  purpleLight: '#EDE9FE',
  orange: '#F97316',
  orangeLight: '#FFF7ED',
  green2: '#16A34A',
  green2Light: '#F0FDF4',
  bg: '#F7F8FA',
  white: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
}

const quizzes = [
  {
    id: '1', title: 'SAT Math Module 1', category: 'SAT Math', categoryColor: COLORS.primary, categoryBg: COLORS.primaryLight,
    questions: 24, students: 92, successRate: 78, icon: '📐',
  },
  {
    id: '2', title: 'Reading Practice Set 2', category: 'Reading', categoryColor: COLORS.purple, categoryBg: COLORS.purpleLight,
    questions: 20, students: 68, successRate: 82, icon: '📖',
  },
  {
    id: '3', title: 'Writing Practice Test', category: 'Writing', categoryColor: COLORS.orange, categoryBg: COLORS.orangeLight,
    questions: 15, students: 55, successRate: 65, icon: '✏️',
  },
  {
    id: '4', title: 'Full SAT Mock Test #3', category: 'Full SAT', categoryColor: COLORS.green2, categoryBg: COLORS.green2Light,
    questions: 98, students: 120, successRate: 81, icon: '📋',
  },
]

interface Props {
  onNavigate: (screen: string, params?: any) => void
}

export default function ProfessorQuizScreen({ onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState('Tous')
  const tabs = ['Tous', 'SAT Math', 'Reading', 'Writing']

  const filtered = activeTab === 'Tous'
    ? quizzes
    : quizzes.filter(q => q.category === activeTab)

  const getColor = (rate: number) => {
    if (rate >= 80) return COLORS.success
    if (rate >= 65) return COLORS.orange
    return '#EF4444'
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mes quiz</Text>
        <TouchableOpacity style={styles.createBtn}>
          <Text style={styles.createBtnText}>+ Créer</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quiz List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <View style={[styles.iconBox, { backgroundColor: item.categoryBg }]}>
              <Text style={styles.iconText}>{item.icon}</Text>
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.quizTitle}>{item.title}</Text>
              <Text style={styles.quizMeta}>{item.questions} questions • {item.students} étudiants</Text>

              <View style={styles.rateRow}>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, {
                    width: `${item.successRate}%` as any,
                    backgroundColor: item.categoryColor,
                  }]} />
                </View>
                <View style={[styles.rateBadge, { backgroundColor: getColor(item.successRate) + '20' }]}>
                  <Text style={[styles.rateText, { color: getColor(item.successRate) }]}>
                    {item.successRate}%{'\n'}réussite
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
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
  createBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20,
  },
  createBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  tabsRow: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    paddingHorizontal: 16, paddingBottom: 12, gap: 8,
  },
  tab: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: COLORS.bg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  tabTextActive: { color: COLORS.white, fontWeight: '600' },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    borderRadius: 16, padding: 14, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    alignItems: 'center',
  },
  iconBox: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 26 },
  cardContent: { flex: 1 },
  quizTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  quizMeta: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 10 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBg: { flex: 1, height: 6, backgroundColor: COLORS.border, borderRadius: 3 },
  progressFill: { height: 6, borderRadius: 3 },
  rateBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignItems: 'center' },
  rateText: { fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 15 },
})