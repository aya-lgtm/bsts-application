import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl, Linking,
  Modal, TouchableWithoutFeedback, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
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
const GOLD          = '#F59E0B';
const SUCCESS       = '#10B981';
const DANGER        = '#EF4444';

const LANGUES: { label: string; value: 'fr' | 'en' }[] = [
  { label: 'Français', value: 'fr' },
  { label: 'English',  value: 'en' },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface CollegeStudentProfile {
  id: string; nom: string; prenom: string;
  photo?: string; universite?: string; domaine?: string;
  prixParHeure?: number; prixParDemiHeure?: number;
}

interface Consultation {
  id: string; date: string; heure: string; duree: string;
  statut: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  prix: number; isPaid: boolean; notes?: string; meetLink?: string;
  userId: string; User?: { nom: string; prenom: string; photo?: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 44, uri }: { name: string; size?: number; uri?: string }) => {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: PRIMARY_LIGHT, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: PRIMARY, fontSize: size * 0.36, fontWeight: '700' }}>{initials}</Text>
    </View>
  );
};

const formatDateLabel = (dateStr: string): string => {
  const d = new Date(dateStr);
  const today = new Date(); const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString())    return "Aujourd'hui";
  if (d.toDateString() === tomorrow.toDateString()) return 'Demain';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'short' });
};

const formatTime = (heure: string): string => heure?.slice(0, 5) ?? '';

