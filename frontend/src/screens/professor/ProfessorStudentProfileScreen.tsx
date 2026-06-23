import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg'
import api from '../../services/auth.service'
import type { Student } from './ProfessorStudentsScreen'

const { width: SCREEN_W } = Dimensions.get('window')

// ─── Couleurs ─────────────────────────────────────────────────────────────
const C = {
  primary:      '#1A6B4A',
  primaryLight: '#E8F5EE',
  bg:           '#FFFFFF',
  white:        '#FFFFFF',
  text:         '#1A1A1A',
  sub:          '#888',
  border:       '#EFEFEF',
  success:      '#22C55E',
  danger:       '#EF4444',
  orange:       '#F97316',
  purple:       '#7C3AED',
  blue:         '#3B82F6',
  amber:        '#F59E0B',
  teal:         '#0D9488',
}

// ─── Niveaux ──────────────────────────────────────────────────────────────
const NIVEAU_MAP: Record<string, { label: string; color: string; bg: string }> = {
  STARTER:  { label: 'Débutant',      color: '#EF4444', bg: '#FEE2E2' },
  EXPLORER: { label: 'Intermédiaire', color: '#F97316', bg: '#FFEDD5' },
  SCHOLAR:  { label: 'Avancé',        color: C.primary, bg: '#D1FAE5' },
  ACHIEVER: { label: 'Expert',        color: '#7C3AED', bg: '#EDE9FE' },
  CHAMPION: { label: 'Champion',      color: '#F59E0B', bg: '#FEF3C7' },
}

// ─── Icônes sections SAT ──────────────────────────────────────────────────
const SECTION_COLORS: Record<string, { color: string; icon: string }> = {
  'Math':                   { color: C.blue,   icon: 'calculator-outline'    },
  'Reading & Writing':      { color: C.purple, icon: 'book-outline'          },
  'Evidence-Based Reading': { color: C.orange, icon: 'document-text-outline' },
  'Math Advanced':          { color: C.teal,   icon: 'trending-up-outline'   },
  'Math - Advanced':        { color: C.teal,   icon: 'trending-up-outline'   },
}

function getSectionStyle(name: string) {
  const key = Object.keys(SECTION_COLORS).find(k =>
    name.toLowerCase().includes(k.toLowerCase()),
  )
  return SECTION_COLORS[key ?? ''] ?? { color: C.primary, icon: 'analytics-outline' }
}

// ─── Types API ────────────────────────────────────────────────────────────
interface SATProgress {
  currentScore:    number
  targetScore:     number
  globalProgress:  number
  monthlyProgress: number
  satHistory:      { date: string; score: number }[]
}

interface SATSection {
  name:     string
  score:    number
  maxScore: number
  color?:   string
}

// ─── Line Chart SVG ───────────────────────────────────────────────────────
function LineChart({ history }: { history: { date: string; score: number }[] }) {
  if (history.length === 0) {
    return (
      <View style={ch.empty}>
        <Ionicons name="analytics-outline" size={36} color={C.border} />
        <Text style={ch.emptyTxt}>Aucune session SAT enregistrée</Text>
      </View>
    )
  }

  const W       = SCREEN_W - 64
  const H       = 140
  const PAD_X   = 40
  const PAD_Y   = 16
  const CHART_W = W - PAD_X * 2
  const CHART_H = H - PAD_Y * 2

  const scores   = history.map(h => h.score)
  const minScore = Math.max(0,    Math.min(...scores) - 100)
  const maxScore = Math.min(1600, Math.max(...scores) + 100)
  const range    = maxScore - minScore || 1

  const pts = history.map((h, i) => ({
    x:     PAD_X + (i / Math.max(history.length - 1, 1)) * CHART_W,
    y:     PAD_Y + CHART_H - ((h.score - minScore) / range) * CHART_H,
    score: h.score,
    date:  h.date,
  }))

  const linePath = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`
    const prev = pts[i - 1]
    const cpx  = (prev.x + pt.x) / 2
    return `${acc} C ${cpx} ${prev.y} ${cpx} ${pt.y} ${pt.x} ${pt.y}`
  }, '')

  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`
  const last     = pts[pts.length - 1]

  return (
    <View>
      <View style={[ch.yLabels, { height: H }]}>
        {[maxScore, Math.round((maxScore + minScore) / 2), minScore].map((v, i) => (
          <Text key={i} style={ch.yLabel}>{v}</Text>
        ))}
      </View>
      <Svg width={W} height={H} style={{ marginLeft: PAD_X - 4 }}>
        <Defs>
          <SvgGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor={C.primary} stopOpacity="0.18" />
            <Stop offset="100%" stopColor={C.primary} stopOpacity="0.01" />
          </SvgGradient>
        </Defs>
        <Path d={areaPath} fill="url(#grad)" />
        <Path d={linePath} fill="none" stroke={C.primary} strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4}
            fill={C.white} stroke={C.primary} strokeWidth={2} />
        ))}
      </Svg>
      <View style={[ch.tooltip, { left: last.x + PAD_X - 4 - 22 }]}>
        <Text style={ch.tooltipTxt}>{last.score}</Text>
      </View>
      <View style={[ch.xLabels, { width: W, marginLeft: PAD_X - 4 }]}>
        {pts.map((p, i) => (
          <Text key={i} style={[ch.xLabel, { left: p.x - 18 }]} numberOfLines={1}>
            {history[i].date}
          </Text>
        ))}
      </View>
    </View>
  )
}

