// screens/SUPER_ADMIN/SuperAdminSATScreen.tsx
// Gestion des questions SAT — total + répartition par domaine + actions rapides
// Backend : GET /api/v1/sat/questions (avec limit élevé pour compter, ou idéalement
// un futur GET /api/v1/sat/questions/count groupé par domaine — à confirmer avec
// la camarade si on veut éviter de rapatrier toutes les questions juste pour compter)

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
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
  border: '#E8E8E8', success: '#4CAF50', danger: '#E24B4A',
};

const DOMAINES = ['MATH', 'READING', 'WRITING'];
const DOMAINE_LABELS: Record<string, string> = {
  MATH: 'Mathématiques',
  READING: 'Reading',
  WRITING: 'Writing',
};

interface DomaineStats {
  domaine: string;
  count: number;
  pourcent: number;
}

interface SATData {
  total: number;
  domaines: DomaineStats[];
}

interface NavigationProp {
  navigate: (screen: string, params?: Record<string, any>) => void;
}
interface Props { navigation: NavigationProp; }

const fetchSATData = async (): Promise<SATData> => {
  // Récupère un échantillon large par domaine pour estimer la répartition.
  // ⚠️ Pas idéal en perf — à remplacer par un endpoint d'agrégation côté backend
  // si le volume de questions devient important (voir note en haut de fichier).
  const results = await Promise.all(
    DOMAINES.map((d) => api.get(`/sat/questions?domaine=${d}&limit=1000`).catch(() => ({ data: { questions: [] } })))
  );

  const domaines: DomaineStats[] = DOMAINES.map((d, i) => ({
    domaine: d,
    count: results[i].data?.questions?.length ?? 0,
    pourcent: 0,
  }));

  const total = domaines.reduce((sum, d) => sum + d.count, 0);
  domaines.forEach((d) => { d.pourcent = total > 0 ? Math.round((d.count / total) * 100) : 0; });

  return { total, domaines };
};

const DomaineRow = ({ stats }: { stats: DomaineStats }) => (
  <View style={styles.domaineRow}>
    <View style={styles.domaineHeader}>
      <View style={[styles.domaineIcon, { backgroundColor: COLORS.primaryLight }]}>
        <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.domaineLabel}>{DOMAINE_LABELS[stats.domaine] ?? stats.domaine}</Text>
        <Text style={styles.domaineCount}>{stats.count.toLocaleString('fr-FR')} questions</Text>
      </View>
      <Text style={styles.domainePourcent}>{stats.pourcent}%</Text>
    </View>
    <View style={styles.progressBarBg}>
      <View style={[styles.progressBarFill, { width: `${stats.pourcent}%` as any }]} />
    </View>
  </View>
);

const QuickAction = ({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) => (
  <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.85}>
    <View style={styles.quickActionIcon}>
      <Ionicons name={icon as any} size={18} color={COLORS.primary} />
    </View>
    <Text style={styles.quickActionLabel}>{label}</Text>
    <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
  </TouchableOpacity>
);

export default function SuperAdminSATScreen({ navigation }: Props) {
  const [data, setData] = useState<SATData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const result = await fetchSATData();
      setData(result);
    } catch (err) {
      console.error('[SuperAdminSATScreen] Erreur:', err);
      setData({ total: 0, domaines: DOMAINES.map((d) => ({ domaine: d, count: 0, pourcent: 0 })) });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading || !data) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>SAT</Text>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une question..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Questions SAT</Text>
          <Text style={styles.totalValue}>{data.total.toLocaleString('fr-FR')}</Text>
          <Text style={styles.totalSub}>Total des questions</Text>
        </View>

        <Text style={styles.sectionTitle}>Domaines</Text>
        <View style={styles.domainesCard}>
          {data.domaines.map((d) => (
            <DomaineRow key={d.domaine} stats={d} />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Actions rapides</Text>
        <View style={styles.quickActionsCard}>
          <QuickAction icon="add-circle-outline" label="Ajouter une question" onPress={() => {}} />
          <View style={styles.divider} />
          <QuickAction icon="layers-outline" label="Créer un Mini SAT" onPress={() => {}} />
          <View style={styles.divider} />
          <QuickAction icon="document-text-outline" label="Créer un SAT complet" onPress={() => {}} />
          <View style={styles.divider} />
          <QuickAction icon="cloud-upload-outline" label="Importer des questions" onPress={() => {}} />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  topBar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  topBarTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.3 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: COLORS.background, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },

  totalCard: {
    backgroundColor: COLORS.primary, borderRadius: 18,
    padding: 20, marginBottom: 24,
  },
  totalLabel: { fontSize: 13, color: '#FFFFFFCC', fontWeight: '600', marginBottom: 6 },
  totalValue: { fontSize: 34, fontWeight: '800', color: COLORS.white, letterSpacing: -0.5 },
  totalSub: { fontSize: 12, color: '#FFFFFFAA', marginTop: 4 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },

  domainesCard: {
    backgroundColor: COLORS.white, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 16, marginBottom: 24, gap: 16,
  },
  domaineRow: { gap: 8 },
  domaineHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  domaineIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  domaineLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  domaineCount: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  domainePourcent: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  progressBarBg: { height: 8, backgroundColor: COLORS.background, borderRadius: 6, overflow: 'hidden' },
  progressBarFill: { height: 8, backgroundColor: COLORS.primary, borderRadius: 6 },

  quickActionsCard: {
    backgroundColor: COLORS.white, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  quickAction: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  quickActionIcon: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  quickActionLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 14 },
});