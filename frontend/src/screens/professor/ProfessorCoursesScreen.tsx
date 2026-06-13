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
  blue: '#3B82F6',
  blueLight: '#EFF6FF',
  bg: '#F7F8FA',
  white: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
}

const courses = [
  {
    id: '1', title: 'SAT Math Advanced', tag: 'SAT Math', tagColor: COLORS.primary, tagBg: COLORS.primaryLight,
    lessons: 24, students: 89, successRate: 78, status: 'Publié',
  },
  {
    id: '2', title: 'SAT Reading & Writing', tag: 'Reading &\nWriting', tagColor: COLORS.purple, tagBg: COLORS.purpleLight,
    lessons: 18, students: 76, successRate: 72, status: 'Publié',
  },
  {
    id: '3', title: 'Evidence-Based Reading', tag: 'Evidence-\nBased', tagColor: COLORS.orange, tagBg: COLORS.orangeLight,
    lessons: 15, students: 64, successRate: 68, status: 'Publié',
  },
  {
    id: '4', title: 'SAT Practice Tests', tag: 'SAT\nPractice', tagColor: COLORS.blue, tagBg: COLORS.blueLight,
    lessons: 12, students: 92, successRate: 81, status: 'Publié',
  },
]

interface Props {
  onNavigate: (screen: string, params?: any) => void
}

export default function ProfessorCoursesScreen({ onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState('Tous')
  const tabs = ['Tous', 'Publiés', 'Brouillons']

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mes cours</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}><Text style={styles.iconText}>🔍</Text></TouchableOpacity>
          <TouchableOpacity style={styles.addBtn}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
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

      {/* Courses List */}
      <FlatList
        data={courses}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            {/* Left colored tag */}
            <View style={[styles.courseTag, { backgroundColor: item.tagBg }]}>
              <Text style={[styles.courseTagText, { color: item.tagColor }]}>{item.tag}</Text>
            </View>

            {/* Course Info */}
            <View style={styles.cardContent}>
              <View style={styles.cardTop}>
                <Text style={styles.courseTitle}>{item.title}</Text>
                <TouchableOpacity style={styles.moreBtn}>
                  <Text style={styles.moreText}>•••</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.courseMeta}>{item.lessons} leçons • {item.students} étudiants</Text>

              <View style={styles.cardBottom}>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
                <View style={styles.rateContainer}>
                  <Text style={styles.rateLabel}>Taux réussite : </Text>
                  <Text style={[styles.rateValue, { color: item.tagColor }]}>{item.successRate}%</Text>
                </View>
                <TouchableOpacity style={styles.statsBtn}>
                  <Text style={styles.statsBtnIcon}>📊</Text>
                </TouchableOpacity>
              </View>

              {/* Progress bar */}
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${item.successRate}%` as any, backgroundColor: item.tagColor }]} />
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 6 },
  iconText: { fontSize: 20 },
  addBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: COLORS.white, fontSize: 22, fontWeight: '300', marginTop: -2 },
  tabsRow: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    paddingHorizontal: 16, paddingBottom: 12, gap: 8,
  },
  tab: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, backgroundColor: COLORS.bg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  tabTextActive: { color: COLORS.white, fontWeight: '600' },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  courseTag: {
    width: 68, alignItems: 'center', justifyContent: 'center', padding: 8,
  },
  courseTagText: { fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 15 },
  cardContent: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  courseTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1, marginRight: 8 },
  moreBtn: { padding: 2 },
  moreText: { fontSize: 14, color: COLORS.textSecondary, letterSpacing: 2 },
  courseMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, marginBottom: 10 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },
  statusText: { fontSize: 12, color: COLORS.success, fontWeight: '600' },
  rateContainer: { flexDirection: 'row', flex: 1 },
  rateLabel: { fontSize: 12, color: COLORS.textSecondary },
  rateValue: { fontSize: 12, fontWeight: '700' },
  statsBtn: { padding: 2 },
  statsBtnIcon: { fontSize: 16 },
  progressBg: { height: 4, backgroundColor: COLORS.border, borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2 },
})