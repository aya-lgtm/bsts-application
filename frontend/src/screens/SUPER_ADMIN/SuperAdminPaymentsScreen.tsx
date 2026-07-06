// screens/SUPER_ADMIN/SuperAdminPaymentsScreen.tsx
// Vue globale des paiements/revenus — utilise Payment + Subscription
// Backend : pas d'endpoint global existant pour TOUS les paiements (seulement
// "mes paiements"). Idéalement prévoir GET /api/v1/admin/payments — sinon on
// agrège côté front depuis ce qui est exposé (à valider avec la camarade).

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
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

interface PaymentItem {
  id: string;
  userNom: string;
  userPrenom: string;
  montant: number;
  plan: string;
  statut: string;
  createdAt: string;
}

interface PaymentsData {
  revenusTotaux: number;
  deltaPourcent: number;
  repartition: { label: string; montant: number }[];
  transactions: PaymentItem[];
}

interface NavigationProp {
  navigate: (screen: string, params?: Record<string, any>) => void;
}
interface Props { navigation: NavigationProp; }

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch { return ''; }
}

const fetchPaymentsData = async (): Promise<PaymentsData> => {
  // ⚠️ Endpoint global pas confirmé côté backend — on tente /admin/payments,
  // avec repli sur un état vide si non disponible (catch silencieux).
  const res = await api.get('/admin/payments');
  const d = res.data;
  return {
    revenusTotaux: d.revenusTotaux ?? 0,
    deltaPourcent: d.deltaPourcent ?? 0,
    repartition: d.repartition ?? [],
    transactions: (d.transactions ?? []).map((t: any) => ({
      id: t.id,
      userNom: t.User?.nom ?? '',
      userPrenom: t.User?.prenom ?? '',
      montant: t.montant,
      plan: t.plan,
      statut: t.statut,
      createdAt: t.createdAt,
    })),
  };
};

const RepartitionRow = ({ label, montant, total }: { label: string; montant: number; total: number }) => {
  const pourcent = total > 0 ? Math.round((montant / total) * 100) : 0;
  return (
    <View style={styles.repartitionRow}>
      <Text style={styles.repartitionLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.repartitionValue}>{montant.toLocaleString('fr-FR')} € · {pourcent}%</Text>
    </View>
  );
};

const TransactionRow = ({ item }: { item: PaymentItem }) => (
  <View style={styles.transactionRow}>
    <View style={styles.transactionIcon}>
      <Ionicons name="cash-outline" size={16} color={COLORS.primary} />
    </View>
    <View style={styles.transactionInfo}>
      <Text style={styles.transactionTitle} numberOfLines={1}>
        {item.userPrenom} {item.userNom}
      </Text>
      <Text style={styles.transactionDate}>{formatDate(item.createdAt)}</Text>
    </View>
    <Text style={styles.transactionAmount}>{item.montant.toLocaleString('fr-FR')} €</Text>
  </View>
);

export default function SuperAdminPaymentsScreen({ navigation }: Props) {
  const [data, setData] = useState<PaymentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const result = await fetchPaymentsData();
      setData(result);
    } catch (err) {
      console.error('[SuperAdminPaymentsScreen] Erreur:', err);
      setData({ revenusTotaux: 0, deltaPourcent: 0, repartition: [], transactions: [] });
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

  const totalRepartition = data.repartition.reduce((sum, r) => sum + r.montant, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Paiements</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Revenus totaux</Text>
          <Text style={styles.totalValue}>{data.revenusTotaux.toLocaleString('fr-FR')} €</Text>
          <Text style={[styles.totalDelta, data.deltaPourcent < 0 && styles.totalDeltaNegative]}>
            {data.deltaPourcent >= 0 ? '+' : ''}{data.deltaPourcent}% par rapport au mois dernier
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Répartition</Text>
        <View style={styles.card}>
          {data.repartition.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Ionicons name="pie-chart-outline" size={26} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Pas encore de données</Text>
            </View>
          ) : (
            data.repartition.map((r, i) => (
              <View key={r.label}>
                <RepartitionRow label={r.label} montant={r.montant} total={totalRepartition} />
                {i < data.repartition.length - 1 && <View style={styles.divider} />}
              </View>
            ))
          )}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Transactions récentes</Text>
        </View>
        <View style={styles.card}>
          {data.transactions.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Ionicons name="receipt-outline" size={26} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Aucune transaction récente</Text>
            </View>
          ) : (
            data.transactions.map((t, i) => (
              <View key={t.id}>
                <TransactionRow item={t} />
                {i < data.transactions.length - 1 && <View style={styles.divider} />}
              </View>
            ))
          )}
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

  totalCard: { backgroundColor: COLORS.primary, borderRadius: 18, padding: 20, marginBottom: 24 },
  totalLabel: { fontSize: 13, color: '#FFFFFFCC', fontWeight: '600', marginBottom: 6 },
  totalValue: { fontSize: 30, fontWeight: '800', color: COLORS.white, letterSpacing: -0.5 },
  totalDelta: { fontSize: 12, color: '#C8F0E2', marginTop: 6, fontWeight: '600' },
  totalDeltaNegative: { color: '#FFD0D0' },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  sectionHeaderRow: { marginTop: 8 },

  card: {
    backgroundColor: COLORS.white, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 24, overflow: 'hidden',
  },

  repartitionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14,
  },
  repartitionLabel: { fontSize: 13, color: COLORS.textPrimary, flex: 1 },
  repartitionValue: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  transactionRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  transactionIcon: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  transactionInfo: { flex: 1 },
  transactionTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  transactionDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  transactionAmount: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },

  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 14 },
  emptyBlock: { alignItems: 'center', padding: 24, gap: 8 },
  emptyText: { fontSize: 13, color: COLORS.textMuted },
});