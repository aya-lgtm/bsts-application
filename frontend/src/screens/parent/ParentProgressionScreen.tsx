import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

// ─── Mock Data ────────────────────────────────────────────────────────────
const MOCK_CHILDREN = [
  {
    id: '1',
    name: 'Adam Khan',
    classe: 'Classe 11',
    satScore: 1320,
    satScorePrev: 1240,
    level: 'Scholar',
    levelNum: 3,
    points: 2100,
    pointsNext: 3500,
    streak: 12,
    progressPercent: 72,
    subjects: [
      { name: 'SAT Math', progress: 82, color: '#0D6B5E' },
      { name: 'SAT Reading', progress: 68, color: '#6C63FF' },
      { name: 'SAT Writing', progress: 75, color: '#D4A017' },
      { name: 'Sciences', progress: 55, color: '#E53935' },
      { name: 'Anglais', progress: 90, color: '#2196F3' },
    ],
    satHistory: [1100, 1150, 1200, 1220, 1240, 1280, 1320],
    badges: ['🔥', '⭐', '📚', '🏆'],
  },
  {
    id: '2',
    name: 'Lina Khan',
    classe: 'Classe 9',
    satScore: 1180,
    satScorePrev: 1100,
    level: 'Explorer',
    levelNum: 2,
    points: 820,
    pointsNext: 1500,
    streak: 5,
    progressPercent: 58,
    subjects: [
      { name: 'SAT Math', progress: 60, color: '#0D6B5E' },
      { name: 'SAT Reading', progress: 70, color: '#6C63FF' },
      { name: 'SAT Writing', progress: 55, color: '#D4A017' },
      { name: 'Sciences', progress: 48, color: '#E53935' },
      { name: 'Anglais', progress: 72, color: '#2196F3' },
    ],
    satHistory: [980, 1020, 1050, 1080, 1100, 1140, 1180],
    badges: ['🔥', '📚'],
  },
];

// ─── Horizontal Progress Bar ───────────────────────────────────────────────
function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.barBg}>
      <View style={[styles.barFill, { width: `${value}%`, backgroundColor: color }]} />
    </View>
  );
}

// ─── Level Bar ─────────────────────────────────────────────────────────────
function LevelBar({ points, pointsNext }: { points: number; pointsNext: number }) {
  const pct = Math.min((points / pointsNext) * 100, 100);
  return (
    <View style={styles.levelBarBg}>
      <View style={[styles.levelBarFill, { width: `${pct}%` }]} />
    </View>
  );
}

