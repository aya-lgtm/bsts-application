import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Modal, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as SecureStore from 'expo-secure-store';
import api from '../../services/auth.service';

// ─── Couleurs ─────────────────────────────────────────────────────────────
const COLORS = {
  primary:       '#0D6B5E',
  primaryLight:  '#E8F5F3',
  bg:            '#F5F7F6',
  white:         '#FFFFFF',
  text:          '#1A1A2E',
  textSecondary: '#6B7280',
  border:        '#E5E7EB',
  danger:        '#EF4444',
  unread:        '#FAFFFE',
};

// ─── Types ────────────────────────────────────────────────────────────────
// ✅ Pas de 'payment' ni 'renewal' — le prof ne gère pas les paiements
type NotifType = 'message' | 'quiz_completed' | 'score_improved' | 'student_joined' | 'student_inactive';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  subtitle: string;
  read: boolean;
  createdAt: string;
}

// Préférences lues depuis SecureStore (définies dans ProfessorProfilScreen)
interface NotifPrefs {
  quizSubmitted:   boolean;  // contrôle quiz_completed
  lessonCompleted: boolean;  // contrôle score_improved
  newMessage:      boolean;  // contrôle message
  reminders:       boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  const date = new Date(iso);
  const now  = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7)  return `Il y a ${diffDays} jours`;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ─── Icône par type ───────────────────────────────────────────────────────
