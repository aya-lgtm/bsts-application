import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import * as SecureStore from 'expo-secure-store'
import api from '../../services/auth.service'

// ─── Logo local ───────────────────────────────────────────────────────────
const LOGO = require('../../assets/logo1.png')   // ← ajuste le chemin selon ton arbo

// ─── Palette ──────────────────────────────────────────────────────────────
const C = {
  primary:   '#0D6B5E',
  primaryBg: '#E8F5F3',
  bg:        '#FFFFFF',
  text:      '#111111',
  sub:       '#888888',
  border:    '#F0F0F0',
  success:   '#22C55E',
  orange:    '#F97316',
  blue:      '#3B82F6',
  purple:    '#8B5CF6',
  red:       '#EF4444',
  white:     '#FFFFFF',
}

// ─── Types ────────────────────────────────────────────────────────────────
interface UserData {
  id: string; nom: string; prenom: string; email: string
  photo?: string; matieres?: string[]
}
interface ProfStats { totalStudents: number; totalQuizzes: number; avgStudentScore: number }
interface StudentActivity {
  id: string; studentName: string; title: string
  subtitle: string; date: string; icon: string; iconColor: string
}
interface ConvMessage { isRead: boolean; senderId: string; content?: string; createdAt?: string }
interface Conversation { id: string; Messages?: ConvMessage[]; members?: any[] }

