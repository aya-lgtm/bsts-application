import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator, TextInput,
  Modal, KeyboardAvoidingView, Platform, RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { changePasswordAPI, loginUser } from '../../services/auth.service';
import api from '../../services/auth.service';
import { useLanguage } from './LanguageContext';

interface CollegeStudentData {
  id: string; nom: string; prenom: string; email: string; role: string;
  universite?: string; domaine?: string; anneeEtude?: number; bio?: string;
  prixParHeure?: number; prixParDemiHeure?: number; disponibilites?: any[];
}

interface ConsultationStats {
  total: number; confirmed: number; pending: number; totalEarned: number;
}

type Props = {
  navigation: { navigate: (screen: string, params?: any) => void };
  onLogout?: () => void;
};

function InfoModal({ visible, title, onClose, children }: {
  visible: boolean; title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={22} color="#555" />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MenuRow({ icon, label, value, onPress, danger = false }: {
  icon: string; label: string; value?: string; onPress?: () => void; danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuRowLeft}>
        <Ionicons name={icon as any} size={20} color={danger ? '#E53935' : '#0D6B5E'} />
        <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      </View>
      <View style={styles.menuRowRight}>
        {value ? <Text style={styles.menuValue}>{value}</Text> : null}
        {!danger && <Ionicons name="chevron-forward" size={16} color="#CCC" />}
      </View>
    </TouchableOpacity>
  );
}

function StatBadge({ icon, value, label, loading }: {
  icon: string; value: string; label: string; loading?: boolean;
}) {
  return (
    <View style={styles.statBadge}>
      <Ionicons name={icon as any} size={20} color="#0D6B5E" />
      {loading
        ? <ActivityIndicator size="small" color="#0D6B5E" style={{ marginVertical: 3 }} />
        : <Text style={styles.statValue}>{value}</Text>
      }
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function CollegeStudentProfilScreen({ navigation, onLogout }: Props) {
  const { t } = useLanguage();

  const [profile, setProfile]       = useState<CollegeStudentData | null>(null);
  const [stats, setStats]           = useState<ConsultationStats | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingStats, setLoadingStats]     = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [bioAvailable, setBioAvailable]     = useState(false);
  const [bioEnabled, setBioEnabled]         = useState(false);
  const [showBioModal, setShowBioModal]     = useState(false);
  const [pwdForBio, setPwdForBio]           = useState('');
  const [pwdBioError, setPwdBioError]       = useState('');
  const [showAccountModal, setShowAccountModal]   = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showStatsModal, setShowStatsModal]       = useState(false);
  const [showSupportModal, setShowSupportModal]   = useState(false);
  const [showDisposModal, setShowDisposModal]     = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd]         = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError]     = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/users/profile');
      setProfile(res.data.user);
      await SecureStore.setItemAsync('user', JSON.stringify(res.data.user));
    } catch {
      const stored = await SecureStore.getItemAsync('user');
      if (stored) setProfile(JSON.parse(stored));
    } finally { setLoadingProfile(false); }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/college-students/consultations/my');
      const consultations: any[] = res.data.consultations || [];
      const confirmed  = consultations.filter(c => c.statut === 'CONFIRMED').length;
      const pending    = consultations.filter(c => c.statut === 'PENDING').length;
      const totalEarned = consultations.filter(c => c.isPaid).reduce((sum, c) => sum + (c.prix || 0), 0);
      setStats({ total: consultations.length, confirmed, pending, totalEarned });
    } catch { setStats(null); }
    finally { setLoadingStats(false); }
  }, []);

  const checkBiometric = useCallback(async () => {
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setBioAvailable(enrolled);
    const stored = await SecureStore.getItemAsync('user');
    const uid = stored ? JSON.parse(stored).id : null;
    if (!uid) return;
    const saved = await SecureStore.getItemAsync(`biometric_enabled_${uid}`);
    setBioEnabled(saved === 'true');
  }, []);

  useEffect(() => { fetchProfile(); fetchStats(); checkBiometric(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); setLoadingStats(true);
    await fetchProfile(); await fetchStats();
    setRefreshing(false);
  }, [fetchProfile, fetchStats]);

  const prenom   = profile?.prenom ?? '';
  const nom      = profile?.nom    ?? '';
  const email    = profile?.email  ?? '';
  const fullName = [prenom, nom].filter(Boolean).join(' ') || t('profil', 'title');
  const initials = [prenom[0], nom[0]].filter(Boolean).join('').toUpperCase() || 'CS';

  const handleToggleBiometric = async () => {
    if (!bioAvailable) {
      Alert.alert(t('common', 'error'), 'Non disponible sur cet appareil.');
      return;
    }
    if (bioEnabled) {
      Alert.alert(t('profil', 'fingerprint'), t('profil', 'logoutConfirm'), [
        { text: t('common', 'cancel'), style: 'cancel' },
        {
          text: t('common', 'confirm'), style: 'destructive',
          onPress: async () => {
            const stored = await SecureStore.getItemAsync('user');
            const uid = stored ? JSON.parse(stored).id : null;
            if (uid) await SecureStore.setItemAsync(`biometric_enabled_${uid}`, 'false');
            setBioEnabled(false);
          },
        },
      ]);
    } else {
      setPwdForBio(''); setPwdBioError(''); setShowBioModal(true);
    }
  };

  const handleEnableBiometric = async () => {
    setPwdBioError('');
    if (!pwdForBio) { setPwdBioError(t('profil', 'enterPwd')); return; }
    try {
      await loginUser(email, pwdForBio);
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('profil', 'enableBio'),
        disableDeviceFallback: true,
        cancelLabel: t('common', 'cancel'),
      });
      if (result.success) {
        const stored = await SecureStore.getItemAsync('user');
        const uid = stored ? JSON.parse(stored).id : null;
        if (uid) await SecureStore.setItemAsync(`biometric_enabled_${uid}`, 'true');
        setBioEnabled(true); setShowBioModal(false);
        Alert.alert('✅', t('profil', 'enableBio'));
      } else { setPwdBioError('Empreinte non reconnue.'); }
    } catch (e: any) { setPwdBioError(e?.response?.data?.message || 'Mot de passe incorrect'); }
  };

  const handleChangePassword = async () => {
    setPwdError('');
    if (!currentPwd || !newPwd || !confirmPwd) { setPwdError(t('profil', 'enterPwd')); return; }
    if (newPwd.length < 8) { setPwdError('Au moins 8 caractères requis.'); return; }
    if (newPwd !== confirmPwd) { setPwdError('Les mots de passe ne correspondent pas.'); return; }
    try {
      setPwdLoading(true);
      await changePasswordAPI(currentPwd, newPwd);
      Alert.alert('✅', t('common', 'success'));
      setShowPasswordModal(false);
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e: any) { setPwdError(e?.response?.data?.message || ''); }
    finally { setPwdLoading(false); }
  };

  const handleLogout = () => {
    Alert.alert(t('profil', 'logout'), t('profil', 'logoutConfirm'), [
      { text: t('common', 'cancel'), style: 'cancel' },
      {
        text: t('profil', 'logout'), style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('accessToken');
          await SecureStore.deleteItemAsync('refreshToken');
          await SecureStore.deleteItemAsync('user');
          onLogout?.();
        },
      },
    ]);
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0D6B5E" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topbar}>
        <View style={{ width: 32 }} />
        <Text style={styles.topbarTitle}>{t('profil', 'title')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D6B5E" />}
      >
        {/* ── Profile Card ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{fullName}</Text>
            <View style={styles.profBadge}>
              <Ionicons name="school-outline" size={12} color="#0D6B5E" />
              <Text style={styles.profBadgeText}>
                {profile?.universite?.toUpperCase() ?? 'Mentor'}
              </Text>
            </View>
            <Text style={styles.profileSub}>
              {profile?.domaine ?? '—'}{profile?.anneeEtude ? ` · ${profile.anneeEtude}ème année` : ''}
            </Text>
            <Text style={styles.profileContact}>{email}</Text>
          </View>
        </View>

        {/* ── Bio ── */}
        {profile?.bio ? (
          <View style={styles.bioCard}>
            <Text style={styles.bioLabel}>{t('profil', 'aboutMe')}</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        ) : null}

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <StatBadge icon="calendar-outline"       value={stats ? String(stats.total)     : '—'} label={t('profil', 'consultations')} loading={loadingStats} />
          <View style={styles.statDivider} />
          <StatBadge icon="checkmark-done-outline" value={stats ? String(stats.confirmed) : '—'} label={t('profil', 'confirmed')}     loading={loadingStats} />
          <View style={styles.statDivider} />
          <StatBadge icon="cash-outline"           value={stats ? `${stats.totalEarned} MAD` : '—'} label={t('profil', 'revenue')}   loading={loadingStats} />
        </View>

        {/* ── Prix ── */}
        <View style={styles.prixCard}>
          <View style={styles.prixItem}>
            <Text style={styles.prixLabel}>{t('profil', 'pricePerHour')}</Text>
            <Text style={styles.prixVal}>{profile?.prixParHeure ?? '—'} MAD</Text>
          </View>
          <View style={styles.prixDivider} />
          <View style={[styles.prixItem, { alignItems: 'flex-end' }]}>
            <Text style={styles.prixLabel}>{t('profil', 'price30')}</Text>
            <Text style={styles.prixVal}>{profile?.prixParDemiHeure ?? '—'} MAD</Text>
          </View>
        </View>

        {/* ── Activité ── */}
        <Text style={styles.sectionLabel}>{t('profil', 'activity')}</Text>
        <View style={styles.menuCard}>
          <MenuRow icon="stats-chart-outline" label={t('profil', 'stats')}  onPress={() => setShowStatsModal(true)} />
          <View style={styles.separator} />
          <MenuRow icon="time-outline"        label={t('profil', 'myDispo')} onPress={() => setShowDisposModal(true)}
            value={profile?.disponibilites?.filter((d: any) => d.actif !== false).length
              ? `${profile.disponibilites.filter((d: any) => d.actif !== false).length} jours`
              : undefined}
          />
        </View>

        {/* ── Compte ── */}
        <Text style={styles.sectionLabel}>{t('profil', 'account')}</Text>
        <View style={styles.menuCard}>
          <MenuRow icon="person-outline"      label={t('profil', 'accountInfo')}    onPress={() => setShowAccountModal(true)} />
          <View style={styles.separator} />
          <MenuRow icon="finger-print-outline" label={t('profil', 'fingerprint')}   value={bioEnabled ? t('profil', 'active') : t('profil', 'inactive')} onPress={handleToggleBiometric} />
          <View style={styles.separator} />
          <MenuRow icon="key-outline"          label={t('profil', 'changePassword')} onPress={() => { setShowPasswordModal(true); setPwdError(''); setCurrentPwd(''); setNewPwd(''); setConfirmPwd(''); }} />
          <View style={styles.separator} />
          <MenuRow icon="headset-outline"      label={t('profil', 'support')}        onPress={() => setShowSupportModal(true)} />
        </View>

        {/* ── Déconnexion ── */}
        <View style={[styles.menuCard, { marginTop: 12 }]}>
          <MenuRow icon="log-out-outline" label={t('profil', 'logout')} onPress={handleLogout} danger />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ════ MODAL : Informations du compte ════ */}
      <InfoModal visible={showAccountModal} title={t('profil', 'accountInfo')} onClose={() => setShowAccountModal(false)}>
        <View style={styles.modalBody}>
          {([
            { label: t('profil', 'firstName'),  value: prenom || '—' },
            { label: t('profil', 'lastName'),   value: nom    || '—' },
            { label: t('profil', 'email'),      value: email  || '—' },
            { label: t('profil', 'university'), value: profile?.universite ?? '—' },
            { label: t('profil', 'domain'),     value: profile?.domaine    ?? '—' },
            { label: t('profil', 'studyYear'),  value: profile?.anneeEtude ? `${profile.anneeEtude}ème année` : '—' },
          ] as { label: string; value: string }[]).map((row, i, arr) => (
            <React.Fragment key={row.label}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{row.value}</Text>
              </View>
              {i < arr.length - 1 && <View style={styles.infoRowDivider} />}
            </React.Fragment>
          ))}
        </View>
        <TouchableOpacity style={styles.modalBtn} onPress={() => setShowAccountModal(false)}>
          <Text style={styles.modalBtnText}>{t('profil', 'close')}</Text>
        </TouchableOpacity>
      </InfoModal>

      {/* ════ MODAL : Statistiques ════ */}
      <InfoModal visible={showStatsModal} title={t('profil', 'stats')} onClose={() => setShowStatsModal(false)}>
        <View style={styles.modalBody}>
          {loadingStats ? (
            <ActivityIndicator size="large" color="#0D6B5E" style={{ marginVertical: 20 }} />
          ) : stats === null ? (
            <Text style={styles.emptyText}>{t('common', 'noData')}</Text>
          ) : (
            ([
              { icon: 'calendar-outline',       label: t('profil', 'consultations'), value: String(stats.total)           },
              { icon: 'checkmark-done-outline', label: t('profil', 'confirmed'),     value: String(stats.confirmed)       },
              { icon: 'time-outline',           label: t('meetings', 'pending'),     value: String(stats.pending)         },
              { icon: 'cash-outline',           label: t('profil', 'revenue'),       value: `${stats.totalEarned} MAD`    },
            ] as { icon: string; label: string; value: string }[]).map((row, i, arr) => (
              <React.Fragment key={row.label}>
                <View style={styles.statModalRow}>
                  <View style={styles.statModalLeft}>
                    <Ionicons name={row.icon as any} size={18} color="#0D6B5E" />
                    <Text style={styles.infoLabel}>{row.label}</Text>
                  </View>
                  <Text style={styles.statModalValue}>{row.value}</Text>
                </View>
                {i < arr.length - 1 && <View style={styles.infoRowDivider} />}
              </React.Fragment>
            ))
          )}
        </View>
        <TouchableOpacity style={styles.modalBtn} onPress={() => setShowStatsModal(false)}>
          <Text style={styles.modalBtnText}>{t('profil', 'close')}</Text>
        </TouchableOpacity>
      </InfoModal>

      {/* ════ MODAL : Disponibilités ════ */}
      <InfoModal visible={showDisposModal} title={t('profil', 'myDispo')} onClose={() => setShowDisposModal(false)}>
        <View style={styles.modalBody}>
          {!profile?.disponibilites || profile.disponibilites.length === 0 ? (
            <Text style={styles.emptyText}>{t('common', 'noData')}</Text>
          ) : (
            profile.disponibilites.map((d: any, i: number, arr: any[]) => (
              <React.Fragment key={d.jour}>
                <View style={styles.dispoRow}>
                  <Text style={[styles.dispoJour, !d.actif && { color: '#AAA' }]}>{d.jour}</Text>
                  <Text style={styles.dispoHeures}>{d.actif ? d.heures : t('dispos', 'unavailable')}</Text>
                </View>
                {i < arr.length - 1 && <View style={styles.infoRowDivider} />}
              </React.Fragment>
            ))
          )}
        </View>
        <TouchableOpacity style={styles.modalBtn} onPress={() => setShowDisposModal(false)}>
          <Text style={styles.modalBtnText}>{t('profil', 'close')}</Text>
        </TouchableOpacity>
      </InfoModal>

      {/* ════ MODAL : Support ════ */}
      <InfoModal visible={showSupportModal} title={t('profil', 'support')} onClose={() => setShowSupportModal(false)}>
        <View style={styles.modalBody}>
          <TouchableOpacity style={styles.supportRow}
            onPress={() => { setShowSupportModal(false); Linking.openURL('https://wa.me/212708060466'); }}>
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            <Text style={styles.supportRowText}>{t('profil', 'whatsapp')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#CCC" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#F5F7F6' }]} onPress={() => setShowSupportModal(false)}>
          <Text style={[styles.modalBtnText, { color: '#555' }]}>{t('profil', 'close')}</Text>
        </TouchableOpacity>
      </InfoModal>

      {/* ════ MODAL : Activer empreinte ════ */}
      <InfoModal visible={showBioModal} title={t('profil', 'enableBio')} onClose={() => setShowBioModal(false)}>
        <View style={styles.modalBody}>
          <Text style={[styles.infoLabel, { marginBottom: 12, lineHeight: 20 }]}>{t('profil', 'enterPwd')}</Text>
          {pwdBioError ? <Text style={styles.pwdError}>{pwdBioError}</Text> : null}
          <Text style={styles.inputLabel}>{t('profil', 'currentPwd')}</Text>
          <TextInput style={styles.input} secureTextEntry placeholder="••••••••" placeholderTextColor="#CCC" value={pwdForBio} onChangeText={setPwdForBio} autoFocus />
        </View>
        <TouchableOpacity style={styles.modalBtn} onPress={handleEnableBiometric}>
          <Text style={styles.modalBtnText}>{t('profil', 'enableBio')}</Text>
        </TouchableOpacity>
      </InfoModal>

      {/* ════ MODAL : Changer mot de passe ════ */}
      <InfoModal visible={showPasswordModal} title={t('profil', 'changePassword')} onClose={() => { setShowPasswordModal(false); setPwdError(''); }}>
        <View style={styles.modalBody}>
          {pwdError ? <Text style={styles.pwdError}>{pwdError}</Text> : null}
          {([
            { label: t('profil', 'currentPwd'), val: currentPwd, set: setCurrentPwd },
            { label: t('profil', 'newPwd'),     val: newPwd,     set: setNewPwd     },
            { label: t('profil', 'confirmPwd'), val: confirmPwd, set: setConfirmPwd },
          ] as { label: string; val: string; set: (v: string) => void }[]).map(f => (
            <React.Fragment key={f.label}>
              <Text style={styles.inputLabel}>{f.label}</Text>
              <TextInput style={styles.input} secureTextEntry placeholder="••••••••" placeholderTextColor="#CCC" value={f.val} onChangeText={f.set} />
            </React.Fragment>
          ))}
        </View>
        <TouchableOpacity style={[styles.modalBtn, pwdLoading && { opacity: 0.7 }]} onPress={handleChangePassword} disabled={pwdLoading}>
          {pwdLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>{t('profil', 'update')}</Text>}
        </TouchableOpacity>
      </InfoModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#FFFFFF' },
  scroll:           { flex: 1 },
  container:        { paddingHorizontal: 20, paddingTop: 20 },
  topbar:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25, paddingTop: 60, paddingBottom: 12 },
  topbarTitle:      { fontSize: 25, fontWeight: '800', color: '#0D6B5E' },
  profileCard:      { backgroundColor: '#fff', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  avatarPlaceholder:{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#0D6B5E22', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarInitials:   { fontSize: 26, fontWeight: '800', color: '#0D6B5E' },
  profileInfo:      { flex: 1 },
  profileName:      { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 },
  profBadge:        { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderWidth: 1.5, borderColor: '#0D6B5E', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6 },
  profBadgeText:    { fontSize: 10, fontWeight: '800', color: '#0D6B5E', letterSpacing: 0.5 },
  profileSub:       { fontSize: 13, color: '#555', marginBottom: 2 },
  profileContact:   { fontSize: 12, color: '#999' },
  bioCard:          { backgroundColor: '#F8FAFB', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  bioLabel:         { fontSize: 12, fontWeight: '700', color: '#0D6B5E', marginBottom: 6 },
  bioText:          { fontSize: 14, color: '#444', lineHeight: 20 },
  statsRow:         { backgroundColor: '#fff', borderRadius: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  statBadge:        { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  statDivider:      { width: 1, height: 40, backgroundColor: '#F0F0F0' },
  statValue:        { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  statLabel:        { fontSize: 10, color: '#888', textAlign: 'center' },
  prixCard:         { flexDirection: 'row', backgroundColor: '#E6F3F1', borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#0D6B5E30' },
  prixItem:         { flex: 1 },
  prixDivider:      { width: 1, backgroundColor: '#0D6B5E30', marginHorizontal: 16 },
  prixLabel:        { fontSize: 12, color: '#0D6B5E', fontWeight: '600' },
  prixVal:          { fontSize: 20, fontWeight: '800', color: '#0D6B5E', marginTop: 4 },
  sectionLabel:     { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 8, marginLeft: 4 },
  menuCard:         { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  menuRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  menuRowLeft:      { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  menuLabel:        { fontSize: 15, color: '#1A1A1A', fontWeight: '400' },
  menuLabelDanger:  { color: '#E53935', fontWeight: '500' },
  menuRowRight:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuValue:        { fontSize: 13, color: '#AAA' },
  separator:        { height: 1, backgroundColor: '#F0F0F0', marginLeft: 32 },
  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:       { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  modalHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalTitle:       { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  modalCloseBtn:    { padding: 4 },
  modalBody:        { paddingHorizontal: 20, paddingVertical: 16 },
  modalBtn:         { backgroundColor: '#0D6B5E', marginHorizontal: 20, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  modalBtnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },
  infoRow:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  infoRowDivider:   { height: 1, backgroundColor: '#F0F0F0' },
  infoLabel:        { fontSize: 14, color: '#888' },
  infoValue:        { fontSize: 14, fontWeight: '600', color: '#1A1A1A', flexShrink: 1, textAlign: 'right' },
  emptyText:        { fontSize: 14, color: '#888', textAlign: 'center', paddingVertical: 16, lineHeight: 22 },
  statModalRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  statModalLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statModalValue:   { fontSize: 15, fontWeight: '700', color: '#0D6B5E' },
  dispoRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  dispoJour:        { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  dispoHeures:      { fontSize: 13, color: '#666' },
  supportRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  supportRowText:   { flex: 1, fontSize: 15, color: '#1A1A1A' },
  pwdError:         { color: '#E53935', fontSize: 13, marginBottom: 10, fontWeight: '500' },
  inputLabel:       { fontSize: 13, color: '#555', fontWeight: '600', marginBottom: 6 },
  input:            { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A1A', marginBottom: 14, backgroundColor: '#FAFAFA' },
});