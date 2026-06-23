import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, TextInput, ActivityIndicator,
  RefreshControl, ScrollView, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import api from '../../services/auth.service'

// ─── Couleurs ─────────────────────────────────────────────────────────────
const C = {
  primary:      '#1A6B4A',   // vert foncé de l'image
  primaryLight: '#E8F5EE',
  bg:           '#FFFFFF',
  white:        '#FFFFFF',
  text:         '#1A1A1A',
  sub:          '#888',
  border:       '#EFEFEF',
  success:      '#1A6B4A',
  danger:       '#EF4444',
  orange:       '#F97316',
  purple:       '#7C3AED',
  blue:         '#3B82F6',
  amber:        '#F59E0B',
  teal:         '#0D9488',
}

// ─── Types ────────────────────────────────────────────────────────────────
export interface Student {
  id:              string
  nom:             string
  prenom:          string
  email:           string
  avatar?:         string
  niveauScolaire?: string
  matieres?:       string[]
  niveauMatiere?:  string
  scoreSAT:        number
  avgQuizScore:    number
  streak:          number
  niveau:          string   // STARTER | EXPLORER | SCHOLAR | ACHIEVER | CHAMPION
  lastActivity?:   string
  unreadMessages?: number
}

// ─── Niveaux gamification ─────────────────────────────────────────────────
const NIVEAU_MAP: Record<string, { label: string; color: string; bg: string }> = {
  STARTER:  { label: 'Débutant',      color: '#EF4444', bg: '#FEE2E2' },
  EXPLORER: { label: 'Intermédiaire', color: '#F97316', bg: '#FFEDD5' },
  SCHOLAR:  { label: 'Avancé',        color: '#1A6B4A', bg: '#D1FAE5' },
  ACHIEVER: { label: 'Expert',        color: '#7C3AED', bg: '#EDE9FE' },
  CHAMPION: { label: 'Champion',      color: '#F59E0B', bg: '#FEF3C7' },
}

// ─── Filtres ──────────────────────────────────────────────────────────────
type FilterKey = 'Tous' | 'SCHOLAR' | 'ACHIEVER' | 'EXPLORER' | 'STARTER' | 'CHAMPION'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'Tous',     label: 'Tous'              },
  { key: 'ACHIEVER', label: 'Avancé (1200+)'    },
  { key: 'EXPLORER', label: 'Intermédiaire'     },
  { key: 'STARTER',  label: 'Débutant'          },
  { key: 'SCHOLAR',  label: 'Scholar'           },
  { key: 'CHAMPION', label: 'Champion'          },
]

// ─── Helpers ──────────────────────────────────────────────────────────────
function makeInitials(s: Student) {
  return ([s.prenom?.[0], s.nom?.[0]].filter(Boolean).join('').toUpperCase()) || '?'
}

function isOnline(iso?: string) {
  if (!iso) return false
  return Date.now() - new Date(iso).getTime() < 5 * 60 * 1000
}

function streakLabel(n: number) {
  return `${n} jour${n > 1 ? 's' : ''}`
}

// ─── Avatar ───────────────────────────────────────────────────────────────
function Avatar({ item, size = 52 }: { item: Student; size?: number }) {
  const [err, setErr] = useState(false)
  const online = isOnline(item.lastActivity)
  const radius = size / 2

  return (
    <View style={{ width: size, height: size }}>
      {item.avatar && !err ? (
        <Image
          source={{ uri: item.avatar }}
          style={{ width: size, height: size, borderRadius: radius }}
          onError={() => setErr(true)}
        />
      ) : (
        <View style={[
          st.avatarFallback,
          { width: size, height: size, borderRadius: radius },
        ]}>
          <Text style={[st.avatarInitials, { fontSize: size * 0.34 }]}>
            {makeInitials(item)}
          </Text>
        </View>
      )}
      {online && (
        <View style={[
          st.onlineDot,
          { width: size * 0.26, height: size * 0.26, borderRadius: size * 0.13,
            bottom: 0, right: 0 },
        ]} />
      )}
    </View>
  )
}

