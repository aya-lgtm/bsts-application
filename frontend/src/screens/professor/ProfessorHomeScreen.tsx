import React from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const COLORS = {
  primary: '#0D6B5E',
  primaryLight: '#E8F5F3',
  accent: '#F4A936',
  purple: '#7C3AED',
  bg: '#F7F8FA',
  white: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
  danger: '#EF4444',
  orange: '#F97316',
}

interface Props {
  onNavigate: (screen: string, params?: any) => void
}

export default function ProfessorHomeScreen({ onNavigate }: Props) {
  const stats = [
    { label: 'Étudiants', value: '184', icon: '👥' },
    { label: 'Cours actifs', value: '12', icon: '📚' },
    { label: 'Quiz créés', value: '36', icon: '📋' },
  ]

  const stats2 = [
    { label: 'Messages non lus', value: '8', icon: '💬' },
    { label: 'Taux réussite', value: '78%', icon: '🎯' },
    { label: 'Score SAT moyen', value: '1240', icon: '📈' },
  ]

  const recentActivities = [
    { name: 'Adam Khan', action: 'a amélioré son score SAT', detail: '1280 → 1320 (+40 points)', time: "Aujourd'hui", icon: '✅', color: COLORS.success },
    { name: 'Lina Khan', action: 'a terminé un Mock Test', detail: 'Score obtenu : 1180', time: 'Hier', icon: '📝', color: COLORS.orange },
    { name: 'Nouveau message de Yassine', action: '', detail: 'Question sur SAT Math - Module 2', time: '12 Mai', icon: '💬', color: COLORS.primary },
  ]

  const quickActions = [
    { label: 'Ajouter\nun cours', icon: '📦', screen: 'courses' },
    { label: 'Créer\nun quiz', icon: '✏️', screen: 'quiz' },
    { label: 'Voir les\nrésultats', icon: '📊', screen: 'analytics' },
    { label: 'Ouvrir\nle chat', icon: '💬', screen: 'chat' },
  ]

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.menuBtn}>
              <Text style={styles.menuIcon}>☰</Text>
            </TouchableOpacity>
            <View>
              <Text style={styles.greeting}>Bonjour,</Text>
              <Text style={styles.name}>Prof. Sarah Benali 👋</Text>
              <Text style={styles.subtitle}>Voici un aperçu de votre activité aujourd'hui.</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notifBtn}>
              <Text style={styles.notifIcon}>🔔</Text>
              <View style={styles.notifBadge}><Text style={styles.notifBadgeText}>3</Text></View>
            </TouchableOpacity>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>SB</Text>
            </View>
          </View>
        </View>

        {/* Stats Row 1 */}
        <View style={styles.statsRow}>
          {stats.map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Stats Row 2 */}
        <View style={styles.statsRow}>
          {stats2.map((s, i) => (
            <View key={i} style={[styles.statCard, i === 1 && styles.statCardGreen]}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={[styles.statValue, i === 1 && styles.statValueGreen]}>{s.value}</Text>
              <Text style={[styles.statLabel, i === 1 && styles.statLabelGreen]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Activité récente */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Activité récente</Text>
            <TouchableOpacity><Text style={styles.seeAll}>Voir tout →</Text></TouchableOpacity>
          </View>
          {recentActivities.map((a, i) => (
            <View key={i} style={styles.activityRow}>
              <View style={[styles.activityIcon, { backgroundColor: a.color + '20' }]}>
                <Text style={styles.activityIconText}>{a.icon}</Text>
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityName}>
                  <Text style={styles.activityNameBold}>{a.name}</Text>
                  {a.action ? ` ${a.action}` : ''}
                </Text>
                <Text style={styles.activityDetail}>{a.detail}</Text>
              </View>
              <Text style={styles.activityTime}>{a.time}</Text>
            </View>
          ))}
        </View>

        {/* Actions rapides */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <View style={styles.quickActionsRow}>
            {quickActions.map((a, i) => (
              <TouchableOpacity key={i} style={styles.quickAction} onPress={() => onNavigate(a.screen)}>
                <View style={styles.quickActionIcon}>
                  <Text style={styles.quickActionIconText}>{a.icon}</Text>
                </View>
                <Text style={styles.quickActionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16,
    backgroundColor: COLORS.white,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  menuBtn: { marginTop: 4 },
  menuIcon: { fontSize: 20 },
  greeting: { fontSize: 13, color: COLORS.textSecondary },
  name: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifBtn: { position: 'relative' },
  notifIcon: { fontSize: 22 },
  notifBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: COLORS.danger, borderRadius: 8,
    width: 16, height: 16, alignItems: 'center', justifyContent: 'center',
  },
  notifBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 12 },
  statCard: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: 12,
    padding: 12, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  statCardGreen: { backgroundColor: COLORS.primaryLight },
  statIcon: { fontSize: 18, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  statValueGreen: { color: COLORS.primary },
  statLabel: { fontSize: 10, color: COLORS.textSecondary, textAlign: 'center', marginTop: 2 },
  statLabelGreen: { color: COLORS.primary },
  section: {
    marginTop: 16, marginHorizontal: 16,
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  seeAll: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  activityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  activityIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  activityIconText: { fontSize: 16 },
  activityContent: { flex: 1 },
  activityName: { fontSize: 13, color: COLORS.text },
  activityNameBold: { fontWeight: '700' },
  activityDetail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  activityTime: { fontSize: 11, color: COLORS.textSecondary },
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  quickAction: { alignItems: 'center', flex: 1 },
  quickActionIcon: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionIconText: { fontSize: 22 },
  quickActionLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
})