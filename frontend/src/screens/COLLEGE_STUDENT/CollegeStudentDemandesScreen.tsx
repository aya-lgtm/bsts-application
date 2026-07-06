import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/auth.service';
import { useLanguage } from './LanguageContext';

const PRIMARY       = '#0D6B5E';
const PRIMARY_LIGHT = '#E6F3F1';
const BG            = '#FFFFFF';
const CARD          = '#F8FAFB';
const TEXT          = '#111827';
const TEXT_MUTED    = '#6B7280';
const BORDER        = '#E5E7EB';
const SUCCESS_COLOR = '#10B981';
const DANGER        = '#EF4444';

interface Consultation {
  id: string;
  date: string;
  heure: string;
  duree: string;
  statut: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  notes?: string;
  prix: number;
  isPaid: boolean;
  userId: string;
  User?: { nom: string; prenom: string; photo?: string; role?: string };
}

const Avatar = ({ name, uri, size = 46 }: { name: string; uri?: string; size?: number }) => {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: PRIMARY_LIGHT, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: PRIMARY, fontSize: size * 0.35, fontWeight: '700' }}>{initials}</Text>
    </View>
  );
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' });

export default function CollegeStudentDemandesScreen() {
  // ✅ Seul ajout
  const { t } = useLanguage();

  const [tab, setTab]                     = useState<'pending' | 'accepted'>('pending');
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchConsultations();
    }, [])
  );

  const fetchConsultations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/college-students/consultations/my');
      setConsultations(res.data.consultations || []);
    } catch {
      Alert.alert(t('common', 'error'), 'Impossible de charger les demandes.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (c: Consultation) => {
    setActionLoading(c.id);
    try {
      await api.put(`/college-students/consultations/${c.id}/confirm-payment`);
      setConsultations(prev =>
        prev.map(x => x.id === c.id ? { ...x, statut: 'CONFIRMED', isPaid: true } : x)
      );
      Alert.alert(t('common', 'success'), `${t('meetings', 'confirmed')} — ${c.User?.prenom ?? ''}`);
    } catch (err: any) {
      Alert.alert(t('common', 'error'), err?.response?.data?.message || '');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefuse = (c: Consultation) => {
    Alert.alert(
      t('common', 'confirm'),
      `${t('meetings', 'confirmRefuse')} ${c.User?.prenom ?? ''} ?`,
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        {
          text: t('common', 'refuse'), style: 'destructive',
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

  const pending  = consultations.filter(c => c.statut === 'PENDING');
  const accepted = consultations.filter(c => ['CONFIRMED', 'COMPLETED'].includes(c.statut));
  const list     = tab === 'pending' ? pending : accepted;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('meetings', 'tabDemandes')}</Text>
        <View style={styles.tabBar}>
          {([
            { val: 'pending',  label: `${t('meetings', 'pending')} (${pending.length})` },
            { val: 'accepted', label: `${t('meetings', 'confirmed')} (${accepted.length})` },
          ] as const).map(t_ => (
            <TouchableOpacity
              key={t_.val}
              onPress={() => setTab(t_.val)}
              style={[styles.tab, tab === t_.val && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === t_.val && styles.tabTextActive]}>{t_.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.body}>
        {loading ? (
          <ActivityIndicator size="large" color={PRIMARY} style={{ marginVertical: 60 }} />
        ) : list.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 44, marginBottom: 10 }}>
              {tab === 'pending' ? '🎉' : '📭'}
            </Text>
            <Text style={styles.emptyTitle}>
              {tab === 'pending' ? t('meetings', 'noDemandes') : t('meetings', 'noAvenir')}
            </Text>
            <Text style={styles.emptySub}>
              {tab === 'pending' ? t('meetings', 'upToDate') : ''}
            </Text>
          </View>
        ) : (
          list.map(c => {
            const userName  = c.User ? `${c.User.prenom} ${c.User.nom}` : '—';
            const isLoading = actionLoading === c.id;
            return (
              <View key={c.id} style={styles.card}>

                <View style={styles.cardTop}>
                  <Avatar name={userName} uri={c.User?.photo} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{userName}</Text>
                    {c.User?.role && (
                      <Text style={styles.cardRole}>
                        {c.User.role === 'STUDENT' ? '🎓 Étudiant' : '👨‍👩‍👧 Parent'}
                      </Text>
                    )}
                    <Text style={styles.cardSubject} numberOfLines={2}>
                      {c.notes || 'Consultation générale'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsRow}>
                  <View style={styles.detailChip}>
                    <Text style={styles.detailChipText}>📅 {formatDate(c.date)}</Text>
                  </View>
                  <View style={styles.detailChip}>
                    <Text style={styles.detailChipText}>🕐 {c.heure} · {c.duree}</Text>
                  </View>
                  <View style={styles.detailChip}>
                    <Text style={styles.detailChipText}>💰 {c.prix} MAD</Text>
                  </View>
                </View>

                {c.isPaid && (
                  <View style={styles.paidBadge}>
                    <Text style={styles.paidBadgeText}>{t('meetings', 'paid')}</Text>
                  </View>
                )}

                {tab === 'pending' && (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.btnSecondary, isLoading && { opacity: 0.5 }]}
                      onPress={() => handleRefuse(c)}
                      disabled={isLoading}
                    >
                      <Text style={styles.btnSecondaryText}>{t('common', 'refuse')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btnPrimary, isLoading && { opacity: 0.7 }]}
                      onPress={() => handleAccept(c)}
                      disabled={isLoading}
                    >
                      {isLoading
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.btnPrimaryText}>{t('common', 'accept')}</Text>
                      }
                    </TouchableOpacity>
                  </View>
                )}

                {tab === 'accepted' && (
                  <View style={styles.confirmedRow}>
                    <Text style={styles.confirmedText}>✓ {t('meetings', 'confirmed')}</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: BG },
  header:           { padding: 20, paddingTop: 24, borderBottomWidth: 1, borderBottomColor: BORDER },
  title:            { fontSize: 20, fontWeight: '700', color: TEXT, marginBottom: 14 },
  tabBar:           { flexDirection: 'row', backgroundColor: CARD, borderRadius: 10, padding: 3 },
  tab:              { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  tabActive:        { backgroundColor: PRIMARY },
  tabText:          { fontSize: 13, fontWeight: '600', color: TEXT_MUTED },
  tabTextActive:    { color: '#fff' },
  body:             { padding: 16 },
  emptyBox:         { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyTitle:       { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 8, textAlign: 'center' },
  emptySub:         { fontSize: 13, color: TEXT_MUTED, textAlign: 'center', lineHeight: 20 },
  card:             { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 16, padding: 16, marginBottom: 14 },
  cardTop:          { flexDirection: 'row', gap: 12, marginBottom: 12 },
  cardName:         { fontSize: 15, fontWeight: '700', color: TEXT },
  cardRole:         { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  cardSubject:      { fontSize: 13, color: TEXT, marginTop: 6, lineHeight: 18 },
  detailsRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  detailChip:       { backgroundColor: PRIMARY_LIGHT, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  detailChipText:   { fontSize: 12, color: PRIMARY, fontWeight: '600' },
  paidBadge:        { backgroundColor: '#ECFDF5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12, alignSelf: 'flex-start' },
  paidBadgeText:    { color: SUCCESS_COLOR, fontSize: 12, fontWeight: '700' },
  actionsRow:       { flexDirection: 'row', gap: 10 },
  btnSecondary:     { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, alignItems: 'center', backgroundColor: BG },
  btnSecondaryText: { fontSize: 14, fontWeight: '700', color: TEXT_MUTED },
  btnPrimary:       { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: PRIMARY, alignItems: 'center' },
  btnPrimaryText:   { fontSize: 14, fontWeight: '700', color: '#fff' },
  confirmedRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  confirmedText:    { color: SUCCESS_COLOR, fontSize: 13, fontWeight: '700' },
});