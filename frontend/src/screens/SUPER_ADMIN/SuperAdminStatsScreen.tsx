// screens/SUPER_ADMIN/SuperAdminStatsScreen.tsx
// Statistiques globales : nouveaux utilisateurs, cours consultés, quiz, score SAT moyen
// Backend : GET /api/v1/admin/stats?period=week|month (À CRÉER — voir spec backend)

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StyleSheet, SafeAreaView,
  StatusBar, Dimensions,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Period = 'week' | 'month';

interface StatCard {
  value: number;
  deltaPourcent: number;
}

interface StatsData {
  nouveauxUtilisateurs: StatCard;
  coursConsultes: StatCard;
  quizRealises: StatCard;
  scoreSATMoyen: StatCard & { max: number };
  utilisationParJour: { jour: string; count: number }[];
}

interface NavigationProp {
  navigate: (screen: string, params?: Record<string, any>) => void;
}
interface Props { navigation: NavigationProp; }

const fetchStats = async (period: Period): Promise<StatsData> => {
  const res = await api.get(`/admin/stats?period=${period}`);
  const d = res.data;
  return {
    nouveauxUtilisateurs: d.nouveauxUtilisateurs ?? { value: 0, deltaPourcent: 0 },
    coursConsultes: d.coursConsultes ?? { value: 0, deltaPourcent: 0 },
    quizRealises: d.quizRealises ?? { value: 0, deltaPourcent: 0 },
    scoreSATMoyen: d.scoreSATMoyen ?? { value: 0, max: 1600, deltaPourcent: 0 },
    utilisationParJour: d.utilisationParJour ?? [],
  };
};

const StatCard = ({ label, value, delta, suffix }: { label: string; value: number; delta: number; suffix?: string }) => (
  <View style={styles.statCard}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value.toLocaleString('fr-FR')}{suffix ?? ''}</Text>
    <View style={styles.statDeltaRow}>
      <Ionicons
        name={delta >= 0 ? 'arrow-up' : 'arrow-down'}
        size={12}
        color={delta >= 0 ? COLORS.success : COLORS.danger}
      />
      <Text style={[styles.statDelta, { color: delta >= 0 ? COLORS.success : COLORS.danger }]}>
        {Math.abs(delta)}%
      </Text>
    </View>
  </View>
);

const BarChart = ({ data }: { data: { jour: string; count: number }[] }) => {
  if (data.length === 0) {
    return (
      <View style={styles.chartEmpty}>
        <Ionicons name="bar-chart-outline" size={28} color={COLORS.textMuted} />
        <Text style={styles.emptyText}>Pas encore de données</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.count), 1);
  const chartWidth = SCREEN_WIDTH - 40 - 32;
  const barWidth = Math.max(16, (chartWidth - (data.length - 1) * 8) / data.length);

  return (
    <View style={styles.chartBars}>
      {data.map((item, index) => {
        const barHeight = Math.max(4, (item.count / maxValue) * 140);
        return (
          <View key={index} style={styles.chartBarColumn}>
            <View style={[styles.chartBar, { height: barHeight, width: barWidth }]} />
            <Text style={styles.chartBarLabel}>{item.jour}</Text>
          </View>
        );
      })}
    </View>
  );
};

export default function SuperAdminStatsScreen({ navigation }: Props) {
  const [period, setPeriod] = useState<Period>('week');
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (p: Period, isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const result = await fetchStats(p);
      setData(result);
    } catch (err) {
      console.error('[SuperAdminStatsScreen] Erreur:', err);
      setData({
        nouveauxUtilisateurs: { value: 0, deltaPourcent: 0 },
        coursConsultes: { value: 0, deltaPourcent: 0 },
        quizRealises: { value: 0, deltaPourcent: 0 },
        scoreSATMoyen: { value: 0, max: 1600, deltaPourcent: 0 },
        utilisationParJour: [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(period); }, [period, loadData]);

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
        <Text style={styles.topBarTitle}>Statistiques</Text>
        <TouchableOpacity
          style={styles.periodBtn}
          onPress={() => setPeriod((p) => (p === 'week' ? 'month' : 'week'))}
        >
          <Text style={styles.periodBtnText}>{period === 'week' ? 'Cette semaine' : 'Ce mois'}</Text>
          <Ionicons name="chevron-down" size={14} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(period, true)} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >
        <View style={styles.statsGrid}>
          <StatCard label="Nouveaux utilisateurs" value={data.nouveauxUtilisateurs.value} delta={data.nouveauxUtilisateurs.deltaPourcent} />
          <StatCard label="Cours consultés" value={data.coursConsultes.value} delta={data.coursConsultes.deltaPourcent} />
          <StatCard label="Quiz réalisés" value={data.quizRealises.value} delta={data.quizRealises.deltaPourcent} />
          <StatCard
            label="Score SAT moyen"
            value={data.scoreSATMoyen.value}
            delta={data.scoreSATMoyen.deltaPourcent}
            suffix={` / ${data.scoreSATMoyen.max}`}
          />
        </View>

        <Text style={styles.sectionTitle}>Utilisation de la plateforme</Text>
        <View style={styles.chartCard}>
          <BarChart data={data.utilisationParJour} />
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

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
  },
  topBarTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.3 },
  periodBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primaryLight, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  periodBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8,
  },
  statCard: {
    width: '48%', backgroundColor: COLORS.white, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 12,
  },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.3 },
  statDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 },
  statDelta: { fontSize: 11, fontWeight: '700' },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12, marginTop: 8 },
  chartCard: {
    backgroundColor: COLORS.white, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 16,
  },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 160 },
  chartBarColumn: { alignItems: 'center', gap: 6 },
  chartBar: { backgroundColor: COLORS.primary, borderRadius: 6 },
  chartBarLabel: { fontSize: 10, color: COLORS.textMuted },
  chartEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30, gap: 8 },
  emptyText: { fontSize: 13, color: COLORS.textMuted },
});