// ─── DrawerMenu — composant interne avec accès au hook ────────────────────────
const DrawerMenu = ({
  visible, onClose, darkMode, onToggleDark,
}: {
  visible: boolean; onClose: () => void;
  darkMode: boolean; onToggleDark: () => void;
}) => {
  // ✅ useLanguage() appelé DANS le composant — pas d'erreur
  const { t, lang, setLang } = useLanguage();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
        }} />
      </TouchableWithoutFeedback>

      <View style={drawerStyles.sheet}>
        <View style={drawerStyles.handle} />

        {/* Header */}
        <View style={drawerStyles.header}>
          <Text style={drawerStyles.headerTitle}>{t('drawer', 'preferences')}</Text>
          <TouchableOpacity onPress={onClose} style={drawerStyles.closeBtn}>
            <Ionicons name="close" size={20} color={TEXT} />
          </TouchableOpacity>
        </View>

        {/* ── Thème ── */}
        <View style={drawerStyles.section}>
          <Text style={drawerStyles.sectionLabel}>{t('drawer', 'appearance')}</Text>
          <View style={drawerStyles.row}>
            <View style={drawerStyles.rowLeft}>
              <View style={[drawerStyles.iconWrap, { backgroundColor: darkMode ? '#1F2937' : '#F3F4F6' }]}>
                <Ionicons name={darkMode ? 'moon' : 'sunny'} size={20} color={darkMode ? '#818CF8' : GOLD} />
              </View>
              <View>
                <Text style={drawerStyles.rowLabel}>
                  {darkMode ? t('drawer', 'darkMode') : t('drawer', 'lightMode')}
                </Text>
                <Text style={drawerStyles.rowSub}>
                  {darkMode ? t('drawer', 'darkEnabled') : t('drawer', 'lightEnabled')}
                </Text>
              </View>
            </View>
            <Switch
              value={darkMode}
              onValueChange={onToggleDark}
              trackColor={{ false: BORDER, true: PRIMARY }}
              thumbColor={BG}
            />
          </View>
        </View>

        {/* ── Langue ── */}
        <View style={drawerStyles.section}>
          <Text style={drawerStyles.sectionLabel}>{t('drawer', 'language')}</Text>
          {LANGUES.map(l => (
            <TouchableOpacity
              key={l.value}
              style={drawerStyles.langueRow}
              onPress={() => { setLang(l.value); onClose(); }}
            >
              <Text style={[drawerStyles.langueText, lang === l.value && drawerStyles.langueTextActive]}>
                {l.label}
              </Text>
              {lang === l.value && <Ionicons name="checkmark-circle" size={22} color={PRIMARY} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
};

const drawerStyles = StyleSheet.create({
  sheet:           { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  handle:          { width: 40, height: 4, backgroundColor: BORDER, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerTitle:     { fontSize: 18, fontWeight: '800', color: TEXT },
  closeBtn:        { width: 32, height: 32, borderRadius: 16, backgroundColor: CARD_BG, alignItems: 'center', justifyContent: 'center' },
  section:         { paddingHorizontal: 20, paddingTop: 20 },
  sectionLabel:    { fontSize: 12, fontWeight: '700', color: TEXT_MUTED, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  row:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  rowLeft:         { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconWrap:        { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowLabel:        { fontSize: 15, fontWeight: '600', color: TEXT },
  rowSub:          { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  langueRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  langueText:      { fontSize: 15, color: TEXT, fontWeight: '500' },
  langueTextActive:{ color: PRIMARY, fontWeight: '700' },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CollegeStudentHomeScreen({
  onLogout, navigation,
}: { onLogout?: () => void; navigation?: any }) {

  // ✅ useLanguage() appelé dans le composant principal
  const { t } = useLanguage();

  const [profile, setProfile]           = useState<CollegeStudentProfile | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [moyenne, setMoyenne]           = useState<number | null>(null);
  const [totalAvis, setTotalAvis]       = useState<number>(0);
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [darkMode, setDarkMode]         = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, consRes] = await Promise.all([
        api.get('/users/profile'),
        api.get('/college-students/consultations/my'),
      ]);
      setProfile(profileRes.data.user);
      setConsultations(consRes.data.consultations ?? []);

      try {
        const reviewsRes = await api.get('/college-students/me/reviews');
        setMoyenne(reviewsRes.data.noteMoyenne ?? null);
        setTotalAvis(reviewsRes.data.totalReviews ?? 0);
        const revs = reviewsRes.data.reviews ?? [];
        if (revs.length > 0) {
          const satisfied = revs.filter((r: any) => r.note >= 4).length;
          setSatisfaction(Math.round((satisfied / revs.length) * 100));
        }
      } catch {}
    } catch (e) {
      console.error('HomeScreen:', e);
      const stored = await SecureStore.getItemAsync('user');
      if (stored) setProfile(JSON.parse(stored));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  const pending   = consultations.filter(c => c.statut === 'PENDING');
  const confirmed = consultations.filter(c => c.statut === 'CONFIRMED');
  const completed = consultations.filter(c => c.statut === 'COMPLETED');

  const nextMeeting = [...confirmed]
    .sort((a, b) => new Date(`${a.date}T${a.heure}`).getTime() - new Date(`${b.date}T${b.heure}`).getTime())[0] ?? null;

  const totalMeetings = completed.length;
  const totalStudents = new Set(consultations.map(c => c.userId)).size;
  const totalEarned   = consultations.filter(c => c.isPaid).reduce((s, c) => s + (c.prix ?? 0), 0);
  const fullName      = profile ? `${profile.prenom} ${profile.nom}` : '';
  const prenom        = profile?.prenom ?? '';

  const joinMeeting = async (c: Consultation) => {
    const url = c.meetLink ?? 'https://meet.google.com';
    const can = await Linking.canOpenURL(url);
    if (can) Linking.openURL(url);
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

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => setDrawerOpen(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="menu-outline" size={28} color={TEXT} />
        </TouchableOpacity>

        <Image source={require('../../assets/logo1.png')} style={styles.logoImg} resizeMode="contain" />

        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => navigation?.navigate('CollegeStudentNotifications')}
          style={{ position: 'relative' }}
        >
          <Ionicons name="notifications-outline" size={26} color={TEXT} />
          {pending.length > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{pending.length > 9 ? '9+' : pending.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
      >
        {/* ── Hero ── */}
        <View style={styles.heroRow}>
          <Avatar name={fullName || 'CS'} size={68} uri={profile?.photo} />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.heroGreeting}>{t('home', 'hello')} {prenom} 👋</Text>
            <Text style={styles.heroSub}>
              {profile?.universite ?? t('home', 'readyToHelp')}
            </Text>
            {profile?.domaine && <Text style={styles.heroDomain}>{profile.domaine}</Text>}
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          {[
            { val: String(totalMeetings), label: t('home', 'meetingsDone') },
            { val: String(totalStudents), label: t('home', 'studentsHelped') },
            { val: moyenne !== null ? `${moyenne.toFixed(1)}★` : '—', label: t('home', 'avgRating') },
            { val: satisfaction !== null ? `${satisfaction}%` : '—',  label: t('home', 'satisfaction') },
          ].map((s, i) => (
            <View key={i} style={[styles.statCell, i < 3 && { borderRightWidth: 1, borderRightColor: BORDER }]}>
              <Text style={styles.statVal}>{s.val}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Revenus ── */}
        <View style={styles.revenusCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.revenusLabel}>{t('home', 'revenusThisMonth')}</Text>
            <Text style={styles.revenusVal}>{totalEarned} MAD</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="trending-up" size={14} color="#86efac" />
              <Text style={styles.revenusSub}>{t('home', 'basedOnPaid')}</Text>
            </View>
          </View>
          <View style={styles.revenusIconWrap}>
            <Ionicons name="wallet-outline" size={28} color="#fff" />
          </View>
        </View>

        {/* ── Note moyenne ── */}
        <TouchableOpacity
          style={styles.noteCard}
          onPress={() => navigation?.navigate('CollegeStudentAvis')}
          activeOpacity={0.85}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.noteCardLabel}>{t('home', 'avgRatingCard')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginVertical: 4 }}>
              <Text style={styles.noteCardVal}>{moyenne?.toFixed(1) ?? '—'}</Text>
              <Text style={styles.noteCardSur}>/5</Text>
            </View>
            <Text style={styles.noteCardBase}>{totalAvis} {t('home', 'reviewsReceived')}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <View style={{ flexDirection: 'row', gap: 3 }}>
              {[1,2,3,4,5].map(i => (
                <Ionicons key={i} name={moyenne && i <= Math.round(moyenne) ? 'star' : 'star-outline'} size={22} color={GOLD} />
              ))}
            </View>
            <Ionicons name="chevron-forward" size={16} color={TEXT_MUTED} />
          </View>
        </TouchableOpacity>

        {/* ── Prochain meeting ── */}
        <View style={styles.section}>
          <View style={styles.nextMeetingCard}>
            <View style={styles.nextMeetingHeader}>
              <Text style={styles.nextMeetingTitle}>{t('home', 'nextMeeting')}</Text>
              {nextMeeting && <Text style={styles.nextMeetingDate}>{formatDateLabel(nextMeeting.date)}</Text>}
            </View>

            {nextMeeting ? (
              <>
                <View style={styles.nextMeetingTimeRow}>
                  <Text style={styles.nextMeetingTime}>{formatTime(nextMeeting.heure)}</Text>
                  <View style={styles.dureeBadge}>
                    <Text style={styles.dureeBadgeText}>{nextMeeting.duree}</Text>
                  </View>
                </View>
                <View style={styles.nextMeetingBottom}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Avatar
                      name={nextMeeting.User ? `${nextMeeting.User.prenom} ${nextMeeting.User.nom}` : '?'}
                      size={38} uri={nextMeeting.User?.photo}
                    />
                    <View style={{ marginLeft: 10 }}>
                      <Text style={styles.nextMeetingUserName}>
                        {nextMeeting.User ? `${nextMeeting.User.prenom} ${nextMeeting.User.nom}` : '—'}
                      </Text>
                      <Text style={styles.nextMeetingNotes} numberOfLines={1}>
                        {nextMeeting.notes ?? t('home', 'consultation')}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.joinBtn} onPress={() => joinMeeting(nextMeeting)}>
                    <Text style={styles.joinBtnText}>{t('common', 'join')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Ionicons name="calendar-outline" size={40} color={BORDER} />
                <Text style={{ color: TEXT_MUTED, marginTop: 8, fontSize: 14 }}>{t('home', 'noConfirmed')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── CTA Demandes ── */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.demandsCTA}
            onPress={() => navigation?.navigate('CollegeStudentMeetings')}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.demandesBadge}>
                <Text style={styles.demandesBadgeText}>{pending.length}</Text>
              </View>
              <Text style={styles.demandsCTAText}>{t('home', 'seeDemands')}</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Drawer ── */}
      <DrawerMenu
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, backgroundColor: BG, borderBottomWidth: 1, borderBottomColor: BORDER },
  logoImg:             { width: 52, height: 52 },
  notifBadge:          { position: 'absolute', top: -4, right: -4, backgroundColor: DANGER, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: BG },
  notifBadgeText:      { color: '#fff', fontSize: 10, fontWeight: '800' },
  heroRow:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  heroGreeting:        { fontSize: 22, fontWeight: '800', color: TEXT, marginBottom: 4 },
  heroSub:             { fontSize: 13, color: TEXT_MUTED },
  heroDomain:          { fontSize: 12, color: PRIMARY, fontWeight: '600', marginTop: 3 },
  statsRow:            { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, backgroundColor: BG, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  statCell:            { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statVal:             { fontSize: 16, fontWeight: '800', color: PRIMARY, marginBottom: 4 },
  statLabel:           { fontSize: 9, color: TEXT_MUTED, textAlign: 'center', lineHeight: 13 },
  revenusCard:         { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 16, backgroundColor: PRIMARY, borderRadius: 16, padding: 20, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  revenusLabel:        { color: 'rgba(255,255,255,.75)', fontSize: 12, marginBottom: 4 },
  revenusVal:          { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 4 },
  revenusSub:          { color: '#86efac', fontSize: 11, fontWeight: '600' },
  revenusIconWrap:     { width: 50, height: 50, borderRadius: 14, backgroundColor: 'rgba(255,255,255,.15)', alignItems: 'center', justifyContent: 'center', marginLeft: 16 },
  noteCard:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFBEB', marginHorizontal: 20, marginBottom: 16, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FDE68A' },
  noteCardLabel:       { fontSize: 12, color: '#92400E', fontWeight: '600' },
  noteCardVal:         { fontSize: 30, fontWeight: '800', color: '#92400E' },
  noteCardSur:         { fontSize: 15, fontWeight: '600', color: '#B45309' },
  noteCardBase:        { fontSize: 12, color: '#B45309', marginTop: 2 },
  section:             { paddingHorizontal: 20, marginBottom: 16 },
  nextMeetingCard:     { backgroundColor: BG, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  nextMeetingHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  nextMeetingTitle:    { fontSize: 15, fontWeight: '700', color: TEXT },
  nextMeetingDate:     { fontSize: 12, color: TEXT_MUTED, fontWeight: '500' },
  nextMeetingTimeRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  nextMeetingTime:     { fontSize: 44, fontWeight: '900', color: TEXT, letterSpacing: -2 },
  dureeBadge:          { backgroundColor: PRIMARY_LIGHT, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6 },
  dureeBadgeText:      { color: PRIMARY, fontSize: 13, fontWeight: '700' },
  nextMeetingBottom:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextMeetingUserName: { fontSize: 14, fontWeight: '700', color: TEXT },
  nextMeetingNotes:    { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  joinBtn:             { borderWidth: 1.5, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 9, backgroundColor: BG },
  joinBtnText:         { fontSize: 14, fontWeight: '600', color: TEXT },
  demandsCTA:          { backgroundColor: PRIMARY_DARK, borderRadius: 16, paddingVertical: 17, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: PRIMARY_DARK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  demandesBadge:       { backgroundColor: 'rgba(255,255,255,.2)', borderRadius: 99, minWidth: 28, height: 28, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  demandesBadgeText:   { color: '#fff', fontSize: 14, fontWeight: '800' },
  demandsCTAText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
});