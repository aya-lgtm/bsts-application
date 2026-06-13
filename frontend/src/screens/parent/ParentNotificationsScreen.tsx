import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as SecureStore from 'expo-secure-store';

// ─── Types ────────────────────────────────────────────────────────────────
type NotifType = 'lesson' | 'quiz' | 'score' | 'payment' | 'renewal' | 'streak';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  subtitle: string;
  read: boolean;
  createdAt: string;
}

// ─── API ──────────────────────────────────────────────────────────────────
const API_URL = 'http://192.168.1.5:3000/api/v1';

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await SecureStore.getItemAsync('accessToken');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...((options.headers as any) || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Erreur serveur');
  return data;
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Aujourd\'hui';
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Icon per type ─────────────────────────────────────────────────────────
function NotifIcon({ type }: { type: NotifType }) {
  const config: Record<NotifType, { emoji: string; bg: string; border: string }> = {
    lesson:  { emoji: '🏆', bg: '#FFF8E7', border: '#F5CC6A' },
    quiz:    { emoji: '✅', bg: '#EAF7EE', border: '#4CAF50' },
    score:   { emoji: '⭐', bg: '#FFF8E7', border: '#F5CC6A' },
    payment: { emoji: '💳', bg: '#EEF4FF', border: '#5C85E6' },
    renewal: { emoji: '🏅', bg: '#EAF7EE', border: '#4CAF50' },
    streak:  { emoji: '🔥', bg: '#FFF0EE', border: '#E53935' },
  };
  const c = config[type] || config.lesson;
  return (
    <View style={[styles.iconCircle, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={styles.iconEmoji}>{c.emoji}</Text>
    </View>
  );
}

// ─── Notification Row ──────────────────────────────────────────────────────
function NotifRow({
  notif,
  onPress,
  onDelete,
}: {
  notif: Notification;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, !notif.read && styles.rowUnread]}
      onPress={onPress}
      activeOpacity={0.75}
      onLongPress={() =>
        Alert.alert('Supprimer', 'Supprimer cette notification ?', [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', style: 'destructive', onPress: onDelete },
        ])
      }
    >
      <NotifIcon type={notif.type} />

      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, !notif.read && styles.rowTitleBold]} numberOfLines={1}>
          {notif.title}
        </Text>
        {notif.subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={1}>{notif.subtitle}</Text>
        ) : null}
      </View>

      <View style={styles.rowDate}>
        <Text style={styles.rowDay}>{formatDate(notif.createdAt)}</Text>
        <Text style={styles.rowTime}>{formatTime(notif.createdAt)}</Text>
      </View>

      {!notif.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

// ─── Detail Modal ──────────────────────────────────────────────────────────
function DetailModal({
  notif,
  onClose,
}: {
  notif: Notification | null;
  onClose: () => void;
}) {
  if (!notif) return null;
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <NotifIcon type={notif.type} />
          <Text style={styles.modalTitle}>{notif.title}</Text>
          {notif.subtitle ? (
            <Text style={styles.modalSubtitle}>{notif.subtitle}</Text>
          ) : null}
          <Text style={styles.modalDate}>
            {formatDate(notif.createdAt)} · {formatTime(notif.createdAt)}
          </Text>
          <TouchableOpacity style={styles.modalBtn} onPress={onClose}>
            <Text style={styles.modalBtnText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Filter Tabs ───────────────────────────────────────────────────────────
const FILTERS = ['Tout', 'Activité', 'Paiements', 'Non lus'];

function FilterTabs({
  active,
  onSelect,
  counts,
}: {
  active: string;
  onSelect: (f: string) => void;
  counts: Record<string, number>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabsScroll}
      contentContainerStyle={styles.tabsContent}
    >
      {FILTERS.map((f) => (
        <TouchableOpacity
          key={f}
          style={[styles.tab, active === f && styles.tabActive]}
          onPress={() => onSelect(f)}
        >
          <Text style={[styles.tabText, active === f && styles.tabTextActive]}>{f}</Text>
          {counts[f] > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{counts[f]}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────
export default function ParentNotificationsScreen({ navigation }: any) {
  const [notifs, setNotifs]       = useState<Notification[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setFilter] = useState('Tout');
  const [selected, setSelected]   = useState<Notification | null>(null);

  // ── Load from API ─────────────────────────────────────────────────────
  const loadNotifs = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await apiFetch('/notifications');
      setNotifs(data.notifications || []);
    } catch (e: any) {
      console.error('Notifs error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadNotifs(); }, []);

  // ── Mark as read ──────────────────────────────────────────────────────
  const handlePress = async (notif: Notification) => {
    setSelected(notif);
    if (!notif.read) {
      try {
        await apiFetch(`/notifications/${notif.id}/read`, { method: 'PUT' });
        setNotifs((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
      } catch (e) {}
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/notifications/${id}`, { method: 'DELETE' });
      setNotifs((prev) => prev.filter((n) => n.id !== id));
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  // ── Mark all read ─────────────────────────────────────────────────────
  const markAllRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'PUT' });
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  // ── Filter ────────────────────────────────────────────────────────────
  const filtered = notifs.filter((n) => {
    if (activeFilter === 'Non lus')   return !n.read;
    if (activeFilter === 'Activité')  return ['lesson', 'quiz', 'score', 'streak'].includes(n.type);
    if (activeFilter === 'Paiements') return ['payment', 'renewal'].includes(n.type);
    return true;
  });

  const unreadCount = notifs.filter((n) => !n.read).length;
  const counts: Record<string, number> = {
    'Tout': unreadCount,
    'Non lus': unreadCount,
    'Activité': notifs.filter((n) => !n.read && ['lesson','quiz','score','streak'].includes(n.type)).length,
    'Paiements': notifs.filter((n) => !n.read && ['payment','renewal'].includes(n.type)).length,
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>

      {/* Topbar */}
      <View style={styles.topbar}>
        <Text style={styles.topbarTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
            <Text style={styles.markAllText}>Tout lire ({unreadCount})</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <FilterTabs active={activeFilter} onSelect={setFilter} counts={counts} />

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0D6B5E" />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadNotifs(true)}
              tintColor="#0D6B5E"
            />
          }
        >
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={52} color="#CCC" />
              <Text style={styles.emptyTitle}>Aucune notification</Text>
              <Text style={styles.emptyText}>Tirez vers le bas pour actualiser</Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              {filtered.map((notif, idx) => (
                <View key={notif.id}>
                  <NotifRow
                    notif={notif}
                    onPress={() => handlePress(notif)}
                    onDelete={() => handleDelete(notif.id)}
                  />
                  {idx < filtered.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          )}
          <Text style={styles.hint}>Appuyez longuement pour supprimer</Text>
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {/* Detail Modal */}
      <DetailModal notif={selected} onClose={() => setSelected(null)} />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

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
    position: 'absolute', // Positionnement absolu
    left: 0,              // Pour ignorer le flux normal
    right: 0,             // Pour ignorer le flux normal
    textAlign: 'center',  // Centrage du texte 
    paddingTop: 30,
    },

  markAllBtn: {
    backgroundColor: '#0D6B5E18',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: { fontSize: 12, color: '#0D6B5E', fontWeight: '700' },

  // Filter tabs
  tabsScroll: { maxHeight: 48 },
  tabsContent: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#DDD', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: '#fff',
  },
  tabActive: { backgroundColor: '#0D6B5E', borderColor: '#0D6B5E' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#555' },
  tabTextActive: { color: '#fff' },
  tabBadge: {
    backgroundColor: '#E53935', borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: 'center',
  },
  tabBadgeText: { fontSize: 10, color: '#fff', fontWeight: '800' },

  // List
  listCard: {
    backgroundColor: '#fff', borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    position: 'relative',
  },
  rowUnread: { backgroundColor: '#FAFFFE' },
  iconCircle: {
    width: 46, height: 46, borderRadius: 23,
    borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  iconEmoji: { fontSize: 20 },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 14, color: '#1A1A1A', fontWeight: '500' },
  rowTitleBold: { fontWeight: '700' },
  rowSubtitle: { fontSize: 12, color: '#888', marginTop: 3 },
  rowDate: { alignItems: 'flex-end', flexShrink: 0 },
  rowDay: { fontSize: 12, color: '#555', fontWeight: '500' },
  rowTime: { fontSize: 11, color: '#AAA', marginTop: 2 },
  unreadDot: {
    position: 'absolute', top: 14, right: 14,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#0D6B5E',
  },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 16 },

  // Empty
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16, color: '#888', fontWeight: '700' },
  emptyText: { fontSize: 13, color: '#CCC' },
  hint: { textAlign: 'center', fontSize: 11, color: '#CCC', marginTop: 16 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 20,
    padding: 28, alignItems: 'center', width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 10,
  },
  modalTitle: {
    fontSize: 17, fontWeight: '800', color: '#1A1A1A',
    marginTop: 14, textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14, color: '#555', marginTop: 8,
    textAlign: 'center', lineHeight: 20,
  },
  modalDate: { fontSize: 12, color: '#AAA', marginTop: 8, marginBottom: 20 },
  modalBtn: {
    backgroundColor: '#0D6B5E', borderRadius: 12,
    paddingVertical: 13, paddingHorizontal: 40,
  },
  modalBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});