// ─── Child Detail Card ─────────────────────────────────────────────────────
function ChildDetail({ child }: { child: typeof MOCK_CHILDREN[0] }) {
  const satDelta = child.satScore - child.satScorePrev;

  return (
    <View style={styles.childCard}>
      {/* Child header */}
      <View style={styles.childHeader}>
        <View style={styles.childAvatarPlaceholder}>
          <Text style={styles.childInitial}>{child.name[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.childName}>{child.name}</Text>
          <Text style={styles.childClasse}>{child.classe}</Text>
        </View>
        <View style={styles.satChip}>
          <Text style={styles.satScore}>{child.satScore}</Text>
          <Text style={[styles.satDelta, { color: satDelta >= 0 ? '#0D6B5E' : '#E53935' }]}>
            {satDelta >= 0 ? '▲' : '▼'} {Math.abs(satDelta)}
          </Text>
        </View>
      </View>

      {/* Level + points */}
      <View style={styles.levelRow}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>Niveau {child.levelNum} – {child.level}</Text>
        </View>
        <Text style={styles.pointsText}>{child.points} / {child.pointsNext} pts</Text>
      </View>
      <LevelBar points={child.points} pointsNext={child.pointsNext} />

      {/* Stats mini row */}
      <View style={styles.miniStatsRow}>
        <View style={styles.miniStat}>
          <Text style={styles.miniStatValue}>{child.progressPercent}%</Text>
          <Text style={styles.miniStatLabel}>Progression</Text>
        </View>
        <View style={styles.miniStatDivider} />
        <View style={styles.miniStat}>
          <Text style={styles.miniStatValue}>{child.streak} j</Text>
          <Text style={styles.miniStatLabel}>Streak 🔥</Text>
        </View>
        <View style={styles.miniStatDivider} />
        <View style={styles.miniStat}>
          <Text style={styles.miniStatValue}>{child.badges.length}</Text>
          <Text style={styles.miniStatLabel}>Badges</Text>
        </View>
      </View>

      {/* Badges */}
      <View style={styles.badgesRow}>
        {child.badges.map((b, i) => (
          <View key={i} style={styles.badge}>
            <Text style={styles.badgeEmoji}>{b}</Text>
          </View>
        ))}
      </View>

      {/* Subjects */}
      <Text style={styles.subjectsTitle}>Progression par matière</Text>
      {child.subjects.map((sub) => (
        <View key={sub.name} style={styles.subjectRow}>
          <Text style={styles.subjectName}>{sub.name}</Text>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <ProgressBar value={sub.progress} color={sub.color} />
          </View>
          <Text style={[styles.subjectPct, { color: sub.color }]}>{sub.progress}%</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────
export default function ParentProgressionScreen({ navigation }: any) {
  const [selectedChild, setSelectedChild] = useState<string | null>(null);

  const displayed =
    selectedChild
      ? MOCK_CHILDREN.filter((c) => c.id === selectedChild)
      : MOCK_CHILDREN;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <Text style={styles.topbarTitle}>Progression</Text>
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        <TouchableOpacity
          style={[styles.tab, selectedChild === null && styles.tabActive]}
          onPress={() => setSelectedChild(null)}
        >
          <Text style={[styles.tabText, selectedChild === null && styles.tabTextActive]}>
            Tous
          </Text>
        </TouchableOpacity>
        {MOCK_CHILDREN.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.tab, selectedChild === c.id && styles.tabActive]}
            onPress={() => setSelectedChild(c.id)}
          >
            <Text style={[styles.tabText, selectedChild === c.id && styles.tabTextActive]}>
              {c.name.split(' ')[0]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {displayed.map((child) => (
          <ChildDetail key={child.id} child={child} />
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7F6' },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 8 },

  topbar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  topbarTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
  },

  tabs: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#E8EEEC',
  },
  tabActive: { backgroundColor: '#0D6B5E' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#555' },
  tabTextActive: { color: '#fff' },

  childCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },

  childHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
  childAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0D6B5E22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  childInitial: { fontSize: 20, fontWeight: '700', color: '#0D6B5E' },
  childName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  childClasse: { fontSize: 12, color: '#888', marginTop: 2 },
  satChip: {
    backgroundColor: '#E8F5F2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  satScore: { fontSize: 20, fontWeight: '800', color: '#0D6B5E' },
  satDelta: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  levelBadge: {
    backgroundColor: '#D4A01722',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  levelText: { fontSize: 12, fontWeight: '700', color: '#D4A017' },
  pointsText: { fontSize: 12, color: '#888' },

  levelBarBg: {
    height: 6,
    backgroundColor: '#E8EEEC',
    borderRadius: 3,
    marginBottom: 14,
    overflow: 'hidden',
  },
  levelBarFill: {
    height: '100%',
    backgroundColor: '#D4A017',
    borderRadius: 3,
  },

  miniStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F7F6',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 14,
  },
  miniStat: { flex: 1, alignItems: 'center' },
  miniStatValue: { fontSize: 16, fontWeight: '800', color: '#0D6B5E' },
  miniStatLabel: { fontSize: 10, color: '#888', marginTop: 3 },
  miniStatDivider: { width: 1, backgroundColor: '#DDD' },

  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F7F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeEmoji: { fontSize: 18 },

  subjectsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  subjectName: { fontSize: 12, color: '#555', width: 90 },
  subjectPct: { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },

  barBg: {
    height: 7,
    backgroundColor: '#E8EEEC',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
});