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
const CARD          = '#FFFFFF';
const TEXT          = '#111827';
const TEXT_MUTED    = '#6B7280';
const BORDER        = '#E5E7EB';
const GOLD          = '#F59E0B';

interface Review {
  id: string;
  note: number;
  commentaire?: string;
  badges?: string[];
  createdAt: string;
  user?: { nom: string; prenom: string; photo?: string };
}

const MOCK_REVIEWS: Review[] = [
  { id: '1', note: 5.0, commentaire: 'Très clair et très utile, merci beaucoup !', badges: ['Très pédagogue', "À l'écoute"], createdAt: '2024-06-12T10:00:00Z', user: { nom: 'Benali', prenom: 'Aya' } },
  { id: '2', note: 5.0, commentaire: "Merci pour tes conseils, ça m'a aidé !", badges: ['Motivant', 'Répond rapidement'], createdAt: '2024-06-10T14:00:00Z', user: { nom: 'Haddad', prenom: 'Youssef' } },
  { id: '3', note: 4.8, commentaire: 'Super meeting, je recommande 🙌', badges: ['Donne de bons conseils'], createdAt: '2024-06-08T16:00:00Z', user: { nom: 'Touri', prenom: 'Imane' } },
];

const Avatar = ({ name, size = 44, uri }: { name: string; size?: number; uri?: string }) => {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: PRIMARY_LIGHT, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: PRIMARY, fontSize: size * 0.35, fontWeight: '700' }}>{initials}</Text>
    </View>
  );
};

