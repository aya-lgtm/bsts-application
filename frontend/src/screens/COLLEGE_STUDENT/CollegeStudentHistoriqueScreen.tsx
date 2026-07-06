import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/auth.service';
import { useLanguage } from './LanguageContext';

const PRIMARY       = '#0D6B5E';
const PRIMARY_LIGHT = '#E6F3F1';
const BG            = '#FFFFFF';
const TEXT          = '#111827';
const TEXT_MUTED    = '#6B7280';
const BORDER        = '#E5E7EB';
const GOLD          = '#F59E0B';

type TabKey = 'termines' | 'annules';

interface Consultation {
  id: string;
  date: string;
  heure: string;
  duree: string;
  statut: string;
  prix: number;
  isPaid: boolean;
  notes?: string;
  userId: string;
  User?: { nom: string; prenom: string; photo?: string };
}

interface Review {
  userId: string;
  note: number;
}

const Avatar = ({ name, size = 48, uri }: { name: string; size?: number; uri?: string }) => {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: PRIMARY_LIGHT, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: PRIMARY, fontSize: size * 0.35, fontWeight: '700' }}>{initials}</Text>
    </View>
  );
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

interface Props {
  navigation?: any;
  onBack?: () => void;
}

export default function CollegeStudentHistoriqueScreen({ navigation, onBack }: Props) {
  const { t } = useLanguage();

  const [tab, setTab]                     = useState<TabKey>('termines');
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [reviews, setReviews]             = useState<Review[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [consRes, reviewsRes] = await Promise.all([
        api.get('/college-students/consultations/my'),
        api.get('/college-students/me/reviews').catch(() => ({ data: { reviews: [] } })),
      ]);
      setConsultations(consRes.data.consultations ?? []);
      setReviews(reviewsRes.data.reviews ?? []);
    } catch (e: any) {
      console.error('HistoriqueScreen:', e?.response?.data ?? e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  const handleBack = useCallback(() => {
    if (onBack) { onBack(); return; }
    navigation?.goBack?.();
  }, [onBack, navigation]);

  const termines = consultations
    .filter(c => c.statut === 'COMPLETED')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const annules = consultations
    .filter(c => c.statut === 'CANCELLED')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const list = tab === 'termines' ? termines : annules;

  const getNoteForUser = (userId: string): number | null => {
    const r = reviews.find(rv => rv.userId === userId);
    return r ? r.note : null;
  };

  const StarRow = ({ note }: { note: number | null }) => {
    if (note === null) return (
      <Text style={{ fontSize: 11, color: TEXT_MUTED, fontStyle: 'italic' }}>
        {t('meetings', 'notRated')}
      </Text>
    );
    const full  = Math.floor(note);
    const half  = note % 1 >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    const stars: React.ReactElement[] = [];
    for (let i = 0; i < full;  i++) stars.push(<Ionicons key={'f' + i} name="star"         size={16} color={GOLD} />);
    if (half)                        stars.push(<Ionicons key="h"       name="star-half"    size={16} color={GOLD} />);
    for (let i = 0; i < empty; i++) stars.push(<Ionicons key={'e' + i}  name="star-outline" size={16} color={GOLD} />);
    return <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>{stars}</View>;
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG }}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('meetings', 'tabTermines')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* ── Tabs ── */}
      <View style={styles.tabBar}>
        {([
          { key: 'termines' as TabKey, label: t('meetings', 'tabTermines'), count: termines.length },
          { key: 'annules'  as TabKey, label: t('meetings', 'tabAnnules'),  count: annules.length  },
        ]).map(t_ => (
          <TouchableOpacity
            key={t_.key}
            style={[styles.tabBtn, tab === t_.key && styles.tabBtnActive]}
            onPress={() => setTab(t_.key)}
          >
            <Text style={[styles.tabText, tab === t_.key && styles.tabTextActive]}>
              {t_.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Content ── */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
      >
        {list.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>
              {tab === 'termines' ? '📋' : '❌'}
            </Text>
            <Text style={styles.emptyTitle}>
              {tab === 'termines' ? t('meetings', 'noTermines') : t('meetings', 'noAnnules')}
            </Text>
          </View>
        ) : (
          list.map((c, idx, arr) => {
            const userName = c.User ? `${c.User.prenom} ${c.User.nom}` : '—';
            const isLast   = idx === arr.length - 1;
            const note     = getNoteForUser(c.userId);

            return (
              <View
                key={c.id}
                style={[styles.card, !isLast && { borderBottomWidth: 1, borderBottomColor: BORDER }]}
              >
                <View style={styles.cardRow}>
                  <Avatar name={userName} uri={c.User?.photo} size={52} />

                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.cardName}>{userName}</Text>
                    <Text style={styles.cardNotes} numberOfLines={1}>
                      {c.notes ?? 'Consultation'}
                    </Text>
                    <View style={styles.cardBottom}>
                      <Text style={styles.cardDuree}>{c.duree}</Text>
                      <StarRow note={note} />
                    </View>
                  </View>

                  <View style={styles.cardRight}>
                    <Text style={styles.cardDate}>{formatDate(c.date)}</Text>
                    <Text style={styles.cardPrix}>{c.prix} MAD</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {/* ── Résumé ── */}
        {list.length > 0 && tab === 'termines' && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryVal}>{termines.length}</Text>
              <Text style={styles.summaryLabel}>
                {t('meetings', 'tabTermines')}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryVal}>
                {termines.filter(c => c.isPaid).reduce((s, c) => s + c.prix, 0)} MAD
              </Text>
              <Text style={styles.summaryLabel}>{t('profil', 'revenue')}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryVal}>
                {reviews.length > 0
                  ? (reviews.reduce((s, r) => s + r.note, 0) / reviews.length).toFixed(1)
                  : '—'}
              </Text>
              <Text style={styles.summaryLabel}>{t('profil', 'avgRating')}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14, backgroundColor: BG },
  headerTitle:     { fontSize: 20, fontWeight: '800', color: TEXT },
  tabBar:          { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: BG },
  tabBtn:          { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive:    { borderBottomColor: PRIMARY },
  tabText:         { fontSize: 15, fontWeight: '600', color: TEXT_MUTED },
  tabTextActive:   { color: PRIMARY, fontWeight: '700' },
  emptyBox:        { alignItems: 'center', paddingTop: 80 },
  emptyTitle:      { fontSize: 16, fontWeight: '700', color: TEXT_MUTED, marginBottom: 8 },
  card:            { paddingHorizontal: 20, paddingVertical: 18, backgroundColor: BG },
  cardRow:         { flexDirection: 'row', alignItems: 'flex-start' },
  cardName:        { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 3 },
  cardNotes:       { fontSize: 13, color: TEXT_MUTED, marginBottom: 6 },
  cardBottom:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardDuree:       { fontSize: 13, color: TEXT_MUTED, fontWeight: '500' },
  cardRight:       { alignItems: 'flex-end', marginLeft: 12 },
  cardDate:        { fontSize: 12, color: TEXT_MUTED, marginBottom: 4 },
  cardPrix:        { fontSize: 17, fontWeight: '800', color: TEXT },
  summaryCard:     { flexDirection: 'row', marginHorizontal: 20, marginTop: 24, backgroundColor: PRIMARY_LIGHT, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: `${PRIMARY}25` },
  summaryItem:     { flex: 1, alignItems: 'center' },
  summaryVal:      { fontSize: 18, fontWeight: '800', color: PRIMARY, marginBottom: 4 },
  summaryLabel:    { fontSize: 11, color: PRIMARY, opacity: 0.7, textAlign: 'center' },
  summaryDivider:  { width: 1, backgroundColor: `${PRIMARY}30`, marginVertical: 4 },
});