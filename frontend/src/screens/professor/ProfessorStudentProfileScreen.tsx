import React from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions
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
  blue: '#3B82F6',
  teal: '#14B8A6',
}

const { width } = Dimensions.get('window')

interface Props {
  student?: any
  onBack: () => void
}

export default function ProfessorStudentProfileScreen({ student, onBack }: Props) {
  const studentData = student || {
    name: 'Adam Khan', level: 'Avancé', score: 1320, progress: 68,
    bestScore: 1360, targetScore: 1500, initials: 'AK',
  }

  const sections = [
    { label: 'Math', score: 780, max: 800, color: COLORS.primary },
    { label: 'Reading & Writing', score: 720, max: 800, color: COLORS.purple },
    { label: 'Evidence-Based Reading', score: 700, max: 800, color: COLORS.orange },
    { label: 'Math - Advanced', score: 760, max: 800, color: COLORS.teal },
  ]

  // Mini line chart data (simplified SVG-like with View bars)
  const chartPoints = [980, 1040, 1100, 1160, 1200, 1240, 1280, 1320]
  const chartMax = 1600
  const chartMin = 400
  const chartRange = chartMax - chartMin

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Profil étudiant</Text>
        <TouchableOpacity style={styles.moreBtn}>
          <Text style={styles.moreIcon}>•••</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Student Info */}
        <View style={styles.profileCard}>
          <View style={styles.profileLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{studentData.initials || 'AK'}</Text>
            </View>
            <View>
              <Text style={styles.studentName}>{studentData.name}</Text>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>Niveau {studentData.level}</Text>
              </View>
            </View>
          </View>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>Score SAT</Text>
            <Text style={styles.scoreValue}>{studentData.score}</Text>
            <Text style={styles.scoreMax}>sur 1600</Text>
          </View>
        </View>

        {/* Key Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Progression</Text>
            <Text style={styles.statValue}>{studentData.progress}%</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxMid]}>
            <Text style={styles.statLabel}>Meilleur score</Text>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>{studentData.bestScore}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Score cible</Text>
            <Text style={[styles.statValue, { color: COLORS.orange }]}>{studentData.targetScore}</Text>
          </View>
        </View>

        {/* Score Evolution Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Évolution du score SAT</Text>
          <View style={styles.chart}>
            {/* Y-axis labels */}
            <View style={styles.yAxis}>
              {[1600, 1200, 800, 400].map(v => (
                <Text key={v} style={styles.yLabel}>{v}</Text>
              ))}
            </View>
            {/* Chart area */}
            <View style={styles.chartArea}>
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map(p => (
                <View key={p} style={[styles.gridLine, { bottom: `${p}%` as any }]} />
              ))}
              {/* Bars representing score trend */}
              <View style={styles.barsRow}>
                {chartPoints.map((point, i) => {
                  const h = ((point - chartMin) / chartRange) * 100
                  return (
                    <View key={i} style={styles.barWrapper}>
                      <View style={[styles.bar, { height: `${h}%` as any }]}>
                        {i === chartPoints.length - 1 && (
                          <View style={styles.barLabel}>
                            <Text style={styles.barLabelText}>{point}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )
                })}
              </View>
            </View>
          </View>
          {/* X-axis */}
          <View style={styles.xAxis}>
            {['1 Fév', '1 Mar', '1 Avr', '1 Mai', "Aujourd'hui"].map((l, i) => (
              <Text key={i} style={styles.xLabel}>{l}</Text>
            ))}
          </View>
        </View>

        {/* Section Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Détail par section SAT</Text>
          {sections.map((s, i) => (
            <View key={i} style={styles.sectionRow}>
              <View style={[styles.sectionIcon, { backgroundColor: s.color + '20' }]}>
                <Text style={styles.sectionIconText}>{['📐', '📖', '📝', '⭐'][i]}</Text>
              </View>
              <View style={styles.sectionContent}>
                <View style={styles.sectionLabelRow}>
                  <Text style={styles.sectionLabel}>{s.label}</Text>
                  <Text style={styles.sectionScore}>{s.score}/{s.max}</Text>
                </View>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${(s.score / s.max) * 100}%` as any, backgroundColor: s.color }]} />
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
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
  backBtn: { padding: 6 },
  backIcon: { fontSize: 22, color: COLORS.text },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  moreBtn: { padding: 6 },
  moreIcon: { fontSize: 16, color: COLORS.textSecondary, letterSpacing: 2 },
  scroll: { flex: 1 },
  profileCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.white, margin: 16, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  profileLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 20 },
  studentName: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  levelBadge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  levelText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  scoreBox: { alignItems: 'flex-end' },
  scoreLabel: { fontSize: 11, color: COLORS.textSecondary },
  scoreValue: { fontSize: 32, fontWeight: '800', color: COLORS.text },
  scoreMax: { fontSize: 11, color: COLORS.textSecondary },
  statsRow: {
    flexDirection: 'row', marginHorizontal: 16, gap: 0,
    backgroundColor: COLORS.white, borderRadius: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    overflow: 'hidden',
  },
  statBox: { flex: 1, alignItems: 'center', padding: 14 },
  statBoxMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginTop: 4 },
  section: {
    backgroundColor: COLORS.white, marginHorizontal: 16, marginTop: 12,
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  chart: { flexDirection: 'row', height: 140, marginBottom: 4 },
  yAxis: { width: 36, justifyContent: 'space-between', paddingVertical: 0 },
  yLabel: { fontSize: 10, color: COLORS.textSecondary },
  chartArea: { flex: 1, position: 'relative', overflow: 'hidden' },
  gridLine: {
    position: 'absolute', left: 0, right: 0, height: 1,
    backgroundColor: COLORS.border,
  },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', flex: 1, gap: 3, paddingTop: 4 },
  barWrapper: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: {
    backgroundColor: COLORS.primary + '40', borderTopLeftRadius: 4, borderTopRightRadius: 4,
    borderTopWidth: 2, borderTopColor: COLORS.primary, position: 'relative',
  },
  barLabel: {
    position: 'absolute', top: -20, right: -16,
    backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2,
  },
  barLabelText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginLeft: 36, marginTop: 4 },
  xLabel: { fontSize: 10, color: COLORS.textSecondary },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  sectionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionIconText: { fontSize: 18 },
  sectionContent: { flex: 1 },
  sectionLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  sectionLabel: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  sectionScore: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  progressBg: { height: 6, backgroundColor: COLORS.border, borderRadius: 3 },
  progressFill: { height: 6, borderRadius: 3 },
})