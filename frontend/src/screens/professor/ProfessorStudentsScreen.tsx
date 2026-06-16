import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, TextInput, ActivityIndicator,
  RefreshControl, Alert,
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
}

// ─── Types ────────────────────────────────────────────────────────────────
interface Student {
  id:           string
  nom:          string
  prenom:       string
  email:        string
  scoreSAT:     number   // meilleur score SAT
  avgQuizScore: number   // moyenne quiz du prof (%)
  streak:       number
  niveau:       string   // STARTER | EXPLORER | SCHOLAR | ACHIEVER | CHAMPION
}

// ─── Niveau → label + couleur ────────────────────────────────────────────
const NIVEAU_MAP: Record<string, { label: string; color: string }> = {
  STARTER:  { label: 'Débutant',      color: COLORS.danger  },
  EXPLORER: { label: 'Intermédiaire', color: COLORS.orange  },
  SCHOLAR:  { label: 'Avancé',        color: COLORS.success },
  ACHIEVER: { label: 'Expert',        color: COLORS.primary },
  CHAMPION: { label: 'Champion',      color: COLORS.purple  },
}

function getNiveau(s: Student) {
  return NIVEAU_MAP[s.niveau] ?? { label: s.niveau, color: COLORS.textSecondary }
}

function makeInitials(s: Student): string {
  return ([s.prenom?.[0], s.nom?.[0]].filter(Boolean).join('').toUpperCase()) || '?'
}

// ─── Filtres ──────────────────────────────────────────────────────────────
type Filter = 'Tous' | 'CHAMPION' | 'ACHIEVER' | 'SCHOLAR' | 'EXPLORER' | 'STARTER'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'Tous',     label: 'Tous'          },
  { key: 'CHAMPION', label: '🥇 Champion'   },
  { key: 'ACHIEVER', label: '🏆 Expert'     },
  { key: 'SCHOLAR',  label: '📚 Avancé'     },
  { key: 'EXPLORER', label: '🔍 Interméd.'  },
  { key: 'STARTER',  label: '🌱 Débutant'   },
]

