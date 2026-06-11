import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Image,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { loginUser, changePasswordAPI } from '../../services/auth.service'
import FAQScreen from './FAQScreen'
import TermsScreen from './TermsScreen'
import ChildrenModal from './ChildrenModal';

// ─── Types ────────────────────────────────────────────────────────────────
interface UserData {
  nom?: string;
  prenom?: string;
  firstName?: string;  first_name?: string;
  lastName?: string;   last_name?: string;
  email?: string;
  phone?: string;      phone_number?: string;
  role?: string;
  isPremium?: boolean; is_premium?: boolean;
  childrenCount?: number; children_count?: number;
  profilePicture?: string; profile_picture?: string;
}

// ─── Reusable Modal ───────────────────────────────────────────────────────
function InfoModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
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

// ─── Main Screen ──────────────────────────────────────────────────────────
export default function ParentProfilScreen({
  navigation,
  onLogout,
}: {
  navigation?: any;
  onLogout?: () => void;
}) {
  const [user, setUser]       = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal visibility
  const [showAccountModal,  setShowAccountModal]  = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSupportModal,  setShowSupportModal]  = useState(false);
  const [showChildrenModal, setShowChildrenModal] = useState(false);
  const [showFAQ,           setShowFAQ]           = useState(false);
  const [showTerms,         setShowTerms]         = useState(false);

  // Password form state
  const [currentPwd,  setCurrentPwd]  = useState('');
  const [newPwd,      setNewPwd]      = useState('');
  const [confirmPwd,  setConfirmPwd]  = useState('');
  const [pwdError,    setPwdError]    = useState('');
  const [pwdLoading,  setPwdLoading]  = useState(false);

  // Biometric state
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled,   setBiometricEnabled]   = useState(false);

  // Biometric modal state
  const [pwdForBio,    setPwdForBio]    = useState('');
  const [pwdBioError,  setPwdBioError]  = useState('');
  const [showBioModal, setShowBioModal] = useState(false);

  useEffect(() => {
    loadUser();
    checkBiometric();
  }, []);

  const loadUser = async () => {
    try {
      const userStr = await SecureStore.getItemAsync('user');
      if (userStr) setUser(JSON.parse(userStr));
    } catch (e) {
      console.error('Error loading user:', e);
    } finally {
      setLoading(false);
    }
  };

  const checkBiometric = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled   = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(compatible && enrolled);
    const saved = await SecureStore.getItemAsync('biometric_enabled');
    setBiometricEnabled(saved === 'true');
  };

  // ── Normalize fields ──────────────────────────────────────────────────
  const firstName  = user?.prenom ?? user?.firstName ?? user?.first_name ?? '';
  const lastName   = user?.nom    ?? user?.lastName  ?? user?.last_name  ?? '';
  const email      = user?.email      ?? '';
  const phone      = user?.phone      ?? user?.phone_number ?? '';
  const isPremium  = user?.isPremium  ?? user?.is_premium  ?? false;
  const childCount = user?.childrenCount ?? user?.children_count ?? 0;
  const avatar     = user?.profilePicture ?? user?.profile_picture ?? null;
  const fullName   = [firstName, lastName].filter(Boolean).join(' ') || 'Parent';
  const initials   = [firstName[0], lastName[0]].filter(Boolean).join('').toUpperCase() || 'P';

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          try {
            await SecureStore.deleteItemAsync('accessToken');
          } catch (_) {}
          onLogout?.();
        },
      },
    ]);
  };

  const handleToggleBiometric = async () => {
    if (!biometricAvailable) {
      Alert.alert('Not Available', 'Fingerprint authentication is not set up on this device.');
      return;
    }
    if (biometricEnabled) {
      Alert.alert('Disable Fingerprint', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable', style: 'destructive',
          onPress: async () => {
            await SecureStore.setItemAsync('biometric_enabled', 'false');
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
    if (!pwdForBio) {
      setPwdBioError('Please enter your password');
      return;
    }
    try {
      await loginUser(email, pwdForBio);
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Scan your fingerprint to enable it',
        disableDeviceFallback: true,
        cancelLabel: 'Cancel',
      });
      if (result.success) {
        await SecureStore.setItemAsync('biometric_enabled', 'true');
        setBiometricEnabled(true);
        setShowBioModal(false);
        Alert.alert('✅ Enabled', 'Fingerprint login is now active.');
      } else {
        setPwdBioError('Fingerprint not recognized. Please try again.');
      }
    } catch (e: any) {
      setPwdBioError(e?.response?.data?.message || 'Incorrect password');
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
      Alert.alert('✅ Mot de passe modifié', 'Votre mot de passe a été mis à jour avec succès.');
      setShowPasswordModal(false);
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e: any) {
      setPwdError(e?.response?.data?.message || 'Mot de passe actuel incorrect.');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleWhatsApp = () => {
    setShowSupportModal(false);
    Linking.openURL('https://wa.me/212708060466').catch(() =>
      Alert.alert('Erreur', "WhatsApp n'est pas installé sur cet appareil.")
    );
  };

  const handleFAQ = () => {
    setShowSupportModal(false);
    setShowFAQ(true);
  };

  const handleTerms = () => {
    setShowSupportModal(false);
    setShowTerms(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0D6B5E" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.topbar}>
        <View style={{ width: 32 }} />
        <Text style={styles.topbarTitle}>Profile</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Profile Card ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            {avatar
              ? <Image source={{ uri: avatar }} style={styles.avatarImg} />
              : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )
            }
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{fullName}</Text>
              {isPremium && <Text style={styles.crownEmoji}>👑</Text>}
            </View>
            {isPremium && (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumText}>PREMIUM PARENT</Text>
              </View>
            )}
            {email ? <Text style={styles.profileContact}>{email}</Text> : null}
            {phone ? <Text style={styles.profileContact}>{phone}</Text> : null}
          </View>
        </View>

        {/* ── Account Section ── */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.menuCard}>
          <MenuRow
            icon="person-outline"
            label="Account Information"
            onPress={() => setShowAccountModal(true)}
          />
          <View style={styles.separator} />
          <MenuRow
            icon="finger-print-outline"
            label="Fingerprint Login"
            value={biometricEnabled ? 'Active' : 'Inactive'}
            onPress={handleToggleBiometric}
          />
          <View style={styles.separator} />
          <MenuRow
            icon="people-outline"
            label="Multi-child Management"
            value={childCount > 0 ? `${childCount} child${childCount > 1 ? 'ren' : ''} linked` : 'No children'}
            onPress={() => setShowChildrenModal(true)}
          />
          <View style={styles.separator} />
          <MenuRow
            icon="key-outline"
            label="Change Password"
            onPress={() => {
              setShowPasswordModal(true);
              setPwdError('');
              setCurrentPwd('');
              setNewPwd('');
              setConfirmPwd('');
            }}
          />
          <View style={styles.separator} />
          <MenuRow
            icon="headset-outline"
            label="Help & Support"
            onPress={() => setShowSupportModal(true)}
          />
        </View>

        {/* ── Sign Out ── */}
        <View style={[styles.menuCard, { marginTop: 12 }]}>
          <MenuRow icon="log-out-outline" label="Sign Out" onPress={handleLogout} danger />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ════ MODAL: Account Information ════ */}
      <InfoModal visible={showAccountModal} title="Account Information" onClose={() => setShowAccountModal(false)}>
        <View style={styles.modalBody}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>First Name</Text>
            <Text style={styles.infoValue}>{firstName || '—'}</Text>
          </View>
          <View style={styles.infoRowDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Name</Text>
            <Text style={styles.infoValue}>{lastName || '—'}</Text>
          </View>
          <View style={styles.infoRowDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{email || '—'}</Text>
          </View>
          <View style={styles.infoRowDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{phone || '—'}</Text>
          </View>
          <View style={styles.infoRowDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoValue}>{user?.role ?? 'PARENT'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.modalBtn} onPress={() => setShowAccountModal(false)}>
          <Text style={styles.modalBtnText}>Close</Text>
        </TouchableOpacity>
      </InfoModal>

      {/* ════ MODAL: Change Password ════ */}
      <InfoModal
        visible={showPasswordModal}
        title="Change Password"
        onClose={() => { setShowPasswordModal(false); setPwdError(''); }}
      >
        <View style={styles.modalBody}>
          {pwdError ? <Text style={styles.pwdError}>{pwdError}</Text> : null}
          <Text style={styles.inputLabel}>Mot de passe actuel</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#CCC"
            value={currentPwd}
            onChangeText={setCurrentPwd}
          />
          <Text style={styles.inputLabel}>Nouveau mot de passe</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#CCC"
            value={newPwd}
            onChangeText={setNewPwd}
          />
          <Text style={styles.inputLabel}>Confirmer le nouveau mot de passe</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#CCC"
            value={confirmPwd}
            onChangeText={setConfirmPwd}
          />
        </View>
        <TouchableOpacity
          style={[styles.modalBtn, pwdLoading && { opacity: 0.7 }]}
          onPress={handleChangePassword}
          disabled={pwdLoading}
        >
          {pwdLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.modalBtnText}>Mettre à jour le mot de passe</Text>
          }
        </TouchableOpacity>
      </InfoModal>

      {/* ════ MODAL: Multi-child Management ════ */}
      {/* ✅ Remplacé par le composant dédié — plus d'InfoModal ici */}
      <ChildrenModal
        visible={showChildrenModal}
        onClose={() => setShowChildrenModal(false)}
      />

      {/* ════ MODAL: Help & Support ════ */}
      <InfoModal visible={showSupportModal} title="Help & Support" onClose={() => setShowSupportModal(false)}>
        <View style={styles.modalBody}>
          <TouchableOpacity style={styles.supportRow} onPress={handleWhatsApp}>
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            <Text style={styles.supportRowText}>Contacter le support via WhatsApp</Text>
            <Ionicons name="chevron-forward" size={16} color="#CCC" />
          </TouchableOpacity>
          <View style={styles.infoRowDivider} />
          <TouchableOpacity style={styles.supportRow} onPress={handleFAQ}>
            <Ionicons name="help-circle-outline" size={20} color="#0D6B5E" />
            <Text style={styles.supportRowText}>FAQ</Text>
            <Ionicons name="chevron-forward" size={16} color="#CCC" />
          </TouchableOpacity>
          <View style={styles.infoRowDivider} />
          <TouchableOpacity style={styles.supportRow} onPress={handleTerms}>
            <Ionicons name="document-text-outline" size={20} color="#0D6B5E" />
            <Text style={styles.supportRowText}>Conditions d'utilisation</Text>
            <Ionicons name="chevron-forward" size={16} color="#CCC" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#F5F7F6' }]} onPress={() => setShowSupportModal(false)}>
          <Text style={[styles.modalBtnText, { color: '#555' }]}>Fermer</Text>
        </TouchableOpacity>
      </InfoModal>

      {/* ════ MODAL: Enable Fingerprint ════ */}
      <InfoModal
        visible={showBioModal}
        title="Enable Fingerprint"
        onClose={() => setShowBioModal(false)}
      >
        <View style={styles.modalBody}>
          <Text style={[styles.infoLabel, { marginBottom: 12 }]}>
            Enter your password to confirm your identity before enabling fingerprint login.
          </Text>
          {pwdBioError ? <Text style={styles.pwdError}>{pwdBioError}</Text> : null}
          <Text style={styles.inputLabel}>Password</Text>
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
          <Text style={styles.modalBtnText}>Confirm & Enable Fingerprint</Text>
        </TouchableOpacity>
      </InfoModal>

      {/* ════ MODAL: FAQ ════ */}
      <Modal visible={showFAQ} animationType="slide" onRequestClose={() => setShowFAQ(false)}>
        <FAQScreen onBack={() => setShowFAQ(false)} />
      </Modal>

      {/* ════ MODAL: Terms ════ */}
      <Modal visible={showTerms} animationType="slide" onRequestClose={() => setShowTerms(false)}>
        <TermsScreen onBack={() => setShowTerms(false)} />
      </Modal>

    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 20 },

  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    paddingTop: 60,
    paddingBottom: 12,
  },
  topbarTitle: { fontSize: 25, fontWeight: '800', color: '#0D6B5E' },

  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarWrap: {},
  avatarImg: { width: 72, height: 72, borderRadius: 36 },
  avatarPlaceholder: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#0D6B5E22',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitials: { fontSize: 26, fontWeight: '800', color: '#0D6B5E' },
  profileInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  profileName: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  crownEmoji: { fontSize: 18 },
  premiumBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1.5, borderColor: '#D4A017',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8,
  },
  premiumText: { fontSize: 10, fontWeight: '800', color: '#D4A017', letterSpacing: 0.5 },
  profileContact: { fontSize: 13, color: '#666', marginTop: 2 },

  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 8, marginLeft: 4 },

  menuCard: {
    backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 16,
  },
  menuRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  menuLabel: { fontSize: 15, color: '#1A1A1A', fontWeight: '400' },
  menuLabelDanger: { color: '#E53935', fontWeight: '500' },
  menuRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuValue: { fontSize: 13, color: '#AAA' },
  separator: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 32 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  modalCloseBtn: { padding: 4 },
  modalBody: { paddingHorizontal: 20, paddingVertical: 16 },
  modalBtn: {
    backgroundColor: '#0D6B5E',
    marginHorizontal: 20, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 8,
  },
  modalBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  infoRowDivider: { height: 1, backgroundColor: '#F0F0F0' },
  infoLabel: { fontSize: 14, color: '#888' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', flexShrink: 1, textAlign: 'right' },

  pwdError: { color: '#E53935', fontSize: 13, marginBottom: 10, fontWeight: '500' },
  inputLabel: { fontSize: 13, color: '#555', fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#1A1A1A', marginBottom: 14,
    backgroundColor: '#FAFAFA',
  },

  supportRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  supportRowText: { flex: 1, fontSize: 15, color: '#1A1A1A' },

  emptyText: { fontSize: 14, color: '#888', textAlign: 'center', paddingVertical: 16 },
});