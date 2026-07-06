import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert, RefreshControl, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/auth.service';
import { useLanguage } from './LanguageContext';

const PRIMARY       = '#0D6B5E';
const PRIMARY_DARK  = '#0A5449';
const PRIMARY_LIGHT = '#E6F3F1';
const BG            = '#FFFFFF';
const CARD_BG       = '#F8F9FA';
const TEXT          = '#111827';
const TEXT_MUTED    = '#6B7280';
const BORDER        = '#E5E7EB';
const DANGER        = '#EF4444';
const SUCCESS       = '#10B981';
const GOLD          = '#F59E0B';
const WARNING       = '#F59E0B';

type TabKey = 'demandes' | 'avenir' | 'termines' | 'annules';

interface Consultation {
  id: string;
  date: string;
  heure: string;
  duree: string;
  statut: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  prix: number;
  isPaid: boolean;
  notes?: string;
  meetLink?: string;
  userId: string;
  User?: { nom: string; prenom: string; photo?: string };
}

interface Review {
  userId: string;
  note: number;
}

const Avatar = ({ name, size = 52, uri }: { name: string; size?: number; uri?: string }) => {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: PRIMARY_LIGHT }}
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: PRIMARY_LIGHT, alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: PRIMARY, fontSize: size * 0.35, fontWeight: '700' }}>{initials}</Text>
    </View>
  );
};

const formatDateLabel = (dateStr: string): string => {
  const d = new Date(dateStr);
  const today    = new Date();
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString())    return "Aujourd'hui";
  if (d.toDateString() === tomorrow.toDateString()) return 'Demain';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

const formatTime = (h: string) => h?.slice(0, 5) ?? '';