// ─── Student Card ─────────────────────────────────────────────────────────
function StudentCard({ item, onPress }: { item: Student; onPress: () => void }) {
  const niveau = getNiveau(item)
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{makeInitials(item)}</Text>
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        {/* Top row */}
        <View style={styles.cardTop}>
          <Text style={styles.studentName}>{item.prenom} {item.nom}</Text>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>Score SAT</Text>
            <Text style={styles.score}>{item.scoreSAT > 0 ? item.scoreSAT : '—'}</Text>
          </View>
        </View>

        {/* Level badge + chevron */}
        <View style={styles.levelRow}>
          <View style={[styles.levelBadge, { backgroundColor: niveau.color + '20' }]}>
            <Text style={[styles.levelText, { color: niveau.color }]}>{niveau.label}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
        </View>

        {/* Progress bar (avgQuizScore) + streak */}
        <View style={styles.progressRow}>
          <View style={styles.progressBg}>
            <View style={[
              styles.progressFill,
              { width: `${Math.min(item.avgQuizScore, 100)}%` as any },
            ]} />
          </View>
          <Text style={styles.progressText}>{item.avgQuizScore}%</Text>
          <Text style={styles.streak}>
            <Ionicons name="flame-outline" size={12} color={COLORS.orange} /> {item.streak}j
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────
interface Props {
  onNavigate: (screen: string, params?: any) => void
}

export default function ProfessorStudentsScreen({ onNavigate }: Props) {
  const [students,    setStudents]    = useState<Student[]>([])
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [filter,      setFilter]      = useState<Filter>('Tous')
  const [search,      setSearch]      = useState('')
  const [showSearch,  setShowSearch]  = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────
  // GET /users/professor/students
  // → { students: [{ id, nom, prenom, email, scoreSAT, avgQuizScore, streak, niveau }] }
  // ⚠️ Endpoint à créer (specs envoyées à la responsable backend)
  const fetchStudents = useCallback(async () => {
    try {
      setError(null)
      const res = await api.get('/users/professor/students')
      const list: Student[] = res.data?.students ?? []
      setStudents(list)
    } catch (e: any) {
      const status = e?.response?.status
      if (status === 404 || status === 403) {
        setError('endpoint_missing')
      } else {
        setError("Impossible de charger les étudiants.")
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchStudents()
  }, [fetchStudents])

  // ── Filtrage local ────────────────────────────────────────────────────
  const filtered = students
    .filter(s => filter === 'Tous' || s.niveau === filter)
    .filter(s => {
      if (!search) return true
      const q = search.toLowerCase()
      return `${s.prenom} ${s.nom}`.toLowerCase().includes(q)
          || s.email.toLowerCase().includes(q)
    })
    .sort((a, b) => b.scoreSAT - a.scoreSAT)

  // ── Stats rapides ─────────────────────────────────────────────────────
  const avgSAT = students.length
    ? Math.round(students.reduce((a, s) => a + s.scoreSAT, 0) / students.filter(s => s.scoreSAT > 0).length || 0)
    : 0
  const avgQuiz = students.length
    ? Math.round(students.reduce((a, s) => a + s.avgQuizScore, 0) / students.length)
    : 0

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Mes étudiants</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    )
  }

  // ── Endpoint manquant ─────────────────────────────────────────────────
  if (error === 'endpoint_missing') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Mes étudiants</Text>
        </View>
        <View style={styles.center}>
          <Ionicons name="construct-outline" size={52} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>Endpoint en cours de développement</Text>
          <Text style={styles.emptySubtitle}>
            L'endpoint{' '}
            <Text style={styles.code}>GET /users/professor/students</Text>
            {'\n'}doit être ajouté par la responsable backend.
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchStudents}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // ── Erreur générique ──────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Mes étudiants</Text>
        </View>
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={52} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchStudents}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          Mes étudiants{students.length > 0 ? ` (${students.length})` : ''}
        </Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => { setShowSearch(v => !v); setSearch('') }}
          >
            <Ionicons
              name={showSearch ? 'close-outline' : 'search-outline'}
              size={22} color={COLORS.text}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      {showSearch && (
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un étudiant..."
            placeholderTextColor={COLORS.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>
      )}

      {/* Stats rapides */}
      {students.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Ionicons name="people-outline" size={16} color={COLORS.primary} />
            <Text style={styles.statValue}>{students.length}</Text>
            <Text style={styles.statLabel}>Étudiants</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Ionicons name="trending-up-outline" size={16} color={COLORS.primary} />
            <Text style={styles.statValue}>{avgSAT > 0 ? avgSAT : '—'}</Text>
            <Text style={styles.statLabel}>Score SAT moy.</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Ionicons name="ribbon-outline" size={16} color={COLORS.primary} />
            <Text style={styles.statValue}>{avgQuiz}%</Text>
            <Text style={styles.statLabel}>Quiz moy.</Text>
          </View>
        </View>
      )}

      {/* Filtres */}
      <FlatList
        data={FILTERS}
        keyExtractor={f => f.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
        renderItem={({ item: f }) => (
          <TouchableOpacity
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Liste étudiants */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={56} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>
              {search ? 'Aucun résultat' : 'Aucun étudiant'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {search
                ? `Aucun étudiant ne correspond à "${search}".`
                : 'Les étudiants apparaîtront ici une fois qu\'ils auront soumis un de vos quiz.'
              }
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <StudentCard
            item={item}
            onPress={() => onNavigate('student_profile', item)}
          />
        )}
      />
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title:       { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  headerIcons: { flexDirection: 'row', gap: 4 },
  iconBtn:     { padding: 6 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },

  // Stats
  statsRow: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  statBox:     { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 3 },
  statDivider: { width: 1, height: 40, backgroundColor: COLORS.border, alignSelf: 'center' },
  statValue:   { fontSize: 18, fontWeight: '800', color: COLORS.text },
  statLabel:   { fontSize: 10, color: COLORS.textSecondary, textAlign: 'center' },

  // Filtres
  filterScroll:    { backgroundColor: COLORS.white, maxHeight: 56 },
  filterContainer: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: COLORS.bg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText:       { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  filterTextActive: { color: COLORS.white, fontWeight: '700' },

  // Liste
  list:           { padding: 16, gap: 12, paddingBottom: 24 },
  emptyContainer: { flex: 1 },

  // Card
  card: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    borderRadius: 16, padding: 14, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText:   { color: COLORS.white, fontWeight: '800', fontSize: 17 },
  cardContent:  { flex: 1 },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  studentName:  { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1, marginRight: 8 },
  scoreBox:     { alignItems: 'flex-end' },
  scoreLabel:   { fontSize: 10, color: COLORS.textSecondary },
  score:        { fontSize: 20, fontWeight: '800', color: COLORS.text },
  levelRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  levelBadge:   { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  levelText:    { fontSize: 12, fontWeight: '600' },
  progressRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  progressBg:   { flex: 1, height: 5, backgroundColor: COLORS.border, borderRadius: 3 },
  progressFill: { height: 5, backgroundColor: COLORS.primary, borderRadius: 3 },
  progressText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  streak:       { fontSize: 12, color: COLORS.orange },

  // Empty / Error
  emptyState:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  code: {
    fontFamily: 'monospace', backgroundColor: '#F0F0F0',
    paddingHorizontal: 4, borderRadius: 4, fontSize: 12, color: COLORS.primary,
  },
  retryBtn:     { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  retryBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
})