import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  Animated,
  RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as SecureStore from 'expo-secure-store';
// ─── API ──────────────────────────────────────────────────────────────────────
import api from '../../services/auth.service';


const { width: SCREEN_WIDTH } = Dimensions.get('window');



// ─── TYPES ────────────────────────────────────────────────────────────────────
interface SATSection {
  name: string;
  score: number;
  maxScore: number;
  color: string;
  icon: string;
}

interface SATHistoryPoint {
  date: string;
  score: number;
}

interface ChildProgress {
  userId: string;
  name: string;
  classe: string;
  avatarInitial: string;
  currentScore: number;
  targetScore: number;
  globalProgress: number;
  monthlyProgress: number;
  satHistory: SATHistoryPoint[];
  sections: SATSection[];
}

// ─── API CALLS ────────────────────────────────────────────────────────────────
async function fetchChildrenProgress(parentId: string): Promise<ChildProgress[]> {
  try {
    // UNCOMMENT quand le backend est prêt :
    // const res = await api.get(`/sat/parent/${parentId}/progress`);
    // return res.data.children;
    return [];
  } catch (err) {
    console.error('fetchChildrenProgress error:', err);
    return [];
  }
}

// ─── ANIMATED BAR ─────────────────────────────────────────────────────────────
function AnimatedBar({ value, color, height = 6 }: { value: number; color: string; height?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration: 900, useNativeDriver: false }).start();
  }, [value]);
  return (
    <View style={[styles.barBg, { height }]}>
      <Animated.View style={[styles.barFill, {
        backgroundColor: color,
        height,
        width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
      }]} />
    </View>
  );
}

// ─── SAT CHART ────────────────────────────────────────────────────────────────
function SATChart({ data }: { data: SATHistoryPoint[] }) {
  if (!data || data.length < 2) {
    return (
      <View style={styles.chartEmpty}>
        <Ionicons name="stats-chart-outline" size={32} color="#CCC" />
        <Text style={styles.chartEmptyText}>Pas encore de données</Text>
      </View>
    );
  }

  const chartWidth = SCREEN_WIDTH - 72;
  const chartHeight = 140;
  const padL = 44, padR = 16, padT = 16, padB = 32;
  const innerW = chartWidth - padL - padR;
  const innerH = chartHeight - padT - padB;

  const scores = data.map(d => d.score);
  const minS = Math.min(...scores) - 100;
  const maxS = Math.max(...scores) + 100;
  const toX = (i: number) => padL + (i / (data.length - 1)) * innerW;
  const toY = (s: number) => padT + innerH - ((s - minS) / (maxS - minS)) * innerH;

  const yTicks = [600, 900, 1200, 1500];
  const xIndices = [0, Math.floor(data.length / 4), Math.floor(data.length / 2),
    Math.floor((data.length * 3) / 4), data.length - 1];
  const lastX = toX(data.length - 1);
  const lastY = toY(data[data.length - 1].score);

  return (
    <View style={{ width: chartWidth, height: chartHeight + 8 }}>
      {yTicks.map(tick => {
        const y = toY(tick);
        if (y < padT - 4 || y > padT + innerH + 4) return null;
        return (
          <React.Fragment key={tick}>
            <View style={[styles.gridLine, { top: y, left: padL, width: innerW }]} />
            <View style={[styles.yLabel, { top: y - 8, left: 0, width: padL - 6 }]}>
              <Text style={styles.axisText}>{tick}</Text>
            </View>
          </React.Fragment>
        );
      })}
      {xIndices.map(idx => {
        const d = data[idx];
        if (!d) return null;
        return (
          <View key={idx} style={[styles.xLabel, { top: padT + innerH + 6, left: toX(idx) - 20, width: 40 }]}>
            <Text style={styles.axisText} numberOfLines={1}>{d.date}</Text>
          </View>
        );
      })}
      {data.map((d, i) => {
        if (i === 0) return null;
        const x1 = toX(i - 1), y1 = toY(data[i - 1].score);
        const x2 = toX(i), y2 = toY(d.score);
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View key={i} style={{
            position: 'absolute', top: y1, left: x1, width: len, height: 2.5,
            backgroundColor: '#0D6B5E', borderRadius: 2,
            transform: [{ rotate: `${angle}deg` }], transformOrigin: '0 50%',
          }} />
        );
      })}
      <View style={[styles.tooltip, { top: lastY - 24, left: lastX - 22 }]}>
        <Text style={styles.tooltipText}>{data[data.length - 1].score}</Text>
      </View>
      <View style={[styles.dot, { top: lastY - 5, left: lastX - 5 }]} />
    </View>
  );
}

