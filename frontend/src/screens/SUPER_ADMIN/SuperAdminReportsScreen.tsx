// screens/SUPER_ADMIN/SuperAdminReportsScreen.tsx
// Liste et traitement des signalements (questions incorrectes, contenu inapproprié, etc.)
// Backend : GET /api/v1/reports?statut=... , PUT /api/v1/reports/:id/resolve
// (Module complet À CRÉER — voir spec backend)

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, StyleSheet, SafeAreaView,
  StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/auth.service';

const COLORS = {
  primary: '#0D6B5E', primaryLight: '#E1F5EE',
  gold: '#D4A017', goldLight: '#FFF8E7',
  white: '#FFFFFF', background: '#F5F5F0',
  textPrimary: '#1A1A1A', textSecondary: '#6B6B6B', textMuted: '#9E9E9E',
  border: '#E8E8E8', success: '#4CAF50', danger: '#E24B4A', warning: '#F59E0B',
};

type StatutFilter = 'ALL' | 'PENDING' | 'TRAITE';

interface ReportItem {
  id: string;
  reporterNom: string;
  reporterPrenom: string;
  targetType: string;
  raison: string;
  description?: string;
  statut: string;
  createdAt: string;
}

interface NavigationProp {
  navigate: (screen: string, params?: Record<string, any>) => void;
}
interface Props { navigation: NavigationProp; }

const TARGET_TYPE_LABELS: Record<string, string> = {
  USER: 'Utilisateur',
  SAT_QUESTION: 'Question SAT',
  COURSE: 'Cours',
  MEETING: 'Meeting',
};

const STATUT_CONF: Record<string, { label: string; bg: string; color: string }> = {
  PENDING: { label: 'En attente', bg: COLORS.goldLight, color: COLORS.gold },
  TRAITE:  { label: 'Traité',     bg: COLORS.primaryLight, color: COLORS.primary },
  REJETE:  { label: 'Rejeté',     bg: '#FDECEC', color: COLORS.danger },
};

const FILTERS: { key: StatutFilter; label: string }[] = [
  { key: 'ALL',     label: 'Tous' },
  { key: 'PENDING', label: 'En attente' },
  { key: 'TRAITE',  label: 'Traités' },
];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch { return ''; }
}

const ICON_BY_TYPE: Record<string, string> = {
  SAT_QUESTION: 'help-circle-outline',
  USER:         'person-outline',
  COURSE:       'book-outline',
  MEETING:      'calendar-outline',
};

const fetchReports = async (): Promise<ReportItem[]> => {
  const res = await api.get('/reports');
  const list: any[] = res.data?.reports ?? [];
  return list.map((r) => ({
    id: r.id,
    reporterNom: r.reporter?.nom ?? '',
    reporterPrenom: r.reporter?.prenom ?? '',
    targetType: r.targetType,
    raison: r.raison,
    description: r.description,
    statut: r.statut,
    createdAt: r.createdAt,
  }));
};

const ReportCard = ({
  item,
  onResolve,
  onReject,
}: {
  item: ReportItem;
  onResolve: () => void;
  onReject: () => void;
}) => {
  const conf = STATUT_CONF[item.statut] ?? STATUT_CONF.PENDING;
  const icon = ICON_BY_TYPE[item.targetType] ?? 'flag-outline';
  const isPending = item.statut === 'PENDING';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: isPending ? COLORS.goldLight : COLORS.primaryLight }]}>
          <Ionicons name={icon as any} size={18} color={isPending ? COLORS.gold : COLORS.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.raison}</Text>
          <Text style={styles.cardMeta}>
            Par : {item.reporterPrenom} {item.reporterNom} · {formatDate(item.createdAt)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: conf.bg }]}>
          <Text style={[styles.statusText, { color: conf.color }]}>{conf.label}</Text>
        </View>
      </View>

      {item.description ? (
        <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>
      ) : null}

      <View style={styles.cardTypeBadge}>
        <Text style={styles.cardTypeText}>{TARGET_TYPE_LABELS[item.targetType] ?? item.targetType}</Text>
      </View>

      {isPending && (
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.resolveBtn} onPress={onResolve} activeOpacity={0.85}>
            <Ionicons name="checkmark-outline" size={14} color={COLORS.white} />
            <Text style={styles.resolveBtnText}>Traiter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectBtn} onPress={onReject} activeOpacity={0.85}>
            <Ionicons name="close-outline" size={14} color={COLORS.danger} />
            <Text style={styles.rejectBtnText}>Rejeter</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default function SuperAdminReportsScreen({ navigation }: Props) {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<StatutFilter>('ALL');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const result = await fetchReports();
      setReports(result);
    } catch (err) {
      console.error('[SuperAdminReportsScreen] Erreur:', err);
      setReports([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    let list = reports;
    if (filter === 'PENDING') list = list.filter((r) => r.statut === 'PENDING');
    if (filter === 'TRAITE')  list = list.filter((r) => r.statut === 'TRAITE');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.raison.toLowerCase().includes(q) ||
          r.reporterNom.toLowerCase().includes(q) ||
          r.reporterPrenom.toLowerCase().includes(q)
      );
    }
    return list;
  }, [reports, filter, search]);

  const handleResolve = (report: ReportItem) => {
    Alert.alert('Marquer comme traité ?', `Signalement : "${report.raison}"`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Traiter',
        onPress: async () => {
          try {
            await api.put(`/reports/${report.id}/resolve`, { action: 'TRAITE' });
            setReports((prev) =>
              prev.map((r) => (r.id === report.id ? { ...r, statut: 'TRAITE' } : r))
            );
          } catch {
            Alert.alert('Erreur', 'Impossible de traiter ce signalement');
          }
        },
      },
    ]);
  };

  const handleReject = (report: ReportItem) => {
    Alert.alert('Rejeter ce signalement ?', `Signalement : "${report.raison}"`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Rejeter',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.put(`/reports/${report.id}/resolve`, { action: 'REJETE' });
            setReports((prev) =>
              prev.map((r) => (r.id === report.id ? { ...r, statut: 'REJETE' } : r))
            );
          } catch {
            Alert.alert('Erreur', 'Impossible de rejeter ce signalement');
          }
        },
      },
    ]);
  };

  const pendingCount = reports.filter((r) => r.statut === 'PENDING').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={styles.topBarTitle}>Signalements</Text>
          {pendingCount > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un signalement..."
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
              <Ionicons name="flag-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Aucun signalement trouvé</Text>
            </View>
          ) : (
            filtered.map((r) => (
              <ReportCard
                key={r.id}
                item={r}
                onResolve={() => handleResolve(r)}
                onReject={() => handleReject(r)}
              />
            ))
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
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topBarTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.3 },
  pendingBadge: {
    backgroundColor: COLORS.danger, borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  pendingBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.white },

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
    backgroundColor: COLORS.white, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 14, marginBottom: 10, gap: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: {
    width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  cardMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '700' },
  cardDescription: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  cardTypeBadge: {
    alignSelf: 'flex-start', backgroundColor: COLORS.background,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  cardTypeText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  resolveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 10,
  },
  resolveBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: '#FDECEC', borderRadius: 10, paddingVertical: 10,
  },
  rejectBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.danger },

  emptyBlock: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 13, color: COLORS.textMuted },
});