// ─── Student Card ─────────────────────────────────────────────────────────
function StudentCard({
  item, onPress, onChat,
}: {
  item: Student
  onPress: () => void
  onChat:  () => void
}) {
  const nv     = NIVEAU_MAP[item.niveau] ?? { label: item.niveau, color: C.sub, bg: '#F0F0F0' }
  const unread = item.unreadMessages ?? 0

  return (
    <TouchableOpacity style={st.card} onPress={onPress} activeOpacity={0.75}>
      {/* Avatar */}
      <Avatar item={item} size={52} />

      {/* Contenu */}
      <View style={st.cardBody}>
        {/* Ligne 1 : nom + score */}
        <View style={st.cardRow}>
          <Text style={st.cardName}>{item.prenom} {item.nom}</Text>
          <View style={st.scoreArea}>
            <Text style={st.scoreCaption}>Score SAT</Text>
            <Text style={st.scoreNum}>{item.scoreSAT > 0 ? item.scoreSAT : '—'}</Text>
          </View>
        </View>

        {/* Ligne 2 : badge niveau + chevron */}
        <View style={st.cardRow2}>
          <View style={[st.badge, { backgroundColor: nv.bg }]}>
            <Text style={[st.badgeText, { color: nv.color }]}>Niveau {nv.label}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#CCC" />
        </View>

        {/* Ligne 3 : barre + % + streak */}
        <View style={st.progressRow}>
          <View style={st.progressTrack}>
            <View style={[
              st.progressBar,
              { width: `${Math.min(item.avgQuizScore, 100)}%` as any },
            ]} />
          </View>
          <Text style={st.progressPct}>{item.avgQuizScore}%</Text>
          <View style={st.streakWrap}>
            <Ionicons name="flame" size={13} color={C.orange} />
            <Text style={st.streakTxt}>{streakLabel(item.streak)}</Text>
          </View>
        </View>
      </View>

      {/* Bouton chat avec badge */}
      {unread > 0 && (
        <TouchableOpacity style={st.chatFab} onPress={onChat}>
          <Ionicons name="chatbubble-ellipses" size={20} color={C.white} />
          <View style={st.unreadBadge}>
            <Text style={st.unreadTxt}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────
interface Props {
  onNavigate: (screen: string, params?: any) => void
}

export default function ProfessorStudentsScreen({ onNavigate }: Props) {
  const [students,   setStudents]   = useState<Student[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [filter,     setFilter]     = useState<FilterKey>('Tous')
  const [search,     setSearch]     = useState('')
  const [showSearch, setShowSearch] = useState(false)

  // ── Fetch ────────────────────────────────────────────────────────────
  const fetchStudents = useCallback(async () => {
    try {
      setError(null)
      const res = await api.get('/users/professor/students')
      setStudents(res.data?.students ?? [])
    } catch (e: any) {
      const status = e?.response?.status
      setError(
        status === 404 || status === 403
          ? 'endpoint_missing'
          : 'Impossible de charger les étudiants.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchStudents() }, [fetchStudents])
  const onRefresh = useCallback(() => { setRefreshing(true); fetchStudents() }, [fetchStudents])

  // ── Filtrage ─────────────────────────────────────────────────────────
  const filtered = students
    .filter(s => filter === 'Tous' || s.niveau === filter)
    .filter(s => {
      if (!search) return true
      const q = search.toLowerCase()
      return `${s.prenom} ${s.nom}`.toLowerCase().includes(q)
          || s.email.toLowerCase().includes(q)
    })
    .sort((a, b) => b.scoreSAT - a.scoreSAT)

  // ── Stats ────────────────────────────────────────────────────────────
  const withSAT     = students.filter(s => s.scoreSAT > 0)
  const avgSAT      = withSAT.length ? Math.round(withSAT.reduce((a, s) => a + s.scoreSAT, 0) / withSAT.length) : 0
  const unreadTotal = students.reduce((a, s) => a + (s.unreadMessages ?? 0), 0)

  // ── États ────────────────────────────────────────────────────────────
  if (loading) return (
    <SafeAreaView style={st.safe}>
      <View style={st.header}>
        <Text style={st.headerTitle}>Mes étudiants</Text>
      </View>
      <View style={st.center}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    </SafeAreaView>
  )

  if (error === 'endpoint_missing') return (
    <SafeAreaView style={st.safe}>
      <View style={st.header}>
        <Text style={st.headerTitle}>Mes étudiants</Text>
      </View>
      <View style={st.center}>
        <Ionicons name="construct-outline" size={52} color={C.sub} />
        <Text style={st.emptyTitle}>Endpoint en développement</Text>
        <Text style={st.emptySub}>GET /users/professor/students n'est pas encore disponible.</Text>
        <TouchableOpacity style={st.retryBtn} onPress={fetchStudents}>
          <Text style={st.retryTxt}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )

  if (error) return (
    <SafeAreaView style={st.safe}>
      <View style={st.header}>
        <Text style={st.headerTitle}>Mes étudiants</Text>
      </View>
      <View style={st.center}>
        <Ionicons name="cloud-offline-outline" size={52} color={C.sub} />
        <Text style={st.emptyTitle}>{error}</Text>
        <TouchableOpacity style={st.retryBtn} onPress={fetchStudents}>
          <Text style={st.retryTxt}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={st.safe}>
      {/* ── Header ── */}
      <View style={st.header}>
        <Text style={st.headerTitle}>
          Mes étudiants{students.length > 0 ? ` (${students.length})` : ''}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity
            style={st.iconBtn}
            onPress={() => { setShowSearch(v => !v); setSearch('') }}
          >
            <Ionicons
              name={showSearch ? 'close-outline' : 'search-outline'}
              size={22} color={C.text}
            />
          </TouchableOpacity>
          <TouchableOpacity style={st.iconBtn} onPress={onRefresh}>
            <Ionicons name="options-outline" size={22} color={C.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Recherche ── */}
      {showSearch && (
        <View style={st.searchWrap}>
          <Ionicons name="search-outline" size={17} color={C.sub} />
          <TextInput
            style={st.searchInput}
            placeholder="Rechercher un étudiant..."
            placeholderTextColor={C.sub}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color={C.sub} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
        contentContainerStyle={filtered.length === 0 ? st.emptyContainer : st.list}
        ListHeaderComponent={
          <>
            {/* ── Stats top ── */}
            {students.length > 0 && (
              <View style={st.statsCard}>
                <View style={st.statItem}>
                  <Ionicons name="people" size={20} color={C.primary} />
                  <Text style={st.statNum}>{students.length}</Text>
                  <Text style={st.statLbl}>Étudiants</Text>
                </View>
                <View style={st.statSep} />
                <View style={st.statItem}>
                  <Ionicons name="trending-up" size={20} color={C.primary} />
                  <Text style={st.statNum}>{avgSAT > 0 ? avgSAT : '—'}</Text>
                  <Text style={st.statLbl}>Score SAT moy.</Text>
                </View>
                <View style={st.statSep} />
                <View style={st.statItem}>
                  <Ionicons
                    name="chatbubble-ellipses"
                    size={20}
                    color={unreadTotal > 0 ? C.orange : C.primary}
                  />
                  <Text style={[st.statNum, unreadTotal > 0 && { color: C.orange }]}>
                    {unreadTotal}
                  </Text>
                  <Text style={st.statLbl}>Non lus</Text>
                </View>
              </View>
            )}

            {/* ── Filtres ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={st.filtersRow}
            >
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[st.chip, filter === f.key && st.chipActive]}
                  onPress={() => setFilter(f.key)}
                >
                  <Text style={[st.chipTxt, filter === f.key && st.chipTxtActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        }
        ListEmptyComponent={
          <View style={st.emptyState}>
            <Ionicons name="people-outline" size={56} color={C.sub} />
            <Text style={st.emptyTitle}>
              {search ? 'Aucun résultat' : 'Aucun étudiant'}
            </Text>
            <Text style={st.emptySub}>
              {search
                ? `Aucun étudiant pour "${search}".`
                : "Les étudiants apparaîtront ici une fois qu'ils auront soumis un de vos quiz."
              }
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <StudentCard
            item={item}
            onPress={() => onNavigate('student_profile', item)}
            onChat={() => onNavigate('chat', {
              studentId: item.id,
              studentName: `${item.prenom} ${item.nom}`,
            })}
          />
        )}
      />

      {/* FAB "+" */}
      <TouchableOpacity
        style={st.fab}
        onPress={() => onNavigate('invite_student')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={C.white} />
      </TouchableOpacity>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 40, paddingBottom: 12,
    backgroundColor: C.white,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0D6B5E' },
  iconBtn:     { padding: 6 },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.white, marginHorizontal: 16, marginVertical: 10,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1.5, borderColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text },

  // Stats
  statsCard: {
    flexDirection: 'row', backgroundColor: C.white,
    marginHorizontal: 16, marginTop: 16, marginBottom: 4,
    borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  statItem:  { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  statSep:   { width: 1, height: 44, backgroundColor: C.border, alignSelf: 'center' },
  statNum:   { fontSize: 20, fontWeight: '800', color: C.text },
  statLbl:   { fontSize: 10, color: C.sub, textAlign: 'center' },

  // Filtres
  filtersRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24,
    backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border,
  },
  chipActive:   { backgroundColor: C.primary, borderColor: C.primary },
  chipTxt:      { fontSize: 13, color: C.sub, fontWeight: '500' },
  chipTxtActive:{ color: C.white, fontWeight: '700' },

  // Liste
  list:           { paddingHorizontal: 16, paddingBottom: 100, gap: 12, paddingTop: 4 },
  emptyContainer: { flex: 1 },

  // Card
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.white, borderRadius: 18, padding: 16, gap: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  avatarFallback: {
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { color: C.white, fontWeight: '800' },
  onlineDot: {
    position: 'absolute', backgroundColor: '#22C55E',
    borderWidth: 2, borderColor: C.white,
  },
  cardBody:    { flex: 1 },
  cardRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardRow2:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  cardName:    { fontSize: 16, fontWeight: '700', color: C.text, flex: 1, marginRight: 8 },
  scoreArea:   { alignItems: 'flex-end' },
  scoreCaption:{ fontSize: 10, color: C.sub, marginBottom: 1 },
  scoreNum:    { fontSize: 22, fontWeight: '800', color: C.text },

  badge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:   { fontSize: 12, fontWeight: '600' },

  progressRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  progressTrack:{ flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  progressBar:  { height: 6, backgroundColor: C.primary, borderRadius: 3 },
  progressPct:  { fontSize: 13, fontWeight: '700', color: C.text },
  streakWrap:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  streakTxt:    { fontSize: 12, color: C.orange, fontWeight: '600' },

  chatFab: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4,
  },
  unreadBadge: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: C.orange, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  unreadTxt: { color: C.white, fontSize: 9, fontWeight: '800' },

  // FAB
  fab: {
    position: 'absolute', bottom: 28, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOpacity: 0.45, shadowRadius: 10, elevation: 8,
  },

  // Empty / Error
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12, marginTop: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.text, textAlign: 'center' },
  emptySub:   { fontSize: 13, color: C.sub, textAlign: 'center', lineHeight: 20 },
  retryBtn:   { backgroundColor: C.primary, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 13, marginTop: 6 },
  retryTxt:   { color: C.white, fontWeight: '700', fontSize: 14 },
})