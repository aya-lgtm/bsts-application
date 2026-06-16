import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import * as SecureStore from 'expo-secure-store'
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
  gold:          '#D4A017',
}

// ─── Types ────────────────────────────────────────────────────────────────
interface UserData {
  id:       string
  nom:      string
  prenom:   string
  email:    string
  matieres?: string[]
}

interface ProfStats {
  totalStudents:   number
  totalQuizzes:    number
  avgStudentScore: number
}

interface Notification {
  id:       string
  type:     string
  title:    string
  subtitle: string
  read:     boolean
  createdAt:string
}

interface Conversation {
  id:       string
  Messages?: { isRead: boolean; senderId: string }[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────
function formatTime(iso: string): string {
  const d    = new Date(iso)
  const now  = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

const NOTIF_ICON: Record<string, { icon: string; color: string }> = {
  lesson:  { icon: 'book-outline',           color: COLORS.primary },
  quiz:    { icon: 'create-outline',          color: COLORS.purple  },
  score:   { icon: 'trending-up-outline',     color: COLORS.gold    },
  payment: { icon: 'card-outline',            color: COLORS.success },
  streak:  { icon: 'flame-outline',           color: COLORS.orange  },
  renewal: { icon: 'refresh-circle-outline',  color: COLORS.primary },
}

// ─── Stat Card ────────────────────────────────────────────────────────────
function StatCard({
  icon, value, label, loading, green, onPress,
}: {
  icon: string; value: string; label: string
  loading?: boolean; green?: boolean; onPress?: () => void
}) {
  return (
    <TouchableOpacity
      style={[styles.statCard, green && styles.statCardGreen]}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
    >
      <View style={[styles.statIconBox, { backgroundColor: green ? COLORS.primary + '20' : COLORS.primaryLight }]}>
        <Ionicons name={icon as any} size={18} color={green ? COLORS.primary : COLORS.primary} />
      </View>
      {loading
        ? <ActivityIndicator size="small" color={green ? COLORS.primary : COLORS.textSecondary} style={{ marginVertical: 4 }} />
        : <Text style={[styles.statValue, green && styles.statValueGreen]}>{value}</Text>
      }
      <Text style={[styles.statLabel, green && styles.statLabelGreen]}>{label}</Text>
    </TouchableOpacity>
  )
}

// ─── Quick Action ─────────────────────────────────────────────────────────
function QuickAction({
  icon, label, color, onPress,
}: {
  icon: string; label: string; color: string; onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────
interface Props {
  onNavigate: (screen: string, params?: any) => void
}

export default function ProfessorHomeScreen({ onNavigate }: Props) {
  const [user,          setUser]          = useState<UserData | null>(null)
  const [stats,         setStats]         = useState<ProfStats | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadMsgs,    setUnreadMsgs]    = useState(0)
  const [loadingStats,  setLoadingStats]  = useState(true)
  const [loadingNotifs, setLoadingNotifs] = useState(true)
  const [refreshing,    setRefreshing]    = useState(false)

  // ── Charger user depuis SecureStore ───────────────────────────────────
  const loadUser = useCallback(async () => {
    try {
      const str = await SecureStore.getItemAsync('user')
      if (str) setUser(JSON.parse(str))
    } catch (_) {}
  }, [])

  // ── Stats prof ────────────────────────────────────────────────────────
  // GET /users/professor/stats → { totalStudents, totalQuizzes, avgStudentScore }
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/users/professor/stats')
      setStats(res.data)
    } catch (_) {
      setStats(null)
    } finally {
      setLoadingStats(false)
    }
  }, [])

  // ── Notifications ─────────────────────────────────────────────────────
  // GET /notifications → { notifications: [...] }
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications')
      const list: Notification[] = res.data?.notifications ?? []
      // Garder seulement les 4 plus récentes non lues pour la home
      const unread = list.filter(n => !n.read).slice(0, 4)
      setNotifications(unread)
    } catch (_) {
      setNotifications([])
    } finally {
      setLoadingNotifs(false)
    }
  }, [])

  // ── Messages non lus ──────────────────────────────────────────────────
  // GET /chat/ → { conversations: [...] }
  const fetchUnreadMessages = useCallback(async () => {
    try {
      const stored = await SecureStore.getItemAsync('user')
      const myId   = stored ? JSON.parse(stored).id : ''
      const res    = await api.get('/chat/')
      const convs: Conversation[] = res.data?.conversations ?? []
      const total = convs.reduce((acc, c) => {
        const msgs = c.Messages ?? []
        return acc + msgs.filter(m => !m.isRead && m.senderId !== myId).length
      }, 0)
      setUnreadMsgs(total)
    } catch (_) {
      setUnreadMsgs(0)
    }
  }, [])

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchStats(), fetchNotifications(), fetchUnreadMessages()])
  }, [fetchStats, fetchNotifications, fetchUnreadMessages])

  useEffect(() => {
    loadUser()
    fetchAll()
  }, [loadUser, fetchAll])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    setLoadingStats(true)
    setLoadingNotifs(true)
    await Promise.all([loadUser(), fetchAll()])
    setRefreshing(false)
    setLoadingStats(false)
    setLoadingNotifs(false)
  }, [loadUser, fetchAll])

  // ── Valeurs affichées ─────────────────────────────────────────────────
  const prenom   = user?.prenom ?? '...'
  const nom      = user?.nom    ?? ''
  const initials = ([prenom[0], nom[0]].filter(Boolean).join('').toUpperCase()) || 'PR'
  const unreadNotifs = notifications.length
  const totalUnread  = unreadNotifs + unreadMsgs

  const quickActions = [
    { icon: 'book-outline',      label: 'Cours',     color: COLORS.primary, screen: 'cours'     },
    { icon: 'create-outline',    label: 'Quiz',      color: COLORS.purple,  screen: 'quiz'      },
    { icon: 'bar-chart-outline', label: 'Analyses',  color: COLORS.orange,  screen: 'analyses'  },
    { icon: 'chatbubbles-outline',label: 'Chat',     color: COLORS.success, screen: 'chat'      },
  ]

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View>
              <Text style={styles.greeting}>Bonjour,</Text>
              <Text style={styles.name}>Prof. {prenom} {nom} 👋</Text>
              <Text style={styles.subtitle}>Voici un aperçu de votre activité aujourd'hui.</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {/* Cloche notifications */}
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => onNavigate('analyses')}
            >
              <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
              {unreadNotifs > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {unreadNotifs > 9 ? '9+' : unreadNotifs}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            {/* Avatar */}
            <TouchableOpacity
              style={styles.avatar}
              onPress={() => onNavigate('profil')}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Stats Row 1 : données prof ── */}
        {/* Source : GET /users/professor/stats */}
        <View style={styles.statsRow}>
          <StatCard
            icon="people-outline"
            value={stats ? String(stats.totalStudents) : '—'}
            label="Étudiants"
            loading={loadingStats}
            onPress={() => onNavigate('etudiants')}
          />
          <StatCard
            icon="create-outline"
            value={stats ? String(stats.totalQuizzes) : '—'}
            label="Quiz créés"
            loading={loadingStats}
            onPress={() => onNavigate('quiz')}
          />
          <StatCard
            icon="ribbon-outline"
            value={stats ? `${stats.avgStudentScore}%` : '—'}
            label="Score moyen"
            loading={loadingStats}
            green
          />
        </View>

        {/* ── Stats Row 2 : messages + notifs ── */}
        {/* Sources : GET /chat/ + GET /notifications */}
        <View style={styles.statsRow}>
          <StatCard
            icon="chatbubbles-outline"
            value={String(unreadMsgs)}
            label="Messages non lus"
            onPress={() => onNavigate('chat')}
          />
          <StatCard
            icon="notifications-outline"
            value={String(unreadNotifs)}
            label="Notifications"
          />
          <StatCard
            icon="trending-up-outline"
            value={stats?.avgStudentScore ? String(
              Math.round(400 + (stats.avgStudentScore / 100) * 1200)
            ) : '—'}
            label="Score SAT moy."
            loading={loadingStats}
            green
          />
        </View>

        {/* ── Matières ── */}
        {user?.matieres && user.matieres.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mes matières</Text>
            <View style={styles.matieresRow}>
              {user.matieres.map((m, i) => (
                <View key={i} style={styles.matiereBadge}>
                  <Text style={styles.matiereText}>{m}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Notifications récentes ── */}
        {/* Source : GET /notifications (4 dernières non lues) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Notifications récentes
              {unreadNotifs > 0 && (
                <Text style={styles.sectionBadge}> · {unreadNotifs}</Text>
              )}
            </Text>
            <TouchableOpacity onPress={() => onNavigate('analyses')}>
              <Text style={styles.seeAll}>Voir tout →</Text>
            </TouchableOpacity>
          </View>

          {loadingNotifs ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
          ) : notifications.length === 0 ? (
            <View style={styles.emptyNotifs}>
              <Ionicons name="checkmark-circle-outline" size={32} color={COLORS.success} />
              <Text style={styles.emptyNotifsText}>Tout est à jour !</Text>
            </View>
          ) : (
            notifications.map((n, i) => {
              const meta = NOTIF_ICON[n.type] ?? { icon: 'notifications-outline', color: COLORS.primary }
              return (
                <View key={n.id} style={[styles.notifRow, i < notifications.length - 1 && styles.notifRowBorder]}>
                  <View style={[styles.notifIcon, { backgroundColor: meta.color + '18' }]}>
                    <Ionicons name={meta.icon as any} size={18} color={meta.color} />
                  </View>
                  <View style={styles.notifContent}>
                    <Text style={styles.notifTitle} numberOfLines={1}>{n.title}</Text>
                    {n.subtitle ? (
                      <Text style={styles.notifSubtitle} numberOfLines={1}>{n.subtitle}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.notifTime}>{formatTime(n.createdAt)}</Text>
                </View>
              )
            })
          )}
        </View>

        {/* ── Note : activité étudiants ── */}
        <View style={styles.noteCard}>
          <Ionicons name="construct-outline" size={16} color={COLORS.orange} />
          <Text style={styles.noteText}>
            L'activité récente de vos étudiants sera disponible après ajout de{' '}
            <Text style={styles.noteCode}>GET /users/professor/activity</Text> par le backend.
          </Text>
        </View>

        {/* ── Actions rapides ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <View style={styles.quickActionsRow}>
            {quickActions.map((a, i) => (
              <QuickAction
                key={i}
                icon={a.icon}
                label={a.label}
                color={a.color}
                onPress={() => onNavigate(a.screen)}
              />
            ))}
          </View>
        </View>

        {/* ── Raccourcis étudiants ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mes étudiants</Text>
            <TouchableOpacity onPress={() => onNavigate('etudiants')}>
              <Text style={styles.seeAll}>Voir tout →</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.shortcutRow}
            onPress={() => onNavigate('etudiants')}
            activeOpacity={0.75}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="people-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.shortcutContent}>
              <Text style={styles.shortcutTitle}>Voir la liste complète</Text>
              <Text style={styles.shortcutSub}>
                {stats ? `${stats.totalStudents} étudiant${stats.totalStudents > 1 ? 's' : ''}` : 'Chargement...'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity
            style={styles.shortcutRow}
            onPress={() => onNavigate('analyses')}
            activeOpacity={0.75}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: COLORS.orange + '18' }]}>
              <Ionicons name="bar-chart-outline" size={20} color={COLORS.orange} />
            </View>
            <View style={styles.shortcutContent}>
              <Text style={styles.shortcutTitle}>Voir les analyses SAT</Text>
              <Text style={styles.shortcutSub}>Statistiques et progression</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 18,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerLeft:  { flex: 1 },
  greeting:    { fontSize: 13, color: COLORS.textSecondary },
  name:        { fontSize: 20, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  subtitle:    { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  notifBtn:    { position: 'relative', padding: 2 },
  notifBadge: {
    position: 'absolute', top: -3, right: -3,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.danger,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: COLORS.white,
  },
  notifBadgeText: { color: COLORS.white, fontSize: 9, fontWeight: '800' },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: COLORS.white, fontWeight: '800', fontSize: 14 },

  // Stats
  statsRow: {
    flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 12,
  },
  statCard: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: 14,
    padding: 12, alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  statCardGreen:  { backgroundColor: COLORS.primaryLight },
  statIconBox:    { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statValue:      { fontSize: 17, fontWeight: '800', color: COLORS.text },
  statValueGreen: { color: COLORS.primary },
  statLabel:      { fontSize: 10, color: COLORS.textSecondary, textAlign: 'center' },
  statLabelGreen: { color: COLORS.primary },

  // Matières
  matieresRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  matiereBadge: {
    backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  matiereText:  { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  // Section
  section: {
    marginTop: 12, marginHorizontal: 16,
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  sectionBadge: { color: COLORS.danger, fontWeight: '700' },
  seeAll:       { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  // Notifications
  notifRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10,
  },
  notifRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  notifIcon:    { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  notifContent: { flex: 1 },
  notifTitle:   { fontSize: 13, fontWeight: '600', color: COLORS.text },
  notifSubtitle:{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  notifTime:    { fontSize: 11, color: COLORS.textSecondary },
  emptyNotifs:  { alignItems: 'center', paddingVertical: 16, gap: 6 },
  emptyNotifsText: { fontSize: 13, color: COLORS.textSecondary },

  // Note backend
  noteCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFF7ED', marginHorizontal: 16, marginTop: 12,
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: COLORS.orange + '40',
  },
  noteText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  noteCode: {
    fontFamily: 'monospace', color: COLORS.primary,
    fontSize: 11, fontWeight: '600',
  },

  // Quick actions
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  quickAction:     { alignItems: 'center', flex: 1 },
  quickActionIcon: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  quickActionLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', fontWeight: '500' },

  // Shortcuts
  shortcutRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10,
  },
  shortcutIcon: {
    width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  shortcutContent: { flex: 1 },
  shortcutTitle:   { fontSize: 14, fontWeight: '600', color: COLORS.text },
  shortcutSub:     { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  separator:       { height: 1, backgroundColor: COLORS.border, marginVertical: 2 },
})