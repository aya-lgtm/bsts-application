import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/auth.service';
import { useLanguage } from './LanguageContext';

const PRIMARY    = '#0D6B5E';
const BG         = '#FFFFFF';
const TEXT       = '#111827';
const TEXT_MUTED = '#6B7280';
const BORDER     = '#F0F0F0';
const UNREAD_DOT = '#22C55E';

const NOTIF_CONFIG: Record<string, { icon: string; bg: string; color: string }> = {
  MEETING_REQUEST:  { icon: 'calendar',           bg: '#EEF2FF', color: '#6366F1' },
  MEETING_REMINDER: { icon: 'alarm',              bg: '#FEF9C3', color: '#EAB308' },
  PAYMENT:          { icon: 'cash',               bg: '#ECFDF5', color: '#10B981' },
  REVIEW:           { icon: 'star',               bg: '#FEF9C3', color: '#F59E0B' },
  CANCELLED:        { icon: 'close-circle',       bg: '#FEF2F2', color: '#EF4444' },
  INFO:             { icon: 'information-circle', bg: '#EEF2FF', color: '#6366F1' },
  DEFAULT:          { icon: 'notifications',      bg: '#F3F4F6', color: '#6B7280' },
};

interface Notif {
  id: string;
  title: string;
  subtitle?: string;
  type?: string;
  read: boolean;
  createdAt: string;
}

const getTimeLabel = (dateStr: string, lang: 'fr' | 'en'): string => {
  const d    = new Date(dateStr);
  const diffH = (Date.now() - d.getTime()) / 3600000;
  if (diffH < 24) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diffH < 48) return lang === 'fr' ? 'Hier' : 'Yesterday';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

const getDayGroup = (dateStr: string, lang: 'fr' | 'en'): string => {
  const d         = new Date(dateStr);
  const today     = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const twoDays   = new Date(Date.now() - 2 * 86400000);
  if (d.toDateString() === today.toDateString())
    return lang === 'fr' ? "Aujourd'hui" : 'Today';
  if (d.toDateString() === yesterday.toDateString())
    return lang === 'fr' ? 'Hier' : 'Yesterday';
  if (d.toDateString() === twoDays.toDateString())
    return lang === 'fr' ? 'Avant-hier' : 'Two days ago';
  return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', day: '2-digit', month: 'long' });
};

const groupNotifs = (notifs: Notif[], lang: 'fr' | 'en') => {
  const map = new Map<string, Notif[]>();
  notifs.forEach(n => {
    const label = getDayGroup(n.createdAt, lang);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(n);
  });
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
};

const NotifIcon = ({ type }: { type?: string }) => {
  const cfg = NOTIF_CONFIG[type ?? 'DEFAULT'] ?? NOTIF_CONFIG.DEFAULT;
  return (
    <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon as any} size={22} color={cfg.color} />
    </View>
  );
};

export default function CollegeStudentNotificationsScreen({ navigation }: { navigation?: any }) {
  // ✅ Seul ajout
  const { t, lang } = useLanguage();

  const [notifs, setNotifs]         = useState<Notif[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const fetchNotifs = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get('/notifications');
      const data: Notif[] = res.data.notifications ?? [];
      setNotifs(data);
    } catch (e: any) {
      setError(t('common', 'error'));
      console.error('NotificationsScreen:', e?.response?.data ?? e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchNotifs(); }, [fetchNotifs]);

  const markAllRead = async () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await api.put('/notifications/read-all');
    } catch {
      fetchNotifs();
    }
  };

  const markOneRead = async (id: string) => {
    if (notifs.find(n => n.id === id)?.read) return;
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await api.put(`/notifications/${id}/read`);
    } catch {}
  };

  const unread = notifs.filter(n => !n.read).length;
  const groups = groupNotifs(notifs, lang);

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('notifications', 'title')}</Text>
        {unread > 0 && (
          <TouchableOpacity
            onPress={markAllRead}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.markAllText}>{t('notifications', 'markAllRead')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={{ fontSize: 36, marginBottom: 12 }}>⚠️</Text>
          <Text style={styles.emptyTitle}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchNotifs}>
            <Text style={styles.retryText}>{t('common', 'retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : notifs.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🔔</Text>
          <Text style={styles.emptyTitle}>{t('notifications', 'noNotifs')}</Text>
          <Text style={styles.emptySub}>{t('notifications', 'upToDate')}</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {groups.map((group) => (
            <View key={group.label}>

              <Text style={styles.dayLabel}>{group.label}</Text>

              {group.items.map((n, idx, arr) => {
                const isInfo = n.type === 'INFO';
                const isLast = idx === arr.length - 1;

                return (
                  <TouchableOpacity
                    key={n.id}
                    style={[styles.notifRow, isLast && { borderBottomWidth: 0 }]}
                    onPress={() => markOneRead(n.id)}
                    activeOpacity={0.7}
                  >
                    <NotifIcon type={n.type} />

                    <View style={styles.notifBody}>
                      <Text style={[styles.notifTitle, !n.read && styles.notifTitleUnread]}>
                        {n.title}
                      </Text>
                      {!!n.subtitle && (
                        <Text style={styles.notifSubtitle}>{n.subtitle}</Text>
                      )}
                    </View>

                    <View style={styles.notifRight}>
                      <Text style={styles.notifTime}>{getTimeLabel(n.createdAt, lang)}</Text>
                      {isInfo
                        ? <Ionicons name="chevron-forward" size={16} color={TEXT_MUTED} style={{ marginTop: 4 }} />
                        : !n.read
                          ? <View style={styles.unreadDot} />
                          : <View style={styles.dotPlaceholder} />
                      }
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14, backgroundColor: BG },
  title:              { fontSize: 26, fontWeight: '800', color: TEXT },
  markAllText:        { fontSize: 14, fontWeight: '600', color: PRIMARY },
  centerBox:          { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  emptyTitle:         { fontSize: 18, fontWeight: '700', color: TEXT, marginBottom: 6, textAlign: 'center' },
  emptySub:           { fontSize: 14, color: TEXT_MUTED },
  retryBtn:           { marginTop: 16, backgroundColor: PRIMARY, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText:          { color: '#fff', fontWeight: '700', fontSize: 14 },
  dayLabel:           { fontSize: 15, fontWeight: '700', color: TEXT, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 10 },
  notifRow:           { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: BG, borderBottomWidth: 1, borderBottomColor: BORDER },
  iconWrap:           { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifBody:          { flex: 1, marginLeft: 14 },
  notifTitle:         { fontSize: 14, fontWeight: '600', color: TEXT, marginBottom: 4, lineHeight: 20 },
  notifTitleUnread:   { fontWeight: '800' },
  notifSubtitle:      { fontSize: 13, color: TEXT_MUTED, lineHeight: 18 },
  notifRight:         { alignItems: 'flex-end', marginLeft: 10, paddingTop: 2, minWidth: 40 },
  notifTime:          { fontSize: 12, color: TEXT_MUTED, marginBottom: 6, fontWeight: '500' },
  unreadDot:          { width: 10, height: 10, borderRadius: 5, backgroundColor: UNREAD_DOT },
  dotPlaceholder:     { width: 10, height: 10 },
});