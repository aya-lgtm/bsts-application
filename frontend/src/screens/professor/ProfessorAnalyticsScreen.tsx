import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const COLORS = {
  primary: '#0D6B5E',
  primaryLight: '#E8F5F3',
  bg: '#F7F8FA',
  white: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
  orange: '#F97316',
  blue: '#3B82F6',
  purple: '#7C3AED',
}

const scoreDistribution = [
  { label: '1400+', percent: 20, count: 37, color: COLORS.primary },
  { label: '1200 - 1400', percent: 35, count: 65, color: COLORS.blue },
  { label: '1000 - 1200', percent: 30, count: 55, color: COLORS.orange },
  { label: '800 - 1000', percent: 10, count: 18, color: COLORS.purple },
  { label: 'Moins de 800', percent: 5, count: 9, color: '#EF4444' },
]

const trendData = [980, 1040, 1100, 1160, 1200, 1240]
const trendLabels = ['Fév', 'Mar', 'Avr', 'Mai', 'Juin', "Aujourd'hui"]

interface Props {
  onNavigate: (screen: string, params?: any) => void
}

export default function ProfessorAnalyticsScreen({ onNavigate }: Props) {
  const [period, setPeriod] = useState('30 derniers jours')

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Analyses SAT (Classe/Groupe)</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodRow}>
          <TouchableOpacity style={styles.periodBtn}>
            <Text style={styles.periodBtnText}>📅 {period} ▾</Text>
          </TouchableOpacity>
        </View>

        {/* Top Stats */}
        <View style={styles.topStats}>
          <View style={styles.topStat}>
            <Text style={styles.topStatLabel}>Score SAT moyen</Text>
            <View style={styles.topStatValueRow}>
              <Text style={styles.topStatValue}>1240</Text>
              <Text style={styles.topStatArrow}>↑</Text>
            </View>
          </View>
          <View style={[styles.topStat, styles.topStatMid]}>
            <Text style={styles.topStatLabel}>Taux réussite moyen</Text>
            <View style={styles.topStatValueRow}>
              <Text style={styles.topStatValue}>78%</Text>
              <Text style={styles.topStatArrow}>↑</Text>
            </View>
          </View>
          <View style={styles.topStat}>
            <Text style={styles.topStatLabel}>Amélioration moyenne</Text>
            <Text style={[styles.topStatValue, { color: COLORS.success }]}>+120{'\n'}points</Text>
          </View>
        </View>

        {/* Score Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Répartition des scores SAT</Text>
          <View style={styles.distributionContainer}>
            {/* Donut Chart (simplified) */}
            <View style={styles.donutWrapper}>
              <View style={styles.donut}>
                <Text style={styles.donutCenter}>184</Text>
                <Text style={styles.donutLabel}>Étudiants</Text>
              </View>
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              {scoreDistribution.map((item, i) => (
                <View key={i} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendLabel}>{item.label}</Text>
                  <Text style={styles.legendPercent}>{item.percent}%</Text>
                  <Text style={styles.legendCount}>({item.count})</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Distribution bars */}
          <View style={styles.distBars}>
            {scoreDistribution.map((item, i) => (
              <View key={i} style={styles.distBarRow}>
                <View style={[styles.distBar, { width: `${item.percent * 2}%` as any, backgroundColor: item.color }]} />
              </View>
            ))}
          </View>
        </View>

        {/* Score Trend */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Évolution du score moyen</Text>

          {/* Simple bar chart */}
          <View style={styles.trendChart}>
            <View style={styles.trendBars}>
              {trendData.map((val, i) => {
                const h = ((val - 800) / 600) * 100
                const isLast = i === trendData.length - 1
                return (
                  <View key={i} style={styles.trendBarWrapper}>
                    {isLast && (
                      <View style={styles.trendBarLabel}>
                        <Text style={styles.trendBarLabelText}>{val}</Text>
                      </View>
                    )}
                    <View style={[
                      styles.trendBar,
                      { height: `${h}%` as any },
                      isLast ? styles.trendBarActive : {},
                    ]} />
                    <Text style={styles.trendBarX}>{trendLabels[i]}</Text>
                  </View>
                )
              })}
            </View>
            <View style={styles.trendYAxis}>
              {[1240, 1160, 1100, 1040, 980, 200].map((v, i) => (
                <Text key={i} style={styles.trendYLabel}>{i < 5 ? v : ''}</Text>
              ))}
            </View>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  scroll: { flex: 1 },
  periodRow: { paddingHorizontal: 16, paddingVertical: 12, alignItems: 'flex-end' },
  periodBtn: {
    backgroundColor: COLORS.white, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  periodBtnText: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  topStats: {
    flexDirection: 'row', marginHorizontal: 16,
    backgroundColor: COLORS.white, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  topStat: { flex: 1, padding: 14 },
  topStatMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border },
  topStatLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 6 },
  topStatValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  topStatValue: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  topStatArrow: { fontSize: 16, color: COLORS.success },
  section: {
    backgroundColor: COLORS.white, marginHorizontal: 16, marginTop: 12,
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  distributionContainer: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  donutWrapper: { alignItems: 'center', justifyContent: 'center' },
  donut: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 14, borderColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  donutCenter: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  donutLabel: { fontSize: 10, color: COLORS.textSecondary },
  legend: { flex: 1, gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: COLORS.text, flex: 1 },
  legendPercent: { fontSize: 11, fontWeight: '700', color: COLORS.text },
  legendCount: { fontSize: 11, color: COLORS.textSecondary },
  distBars: { marginTop: 14, gap: 4 },
  distBarRow: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  distBar: { height: 8, borderRadius: 4 },
  trendChart: { flexDirection: 'row-reverse', height: 160 },
  trendBars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingBottom: 24 },
  trendBarWrapper: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', position: 'relative' },
  trendBarLabel: {
    position: 'absolute', top: -20, backgroundColor: COLORS.primary,
    borderRadius: 6, paddingHorizontal: 4, paddingVertical: 2,
  },
  trendBarLabelText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },
  trendBar: {
    width: '80%', backgroundColor: COLORS.primaryLight,
    borderTopLeftRadius: 4, borderTopRightRadius: 4,
    borderTopWidth: 2, borderTopColor: COLORS.primary + '60',
  },
  trendBarActive: { backgroundColor: COLORS.primary + '50', borderTopColor: COLORS.primary },
  trendBarX: { position: 'absolute', bottom: 0, fontSize: 9, color: COLORS.textSecondary },
  trendYAxis: { width: 36, justifyContent: 'space-between', paddingVertical: 0, paddingBottom: 24 },
  trendYLabel: { fontSize: 9, color: COLORS.textSecondary, textAlign: 'right' },
})