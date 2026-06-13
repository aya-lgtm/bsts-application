import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
const logo = require('../../assets/logo1.png');
import * as SecureStore from 'expo-secure-store';
import api from '../../services/auth.service';

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Child {
  id: string;
  name: string;
  classe: string;
  satScore: number;
  avatar: string | null;
  progressPercent: number;
  progressHistory: number[]; // ← NOUVEAU : tableau de % dans le temps ex: [20, 35, 40, 55]
  coursesCompleted: number;
  coursesTotal: number;
  streak: number;
}

interface ActivityItem {
  id: string;
  childName: string;
  type: string;
  title: string;
  subtitle: string;
  date: string;
  icon: string;
  iconColor: string;
}

interface HomeData {
  parent: { firstName: string };
  children: Child[];
  activity: ActivityItem[];
}

interface StudentSearchResult {
  id: string;
  name: string;
  email: string;
  classe: string;
}

const getMockData = (user: any): HomeData => ({
  parent: { firstName: user?.prenom || user?.firstName || 'Parent' },
  children: [],
  activity: [],
});

async function fetchHomeData(parentId: string): Promise<HomeData> {
  const userRaw = await SecureStore.getItemAsync('user');
  const user = userRaw ? JSON.parse(userRaw) : {};
  try {
    const [childrenRes, activityRes] = await Promise.all([
      api.get(`/users/${parentId}/children`),
      api.get(`/users/${parentId}/activity?limit=5`),
    ]);
    return {
      parent: { firstName: childrenRes.data.parentName || user?.prenom || user?.firstName || 'Parent' },
      children: childrenRes.data.children || [],
      activity: activityRes.data.activity || [],
    };
  } catch (err) {
    console.error('fetchHomeData error:', err);
    return getMockData(user);
  }
}

async function searchStudent(query: string): Promise<StudentSearchResult[]> {
  const res = await api.get(`/users/search?q=${encodeURIComponent(query)}&role=student`);
  return res.data.users || [];
}

async function sendLinkRequest(parentId: string, studentId: string): Promise<void> {
  await api.post(`/users/${parentId}/link-request`, { studentId });
}

// ─── SPARKLINE ────────────────────────────────────────────────────────────────
const SPARK_WIDTH = 100;
const SPARK_HEIGHT = 40;

function Sparkline({ points }: { points: number[] }) {
  // Pas de données → ligne plate au milieu
  if (!points || points.length < 2) {
    return (
      <View style={{ width: SPARK_WIDTH, height: SPARK_HEIGHT }}>
        <View style={{
          position: 'absolute',
          left: 0,
          top: SPARK_HEIGHT / 2,
          width: SPARK_WIDTH,
          height: 2,
          backgroundColor: 'rgba(255,255,255,0.5)',
          borderRadius: 1,
        }} />
        <View style={{
          position: 'absolute',
          left: SPARK_WIDTH - 8,
          top: SPARK_HEIGHT / 2 - 4,
          width: 8, height: 8, borderRadius: 4,
          backgroundColor: 'rgba(255,255,255,0.9)',
        }} />
      </View>
    );
  }

  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = SPARK_WIDTH / (points.length - 1);
  const pts = points.map((v, i) => ({
    x: i * step,
    y: SPARK_HEIGHT - ((v - min) / range) * (SPARK_HEIGHT - 8) - 4,
  }));

  return (
    <View style={{ width: SPARK_WIDTH, height: SPARK_HEIGHT }}>
      {pts.slice(0, -1).map((pt, i) => {
        const next = pts[i + 1];
        const dx = next.x - pt.x;
        const dy = next.y - pt.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View key={i} style={{
            position: 'absolute', left: pt.x, top: pt.y,
            width: length, height: 2,
            backgroundColor: 'rgba(255,255,255,0.8)',
            borderRadius: 1,
            transform: [{ rotate: `${angle}deg` }],
            transformOrigin: '0 50%',
          }} />
        );
      })}
      <View style={{
        position: 'absolute',
        left: pts[pts.length - 1].x - 4,
        top: pts[pts.length - 1].y - 4,
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.9)',
      }} />
    </View>
  );
}