const StarRow = ({ note, size = 16 }: { note: number; size?: number }) => {
  const full  = Math.floor(note);
  const half  = note % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  const stars: React.ReactElement[] = [];
  for (let i = 0; i < full;  i++) stars.push(<Ionicons key={'f' + i} name="star"         size={size} color={GOLD} />);
  if (half)                        stars.push(<Ionicons key="h"       name="star-half"    size={size} color={GOLD} />);
  for (let i = 0; i < empty; i++) stars.push(<Ionicons key={'e' + i}  name="star-outline" size={size} color={GOLD} />);
  return <View style={{ flexDirection: 'row', gap: 2 }}>{stars}</View>;
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

interface Props {
  navigation?: { navigate: (s: string, p?: any) => void; goBack: () => void };
  onBack?: () => void;
}

export default function CollegeStudentAvisScreen({ navigation, onBack }: Props) {
  // ✅ Seul ajout
  const { t } = useLanguage();

  const [reviews, setReviews]               = useState<Review[]>([]);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [showAll, setShowAll]               = useState(false);
  const [backendMoyenne, setBackendMoyenne] = useState<number>(0);
  const [backendTotal, setBackendTotal]     = useState<number>(0);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/college-students/me/reviews');
      setReviews(res.data.reviews ?? []);
      setBackendMoyenne(res.data.noteMoyenne ?? 0);
      setBackendTotal(res.data.totalReviews ?? 0);
    } catch (e: any) {
      console.error('AvisScreen:', e?.response?.data ?? e?.message);
      setReviews(MOCK_REVIEWS);
      setBackendMoyenne(4.9);
      setBackendTotal(MOCK_REVIEWS.length);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  const handleBack = useCallback(() => {
    if (onBack) { onBack(); return; }
    if (navigation?.goBack) { navigation.goBack(); }
  }, [onBack, navigation]);

  const total   = backendTotal || reviews.length;
  const moyenne = backendMoyenne || (
    reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.note, 0) / reviews.length) * 10) / 10
      : 0
  );

  const badgeCount: Record<string, number> = {};
  reviews.forEach(r => r.badges?.forEach(b => { badgeCount[b] = (badgeCount[b] ?? 0) + 1; }));
  const sortedBadges = Object.entries(badgeCount).sort((a, b) => b[1] - a[1]);
  const displayedReviews = showAll ? reviews : reviews.slice(0, 3);

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
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('avis', 'title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
      >
        {/* ── Note moyenne ── */}
        <View style={styles.noteCard}>
          <View style={styles.noteLeft}>
            <Text style={styles.noteLabel}>{t('avis', 'avgRating')}</Text>
            <View style={styles.noteValRow}>
              <Text style={styles.noteVal}>{moyenne.toFixed(1)}</Text>
              <Text style={styles.noteSur}> / 5</Text>
            </View>
            <Text style={styles.noteBase}>{t('avis', 'basedOn')} {total} {t('avis', 'reviews')}</Text>
          </View>
          <View style={styles.noteRight}>
            <View style={styles.starsLarge}>
              {[1,2,3,4,5].map(i => (
                <Ionicons key={i} name={i <= Math.round(moyenne) ? 'star' : 'star-outline'} size={32} color={GOLD} />
              ))}
            </View>
          </View>
        </View>

        {/* ── Commentaires récents ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('avis', 'recent')}</Text>
            {reviews.length > 3 && (
              <TouchableOpacity onPress={() => setShowAll(!showAll)}>
                <Text style={styles.voirTout}>{showAll ? t('common', 'reduce') : t('common', 'seeAll')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {reviews.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={{ fontSize: 40, marginBottom: 10 }}>💬</Text>
              <Text style={styles.emptyTitle}>{t('avis', 'noReviews')}</Text>
              <Text style={styles.emptySub}>{t('avis', 'noReviewsSub')}</Text>
            </View>
          ) : (
            <View style={styles.reviewsCard}>
              {displayedReviews.map((r, idx) => {
                const userName = r.user ? `${r.user.prenom} ${r.user.nom}` : 'Étudiant';
                const isLast   = idx === displayedReviews.length - 1;
                return (
                  <View key={r.id} style={[styles.reviewRow, !isLast && { borderBottomWidth: 1, borderBottomColor: BORDER }]}>
                    <View style={styles.reviewTop}>
                      <Avatar name={userName} uri={r.user?.photo} size={42} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.reviewName}>{userName}</Text>
                        <View style={styles.reviewStarRow}>
                          <StarRow note={r.note} size={14} />
                          <Text style={styles.reviewNote}>{r.note.toFixed(1)}</Text>
                        </View>
                      </View>
                      <Text style={styles.reviewDate}>{formatDate(r.createdAt)}</Text>
                    </View>
                    {r.commentaire && <Text style={styles.reviewComment}>{r.commentaire}</Text>}
                    {r.badges && r.badges.length > 0 && (
                      <View style={styles.reviewBadgesRow}>
                        {r.badges.map(b => (
                          <View key={b} style={styles.reviewBadge}>
                            <Text style={styles.reviewBadgeText}>{b}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Badges reçus ── */}
        {sortedBadges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('avis', 'badges')}</Text>
            <View style={styles.badgesWrap}>
              {sortedBadges.map(([badge, count]) => (
                <TouchableOpacity key={badge} style={styles.badge} activeOpacity={0.8}>
                  <Text style={styles.badgeText}>{badge}</Text>
                  {count > 1 && (
                    <View style={styles.badgeCount}>
                      <Text style={styles.badgeCountText}>{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Distribution des notes ── */}
        {reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('avis', 'distribution')}</Text>
            <View style={styles.distCard}>
              {[5, 4, 3, 2, 1].map(star => {
                const count = reviews.filter(r => Math.floor(r.note) === star).length;
                const pct   = total > 0 ? (count / total) * 100 : 0;
                return (
                  <View key={star} style={styles.distRow}>
                    <View style={styles.distStarRow}>
                      <Text style={styles.distStar}>{star}</Text>
                      <Ionicons name="star" size={12} color={GOLD} />
                    </View>
                    <View style={styles.distBarBg}>
                      <View style={[styles.distBarFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.distCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14, backgroundColor: BG, borderBottomWidth: 1, borderBottomColor: BORDER },
  title:          { fontSize: 20, fontWeight: '800', color: PRIMARY },
  noteCard:       { backgroundColor: CARD, marginHorizontal: 20, marginTop: 20, marginBottom: 8, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  noteLeft:       { flex: 1 },
  noteLabel:      { fontSize: 13, color: TEXT_MUTED, fontWeight: '500', marginBottom: 6 },
  noteValRow:     { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  noteVal:        { fontSize: 48, fontWeight: '800', color: TEXT, lineHeight: 54 },
  noteSur:        { fontSize: 20, fontWeight: '600', color: TEXT_MUTED },
  noteBase:       { fontSize: 12, color: TEXT_MUTED },
  noteRight:      { alignItems: 'flex-end' },
  starsLarge:     { flexDirection: 'row', gap: 3 },
  section:        { paddingHorizontal: 20, marginTop: 20 },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle:   { fontSize: 16, fontWeight: '700', color: TEXT },
  voirTout:       { fontSize: 13, fontWeight: '600', color: PRIMARY },
  emptyBox:       { alignItems: 'center', paddingVertical: 40, backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER },
  emptyTitle:     { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 6 },
  emptySub:       { fontSize: 13, color: TEXT_MUTED, textAlign: 'center', paddingHorizontal: 24 },
  reviewsCard:    { backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  reviewRow:      { padding: 16 },
  reviewTop:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  reviewName:     { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 4 },
  reviewStarRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reviewNote:     { fontSize: 13, fontWeight: '700', color: GOLD },
  reviewDate:     { fontSize: 11, color: TEXT_MUTED, fontWeight: '500' },
  reviewComment:  { fontSize: 13, color: TEXT_MUTED, lineHeight: 19, marginBottom: 10 },
  reviewBadgesRow:{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reviewBadge:    { backgroundColor: PRIMARY_LIGHT, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  reviewBadgeText:{ fontSize: 11, color: PRIMARY, fontWeight: '600' },
  badgesWrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge:          { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: CARD, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1.5, borderColor: PRIMARY },
  badgeText:      { fontSize: 13, color: PRIMARY, fontWeight: '600' },
  badgeCount:     { backgroundColor: PRIMARY, borderRadius: 99, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeCountText: { color: CARD, fontSize: 10, fontWeight: '800' },
  distCard:       { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, gap: 10 },
  distRow:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  distStarRow:    { flexDirection: 'row', alignItems: 'center', gap: 2, width: 28 },
  distStar:       { fontSize: 13, fontWeight: '700', color: TEXT },
  distBarBg:      { flex: 1, height: 8, backgroundColor: '#F3F4F6', borderRadius: 99, overflow: 'hidden' },
  distBarFill:    { height: 8, backgroundColor: GOLD, borderRadius: 99 },
  distCount:      { fontSize: 12, color: TEXT_MUTED, width: 20, textAlign: 'right' },
});