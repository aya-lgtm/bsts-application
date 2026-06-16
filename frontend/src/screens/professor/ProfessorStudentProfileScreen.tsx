import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import api from '../../services/auth.service'

// ─── Couleurs ─────────────────────────────────────────────────────────────
const COLORS = {
  primary:       '#0D6B5E',
  primaryLight:  '#E8F5F3',
  bg:            '#F5F7F6',
  white:         '#FFFFFF',
  text:          '#1A1A2E',
  textSecondary: '#6B7280',
  border:        '#E5E7EB',
  success:       '#10B981',
  danger:        '#EF4444',
  orange:        '#F97316',
  purple:        '#7C3AED',
  blue:          '#3B82F6',
  teal:          '#14B8A6',
}

// ─── Types ────────────────────────────────────────────────────────────────
// Objet passé depuis ProfessorStudentsScreen
interface StudentBasic {
  id:           string
  nom:          string
  prenom:       string
  email?:       string
  scoreSAT?:    number
  avgQuizScore?: number
  streak?:      number
  niveau?:      string
}

// GET /sat/progress/:userId
interface SATProgress {
  currentScore:    number
  targetScore:     number
  globalProgress:  number
  monthlyProgress: number
  satHistory:      { date: string; score: number }[]
}

// GET /sat/sections/:userId
interface SATSection {
  name:     string
  score:    number
  maxScore: number
  color:    string
}

// ─── Niveau → label + couleur ─────────────────────────────────────────────
const NIVEAU_MAP: Record<string, { label: string; color: string }> = {
  STARTER:  { label: 'Débutant',      color: COLORS.danger  },
  EXPLORER: { label: 'Intermédiaire', color: COLORS.orange  },
  SCHOLAR:  { label: 'Avancé',        color: COLORS.success },
  ACHIEVER: { label: 'Expert',        color: COLORS.primary },
  CHAMPION: { label: 'Champion',      color: COLORS.purple  },
}

function makeInitials(s: StudentBasic): string {
  return ([s.prenom?.[0], s.nom?.[0]].filter(Boolean).join('').toUpperCase()) || '?'
}