// ─── ADD CHILD MODAL ──────────────────────────────────────────────────────────
function AddChildModal({ visible, onClose, parentId }: {
  visible: boolean;
  onClose: () => void;
  parentId: string;
}) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<StudentSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent]       = useState<string[]>([]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    try {
      setSearching(true);
      setResults([]);
      const data = await searchStudent(query.trim());
      setResults(data);
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de rechercher');
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (student: StudentSearchResult) => {
    try {
      setSending(student.id);
      await sendLinkRequest(parentId, student.id);
      setSent(prev => [...prev, student.id]);
      Alert.alert('Demande envoyée', `Une demande de liaison a été envoyée à ${student.name}.`);
    } catch (e: any) {
      Alert.alert('Erreur', e.message || "Impossible d'envoyer la demande");
    } finally {
      setSending(null);
    }
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setSent([]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.card}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Ajouter un enfant</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#888" />
            </TouchableOpacity>
          </View>

          <Text style={modalStyles.subtitle}>
            Recherchez le compte de votre enfant par nom ou email. Une demande lui sera envoyée pour acceptation.
          </Text>

          <View style={modalStyles.searchRow}>
            <TextInput
              style={modalStyles.input}
              placeholder="Nom ou email de l'élève..."
              placeholderTextColor="#BBB"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[modalStyles.searchBtn, searching && { opacity: 0.6 }]}
              onPress={handleSearch}
              disabled={searching}
            >
              {searching
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="search" size={18} color="#fff" />
              }
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
            {results.length === 0 && !searching && query.trim() !== '' && (
              <View style={modalStyles.emptyResult}>
                <Ionicons name="person-outline" size={32} color="#CCC" />
                <Text style={modalStyles.emptyResultText}>Aucun élève trouvé</Text>
              </View>
            )}
            {results.map((student, idx) => {
              const isSent    = sent.includes(student.id);
              const isLoading = sending === student.id;
              return (
                <View key={student.id}>
                  <View style={modalStyles.resultRow}>
                    <View style={modalStyles.resultAvatar}>
                      <Text style={modalStyles.resultAvatarText}>{student.name[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={modalStyles.resultName}>{student.name}</Text>
                      <Text style={modalStyles.resultMeta}>{student.email} · {student.classe}</Text>
                    </View>
                    <TouchableOpacity
                      style={[modalStyles.requestBtn, isSent && modalStyles.requestBtnSent]}
                      onPress={() => !isSent && handleSendRequest(student)}
                      disabled={isSent || isLoading}
                    >
                      {isLoading
                        ? <ActivityIndicator size="small" color="#0D6B5E" />
                        : isSent
                          ? <Ionicons name="checkmark" size={16} color="#0D6B5E" />
                          : <Text style={modalStyles.requestBtnText}>Envoyer</Text>
                      }
                    </TouchableOpacity>
                  </View>
                  {idx < results.length - 1 && <View style={modalStyles.divider} />}
                </View>
              );
            })}
          </ScrollView>

          <View style={modalStyles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color="#0D6B5E" />
            <Text style={modalStyles.infoText}>
              L'élève recevra une notification et devra accepter votre demande.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── CHILD CARD ───────────────────────────────────────────────────────────────
function ChildCard({ child, onPress }: { child: Child; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.childCard} activeOpacity={0.85} onPress={onPress}>
      {child.avatar ? (
        <Image source={{ uri: child.avatar }} style={styles.childAvatar} />
      ) : (
        <View style={[styles.childAvatar, styles.childAvatarPlaceholder]}>
          <Text style={styles.childAvatarInitial}>{child.name[0]}</Text>
        </View>
      )}
      <Text style={styles.childName} numberOfLines={1}>{child.name}</Text>
      <Text style={styles.childClasse}>{child.classe}</Text>
      <View style={styles.satBadge}>
        <Text style={styles.satScore}>{child.satScore || '—'}</Text>
      </View>
      <Text style={styles.satLabel}>Score SAT</Text>
    </TouchableOpacity>
  );
}

function AddChildCard({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.childCard, styles.addChildCard]} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.addChildIcon}>
        <Ionicons name="add" size={28} color="#0D6B5E" />
      </View>
      <Text style={styles.addChildLabel}>Ajouter{'\n'}un enfant</Text>
    </TouchableOpacity>
  );
}

// ─── ACTIVITY ROW ─────────────────────────────────────────────────────────────
function ActivityRow({ item, isLast }: { item: ActivityItem; isLast: boolean }) {
  return (
    <View style={[styles.activityRow, !isLast && styles.activityRowBorder]}>
      <View style={[styles.activityIcon, { backgroundColor: item.iconColor + '18' }]}>
        <Ionicons name={item.icon as any} size={18} color={item.iconColor} />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>
          {item.childName
            ? <Text style={{ fontWeight: '700', color: '#1A1A1A' }}>{item.childName} </Text>
            : null}
          {item.title}
        </Text>
        <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
      </View>
      <Text style={styles.activityDate}>{item.date}</Text>
    </View>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function ParentHomeScreen({ navigation }: any) {
  const [data, setData]               = useState<HomeData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [parentId, setParentId]       = useState('');
  const [showAddChild, setShowAddChild] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const userRaw = await SecureStore.getItemAsync('user');
      const user = userRaw ? JSON.parse(userRaw) : {};
      const id = user.id || user.userId || '';
      setParentId(id);
      const result = await fetchHomeData(id);
      setData(result);
      try {
        const notifRes = await api.get('/notifications?limit=50');
        const notifs = notifRes.data.notifications || [];
        setUnreadCount(notifs.filter((n: any) => !n.read).length);
      } catch {}
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
        </View>
      </SafeAreaView>
    );
  }

  const children        = data?.children || [];
  const avgProgress     = children.length
    ? Math.round(children.reduce((s, c) => s + c.progressPercent, 0) / children.length)
    : 0;
  const totalCourses    = children.reduce((s, c) => s + c.coursesCompleted, 0);
  const totalCoursesMax = children.reduce((s, c) => s + c.coursesTotal, 0);
  const bestSat         = children.length ? Math.max(...children.map(c => c.satScore)) : 0;
  const maxStreak       = children.length ? Math.max(...children.map(c => c.streak)) : 0;

  // ── Calcul sparkline depuis les vraies données ──────────────────────────────
  // On prend l'historique de tous les enfants et on fait la moyenne à chaque point
  const sparkPoints: number[] = (() => {
    const histories = children
      .map(c => c.progressHistory || [])
      .filter(h => h.length > 0);
    if (histories.length === 0) return [];
    const minLen = Math.min(...histories.map(h => h.length));
    if (minLen < 2) return [];
    return Array.from({ length: minLen }, (_, i) =>
      Math.round(histories.reduce((s, h) => s + h[i], 0) / histories.length)
    );
  })();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#0D6B5E" />
        }
      >
        <Image source={logo} style={styles.logo} resizeMode="contain" />

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Bonjour,</Text>
            <Text style={styles.parentName}>{data?.parent.firstName}</Text>
          </View>
          <TouchableOpacity
            style={styles.bellWrap}
            onPress={() => navigation?.navigate('ParentNotifications')}
            activeOpacity={0.75}
          >
            <Ionicons name="notifications-outline" size={28} color="#1A1A1A" />
            {unreadCount > 0 && <View style={styles.bellDot} />}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Mes enfants</Text>
          {children.length > 0 && (
            <TouchableOpacity onPress={() => navigation?.navigate('ParentProgression')}>
              <Text style={styles.voirTout}>Voir tout</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childrenRow}>
          {children.map(child => (
            <ChildCard
              key={child.id}
              child={child}
              onPress={() => navigation?.navigate('ParentProgression', { childId: child.id })}
            />
          ))}
          <AddChildCard onPress={() => setShowAddChild(true)} />
        </ScrollView>

        <Text style={styles.sectionLabel}>Progression globale</Text>
        <View style={styles.progressCard}>
          <View style={styles.progressLeft}>
            <View style={styles.progressIconWrap}>
              <Ionicons name="trending-up-outline" size={16} color="#fff" />
            </View>
            <Text style={styles.progressPercent}>{avgProgress}%</Text>
            <Text style={styles.progressSub}>Moyenne de vos enfants</Text>
          </View>
          {/* Sparkline avec les vraies données */}
          <Sparkline points={sparkPoints} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View style={styles.statIconWrap}>
              <Ionicons name="book-outline" size={16} color="#0D6B5E" />
            </View>
            <Text style={styles.statValue}>{totalCourses}/{totalCoursesMax || '—'}</Text>
            <Text style={styles.statLabel}>Cours complétés</Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.statIconWrap}>
              <Ionicons name="stats-chart-outline" size={16} color="#0D6B5E" />
            </View>
            <Text style={styles.statValue}>{bestSat || '—'}</Text>
            <Text style={styles.statLabel}>Meilleur SAT</Text>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statIconWrap, { backgroundColor: '#E5393518' }]}>
              <Text style={{ fontSize: 14 }}>🔥</Text>
            </View>
            <Text style={styles.statValue}>{maxStreak ? `${maxStreak} j` : '—'}</Text>
            <Text style={styles.statLabel}>Série actuelle</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Activité récente</Text>
        <View style={styles.activityCard}>
          {!data?.activity || data.activity.length === 0 ? (
            <View style={styles.emptyActivity}>
              <Ionicons name="receipt-outline" size={32} color="#CCC" />
              <Text style={styles.emptyActivityText}>Aucune activité récente</Text>
            </View>
          ) : (
            data.activity.map((item, idx) => (
              <ActivityRow
                key={item.id}
                item={item}
                isLast={idx === data.activity.length - 1}
              />
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <AddChildModal
        visible={showAddChild}
        onClose={() => { setShowAddChild(false); load(); }}
        parentId={parentId}
      />
    </SafeAreaView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#FFFFFF' },
  scroll:    { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logo: { 
    paddingHorizontal: 173,
    width: 110,
    height: 80,
    marginBottom: 32,
    marginTop: 40,
 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  greeting:   { fontSize: 20, color: '#888', fontWeight: '500', marginTop: -30 },
  parentName: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginTop: 2, marginBottom:-20 },
  bellWrap: {
    width: 40, height: 40, borderRadius: 21, backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center', position: 'relative',marginTop: -90
  },
  bellDot: {
    position: 'absolute', top: 9, right: 9,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#E53935', borderWidth: 1.5, borderColor: '#F5F5F5',
  },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 },
  sectionLabel:  { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12, marginTop:10 },
  voirTout:      { fontSize: 13, color: '#0D6B5E', fontWeight: '600' },

  childrenRow: { paddingBottom: 4, marginBottom: 4, gap: 12 },
  childCard: {
    width: 116, backgroundColor: '#fff', borderRadius: 16, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#E8E8E8',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  childAvatar:            { width: 52, height: 52, borderRadius: 26, marginBottom: 8 },
  childAvatarPlaceholder: { backgroundColor: '#0D6B5E18', justifyContent: 'center', alignItems: 'center' },
  childAvatarInitial:     { fontSize: 20, fontWeight: '800', color: '#0D6B5E' },
  childName:   { fontSize: 13, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },
  childClasse: { fontSize: 11, color: '#888', marginTop: 2, marginBottom: 8 },
  satBadge:    { backgroundColor: '#0D6B5E18', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  satScore:    { fontSize: 18, fontWeight: '800', color: '#0D6B5E' },
  satLabel:    { fontSize: 10, color: '#888', marginTop: 4 },

  addChildCard:  { borderWidth: 1.5, borderColor: '#0D6B5E33', borderStyle: 'dashed', backgroundColor: '#F0FAF8', justifyContent: 'center' },
  addChildIcon:  { width: 48, height: 48, borderRadius: 24, backgroundColor: '#0D6B5E18', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  addChildLabel: { fontSize: 12, color: '#0D6B5E', fontWeight: '600', textAlign: 'center' },

  progressCard: {
    backgroundColor: '#0D6B5E', borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  progressLeft:    { flex: 1 },
  progressIconWrap:{ width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  progressPercent: { fontSize: 38, fontWeight: '800', color: '#fff' },
  progressSub:     { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 0 },
  statBox: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#E8E8E8',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  statIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#0D6B5E18', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue:    { fontSize: 16, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' },
  statLabel:    { fontSize: 10, color: '#888', textAlign: 'center', marginTop: 3 },

  activityCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E8E8E8', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  activityRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  activityRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  activityIcon:      { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  activityContent:   { flex: 1 },
  activityTitle:     { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  activitySubtitle:  { fontSize: 12, color: '#888', marginTop: 2 },
  activityDate:      { fontSize: 11, color: '#AAA' },
  emptyActivity:     { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyActivityText: { fontSize: 13, color: '#AAA', fontWeight: '500' },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  card: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title:    { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  subtitle: { fontSize: 13, color: '#888', marginBottom: 20, lineHeight: 18 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  input: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#1A1A1A', borderWidth: 1, borderColor: '#E8E8E8' },
  searchBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#0D6B5E', justifyContent: 'center', alignItems: 'center' },
  resultRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  resultAvatar:     { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0D6B5E18', justifyContent: 'center', alignItems: 'center' },
  resultAvatarText: { fontSize: 16, fontWeight: '800', color: '#0D6B5E' },
  resultName:       { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  resultMeta:       { fontSize: 12, color: '#888', marginTop: 2 },
  requestBtn:     { borderWidth: 1, borderColor: '#0D6B5E', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, minWidth: 72, alignItems: 'center' },
  requestBtnSent: { backgroundColor: '#0D6B5E18', borderColor: '#0D6B5E18' },
  requestBtnText: { fontSize: 13, fontWeight: '700', color: '#0D6B5E' },
  divider:         { height: 1, backgroundColor: '#F0F0F0' },
  emptyResult:     { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyResultText: { fontSize: 13, color: '#AAA', fontWeight: '500' },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#0D6B5E0D', borderRadius: 12, padding: 12, marginTop: 16 },
  infoText: { flex: 1, fontSize: 12, color: '#0D6B5E', lineHeight: 17 },
});