const ch = StyleSheet.create({
  empty:      { height: 120, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTxt:   { fontSize: 13, color: C.sub },
  yLabels:    { position: 'absolute', left: 0, top: 0, justifyContent: 'space-between', paddingVertical: 16 },
  yLabel:     { fontSize: 9, color: C.sub, textAlign: 'right', width: 34 },
  xLabels:    { position: 'relative', height: 20, marginTop: 4 },
  xLabel:     { position: 'absolute', fontSize: 9, color: C.sub, width: 36, textAlign: 'center' },
  tooltip: {
    position: 'absolute', top: 2,
    backgroundColor: C.primary, borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  tooltipTxt: { color: C.white, fontSize: 11, fontWeight: '800' },
})

// ─── Avatar ───────────────────────────────────────────────────────────────
function Avatar({ s, size = 64 }: { s: Student; size?: number }) {
  const [err, setErr] = useState(false)
  const initials = ([s.prenom?.[0], s.nom?.[0]].filter(Boolean).join('').toUpperCase()) || '?'
  return s.avatar && !err ? (
    <Image
      source={{ uri: s.avatar }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      onError={() => setErr(true)}
    />
  ) : (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: C.white, fontWeight: '800', fontSize: size * 0.34 }}>
        {initials}
      </Text>
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────
interface Props {
  student?: Student
  onBack:   () => void
  onChat?:  (studentId: string) => void
}

export default function ProfessorStudentProfileScreen({ student, onBack, onChat }: Props) {
  const [progress,   setProgress]   = useState<SATProgress | null>(null)
  const [sections,   setSections]   = useState<SATSection[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const s: Student = student ?? {
    id: '', nom: 'Étudiant', prenom: '', email: '',
    scoreSAT: 0, avgQuizScore: 0, streak: 0, niveau: 'STARTER',
  }

  const nv       = NIVEAU_MAP[s.niveau ?? 'STARTER'] ?? { label: s.niveau ?? '—', color: C.sub, bg: '#F0F0F0' }
  const fullName = `${s.prenom} ${s.nom}`.trim()

  // ── Fetch ────────────────────────────────────────────────────────────────
  // FIX : les routes backend sont /sat/progress/:userId et /sat/sections/:userId
  // (paramètre userId, pas studentId — même endpoint, nom différent)
  const fetchData = useCallback(async () => {
    if (!s.id) { setLoading(false); return }
    setError(null)
    try {
      const [progRes, secRes] = await Promise.allSettled([
        api.get(`/sat/progress/${s.id}`),   // ✅ correspond à GET /sat/progress/:userId
        api.get(`/sat/sections/${s.id}`),   // ✅ correspond à GET /sat/sections/:userId
      ])

      if (progRes.status === 'fulfilled') {
        setProgress(progRes.value.data)
      } else {
        console.warn('SAT progress error:', progRes.reason?.response?.data ?? progRes.reason)
      }

      if (secRes.status === 'fulfilled') {
        setSections(secRes.value.data?.sections ?? [])
      } else {
        console.warn('SAT sections error:', secRes.reason?.response?.data ?? secRes.reason)
      }
    } catch (e: any) {
      setError('Impossible de charger le profil.')
      console.error('fetchData error:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [s.id])

  useEffect(() => { fetchData() }, [fetchData])
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData() }, [fetchData])

  // ── Valeurs calculées ────────────────────────────────────────────────────
  const currentScore    = progress?.currentScore    ?? s.scoreSAT ?? 0
  const targetScore     = progress?.targetScore     ?? 1500
  const globalProgress  = progress?.globalProgress  ?? 0
  const monthlyProgress = progress?.monthlyProgress ?? 0
  const satHistory      = progress?.satHistory      ?? []
  const bestScore       = satHistory.length > 0
    ? Math.max(...satHistory.map(h => h.score))
    : currentScore

  return (
    <SafeAreaView style={p.safe}>

      {/* ── Header ── */}
      <View style={p.header}>
        <TouchableOpacity onPress={onBack} style={p.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={p.headerTitle}>Profil étudiant</Text>
        <TouchableOpacity style={p.backBtn} onPress={onRefresh}>
          <Ionicons name="ellipsis-horizontal" size={22} color={C.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={p.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : error ? (
        <View style={p.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={C.sub} />
          <Text style={p.errorTxt}>{error}</Text>
          <TouchableOpacity style={p.retryBtn} onPress={fetchData}>
            <Text style={p.retryTxt}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
          }
        >
          {/* ── Carte profil ── */}
          <View style={p.profileCard}>
            <Avatar s={s} size={72} />
            <View style={p.profileMid}>
              <Text style={p.profileName}>{fullName}</Text>
              <View style={[p.niveauBadge, { backgroundColor: nv.bg }]}>
                <Text style={[p.niveauTxt, { color: nv.color }]}>Niveau {nv.label}</Text>
              </View>
              {s.email ? <Text style={p.profileEmail}>{s.email}</Text> : null}
            </View>
            <View style={p.profileRight}>
              <Text style={p.satCaption}>Score SAT</Text>
              <Text style={p.satBig}>{currentScore > 0 ? currentScore : '—'}</Text>
              <Text style={p.satSub}>sur 1600</Text>
            </View>
          </View>

          {/* ── Stats ligne ── */}
          <View style={p.statsRow}>
            <View style={p.statItem}>
              <Text style={p.statLbl}>Progression</Text>
              <Text style={p.statVal}>{globalProgress}%</Text>
              <View style={p.statUnderline} />
            </View>
            <View style={p.statItem}>
              <Text style={p.statLbl}>Meilleur score</Text>
              <Text style={p.statVal}>{bestScore > 0 ? bestScore : '—'}</Text>
              <View style={p.statUnderline} />
            </View>
            <View style={p.statItem}>
              <Text style={p.statLbl}>Score cible</Text>
              <Text style={p.statVal}>{targetScore}</Text>
              <View style={p.statUnderline} />
            </View>
          </View>

          {/* ── Évolution SAT ── */}
          <View style={p.section}>
            <View style={p.sectionHead}>
              <Text style={p.sectionTitle}>Évolution du score SAT</Text>
              {satHistory.length > 0 && (
                <Text style={p.sectionMeta}>
                  {satHistory.length} session{satHistory.length > 1 ? 's' : ''}
                </Text>
              )}
            </View>
            <LineChart history={satHistory.slice(-8)} />
          </View>

          {/* ── Détail par section SAT ── */}
          <View style={p.section}>
            <Text style={p.sectionTitle}>Détail par section SAT</Text>
            {sections.length === 0 ? (
              <View style={p.emptySection}>
                <Ionicons name="bar-chart-outline" size={36} color={C.border} />
                <Text style={p.emptySectionTxt}>Aucune session SAT complétée</Text>
              </View>
            ) : (
              sections.map((sec, i) => {
                const pct   = sec.maxScore > 0 ? (sec.score / sec.maxScore) * 100 : 0
                const style = getSectionStyle(sec.name)
                const color = sec.color ?? style.color
                return (
                  <View key={i} style={p.secRow}>
                    <View style={[p.secIconWrap, { backgroundColor: color + '18' }]}>
                      <Ionicons name={style.icon as any} size={18} color={color} />
                    </View>
                    <View style={p.secContent}>
                      <View style={p.secTopRow}>
                        <Text style={p.secName}>{sec.name}</Text>
                        <Text style={[p.secScore, { color }]}>
                          {sec.score}
                          <Text style={p.secMax}>/{sec.maxScore}</Text>
                        </Text>
                      </View>
                      <View style={p.secTrack}>
                        <View style={[
                          p.secFill,
                          { width: `${Math.min(pct, 100)}%` as any, backgroundColor: color },
                        ]} />
                      </View>
                    </View>
                  </View>
                )
              })
            )}
          </View>

          {/* ── Infos supplémentaires ── */}
          <View style={p.extraRow}>
            <View style={p.extraCard}>
              <Ionicons name="flame" size={22} color={C.orange} />
              <Text style={p.extraVal}>{s.streak ?? 0}</Text>
              <Text style={p.extraLbl}>Streak (jours)</Text>
            </View>
            <View style={p.extraCard}>
              <Ionicons name="create-outline" size={22} color={C.blue} />
              <Text style={p.extraVal}>
                {s.avgQuizScore != null ? `${s.avgQuizScore}%` : '—'}
              </Text>
              <Text style={p.extraLbl}>Moy. quiz</Text>
            </View>
            <View style={p.extraCard}>
              <Ionicons name="calendar-outline" size={22} color={C.purple} />
              <Text style={p.extraVal}>
                {monthlyProgress >= 0 ? `+${monthlyProgress}%` : `${monthlyProgress}%`}
              </Text>
              <Text style={p.extraLbl}>Ce mois</Text>
            </View>
          </View>

          {/* ── Actions ── */}
          {s.email ? (
            <View style={p.section}>
              <Text style={p.sectionTitle}>Actions</Text>
              <TouchableOpacity
                style={p.actionRow}
                onPress={() => onChat?.(s.id)}
              >
                <View style={[p.actionIcon, { backgroundColor: C.primaryLight }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color={C.primary} />
                </View>
                <Text style={p.actionLbl}>Envoyer un message</Text>
                <Ionicons name="chevron-forward" size={16} color="#CCC" />
              </TouchableOpacity>
              <View style={p.divider} />
              <TouchableOpacity style={p.actionRow}>
                <View style={[p.actionIcon, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="bar-chart-outline" size={20} color={C.purple} />
                </View>
                <Text style={p.actionLbl}>Voir l'historique complet</Text>
                <Ionicons name="chevron-forward" size={16} color="#CCC" />
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────
const p = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorTxt: { fontSize: 15, color: '#888', textAlign: 'center' },
  retryBtn: { backgroundColor: '#1A6B4A', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 13 },
  retryTxt: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EFEFEF',
  },
  backBtn:     { padding: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },

  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', margin: 16, borderRadius: 20, padding: 16, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
  },
  profileMid:   { flex: 1 },
  profileName:  { fontSize: 17, fontWeight: '800', color: '#1A1A1A', marginBottom: 6 },
  niveauBadge:  { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 5 },
  niveauTxt:    { fontSize: 12, fontWeight: '700' },
  profileEmail: { fontSize: 11, color: '#888' },
  profileRight: { alignItems: 'flex-end' },
  satCaption:   { fontSize: 10, color: '#888' },
  satBig:       { fontSize: 36, fontWeight: '900', color: '#1A1A1A', lineHeight: 42 },
  satSub:       { fontSize: 10, color: '#888' },

  statsRow: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    marginHorizontal: 16, borderRadius: 18,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, overflow: 'hidden',
  },
  statItem:      { flex: 1, alignItems: 'center', paddingVertical: 18, gap: 4 },
  statLbl:       { fontSize: 10, color: '#888' },
  statVal:       { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  statUnderline: { width: 24, height: 3, backgroundColor: '#1A6B4A', borderRadius: 2, marginTop: 3 },

  section: {
    backgroundColor: '#FFFFFF', marginHorizontal: 16, marginTop: 14,
    borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  sectionHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  sectionMeta:  { fontSize: 12, color: '#888' },

  emptySection:    { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptySectionTxt: { fontSize: 13, color: '#888' },

  secRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  secIconWrap:{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  secContent: { flex: 1 },
  secTopRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  secName:    { fontSize: 13, fontWeight: '600', color: '#1A1A1A', flex: 1 },
  secScore:   { fontSize: 14, fontWeight: '800' },
  secMax:     { fontSize: 11, fontWeight: '400', color: '#888' },
  secTrack:   { height: 6, backgroundColor: '#EFEFEF', borderRadius: 3, overflow: 'hidden' },
  secFill:    { height: 6, borderRadius: 3 },

  extraRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 14, gap: 10 },
  extraCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16,
    alignItems: 'center', paddingVertical: 14, gap: 4,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  extraVal: { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  extraLbl: { fontSize: 9, color: '#888', textAlign: 'center' },

  actionRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLbl:  { flex: 1, fontSize: 14, color: '#1A1A1A', fontWeight: '500' },
  divider:    { height: 1, backgroundColor: '#EFEFEF', marginVertical: 6 },
})