export default function CollegeStudentMeetingsScreen({ navigation }: { navigation: any }) {
  // ✅ Seul ajout : useLanguage
  const { t } = useLanguage();

  const [tab, setTab]                     = useState<TabKey>('demandes');
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviews, setReviews]             = useState<Review[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/college-students/consultations/my');
      setConsultations(res.data.consultations ?? []);
    } catch (e) {
      console.error('MeetingsScreen:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  const handleAccept = async (c: Consultation) => {
    Alert.alert(
      t('meetings', 'tabDemandes'),
      `${t('meetings', 'confirmAccept')} ${c.User?.prenom ?? ''} ?`,
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        {
          text: t('common', 'accept'),
          onPress: async () => {
            setActionLoading(c.id);
            try {
              await api.put(`/college-students/consultations/${c.id}/confirm-payment`);
              setConsultations(prev =>
                prev.map(x => x.id === c.id ? { ...x, statut: 'CONFIRMED', isPaid: true } : x)
              );
            } catch (e: any) {
              Alert.alert(t('common', 'error'), e?.response?.data?.message ?? '');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleRefuse = (c: Consultation) => {
    Alert.alert(
      t('common', 'confirm'),
      `${t('meetings', 'confirmRefuse')} ${c.User?.prenom ?? ''} ?`,
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        {
          text: t('common', 'refuse'),
          style: 'destructive',
          onPress: async () => {
            setActionLoading(c.id);
            try {
              setConsultations(prev =>
                prev.map(x => x.id === c.id ? { ...x, statut: 'CANCELLED' } : x)
              );
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const joinMeeting = async (c: Consultation) => {
    const url = c.meetLink ?? 'https://meet.google.com';
    const can = await Linking.canOpenURL(url);
    if (can) Linking.openURL(url);
  };

  const demandes = consultations.filter(c => c.statut === 'PENDING');
  const avenir   = consultations.filter(c => c.statut === 'CONFIRMED');
  const termines = consultations.filter(c => c.statut === 'COMPLETED').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const annules  = consultations.filter(c => c.statut === 'CANCELLED').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getNoteForUser = (userId: string): number | null => {
    const r = reviews.find(rv => rv.userId === userId);
    return r ? r.note : null;
  };

  const StarRow = ({ note }: { note: number | null }) => {
    if (note === null) return <Text style={{ fontSize: 11, color: TEXT_MUTED, fontStyle: 'italic' }}>{t('meetings', 'notRated')}</Text>;
    const full  = Math.floor(note);
    const half  = note % 1 >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    const stars: React.ReactElement[] = [];
    for (let i = 0; i < full;  i++) stars.push(<Ionicons key={'f' + i} name="star"         size={14} color={GOLD} />);
    if (half)                        stars.push(<Ionicons key="h"       name="star-half"    size={14} color={GOLD} />);
    for (let i = 0; i < empty; i++) stars.push(<Ionicons key={'e' + i}  name="star-outline" size={14} color={GOLD} />);
    return <View style={{ flexDirection: 'row', gap: 2, alignItems: 'center' }}>{stars}</View>;
  };

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: 'demandes', label: t('meetings', 'tabDemandes'), count: demandes.length },
    { key: 'avenir',   label: t('meetings', 'tabAvenir'),   count: avenir.length   },
    { key: 'termines', label: t('meetings', 'tabTermines')                          },
    { key: 'annules',  label: t('meetings', 'tabAnnules')                           },
  ];

  const getList = (): Consultation[] => {
    if (tab === 'demandes') return demandes;
    if (tab === 'avenir')   return avenir;
    if (tab === 'termines') return termines;
    return annules;
  };

  const list = getList();

  const renderCard = (c: Consultation, idx: number, arr: Consultation[]) => {
    const isLast    = idx === arr.length - 1;
    const userName  = c.User ? `${c.User.prenom} ${c.User.nom}` : '—';
    const isLoading = actionLoading === c.id;

    return (
      <View key={c.id} style={[styles.card, isLast && { borderBottomWidth: 0 }]}>
        <View style={styles.cardRow}>
          <Avatar name={userName} uri={c.User?.photo} size={52} />

          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.cardName}>{userName}</Text>
            <Text style={styles.cardNotes} numberOfLines={1}>
              {c.notes ?? 'Consultation'}
            </Text>
            <Text style={styles.cardMeta}>
              {c.duree} · {c.prix} MAD
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.cardDateLabel}>{formatDateLabel(c.date)}</Text>
            <Text style={styles.cardTime}>{formatTime(c.heure)}</Text>
          </View>
        </View>

        {tab === 'demandes' && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.btnRefuse, isLoading && { opacity: 0.5 }]}
              onPress={() => handleRefuse(c)}
              disabled={isLoading}
            >
              <Text style={styles.btnRefuseText}>{t('common', 'refuse')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnAccept, isLoading && { opacity: 0.7 }]}
              onPress={() => handleAccept(c)}
              disabled={isLoading}
            >
              {isLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnAcceptText}>{t('common', 'accept')}</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {tab === 'avenir' && (
          <TouchableOpacity
            style={styles.joinBtn}
            onPress={() => joinMeeting(c)}
          >
            <Ionicons name="videocam-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.joinBtnText}>{t('meetings', 'joinMeet')}</Text>
          </TouchableOpacity>
        )}

        {tab === 'termines' && (
          <View style={styles.histRow}>
            <StarRow note={getNoteForUser(c.userId)} />
            {c.isPaid && (
              <View style={styles.paidBadge}>
                <Text style={styles.paidText}>{t('meetings', 'paid')}</Text>
              </View>
            )}
          </View>
        )}

        {tab === 'annules' && (
          <View style={styles.cancelledRow}>
            <Ionicons name="close-circle-outline" size={14} color={DANGER} />
            <Text style={styles.cancelledText}>{t('meetings', 'cancelled')}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>

      <View style={styles.header}>
        <Text style={styles.title}>{t('meetings', 'title')}</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation?.navigate('CollegeStudentPlanning')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="calendar-outline" size={22} color={TEXT} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {TABS.map(t_ => (
          <TouchableOpacity
            key={t_.key}
            style={[styles.tabBtn, tab === t_.key && styles.tabBtnActive]}
            onPress={() => setTab(t_.key)}
          >
            <Text style={[styles.tabText, tab === t_.key && styles.tabTextActive]}>
              {t_.label}
              {t_.count != null && t_.count > 0
                ? (
                  <Text style={[styles.tabCount, tab === t_.key && styles.tabCountActive]}>
                    {' '}{t_.count}
                  </Text>
                )
                : null
              }
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
          }
        >
          {list.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={{ fontSize: 44, marginBottom: 12 }}>
                {tab === 'demandes' ? '🎉' : tab === 'avenir' ? '📅' : '📋'}
              </Text>
              <Text style={styles.emptyTitle}>
                {tab === 'demandes' ? t('meetings', 'noDemandes')
                  : tab === 'avenir'   ? t('meetings', 'noAvenir')
                  : tab === 'termines' ? t('meetings', 'noTermines')
                  :                      t('meetings', 'noAnnules')}
              </Text>
              <Text style={styles.emptySub}>
                {tab === 'demandes' ? t('meetings', 'upToDate') : ''}
              </Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {list.map((c, i, arr) => renderCard(c, i, arr))}
            </View>
          )}

          {tab === 'demandes' && list.length > 0 && (
            <TouchableOpacity style={styles.viewAllRow} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>{t('meetings', 'seeAllDemands')}</Text>
              <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
            </TouchableOpacity>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 14,
    backgroundColor: BG,
  },
  title:          { fontSize: 26, fontWeight: '800', color: TEXT },
  addBtn:         { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  tabBar:         { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: BG, paddingHorizontal: 20 },
  tabBtn:         { paddingVertical: 12, marginRight: 24, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive:   { borderBottomColor: PRIMARY },
  tabText:        { fontSize: 14, fontWeight: '600', color: TEXT_MUTED },
  tabTextActive:  { color: PRIMARY },
  tabCount:       { fontSize: 13, fontWeight: '700', color: TEXT_MUTED },
  tabCountActive: { color: PRIMARY },
  emptyBox:       { alignItems: 'center', paddingTop: 64, paddingBottom: 32 },
  emptyTitle:     { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 6 },
  emptySub:       { fontSize: 13, color: TEXT_MUTED },
  listContainer:  { paddingTop: 8 },
  card:           { paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: BG },
  cardRow:        { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  cardName:       { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 3 },
  cardNotes:      { fontSize: 13, color: TEXT_MUTED, marginBottom: 3 },
  cardMeta:       { fontSize: 13, color: TEXT_MUTED, fontWeight: '500' },
  cardDateLabel:  { fontSize: 12, color: TEXT_MUTED, textAlign: 'right', marginBottom: 2 },
  cardTime:       { fontSize: 14, fontWeight: '700', color: TEXT, textAlign: 'right' },
  actionsRow:     { flexDirection: 'row', gap: 12 },
  btnRefuse:      { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, alignItems: 'center', backgroundColor: BG },
  btnRefuseText:  { fontSize: 15, fontWeight: '600', color: TEXT },
  btnAccept:      { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: PRIMARY_DARK, alignItems: 'center' },
  btnAcceptText:  { fontSize: 15, fontWeight: '700', color: '#fff' },
  joinBtn:        { backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  joinBtnText:    { color: '#fff', fontSize: 14, fontWeight: '700' },
  completedRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  completedText:  { color: SUCCESS, fontSize: 13, fontWeight: '600' },
  paidBadge:      { backgroundColor: '#ECFDF5', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  paidText:       { color: SUCCESS, fontSize: 12, fontWeight: '600' },
  cancelledRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cancelledText:  { color: DANGER, fontSize: 13, fontWeight: '600' },
  histRow:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardPrix:       { fontSize: 17, fontWeight: '800', color: TEXT },
  viewAllRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 16, backgroundColor: '#F8F9FA', borderRadius: 14, padding: 16 },
  viewAllText:    { color: PRIMARY, fontSize: 14, fontWeight: '600' },
});