function NotifIcon({ type }: { type: NotifType }) {
  const config: Record<NotifType, { emoji: string; bg: string; border: string }> = {
    message:          { emoji: '💬', bg: '#EEF4FF', border: '#3B82F6' },
    quiz_completed:   { emoji: '📝', bg: COLORS.primaryLight, border: COLORS.primary },
    score_improved:   { emoji: '📈', bg: '#FFF8E7', border: '#F5CC6A' },
    student_joined:   { emoji: '🎓', bg: COLORS.primaryLight, border: COLORS.primary },
    student_inactive: { emoji: '⚠️',  bg: '#FFF0EE', border: COLORS.danger },
  };
  const c = config[type] ?? config.student_joined;
  return (
    <View style={[styles.iconCircle, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={styles.iconEmoji}>{c.emoji}</Text>
    </View>
  );
}

// ─── Ligne notification ────────────────────────────────────────────────────
function NotifRow({ notif, onPress, onDelete }: {
  notif: Notification; onPress: () => void; onDelete: () => void;
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

// ─── Modal détail ─────────────────────────────────────────────────────────
function DetailModal({ notif, onClose }: { notif: Notification | null; onClose: () => void }) {
  if (!notif) return null;
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <NotifIcon type={notif.type} />
          <Text style={styles.modalTitle}>{notif.title}</Text>
          {notif.subtitle ? <Text style={styles.modalSubtitle}>{notif.subtitle}</Text> : null}
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

// ─── Filtres ──────────────────────────────────────────────────────────────
// ✅ Pas de filtre "Paiements"
const FILTERS = ['Tout', 'Messages', 'Quiz & Scores', 'Étudiants', 'Non lus'];

function FilterTabs({ active, onSelect, counts }: {
  active: string; onSelect: (f: string) => void; counts: Record<string, number>;
}) {
  return (
    <ScrollView
      horizontal showsHorizontalScrollIndicator={false}
      style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}
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

// ─── Screen ───────────────────────────────────────────────────────────────
interface Props {
  onNavigate: (screen: string, params?: any) => void;
}

export default function ProfessorAnalyticsScreen({ onNavigate }: Props) {
  const [notifs,       setNotifs]     = useState<Notification[]>([]);
  const [loading,      setLoading]    = useState(true);
  const [refreshing,   setRefreshing] = useState(false);
  const [activeFilter, setFilter]     = useState('Tout');
  const [selected,     setSelected]   = useState<Notification | null>(null);

  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    quizSubmitted:   true,
    lessonCompleted: true,
    newMessage:      true,
    reminders:       true,
  });

  // ── Charger les préférences depuis SecureStore ────────────────────────
  const loadPrefs = useCallback(async () => {
    try {
      const stored = await SecureStore.getItemAsync('user');
      const uid = stored ? JSON.parse(stored).id : null;
      if (!uid) return;
      const saved = await SecureStore.getItemAsync(`prof_notif_prefs_${uid}`);
      if (saved) setNotifPrefs(JSON.parse(saved));
    } catch (_) {}
  }, []);

  // ── Charger les notifications depuis l'API ────────────────────────────
  const loadNotifs = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await api.get('/notifications');
      setNotifs(res.data?.notifications ?? []);
    } catch (e: any) {
      console.warn('ProfessorNotifs error:', e?.response?.status, e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadPrefs(); loadNotifs(); }, [loadPrefs, loadNotifs]);

  const handlePress = async (notif: Notification) => {
    setSelected(notif);
    if (!notif.read) {
      try {
        await api.put(`/notifications/${notif.id}/read`);
        setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      } catch (_) {}
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifs(prev => prev.filter(n => n.id !== id));
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible de supprimer');
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible de marquer');
    }
  };

  // ✅ Étape 1 : masquer les types désactivés dans les préférences
  const visibleNotifs = notifs.filter(n => {
    if (n.type === 'message'        && !notifPrefs.newMessage)      return false;
    if (n.type === 'quiz_completed' && !notifPrefs.quizSubmitted)   return false;
    if (n.type === 'score_improved' && !notifPrefs.lessonCompleted) return false;
    return true;
  });

  // ✅ Étape 2 : appliquer le filtre de l'onglet
  const filtered = visibleNotifs.filter(n => {
    if (activeFilter === 'Non lus')       return !n.read;
    if (activeFilter === 'Messages')      return n.type === 'message';
    if (activeFilter === 'Quiz & Scores') return ['quiz_completed', 'score_improved'].includes(n.type);
    if (activeFilter === 'Étudiants')     return ['student_joined', 'student_inactive'].includes(n.type);
    return true;
  });

  const unreadCount = visibleNotifs.filter(n => !n.read).length;
  const hiddenCount = notifs.length - visibleNotifs.length;

  const counts: Record<string, number> = {
    'Tout':          unreadCount,
    'Non lus':       unreadCount,
    'Messages':      visibleNotifs.filter(n => !n.read && n.type === 'message').length,
    'Quiz & Scores': visibleNotifs.filter(n => !n.read && ['quiz_completed','score_improved'].includes(n.type)).length,
    'Étudiants':     visibleNotifs.filter(n => !n.read && ['student_joined','student_inactive'].includes(n.type)).length,
  };

  return (
    <SafeAreaView style={styles.safe}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
            <Text style={styles.markAllText}>Tout lire ({unreadCount})</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ✅ Bandeau si des notifs sont masquées par les préférences */}
      {hiddenCount > 0 && (
        <TouchableOpacity
          style={styles.prefsBanner}
          onPress={() => onNavigate('profil')}
          activeOpacity={0.8}
        >
          <Ionicons name="notifications-off-outline" size={14} color={COLORS.primary} />
          <Text style={styles.prefsBannerText}>
            {hiddenCount} notification{hiddenCount > 1 ? 's masquées' : ' masquée'} selon vos préférences
          </Text>
          <Text style={styles.prefsBannerLink}>Modifier →</Text>
        </TouchableOpacity>
      )}

      {/* Filtres */}
      <FilterTabs active={activeFilter} onSelect={setFilter} counts={counts} />

      {/* Contenu */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { loadPrefs(); loadNotifs(true); }}
              tintColor={COLORS.primary}
            />
          }
        >
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={52} color={COLORS.border} />
              <Text style={styles.emptyTitle}>Aucune notification</Text>
              <Text style={styles.emptyText}>
                {hiddenCount > 0
                  ? 'Certaines notifications sont masquées par vos préférences'
                  : 'Tirez vers le bas pour actualiser'}
              </Text>
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

      <DetailModal notif={selected} onClose={() => setSelected(null)} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#FFFFFF' },
  scroll:    { flex: 1 },
  container: { paddingHorizontal: 16, paddingTop: 16 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
   flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 25, paddingTop: 60, paddingBottom: 12,
  },
  headerTitle: { fontSize: 25, fontWeight: '800', color: '#0D6B5E', flex: 1,textAlign: 'center'  },
  markAllBtn:  { backgroundColor: COLORS.primaryLight, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  markAllText: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },

  prefsBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  prefsBannerText: { flex: 1, fontSize: 12, color: COLORS.primary },
  prefsBannerLink: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  tabsScroll:   { maxHeight: 52, backgroundColor: COLORS.white },
  tabsContent:  { paddingHorizontal: 16, gap: 8, alignItems: 'center', paddingVertical: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7, backgroundColor: COLORS.white,
  },
  tabActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText:       { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white },
  tabBadge: {
    backgroundColor: COLORS.danger, borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: 'center',
  },
  tabBadgeText: { fontSize: 10, color: COLORS.white, fontWeight: '800' },

  listCard: {
    backgroundColor: COLORS.white, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12, position: 'relative',
  },
  rowUnread:    { backgroundColor: COLORS.unread },
  iconCircle: {
    width: 46, height: 46, borderRadius: 23, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  iconEmoji:    { fontSize: 20 },
  rowContent:   { flex: 1 },
  rowTitle:     { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  rowTitleBold: { fontWeight: '700' },
  rowSubtitle:  { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
  rowDate:      { alignItems: 'flex-end', flexShrink: 0 },
  rowDay:       { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  rowTime:      { fontSize: 11, color: COLORS.border, marginTop: 2 },
  unreadDot: {
    position: 'absolute', top: 14, right: 14,
    width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.primary,
  },
  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16 },

  empty:      { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '700' },
  emptyText:  { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
  hint:       { textAlign: 'center', fontSize: 11, color: COLORS.border, marginTop: 16 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  modalCard: {
    backgroundColor: COLORS.white, borderRadius: 20, padding: 28, alignItems: 'center', width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 10,
  },
  modalTitle:    { fontSize: 17, fontWeight: '800', color: COLORS.text, marginTop: 14, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  modalDate:     { fontSize: 12, color: COLORS.textSecondary, marginTop: 8, marginBottom: 20 },
  modalBtn:      { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 40 },
  modalBtnText:  { color: COLORS.white, fontSize: 14, fontWeight: '700' },
});