// ─── SECTION ROW ─────────────────────────────────────────────────────────────
function SectionRow({ section }: { section: SATSection }) {
  return (
    <View style={styles.sectionRow}>
      <View style={[styles.sectionIconWrap, { backgroundColor: section.color + '18' }]}>
        <Ionicons name={section.icon as any} size={16} color={section.color} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={styles.sectionLabelRow}>
          <Text style={styles.sectionName}>{section.name}</Text>
          <Text style={[styles.sectionScore, { color: section.color }]}>
            {section.score}<Text style={styles.sectionMax}>/{section.maxScore}</Text>
          </Text>
        </View>
        <AnimatedBar value={(section.score / section.maxScore) * 100} color={section.color} />
      </View>
    </View>
  );
}

// ─── CHILD SELECTOR ──────────────────────────────────────────────────────────
function ChildSelector({ children, selected, onSelect }: {
  children: ChildProgress[];
  selected: ChildProgress;
  onSelect: (c: ChildProgress) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.selectorContainer, open && { zIndex: 20 }]}>
      <TouchableOpacity style={styles.selectorBtn} onPress={() => setOpen(o => !o)} activeOpacity={0.8}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{selected.avatarInitial}</Text>
        </View>
        <Text style={styles.selectorName}>{selected.name}</Text>
        <Text style={styles.selectorClasse}>{selected.classe}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#888" style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdown}>
          {children.map(c => (
            <TouchableOpacity
              key={c.userId}
              style={[styles.dropdownOption, c.userId === selected.userId && styles.dropdownOptionActive]}
              onPress={() => { onSelect(c); setOpen(false); }}
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{c.avatarInitial}</Text>
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.dropdownName}>{c.name}</Text>
                <Text style={styles.dropdownClasse}>{c.classe}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── SCORE CARD ───────────────────────────────────────────────────────────────
function ScoreCard({ label, score, maxScore, icon }: {
  label: string; score: number; maxScore: number; icon: string;
}) {
  return (
    <View style={styles.scoreCard}>
      <View style={styles.scoreCardHeader}>
        <View style={styles.scoreIconWrap}>
          <Ionicons name={icon as any} size={16} color="#0D6B5E" />
        </View>
        <Text style={styles.scoreLabel}>{label}</Text>
      </View>
      <Text style={styles.scoreValue}>{score || '—'}</Text>
      <Text style={styles.scoreMax}>sur {maxScore}</Text>
      <View style={{ marginTop: 10 }}>
        <AnimatedBar value={(score / maxScore) * 100} color="#0D6B5E" height={5} />
      </View>
    </View>
  );
}

// ─── PROGRESS ROW ─────────────────────────────────────────────────────────────
function ProgressRow({ globalProgress, monthlyProgress }: { globalProgress: number; monthlyProgress: number }) {
  const isPositive = monthlyProgress >= 0;
  return (
    <View style={styles.progressCard}>
      <View style={styles.progressCardLeft}>
        <View style={styles.progressIconWrap}>
          <Ionicons name="trending-up-outline" size={18} color="#0D6B5E" />
        </View>
        <Text style={styles.progressLabel}>Progression globale</Text>
      </View>
      <View style={styles.progressCardRight}>
        <Text style={styles.progressValue}>{globalProgress}%</Text>
        <View style={[styles.progressBadge, { backgroundColor: isPositive ? '#0D6B5E18' : '#E5393518' }]}>
          <Text style={[styles.progressBadgeText, { color: isPositive ? '#0D6B5E' : '#E53935' }]}>
            {isPositive ? '+' : ''}{monthlyProgress}% ce mois
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name="stats-chart-outline" size={52} color="#CCC" />
      <Text style={styles.emptyTitle}>Aucune donnée disponible</Text>
      <Text style={styles.emptyText}>
        Les données de progression apparaîtront{'\n'}une fois que vos enfants commenceront.
      </Text>
    </View>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
export default function ParentProgressionScreen({ navigation, route }: any) {
  const [children, setChildren] = useState<ChildProgress[]>([]);
  const [selected, setSelected] = useState<ChildProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const userRaw = await SecureStore.getItemAsync('user');
      const user = userRaw ? JSON.parse(userRaw) : {};
      const result = await fetchChildrenProgress(user.id || user.userId || '');
      setChildren(result);
      const targetId = route?.params?.childId;
      const target = targetId ? result.find(c => c.userId === targetId) : null;
      setSelected(target || result[0] || null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0D6B5E" />
          <Text style={styles.loadingText}>Chargement de la progression...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── Topbar ── */}
      <View style={styles.topbar}>
        
        <Text style={styles.topbarTitle}>Progression</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor="#0D6B5E"
          />
        }
      >
        {!selected ? <EmptyState /> : (
          <>
            {/* ── Sélecteur enfant ── */}
            {children.length > 1 && (
              <ChildSelector children={children} selected={selected} onSelect={setSelected} />
            )}

            {/* ── Scores ── */}
            <Text style={styles.sectionLabel}>Score SAT</Text>
            <View style={styles.scoreRow}>
              <ScoreCard label="Score actuel" score={selected.currentScore} maxScore={1600} icon="school-outline" />
              <View style={{ width: 12 }} />
              <ScoreCard label="Score cible" score={selected.targetScore} maxScore={1600} icon="flag-outline" />
            </View>

            {/* ── Progression globale ── */}
            <ProgressRow globalProgress={selected.globalProgress} monthlyProgress={selected.monthlyProgress} />

            {/* ── Évolution ── */}
            <Text style={styles.sectionLabel}>Évolution du score SAT</Text>
            <View style={styles.card}>
              <SATChart data={selected.satHistory} />
            </View>

            {/* ── Sections ── */}
            <Text style={styles.sectionLabel}>Détail par section</Text>
            <View style={styles.sectionsCard}>
              {selected.sections.map((s, i) => (
                <View key={s.name}>
                  <SectionRow section={s} />
                  {i < selected.sections.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#FFFFFF' },
  scroll:    { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:      { fontSize: 13, color: '#888', fontWeight: '500' },

  // ── Topbar ─────────────────────────────────────────────────────────────────
  topbar: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 20,
  paddingTop: 115,
  paddingBottom: 12,
},
topbarTitle: {
  fontSize: 25,
  fontWeight: '800',
  color: '#0D6B5E',
  position: 'absolute',
  left: 0,
  right: 0,
  textAlign: 'center',
  paddingTop: 30,
},

  sectionLabel: {
    fontSize: 15, fontWeight: '700', color: '#1A1A1A',
    marginTop: 24, marginBottom: 12,
  },

  // ── Child selector ─────────────────────────────────────────────────────────
  selectorContainer: { marginBottom: 8, zIndex: 10 },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    gap: 10,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#0D6B5E18',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText:    { fontSize: 15, fontWeight: '800', color: '#0D6B5E' },
  selectorName:  { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  selectorClasse:{ fontSize: 12, color: '#888', marginLeft: 4 },
  dropdown: {
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 6,
  },
  dropdownOption:       { flexDirection: 'row', alignItems: 'center', padding: 14 },
  dropdownOptionActive: { backgroundColor: '#F0FAF8' },
  dropdownName:  { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  dropdownClasse:{ fontSize: 11, color: '#888', marginTop: 2 },

  // ── Score cards ────────────────────────────────────────────────────────────
  scoreRow: { flexDirection: 'row', marginBottom: 0 },
  scoreCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  scoreCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  scoreIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#0D6B5E18',
    justifyContent: 'center', alignItems: 'center',
  },
  scoreLabel: { fontSize: 11, fontWeight: '600', color: '#888', flex: 1 },
  scoreValue: { fontSize: 30, fontWeight: '800', color: '#1A1A1A' },
  scoreMax:   { fontSize: 11, color: '#AAA', marginTop: 2 },

  // ── Progress card ──────────────────────────────────────────────────────────
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  progressCardLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressCardRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#0D6B5E18',
    justifyContent: 'center', alignItems: 'center',
  },
  progressLabel:     { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  progressValue:     { fontSize: 22, fontWeight: '800', color: '#0D6B5E' },
  progressBadge:     { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  progressBadgeText: { fontSize: 11, fontWeight: '700' },

  // ── Chart card ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    overflow: 'hidden',
  },
  chartEmpty:     { paddingVertical: 40, alignItems: 'center', gap: 10 },
  chartEmptyText: { color: '#AAA', fontSize: 13, fontWeight: '500' },
  gridLine: { position: 'absolute', height: 1, backgroundColor: '#F0F0F0' },
  yLabel:   { position: 'absolute', alignItems: 'flex-end' },
  xLabel:   { position: 'absolute', alignItems: 'center' },
  axisText: { fontSize: 9, color: '#BBB' },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#0D6B5E',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tooltipText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  dot: {
    position: 'absolute',
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#0D6B5E',
    borderWidth: 2, borderColor: '#fff',
  },

  // ── Sections card ──────────────────────────────────────────────────────────
  sectionsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  sectionLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionName:  { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  sectionScore: { fontSize: 14, fontWeight: '800' },
  sectionMax:   { fontSize: 11, fontWeight: '500', color: '#AAA' },
  divider:      { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 16 },

  // ── Bar ────────────────────────────────────────────────────────────────────
  barBg:   { backgroundColor: '#E8EEEC', borderRadius: 4, overflow: 'hidden' },
  barFill: { borderRadius: 4 },

  // ── Empty ──────────────────────────────────────────────────────────────────
  emptyWrap:  { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16, color: '#888', fontWeight: '700' },
  emptyText:  { fontSize: 13, color: '#CCC', textAlign: 'center', lineHeight: 20 },
});