// ─── Mini bar chart ───────────────────────────────────────────────────────
function BarChart({ history }: { history: { date: string; score: number }[] }) {
  if (history.length === 0) return (
    <View style={chart.empty}>
      <Text style={chart.emptyText}>Aucune session SAT enregistrée</Text>
    </View>
  )

  const scores  = history.map(h => h.score)
  const maxVal  = Math.max(...scores, 1600)
  const minVal  = 400
  const range   = maxVal - minVal

  return (
    <View style={chart.wrap}>
      {/* Y axis */}
      <View style={chart.yAxis}>
        {[maxVal, Math.round((maxVal + minVal) / 2), minVal].map((v, i) => (
          <Text key={i} style={chart.yLabel}>{v}</Text>
        ))}
      </View>

      {/* Bars */}
      <View style={chart.barsArea}>
        {history.map((h, i) => {
          const pct    = ((h.score - minVal) / range) * 100
          const isLast = i === history.length - 1
          return (
            <View key={i} style={chart.barCol}>
              {isLast && (
                <View style={chart.topLabel}>
                  <Text style={chart.topLabelText}>{h.score}</Text>
                </View>
              )}
              <View style={[
                chart.bar,
                { height: `${Math.max(pct, 3)}%` as any },
                isLast && chart.barLast,
              ]} />
              <Text style={chart.xLabel} numberOfLines={1}>{h.date}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const chart = StyleSheet.create({
  wrap:    { height: 160, flexDirection: 'row', marginTop: 8 },
  yAxis:   { width: 34, justifyContent: 'space-between', paddingBottom: 22 },
  yLabel:  { fontSize: 9, color: COLORS.textSecondary, textAlign: 'right' },
  barsArea:{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 3, paddingBottom: 22 },
  barCol:  { flex: 1, alignItems: 'center', justifyContent: 'flex-end', position: 'relative' },
  topLabel:{
    position: 'absolute', top: -20,
    backgroundColor: COLORS.primary, borderRadius: 6,
    paddingHorizontal: 4, paddingVertical: 2,
  },
  topLabelText: { color: COLORS.white, fontSize: 9, fontWeight: '700' },
  bar: {
    width: '80%',
    backgroundColor: COLORS.primaryLight,
    borderTopLeftRadius: 4, borderTopRightRadius: 4,
    borderTopWidth: 2, borderTopColor: COLORS.primary + '60',
  },
  barLast:  { backgroundColor: COLORS.primary + '55', borderTopColor: COLORS.primary },
  xLabel:   { position: 'absolute', bottom: 0, fontSize: 8, color: COLORS.textSecondary, textAlign: 'center' },
  empty:    { height: 100, alignItems: 'center', justifyContent: 'center' },
  emptyText:{ fontSize: 13, color: COLORS.textSecondary },
})

// ─── Section icon ─────────────────────────────────────────────────────────
const SECTION_ICONS: Record<string, string> = {
  'Math':                   'calculator-outline',
  'Reading & Writing':      'book-outline',
  'Evidence-Based Reading': 'document-text-outline',
  'Math Advanced':          'trending-up-outline',
}

// ─── Main Screen ──────────────────────────────────────────────────────────
interface Props {
  student?: StudentBasic
  onBack:   () => void
}

export default function ProfessorStudentProfileScreen({ student, onBack }: Props) {
  const [progress,   setProgress]   = useState<SATProgress | null>(null)
  const [sections,   setSections]   = useState<SATSection[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Fallback si pas de student passé
  const s: StudentBasic = student ?? {
    id: '', nom: 'Khan', prenom: 'Adam',
    scoreSAT: 0, avgQuizScore: 0, streak: 0, niveau: 'STARTER',
  }

  const niveau     = NIVEAU_MAP[s.niveau ?? 'STARTER'] ?? { label: s.niveau ?? '—', color: COLORS.textSecondary }
  const initials   = makeInitials(s)
  const fullName   = `${s.prenom} ${s.nom}`

  // ── Fetch ────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!s.id) { setLoading(false); return }
    try {
      const [progRes, secRes] = await Promise.allSettled([
        // GET /sat/progress/:userId → { currentScore, targetScore, globalProgress, monthlyProgress, satHistory }
        api.get(`/sat/progress/${s.id}`),
        // GET /sat/sections/:userId → { sections: [{ name, score, maxScore, color }] }
        api.get(`/sat/sections/${s.id}`),
      ])

      if (progRes.status === 'fulfilled') {
        setProgress(progRes.value.data)
      }
      if (secRes.status === 'fulfilled') {
        setSections(secRes.value.data?.sections ?? [])
      }
    } catch (e) {
      console.warn('ProfessorStudentProfile fetch error:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [s.id])

  useEffect(() => { fetchData() }, [fetchData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchData()
  }, [fetchData])

  // ── Valeurs affichées ─────────────────────────────────────────────────
  const currentScore    = progress?.currentScore    ?? s.scoreSAT    ?? 0
  const targetScore     = progress?.targetScore     ?? 1500
  const globalProgress  = progress?.globalProgress  ?? 0
  const monthlyProgress = progress?.monthlyProgress ?? 0
  const satHistory      = progress?.satHistory      ?? []
  const bestScore       = satHistory.length > 0
    ? Math.max(...satHistory.map(h => h.score))
    : currentScore

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil étudiant</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        >
          {/* ── Profile Card ── */}
          <View style={styles.profileCard}>
            <View style={styles.profileLeft}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.studentName}>{fullName}</Text>
                {s.email ? <Text style={styles.studentEmail}>{s.email}</Text> : null}
                <View style={[styles.niveauBadge, { backgroundColor: niveau.color + '18' }]}>
                  <View style={[styles.niveauDot, { backgroundColor: niveau.color }]} />
                  <Text style={[styles.niveauText, { color: niveau.color }]}>{niveau.label}</Text>
                </View>
              </View>
            </View>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>Score SAT</Text>
              <Text style={styles.scoreValue}>{currentScore > 0 ? currentScore : '—'}</Text>
              <Text style={styles.scoreMax}>/ 1600</Text>
            </View>
          </View>

          {/* ── Stats Row ── */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Ionicons name="trending-up-outline" size={16} color={COLORS.primary} />
              <Text style={styles.statValue}>{globalProgress}%</Text>
              <Text style={styles.statLabel}>Progression</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxMid]}>
              <Ionicons name="trophy-outline" size={16} color={COLORS.success} />
              <Text style={[styles.statValue, { color: COLORS.success }]}>
                {bestScore > 0 ? bestScore : '—'}
              </Text>
              <Text style={styles.statLabel}>Meilleur score</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="flag-outline" size={16} color={COLORS.orange} />
              <Text style={[styles.statValue, { color: COLORS.orange }]}>{targetScore}</Text>
              <Text style={styles.statLabel}>Score cible</Text>
            </View>
          </View>

          {/* ── Extra stats ── */}
          <View style={styles.extraStats}>
            <View style={styles.extraStatCard}>
              <Ionicons name="flame-outline" size={20} color={COLORS.orange} />
              <Text style={styles.extraStatValue}>{s.streak ?? 0}</Text>
              <Text style={styles.extraStatLabel}>Streak (jours)</Text>
            </View>
            <View style={styles.extraStatCard}>
              <Ionicons name="create-outline" size={20} color={COLORS.blue} />
              <Text style={styles.extraStatValue}>
                {s.avgQuizScore != null ? `${s.avgQuizScore}%` : '—'}
              </Text>
              <Text style={styles.extraStatLabel}>Moy. quiz</Text>
            </View>
            <View style={styles.extraStatCard}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.purple} />
              <Text style={styles.extraStatValue}>
                {monthlyProgress >= 0 ? `+${monthlyProgress}%` : `${monthlyProgress}%`}
              </Text>
              <Text style={styles.extraStatLabel}>Ce mois</Text>
            </View>
          </View>

          {/* ── Évolution SAT ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Évolution du score SAT</Text>
              {satHistory.length > 0 && (
                <Text style={styles.sectionMeta}>{satHistory.length} session{satHistory.length > 1 ? 's' : ''}</Text>
              )}
            </View>
            <BarChart history={satHistory.slice(-8)} />
          </View>

          {/* ── Sections SAT ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Détail par section SAT</Text>
            {sections.length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="bar-chart-outline" size={36} color={COLORS.textSecondary} />
                <Text style={styles.emptySectionText}>Aucune session SAT complétée</Text>
              </View>
            ) : (
              sections.map((sec, i) => {
                const pct     = sec.maxScore > 0 ? (sec.score / sec.maxScore) * 100 : 0
                const iconKey = Object.keys(SECTION_ICONS).find(k => sec.name.includes(k.split(' ')[0]))
                const icon    = SECTION_ICONS[iconKey ?? ''] ?? 'analytics-outline'
                const color   = sec.color ?? COLORS.primary
                return (
                  <View key={i} style={styles.secRow}>
                    <View style={[styles.secIcon, { backgroundColor: color + '18' }]}>
                      <Ionicons name={icon as any} size={18} color={color} />
                    </View>
                    <View style={styles.secContent}>
                      <View style={styles.secLabelRow}>
                        <Text style={styles.secLabel}>{sec.name}</Text>
                        <Text style={[styles.secScore, { color }]}>
                          {sec.score}<Text style={styles.secMax}>/{sec.maxScore}</Text>
                        </Text>
                      </View>
                      <View style={styles.progressBg}>
                        <View style={[
                          styles.progressFill,
                          { width: `${Math.min(pct, 100)}%` as any, backgroundColor: color },
                        ]} />
                      </View>
                      <Text style={styles.secPct}>{Math.round(pct)}%</Text>
                    </View>
                  </View>
                )
              })
            )}
          </View>

          {/* ── Contacter l'étudiant ── */}
          {s.email && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Actions</Text>
              <TouchableOpacity style={styles.actionRow}>
                <View style={styles.actionIcon}>
                  <Ionicons name="chatbubble-outline" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.actionLabel}>Envoyer un message</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn:     { padding: 6 },
  refreshBtn:  { padding: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },

  // Profile card
  profileCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.white, margin: 16, borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  profileLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText:   { color: COLORS.white, fontWeight: '800', fontSize: 20 },
  studentName:  { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  studentEmail: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },
  niveauBadge:  {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  niveauDot:    { width: 6, height: 6, borderRadius: 3 },
  niveauText:   { fontSize: 12, fontWeight: '700' },
  scoreBox:     { alignItems: 'flex-end' },
  scoreLabel:   { fontSize: 11, color: COLORS.textSecondary },
  scoreValue:   { fontSize: 34, fontWeight: '800', color: COLORS.text, lineHeight: 40 },
  scoreMax:     { fontSize: 11, color: COLORS.textSecondary },

  // Stats Row
  statsRow: {
    flexDirection: 'row', marginHorizontal: 16,
    backgroundColor: COLORS.white, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statBox:    { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 },
  statBoxMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border },
  statLabel:  { fontSize: 10, color: COLORS.textSecondary, textAlign: 'center' },
  statValue:  { fontSize: 20, fontWeight: '800', color: COLORS.text },

  // Extra stats
  extraStats: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 10, gap: 10,
  },
  extraStatCard: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: 14,
    alignItems: 'center', paddingVertical: 12, gap: 4,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  extraStatValue: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  extraStatLabel: { fontSize: 10, color: COLORS.textSecondary, textAlign: 'center' },

  // Section
  section: {
    backgroundColor: COLORS.white, marginHorizontal: 16, marginTop: 12,
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionTitle:  { fontSize: 15, fontWeight: '700', color: COLORS.text },
  sectionMeta:   { fontSize: 12, color: COLORS.textSecondary },

  // Empty section
  emptySection:     { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptySectionText: { fontSize: 13, color: COLORS.textSecondary },

  // SAT sections
  secRow:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 10 },
  secIcon:     { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  secContent:  { flex: 1 },
  secLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  secLabel:    { fontSize: 13, color: COLORS.text, fontWeight: '600', flex: 1, marginRight: 8 },
  secScore:    { fontSize: 14, fontWeight: '800' },
  secMax:      { fontSize: 11, fontWeight: '400', color: COLORS.textSecondary },
  progressBg:  { height: 6, backgroundColor: COLORS.border, borderRadius: 3 },
  progressFill:{ height: 6, borderRadius: 3 },
  secPct:      { fontSize: 10, color: COLORS.textSecondary, marginTop: 3, textAlign: 'right' },

  // Actions
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4,
  },
  actionIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '500' },
})