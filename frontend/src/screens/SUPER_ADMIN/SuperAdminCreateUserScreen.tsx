// screens/SUPER_ADMIN/SuperAdminCreateUserScreen.tsx
// Création d'un nouvel utilisateur (Étudiant, Professeur, Ancien étudiant, Admin)
// Backend : POST /api/v1/users/create-user (voir spec : extension des rôles autorisés)

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, Alert, ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/auth.service';

const COLORS = {
  primary: '#0D6B5E', primaryLight: '#E1F5EE',
  gold: '#D4A017', goldLight: '#FFF8E7',
  white: '#FFFFFF', background: '#F5F5F0',
  textPrimary: '#1A1A1A', textSecondary: '#6B6B6B', textMuted: '#9E9E9E',
  border: '#E8E8E8', success: '#4CAF50', danger: '#E24B4A',
};

type UserType = 'STUDENT' | 'PROFESSOR' | 'COLLEGE_STUDENT' | 'ADMIN';

interface NavigationProp {
  navigate: (screen: string, params?: Record<string, any>) => void;
  goBack?: () => void;
}
interface Props { navigation: NavigationProp; }

const USER_TYPES: { key: UserType; label: string; icon: string }[] = [
  { key: 'STUDENT', label: 'Étudiant', icon: 'school-outline' },
  { key: 'PROFESSOR', label: 'Professeur', icon: 'person-outline' },
  { key: 'COLLEGE_STUDENT', label: 'Ancien étudiant', icon: 'people-outline' },
  { key: 'ADMIN', label: 'Admin', icon: 'shield-checkmark-outline' },
];

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
  let result = '';
  for (let i = 0; i < 10; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

export default function SuperAdminCreateUserScreen({ navigation }: Props) {
  const [userType, setUserType] = useState<UserType>('STUDENT');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [tempPassword, setTempPassword] = useState(generateTempPassword());
  const [showPassword, setShowPassword] = useState(false);
  const [sendByEmail, setSendByEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isValid = nom.trim() && prenom.trim() && email.trim().includes('@');

  const handleRegenerate = () => setTempPassword(generateTempPassword());

  const handleSubmit = async () => {
    if (!isValid) {
      Alert.alert('Champs manquants', 'Merci de remplir le nom, prénom et un email valide.');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/users/create-user', {
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.trim().toLowerCase(),
        password: tempPassword,
        role: userType,
        telephone: telephone.trim() || undefined,
        sendCredentialsByEmail: sendByEmail,
      });
      Alert.alert('Succès', `Compte ${USER_TYPES.find((t) => t.key === userType)?.label} créé avec succès !`, [
        { text: 'OK', onPress: () => navigation.navigate('SuperAdminUsers') },
      ]);
    } catch (err: any) {
      const message = err?.response?.data?.message ?? 'Une erreur est survenue';
      Alert.alert('Erreur', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack?.()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Nouvel utilisateur</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Type d'utilisateur */}
        <Text style={styles.label}>Type d'utilisateur</Text>
        <View style={styles.typeGrid}>
          {USER_TYPES.map((t) => {
            const active = userType === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.typeCard, active && styles.typeCardActive]}
                onPress={() => setUserType(t.key)}
                activeOpacity={0.85}
              >
                <Ionicons name={t.icon as any} size={22} color={active ? COLORS.white : COLORS.primary} />
                <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Informations personnelles */}
        <Text style={styles.sectionTitle}>Informations personnelles</Text>

        <Text style={styles.fieldLabel}>Nom complet</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            placeholder="Prénom"
            placeholderTextColor={COLORS.textMuted}
            value={prenom}
            onChangeText={setPrenom}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Nom"
            placeholderTextColor={COLORS.textMuted}
            value={nom}
            onChangeText={setNom}
          />
        </View>

        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="email@exemple.com"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.fieldLabel}>Téléphone (optionnel)</Text>
        <TextInput
          style={styles.input}
          placeholder="06 12 34 56 78"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="phone-pad"
          value={telephone}
          onChangeText={setTelephone}
        />

        {/* Informations de connexion */}
        <Text style={styles.sectionTitle}>Informations de connexion</Text>
        <Text style={styles.fieldLabel}>Mot de passe temporaire</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={tempPassword}
            onChangeText={setTempPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRegenerate} style={styles.regenBtn}>
            <Ionicons name="refresh-outline" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Envoyer les identifiants par email</Text>
          <Switch
            value={sendByEmail}
            onValueChange={setSendByEmail}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={sendByEmail ? COLORS.primary : '#fff'}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, (!isValid || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitBtnText}>Créer l'utilisateur</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
  },
  topBarTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },

  label: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 10, marginTop: 8 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  typeCard: {
    width: '47%', backgroundColor: COLORS.white, borderRadius: 14,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingVertical: 16, alignItems: 'center', gap: 6,
  },
  typeCardActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  typeLabelActive: { color: COLORS.white },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12, marginTop: 8 },
  fieldLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6, marginTop: 12 },
  row: { flexDirection: 'row' },
  input: {
    backgroundColor: COLORS.background, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: COLORS.textPrimary,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 8 },
  regenBtn: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },

  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 18, marginBottom: 8,
  },
  switchLabel: { fontSize: 13, color: COLORS.textPrimary, flex: 1, marginRight: 12 },

  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
});