// screens/SUPER_ADMIN/SuperAdminProfilScreen.tsx
// Profil Super Admin — même style que StudentProfilScreen.tsx
// Sections : carte profil, stats globales, compte, sécurité, déconnexion

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator, TextInput,
  Modal, KeyboardAvoidingView, Platform, RefreshControl,
  Switch,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { changePasswordAPI, loginUser } from '../../services/auth.service';
import api from '../../services/auth.service';

// ─── Types ────────────────────────────────────────────────────────────────
interface AdminData {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
}

interface AdminStats {
  totalUsers: number;
  totalEtudiants: number;
  totalProfesseurs: number;
  totalCours: number;
  totalQuestionsSAT: number;
  totalMeetings: number;
  revenusMois: number;
}

interface NotifPrefs {
  newUser: boolean;
  newReport: boolean;
  newPayment: boolean;
  systemAlerts: boolean;
}

type Props = {
  navigation: { navigate: (screen: string, params?: any) => void };
  onLogout?: () => void;
};

// ─── Bottom-Sheet Modal ───────────────────────────────────────────────────
function InfoModal({
  visible, title, onClose, children,
}: {
  visible: boolean; title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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

// ─── Menu Row ─────────────────────────────────────────────────────────────
function MenuRow({
  icon, label, value, onPress, danger = false,
}: {
  icon: string; label: string; value?: string;
  onPress?: () => void; danger?: boolean;
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

// ─── Stat Badge ───────────────────────────────────────────────────────────
function StatBadge({
  icon, value, label, loading,
}: {
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

// ─── Main Screen ──────────────────────────────────────────────────────────
export default function SuperAdminProfilScreen({ navigation, onLogout }: Props) {
  const [user,    setUser]    = useState<AdminData | null>(null);
  const [stats,   setStats]   = useState<AdminStats | null>(null);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingStats,   setLoadingStats]   = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);

  // Biométrie
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled,   setBiometricEnabled]   = useState(false);
  const [showBioModal,       setShowBioModal]       = useState(false);
  const [pwdForBio,          setPwdForBio]          = useState('');
  const [pwdBioError,        setPwdBioError]        = useState('');

  // Préférences notifications
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    newUser:      true,
    newReport:    true,
    newPayment:   true,
    systemAlerts: true,
  });

  // Modals
  const [showAccountModal,  setShowAccountModal]  = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showStatsModal,    setShowStatsModal]    = useState(false);
  const [showNotifModal,    setShowNotifModal]    = useState(false);

  // Password
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd,     setNewPwd]     = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError,   setPwdError]   = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  // ── Fetch profil ──────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/users/profile');
      const u: AdminData = res.data.user;
      setUser(u);
      await SecureStore.setItemAsync('user', JSON.stringify(u));
    } catch {
      try {
        const stored = await SecureStore.getItemAsync('user');
        if (stored) setUser(JSON.parse(stored));
      } catch (_) {}
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  // ── Fetch stats globales ──────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/dashboard');
      const d = res.data;
      setStats({
        totalUsers:        (d.totalEtudiants ?? 0) + (d.totalProfesseurs ?? 0) + (d.totalAnciensEtudiants ?? 0),
        totalEtudiants:    d.totalEtudiants ?? 0,
        totalProfesseurs:  d.totalProfesseurs ?? 0,
        totalCours:        d.totalCours ?? 0,
        totalQuestionsSAT: d.totalQuestionsSAT ?? 0,
        totalMeetings:     d.totalMeetings ?? 0,
        revenusMois:       d.revenusMois ?? 0,
      });
    } catch {
      try {
        const usersRes = await api.get('/users');
        const list = usersRes.data?.users ?? [];
        const etudiants  = list.filter((u: any) => u.role === 'STUDENT').length;
        const professeurs = list.filter((u: any) => u.role === 'PROFESSOR').length;
        const anciens     = list.filter((u: any) => u.role === 'COLLEGE_STUDENT').length;
        setStats({
          totalUsers: etudiants + professeurs + anciens,
          totalEtudiants: etudiants,
          totalProfesseurs: professeurs,
          totalCours: 0,
          totalQuestionsSAT: 0,
          totalMeetings: 0,
          revenusMois: 0,
        });
      } catch {
        setStats(null);
      }
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // ── Biométrie ─────────────────────────────────────────────────────────
  const checkBiometric = useCallback(async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled   = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(compatible && enrolled);
    const stored = await SecureStore.getItemAsync('user');
    const uid = stored ? JSON.parse(stored).id : null;
    if (!uid) return;
    const saved = await SecureStore.getItemAsync(`biometric_enabled_${uid}`);
    setBiometricEnabled(saved === 'true');
  }, []);

  // ── Prefs notifications ───────────────────────────────────────────────
  const loadNotifPrefs = useCallback(async () => {
    try {
      const stored = await SecureStore.getItemAsync('user');
      const uid = stored ? JSON.parse(stored).id : null;
      if (!uid) return;
      const saved = await SecureStore.getItemAsync(`admin_notif_prefs_${uid}`);
      if (saved) setNotifPrefs(JSON.parse(saved));
    } catch (_) {}
  }, []);

  const saveNotifPref = async (key: keyof NotifPrefs, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    const stored = await SecureStore.getItemAsync('user');
    const uid = stored ? JSON.parse(stored).id : null;
    if (!uid) return;
    await SecureStore.setItemAsync(`admin_notif_prefs_${uid}`, JSON.stringify(updated));
  };

  useEffect(() => {
    const init = async () => {
      await fetchProfile();
      await fetchStats();
      await checkBiometric();
      await loadNotifPrefs();
    };
    init();
  }, [fetchProfile, fetchStats, checkBiometric, loadNotifPrefs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoadingStats(true);
    await fetchProfile();
    await fetchStats();
    setRefreshing(false);
  }, [fetchProfile, fetchStats]);

  const prenom   = user?.prenom ?? '';
  const nom      = user?.nom    ?? '';
  const email    = user?.email  ?? '';
  const fullName = [prenom, nom].filter(Boolean).join(' ') || 'Super Admin';
  const initials = [prenom[0], nom[0]].filter(Boolean).join('').toUpperCase() || 'SA';

  const handleToggleBiometric = async () => {
    if (!biometricAvailable) {
      Alert.alert('Non disponible', "L'authentification par empreinte n'est pas configurée sur cet appareil.");
      return;
    }
    if (biometricEnabled) {
      Alert.alert('Désactiver l\'empreinte', 'Êtes-vous sûr ?', [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Désactiver', style: 'destructive',
          onPress: async () => {
            const stored = await SecureStore.getItemAsync('user');
            const uid = stored ? JSON.parse(stored).id : null;
            if (uid) await SecureStore.setItemAsync(`biometric_enabled_${uid}`, 'false');
            setBiometricEnabled(false);
          },
        },
      ]);
    } else {
      setPwdForBio('');
      setPwdBioError('');
      setShowBioModal(true);
    }
  };

  const handleEnableBiometric = async () => {
    setPwdBioError('');
    if (!pwdForBio) { setPwdBioError('Veuillez entrer votre mot de passe'); return; }
    try {
      await loginUser(email, pwdForBio);
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Scannez votre empreinte pour l\'activer',
        disableDeviceFallback: true,
        cancelLabel: 'Annuler',
      });
      if (result.success) {
        const stored = await SecureStore.getItemAsync('user');
        const uid = stored ? JSON.parse(stored).id : null;
        if (uid) await SecureStore.setItemAsync(`biometric_enabled_${uid}`, 'true');
        if (uid) await SecureStore.setItemAsync(`biometric_email_${uid}`, email);
        setBiometricEnabled(true);
        setShowBioModal(false);
        Alert.alert('✅ Activé', 'La connexion par empreinte est maintenant active.');
      } else {
        setPwdBioError('Empreinte non reconnue. Réessayez.');
      }
    } catch (e: any) {
      setPwdBioError(e?.response?.data?.message || 'Mot de passe incorrect');
    }
  };

  const handleChangePassword = async () => {
    setPwdError('');
    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdError('Veuillez remplir tous les champs.'); return;
    }
    if (newPwd.length < 8) {
      setPwdError('Le nouveau mot de passe doit contenir au moins 8 caractères.'); return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('Les mots de passe ne correspondent pas.'); return;
    }
    try {
      setPwdLoading(true);
      await changePasswordAPI(currentPwd, newPwd);
      Alert.alert('✅ Succès', 'Votre mot de passe a été mis à jour.');
      setShowPasswordModal(false);
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e: any) {
      setPwdError(e?.response?.data?.message || 'Mot de passe actuel incorrect.');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion', style: 'destructive',
        onPress: async () => {
          try {
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('refreshToken');
            await SecureStore.deleteItemAsync('user');
          } catch (_) {}
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
        <Text style={styles.topbarTitle}>Profil</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D6B5E" />
        }
      >
        {/* ── Profile Card ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{fullName}</Text>
            <View style={styles.profBadge}>
              <Ionicons name="shield-checkmark-outline" size={12} color="#0D6B5E" />
              <Text style={styles.profBadgeText}>SUPER ADMIN</Text>
            </View>
            {email ? <Text style={styles.profileContact}>{email}</Text> : null}
          </View>
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <StatBadge
            icon="people-outline"
            value={stats ? String(stats.totalUsers) : '—'}
            label="Utilisateurs"
            loading={loadingStats}
          />
          <View style={styles.statDivider} />
          <StatBadge
            icon="book-outline"
            value={stats ? String(stats.totalCours) : '—'}
            label="Cours"
            loading={loadingStats}
          />
          <View style={styles.statDivider} />
          <StatBadge
            icon="cash-outline"
            value={stats ? `${stats.revenusMois} €` : '—'}
            label="Revenus/mois"
            loading={loadingStats}
          />
        </View>

        {/* ── Gestion ── */}
        <Text style={styles.sectionLabel}>Gestion</Text>
        <View style={styles.menuCard}>
          <MenuRow
            icon="people-outline"
            label="Utilisateurs"
            value={stats ? `${stats.totalUsers} inscrits` : undefined}
            onPress={() => navigation.navigate('SuperAdminUsers')}
          />
          <View style={styles.separator} />
          <MenuRow
            icon="bar-chart-outline"
            label="Statistiques globales"
            onPress={() => setShowStatsModal(true)}
          />
          <View style={styles.separator} />
          <MenuRow
            icon="cash-outline"
            label="Paiements & Revenus"
            onPress={() => navigation.navigate('SuperAdminPayments')}
          />
          <View style={styles.separator} />
          <MenuRow
            icon="flag-outline"
            label="Signalements"
            onPress={() => navigation.navigate('SuperAdminReports')}
          />
        </View>

        {/* ── Compte ── */}
        <Text style={styles.sectionLabel}>Compte</Text>
        <View style={styles.menuCard}>
          <MenuRow
            icon="person-outline"
            label="Informations du compte"
            onPress={() => setShowAccountModal(true)}
          />
          <View style={styles.separator} />
          <MenuRow
            icon="finger-print-outline"
            label="Connexion par empreinte"
            value={biometricEnabled ? 'Active' : 'Inactive'}
            onPress={handleToggleBiometric}
          />
          <View style={styles.separator} />
          <MenuRow
            icon="key-outline"
            label="Changer le mot de passe"
            onPress={() => {
              setShowPasswordModal(true);
              setPwdError('');
              setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
            }}
          />
          <View style={styles.separator} />
          <MenuRow
            icon="notifications-outline"
            label="Paramètres de notifications"
            onPress={() => setShowNotifModal(true)}
          />
          <View style={styles.separator} />
          <MenuRow
            icon="settings-outline"
            label="Paramètres de l'application"
            onPress={() => navigation.navigate('SuperAdminSettings')}
          />
        </View>

        {/* ── Déconnexion ── */}
        <View style={[styles.menuCard, { marginTop: 12 }]}>
          <MenuRow icon="log-out-outline" label="Déconnexion" onPress={handleLogout} danger />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ════ MODAL : Informations du compte ════ */}
      <InfoModal
        visible={showAccountModal}
        title="Informations du compte"
        onClose={() => setShowAccountModal(false)}
      >
        <View style={styles.modalBody}>
          {([
            { label: 'Prénom', value: prenom || '—' },
            { label: 'Nom',    value: nom    || '—' },
            { label: 'Email',  value: email  || '—' },
            { label: 'Rôle',   value: 'Super Admin' },
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
          <Text style={styles.modalBtnText}>Fermer</Text>
        </TouchableOpacity>
      </InfoModal>

      {/* ════ MODAL : Statistiques globales ════ */}
      <InfoModal
        visible={showStatsModal}
        title="Statistiques globales"
        onClose={() => setShowStatsModal(false)}
      >
        <View style={styles.modalBody}>
          {loadingStats ? (
            <ActivityIndicator size="large" color="#0D6B5E" style={{ marginVertical: 20 }} />
          ) : stats === null ? (
            <Text style={styles.emptyText}>Statistiques non disponibles pour le moment.</Text>
          ) : (
            ([
              { icon: 'school-outline',       label: 'Étudiants',       value: String(stats.totalEtudiants) },
              { icon: 'person-outline',        label: 'Professeurs',     value: String(stats.totalProfesseurs) },
              { icon: 'book-outline',          label: 'Cours publiés',   value: String(stats.totalCours) },
              { icon: 'document-text-outline', label: 'Questions SAT',   value: String(stats.totalQuestionsSAT) },
              { icon: 'videocam-outline',      label: 'Meetings',        value: String(stats.totalMeetings) },
              { icon: 'cash-outline',          label: 'Revenus ce mois', value: `${stats.revenusMois} €` },
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
          <Text style={styles.modalBtnText}>Fermer</Text>
        </TouchableOpacity>
      </InfoModal>

      {/* ════ MODAL : Paramètres de notifications ════ */}
      <InfoModal
        visible={showNotifModal}
        title="Paramètres de notifications"
        onClose={() => setShowNotifModal(false)}
      >
        <View style={styles.modalBody}>
          {([
            { key: 'newUser' as keyof NotifPrefs,      icon: 'person-add-outline', label: 'Nouveaux utilisateurs', desc: "Notifié quand un nouvel utilisateur s'inscrit" },
            { key: 'newReport' as keyof NotifPrefs,    icon: 'flag-outline',       label: 'Nouveaux signalements', desc: 'Notifié quand un contenu est signalé' },
            { key: 'newPayment' as keyof NotifPrefs,   icon: 'cash-outline',       label: 'Nouveaux paiements',    desc: 'Notifié à chaque transaction réussie' },
            { key: 'systemAlerts' as keyof NotifPrefs, icon: 'warning-outline',    label: 'Alertes système',       desc: 'Erreurs serveur et alertes critiques' },
          ]).map((item, i, arr) => (
            <React.Fragment key={item.key}>
              <View style={styles.notifRow}>
                <View style={styles.notifRowLeft}>
                  <View style={styles.notifIconBox}>
                    <Ionicons name={item.icon as any} size={18} color="#0D6B5E" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifLabel}>{item.label}</Text>
                    <Text style={styles.notifDesc}>{item.desc}</Text>
                  </View>
                </View>
                <Switch
                  value={notifPrefs[item.key]}
                  onValueChange={(v) => saveNotifPref(item.key, v)}
                  trackColor={{ false: '#E0E0E0', true: '#0D6B5E40' }}
                  thumbColor={notifPrefs[item.key] ? '#0D6B5E' : '#AAA'}
                />
              </View>
              {i < arr.length - 1 && <View style={styles.infoRowDivider} />}
            </React.Fragment>
          ))}
        </View>
        <TouchableOpacity style={styles.modalBtn} onPress={() => setShowNotifModal(false)}>
          <Text style={styles.modalBtnText}>Enregistrer</Text>
        </TouchableOpacity>
      </InfoModal>

      {/* ════ MODAL : Activer l'empreinte ════ */}
      <InfoModal
        visible={showBioModal}
        title="Activer la connexion par empreinte"
        onClose={() => setShowBioModal(false)}
      >
        <View style={styles.modalBody}>
          <Text style={[styles.infoLabel, { marginBottom: 12, lineHeight: 20 }]}>
            Entrez votre mot de passe pour confirmer votre identité avant d'activer la connexion par empreinte.
          </Text>
          {pwdBioError ? <Text style={styles.pwdError}>{pwdBioError}</Text> : null}
          <Text style={styles.inputLabel}>Mot de passe</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#CCC"
            value={pwdForBio}
            onChangeText={setPwdForBio}
            autoFocus
          />
        </View>
        <TouchableOpacity style={styles.modalBtn} onPress={handleEnableBiometric}>
          <Text style={styles.modalBtnText}>Confirmer et activer l'empreinte</Text>
        </TouchableOpacity>
      </InfoModal>

      {/* ════ MODAL : Changer le mot de passe ════ */}
      <InfoModal
        visible={showPasswordModal}
        title="Changer le mot de passe"
        onClose={() => { setShowPasswordModal(false); setPwdError(''); }}
      >
        <View style={styles.modalBody}>
          {pwdError ? <Text style={styles.pwdError}>{pwdError}</Text> : null}
          {([
            { label: 'Mot de passe actuel',               val: currentPwd, set: setCurrentPwd },
            { label: 'Nouveau mot de passe',              val: newPwd,     set: setNewPwd },
            { label: 'Confirmer le nouveau mot de passe', val: confirmPwd, set: setConfirmPwd },
          ] as { label: string; val: string; set: (v: string) => void }[]).map((f) => (
            <React.Fragment key={f.label}>
              <Text style={styles.inputLabel}>{f.label}</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor="#CCC"
                value={f.val}
                onChangeText={f.set}
              />
            </React.Fragment>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.modalBtn, pwdLoading && { opacity: 0.7 }]}
          onPress={handleChangePassword}
          disabled={pwdLoading}
        >
          {pwdLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.modalBtnText}>Mettre à jour</Text>
          }
        </TouchableOpacity>
      </InfoModal>
    </SafeAreaView>
  );
}

// ─── Styles (identiques à StudentProfilScreen) ────────────────────────────
const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#FFFFFF' },
  scroll:    { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 20 },
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 25, paddingTop: 60, paddingBottom: 12,
  },
  topbarTitle: { fontSize: 25, fontWeight: '800', color: '#0D6B5E' },
  profileCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  avatarPlaceholder: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#0D6B5E22', justifyContent: 'center', alignItems: 'center',
  },
  avatarInitials: { fontSize: 26, fontWeight: '800', color: '#0D6B5E' },
  profileInfo:    { flex: 1 },
  profileName:    { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 },
  profBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    borderWidth: 1.5, borderColor: '#0D6B5E', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8,
  },
  profBadgeText:  { fontSize: 10, fontWeight: '800', color: '#0D6B5E', letterSpacing: 0.5 },
  profileContact: { fontSize: 13, color: '#666', marginTop: 2 },
  statsRow: {
    backgroundColor: '#fff', borderRadius: 16, flexDirection: 'row',
    alignItems: 'center', marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statBadge:   { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: '#F0F0F0' },
  statValue:   { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  statLabel:   { fontSize: 11, color: '#888', textAlign: 'center' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 8, marginLeft: 4 },
  menuCard: {
    backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 16,
  },
  menuRowLeft:     { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  menuLabel:       { fontSize: 15, color: '#1A1A1A', fontWeight: '400' },
  menuLabelDanger: { color: '#E53935', fontWeight: '500' },
  menuRowRight:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuValue:       { fontSize: 13, color: '#AAA' },
  separator:       { height: 1, backgroundColor: '#F0F0F0', marginLeft: 32 },
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:    { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  modalTitle:    { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  modalCloseBtn: { padding: 4 },
  modalBody:     { paddingHorizontal: 20, paddingVertical: 16 },
  modalBtn: {
    backgroundColor: '#0D6B5E', marginHorizontal: 20, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 8,
  },
  modalBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  infoRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  infoRowDivider: { height: 1, backgroundColor: '#F0F0F0' },
  infoLabel:      { fontSize: 14, color: '#888' },
  infoValue:      { fontSize: 14, fontWeight: '600', color: '#1A1A1A', flexShrink: 1, textAlign: 'right' },
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center', paddingVertical: 16, lineHeight: 22 },
  statModalRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  statModalLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statModalValue: { fontSize: 15, fontWeight: '700', color: '#0D6B5E' },
  notifRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 12,
  },
  notifRowLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 },
  notifIconBox:  {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#0D6B5E12', alignItems: 'center', justifyContent: 'center',
  },
  notifLabel:    { fontSize: 14, color: '#1A1A1A', fontWeight: '500' },
  notifDesc:     { fontSize: 12, color: '#AAA', marginTop: 2 },
  pwdError:   { color: '#E53935', fontSize: 13, marginBottom: 10, fontWeight: '500' },
  inputLabel: { fontSize: 13, color: '#555', fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#1A1A1A', marginBottom: 14, backgroundColor: '#FAFAFA',
  },
});