// ─── Helpers ──────────────────────────────────────────────────────────────
function ProfileAvatar({ photo, prenom, nom, size = 66 }: {
  photo?: string; prenom?: string; nom?: string; size?: number
}) {
  const [err, setErr] = useState(false)
  const initials = ([prenom?.[0], nom?.[0]].filter(Boolean).join('').toUpperCase()) || 'PR'
  if (photo && !err) {
    return (
      <Image
        source={{ uri: photo }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        onError={() => setErr(true)}
      />
    )
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: C.white, fontWeight: '800', fontSize: size * 0.33 }}>{initials}</Text>
    </View>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────
interface Props { onNavigate: (screen: string, params?: any) => void }

export default function ProfessorHomeScreen({ onNavigate }: Props) {
  const [user,         setUser]        = useState<UserData | null>(null)
  const [stats,        setStats]       = useState<ProfStats | null>(null)
  const [activity,     setActivity]    = useState<StudentActivity[]>([])
  const [unreadMsgs,   setUnreadMsgs]  = useState(0)
  const [totalCours,   setTotalCours]  = useState<number | null>(null)
  const [loadingStats, setLoadingStats]= useState(true)
  const [loadingAct,   setLoadingAct]  = useState(true)
  const [refreshing,   setRefreshing]  = useState(false)

  const loadUser = useCallback(async () => {
    try { const s = await SecureStore.getItemAsync('user'); if (s) setUser(JSON.parse(s)) } catch (_) {}
  }, [])

  // GET /users/professor/stats
  const fetchStats = useCallback(async () => {
    try { const r = await api.get('/users/professor/stats'); setStats(r.data) }
    catch (_) { setStats(null) } finally { setLoadingStats(false) }
  }, [])

  // GET /course — cours actifs
  const fetchCours = useCallback(async () => {
    try {
      const r = await api.get('/course')
      const l = r.data?.courses ?? r.data?.data ?? []
      setTotalCours(Array.isArray(l) ? l.length : null)
    } catch (_) { setTotalCours(null) }
  }, [])

  // GET /users/professor/students/activity
  const fetchActivity = useCallback(async () => {
    try { const r = await api.get('/users/professor/students/activity', { params: { limit: 5 } }); setActivity(r.data?.activity ?? []) }
    catch (_) { setActivity([]) } finally { setLoadingAct(false) }
  }, [])

  // GET /chat/ — messages non lus
  const fetchUnread = useCallback(async () => {
    try {
      const s  = await SecureStore.getItemAsync('user')
      const id = s ? JSON.parse(s).id : ''
      const r  = await api.get('/chat/')
      const cs: Conversation[] = r.data?.conversations ?? []
      setUnreadMsgs(cs.reduce((a, c) => a + (c.Messages ?? []).filter(m => !m.isRead && m.senderId !== id).length, 0))
    } catch (_) { setUnreadMsgs(0) }
  }, [])

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchStats(), fetchCours(), fetchActivity(), fetchUnread()])
  }, [fetchStats, fetchCours, fetchActivity, fetchUnread])

  useEffect(() => { loadUser(); fetchAll() }, [loadUser, fetchAll])

  const onRefresh = useCallback(async () => {
    setRefreshing(true); setLoadingStats(true); setLoadingAct(true)
    await Promise.all([loadUser(), fetchAll()])
    setRefreshing(false)
  }, [loadUser, fetchAll])

  const prenom   = user?.prenom ?? ''
  const nom      = user?.nom    ?? ''
  const satMoyen = stats?.avgStudentScore
    ? Math.round(400 + (stats.avgStudentScore / 100) * 1200) : 0

  // ── 6 stats en 2 lignes de 3 ──────────────────────────────────────────
  // Icônes EXACTEMENT depuis Ionicons comme dans la maquette
  const statsRow1 = [
    {
      // Maquette : icône silhouettes de personnes
      icon: 'people-outline' as const,
      value: loadingStats ? null : String(stats?.totalStudents ?? '—'),
      label: 'Étudiants',
      color: C.primary, bg: C.primaryBg,
      onPress: () => onNavigate('etudiants'),
    },
    {
      // Maquette : icône livre ouvert
      icon: 'book-outline' as const,
      value: totalCours !== null ? String(totalCours) : '—',
      label: 'Cours actifs',
      color: '#7C3AED', bg: '#EDE9FE',
      onPress: () => onNavigate('cours'),
    },
    {
      // Maquette : icône presse-papier / liste
      icon: 'document-text-outline' as const,
      value: loadingStats ? null : String(stats?.totalQuizzes ?? '—'),
      label: 'Quiz créés',
      color: '#0EA5E9', bg: '#E0F2FE',
      onPress: () => onNavigate('quiz'),
    },
  ]

  const statsRow2 = [
    {
      // Maquette : bulle de chat
      icon: 'chatbubble-ellipses-outline' as const,
      value: String(unreadMsgs),
      label: 'Messages non lus',
      color: C.blue, bg: '#EFF6FF',
      onPress: () => onNavigate('chat'),
    },
    {
      // Maquette : cercle avec cible / check animé
      icon: 'radio-button-on-outline' as const,
      value: loadingStats ? null : `${stats?.avgStudentScore ?? '—'}%`,
      label: 'Taux réussite moyen',
      color: C.success, bg: '#F0FDF4',
    },
    {
      // Maquette : flèche montante (trending up)
      icon: 'trending-up-outline' as const,
      value: loadingStats ? null : (satMoyen > 0 ? String(satMoyen) : '—'),
      label: 'Score SAT moyen',
      color: C.orange, bg: '#FFF7ED',
    },
  ]

  // ── Actions rapides — sans "Voir les résultats" (pas de page dédiée) ──
  // Remplacé par "Mes étudiants" qui existe
  const quickActions = [
    {
      // Maquette : boîte 3D / colis
      icon: 'cube-outline' as const,
      label: 'Ajouter\nun cours',
      color: C.primary, bg: C.primaryBg,
      screen: 'cours',
    },
    {
      // Maquette : enveloppe crayon
      icon: 'mail-outline' as const,
      label: 'Créer\nun quiz',
      color: '#7C3AED', bg: '#EDE9FE',
      screen: 'quiz',
    },
    {
      // Remplace "Voir résultats" → "Mes étudiants"
      icon: 'people-circle-outline' as const,
      label: 'Mes\nétudiants',
      color: C.orange, bg: '#FFF7ED',
      screen: 'etudiants',
    },
    {
      // Maquette : bulle chat ronde
      icon: 'chatbubble-outline' as const,
      label: 'Ouvrir\nle chat',
      color: C.blue, bg: '#EFF6FF',
      screen: 'chat',
    },
  ]

  // ─────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={st.safe}>
      <ScrollView
        style={st.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
      >

        {/* ══ HEADER : hamburger | logo PNG | cloche ═══════════════════════ */}
        <View style={st.header}>

          {/* Hamburger — 3 lignes dont la 3ème plus courte (Ionicons: menu) */}
          <TouchableOpacity
            onPress={() => onNavigate('menu')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="menu-outline" size={30} color={C.text} />
          </TouchableOpacity>

          {/* Logo PNG BSTS */}
          <Image
            source={LOGO}
            style={st.logo}
            resizeMode="contain"
          />

          {/* Cloche — navigue vers notifications */}
          <TouchableOpacity
            onPress={() => onNavigate('notifications')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={st.bellWrap}
          >
            <Ionicons name="notifications-outline" size={26} color={C.text} />
            {unreadMsgs > 0 && (
              <View style={st.bellBadge}>
                <Text style={st.bellBadgeText}>{unreadMsgs > 9 ? '9+' : unreadMsgs}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ══ HERO : Bonjour + photo ════════════════════════════════════════ */}
        <View style={st.hero}>
          <View style={st.heroLeft}>
            <Text style={st.heroGreeting}>Bonjour,</Text>
            <Text style={st.heroName}>Prof. {prenom} {nom} 👋</Text>
            <Text style={st.heroSub}>Voici un aperçu de votre activité aujourd'hui.</Text>
          </View>
          <TouchableOpacity onPress={() => onNavigate('profil')} activeOpacity={0.85}>
            <ProfileAvatar photo={user?.photo} prenom={prenom} nom={nom} size={68} />
          </TouchableOpacity>
        </View>

        {/* ══ STATS LIGNE 1 ════════════════════════════════════════════════ */}
        <View style={st.statsRow}>
          {statsRow1.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={st.statCard}
              onPress={s.onPress}
              activeOpacity={0.78}
            >
              <View style={[st.statCircle, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon} size={22} color={s.color} />
              </View>
              {s.value === null
                ? <ActivityIndicator size="small" color={s.color} style={{ marginVertical: 4 }} />
                : <Text style={[st.statNum, { color: s.color }]}>{s.value}</Text>
              }
              <Text style={st.statLbl}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ══ STATS LIGNE 2 ════════════════════════════════════════════════ */}
        <View style={[st.statsRow, { marginTop: 10 }]}>
          {statsRow2.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={st.statCard}
              onPress={(s as any).onPress}
              activeOpacity={(s as any).onPress ? 0.78 : 1}
            >
              <View style={[st.statCircle, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon} size={22} color={s.color} />
              </View>
              {s.value === null
                ? <ActivityIndicator size="small" color={s.color} style={{ marginVertical: 4 }} />
                : <Text style={[st.statNum, { color: s.color }]}>{s.value}</Text>
              }
              <Text style={st.statLbl} numberOfLines={2}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ══ ACTIVITÉ RÉCENTE ═════════════════════════════════════════════ */}
        {/* GET /users/professor/students/activity — limit 5 */}
        <View style={st.section}>
          <View style={st.sectionHead}>
            <Text style={st.sectionTitle}>Activité récente</Text>
            <TouchableOpacity onPress={() => onNavigate('etudiants')}>
              <Text style={st.seeAll}>Voir tout &gt;</Text>
            </TouchableOpacity>
          </View>

          {loadingAct ? (
            <ActivityIndicator color={C.primary} style={{ marginVertical: 24 }} />
          ) : activity.length === 0 ? (
            <View style={st.emptyWrap}>
              <Ionicons name="time-outline" size={34} color="#CCC" />
              <Text style={st.emptyTxt}>Aucune activité récente</Text>
            </View>
          ) : (
            activity.map((a, i) => {
              const ico   = (a.icon ?? 'notifications-outline') as keyof typeof Ionicons.glyphMap
              const color = a.iconColor ?? C.primary
              return (
                <View key={a.id} style={[st.actRow, i < activity.length - 1 && st.actBorder]}>
                  <View style={[st.actCircle, { backgroundColor: color + '18' }]}>
                    <Ionicons name={ico} size={20} color={color} />
                  </View>
                  <View style={st.actBody}>
                    <Text style={st.actTitle}>
                      <Text style={{ fontWeight: '700' }}>{a.studentName}</Text>
                      {'  '}{a.title}
                    </Text>
                    {a.subtitle ? <Text style={st.actSub}>{a.subtitle}</Text> : null}
                  </View>
                  <Text style={st.actDate}>{a.date}</Text>
                </View>
              )
            })
          )}
        </View>

        {/* ══ ACTIONS RAPIDES ══════════════════════════════════════════════ */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Actions rapides</Text>
          <View style={st.quickRow}>
            {quickActions.map((a, i) => (
              <TouchableOpacity
                key={i}
                style={st.quickCard}
                onPress={() => onNavigate(a.screen)}
                activeOpacity={0.75}
              >
                <View style={[st.quickBox, { backgroundColor: a.bg }]}>
                  <Ionicons name={a.icon} size={26} color={a.color} />
                </View>
                <Text style={st.quickLbl}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 36 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: C.bg },
  scroll:{ flex: 1, backgroundColor: C.bg },

  // ── Header ──────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4,
    backgroundColor: C.bg,
  },
  logo: {
    width: 56, height: 56,
  },
  bellWrap:      { position: 'relative', padding: 4 },
  bellBadge: {
    position: 'absolute', top: 0, right: 0,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: C.red,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2, borderColor: C.white,
  },
  bellBadgeText: { color: C.white, fontSize: 9, fontWeight: '900' },

  // ── Hero ────────────────────────────────────────────────────────────
  hero: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 22,
  },
  heroLeft:     { flex: 1, paddingRight: 14 },
  heroGreeting: { fontSize: 14, color: C.sub },
  heroName:     { fontSize: 22, fontWeight: '900', color: C.text, marginTop: 2, lineHeight: 30 },
  heroSub:      { fontSize: 12, color: C.sub, marginTop: 5, lineHeight: 18 },

  // ── Stats ────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row', paddingHorizontal: 16, gap: 10,
  },
  statCard: {
    flex: 1, backgroundColor: C.bg, borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 6,
    alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 3,
  },
  statCircle: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  statNum: { fontSize: 20, fontWeight: '900' },
  statLbl: { fontSize: 10, color: C.sub, textAlign: 'center', lineHeight: 13 },

  // ── Section ──────────────────────────────────────────────────────────
  section:     { marginTop: 26, paddingHorizontal: 20 },
  sectionHead: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  seeAll:       { fontSize: 13, color: C.primary, fontWeight: '600' },

  // ── Activité ─────────────────────────────────────────────────────────
  emptyWrap: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyTxt:  { fontSize: 14, color: C.sub },
  actRow:    { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 14, gap: 12 },
  actBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  actCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  actBody:  { flex: 1 },
  actTitle: { fontSize: 14, color: C.text, lineHeight: 20 },
  actSub:   { fontSize: 12, color: C.sub, marginTop: 3 },
  actDate:  { fontSize: 12, color: C.sub, flexShrink: 0, marginTop: 2 },

  // ── Actions rapides ──────────────────────────────────────────────────
  quickRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  quickCard:{ flex: 1, alignItems: 'center', gap: 8 },
  quickBox: {
    width: 60, height: 60, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  quickLbl: {
    fontSize: 11, color: C.sub,
    textAlign: 'center', lineHeight: 15, fontWeight: '500',
  },
})