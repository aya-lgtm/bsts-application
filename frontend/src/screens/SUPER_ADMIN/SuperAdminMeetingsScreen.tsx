// screens/SUPER_ADMIN/SuperAdminMeetingsScreen.tsx
// Liste globale de toutes les consultations (Meetings) avec filtres par statut
// Backend : GET /api/v1/admin/meetings?statut=... (À CRÉER — voir spec backend)

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Image,
  ActivityIndicator, RefreshControl, StyleSheet, SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/auth.service';

const COLORS = {
  primary: '#0D6B5E', primaryLight: '#E1F5EE',
  gold: '#D4A017', goldLight: '#FFF8E7',
  white: '#FFFFFF', background: '#F5F5F0',
  textPrimary: '#1A1A1A', textSecondary: '#6B6B6B', textMuted: '#9E9E9E',
  border: '#E8E8E8', success: '#4CAF50', danger: '#E24B4A', info: '#3B82F6',
};

type StatutFilter = 'ALL' | 'PENDING' | 'CONFIRMED' | 'DONE' | 'CANCELLED';

interface MeetingItem {
  id: string;
  studentNom: string;
  studentPrenom: string;
  mentorNom: string;
  mentorPrenom: string;
  date: string;
  heure: string;
  duree: string;
  prix: number;
  statut: string;
}

interface NavigationProp {
  navigate: (screen: string, params?: Record<string, any>) => void;
}
interface Props { navigation: NavigationProp; }

const STATUT_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:   { label: 'En attente', bg: COLORS.goldLight, color: COLORS.gold },
  CONFIRMED: { label: 'Accepté',    bg: COLORS.primaryLight, color: COLORS.primary },
  DONE:      { label: 'Terminé',    bg: '#EAF2FF', color: COLORS.info },
  CANCELLED: { label: 'Annulé',     bg: '#FDECEC', color: COLORS.danger },
};

const FILTERS: { key: StatutFilter; label: string }[] = [
  { key: 'ALL', label: 'Tous' },
  { key: 'PENDING', label: 'En attente' },
  { key: 'CONFIRMED', label: 'Acceptés' },
  { key: 'DONE', label: 'Terminés' },
  { key: 'CANCELLED', label: 'Annulés' },
];

function formatMeetingDate(dateStr: string, heure: string): string {
  try {
    const d = new Date(`${dateStr}T00:00:00`);
    return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} · ${heure}`;
  } catch {
    return `${dateStr} · ${heure}`;
  }
}

const fetchMeetings = async (): Promise<MeetingItem[]> => {
  const res = await api.get('/admin/meetings');
  const list: any[] = res.data?.meetings ?? [];
  return list.map((m) => ({
    id: m.id,
    studentNom: m.User?.nom ?? '',
    studentPrenom: m.User?.prenom ?? '',
    mentorNom: m.CollegeStudent?.nom ?? '',
    mentorPrenom: m.CollegeStudent?.prenom ?? '',
    date: m.date,
    heure: m.heure,
    duree: m.duree,
    prix: m.prix,
    statut: m.statut,
  }));
};

const MeetingCard = ({ item }: { item: MeetingItem }) => {
  const conf = STATUT_LABELS[item.statut] ?? STATUT_LABELS.PENDING;
  const initiales = `${item.studentPrenom?.[0] ?? ''}${item.studentNom?.[0] ?? ''}`.toUpperCase();

  return (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: COLORS.primaryLight }]}>
        <Text style={styles.avatarInitials}>{initiales}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.studentPrenom} {item.studentNom}
        </Text>
        <Text style={styles.cardSub} numberOfLines={1}>
          avec {item.mentorPrenom} {item.mentorNom}
        </Text>
        <Text style={styles.cardMeta}>
          {formatMeetingDate(item.date, item.heure)} · {item.duree}
        </Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: conf.bg }]}>
        <Text style={[styles.statusText, { color: conf.color }]}>{conf.label}</Text>
      </View>
    </View>
  );
};

export default function SuperAdminMeetingsScreen({ navigation }: Props) {
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatutFilter>('ALL');

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const result = await fetchMeetings();
      setMeetings(result);
    } catch (err) {
      console.error('[SuperAdminMeetingsScreen] Erreur:', err);
      setMeetings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    let list = meetings;
    if (filter !== 'ALL') list = list.filter((m) => m.statut === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.studentNom.toLowerCase().includes(q) ||
          m.studentPrenom.toLowerCase().includes(q) ||
          m.mentorNom.toLowerCase().includes(q) ||
          m.mentorPrenom.toLowerCase().includes(q)
      );
    }
    return list;
  }, [meetings, filter, search]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Meetings</Text>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un meeting..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Ionicons name="calendar-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Aucun meeting trouvé</Text>
            </View>
          ) : (
            filtered.map((m) => <MeetingCard key={m.id} item={m} />)
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  topBar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  topBarTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.3 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: COLORS.background, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },

  filterScroll: { flexGrow: 0, marginBottom: 12 },
  filterContent: { paddingHorizontal: 20, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.background, marginRight: 8,
  },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  filterChipTextActive: { color: COLORS.white },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.white, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 14, marginBottom: 10,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  cardSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  cardMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 3 },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '700' },

  emptyBlock: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 13, color: COLORS.textMuted },
});