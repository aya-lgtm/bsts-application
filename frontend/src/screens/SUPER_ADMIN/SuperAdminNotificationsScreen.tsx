// screens/SUPER_ADMIN/SuperAdminNotificationsScreen.tsx
// Envoi de notifications en masse (push/email/SMS) à un groupe d'utilisateurs
// Backend : POST /api/v1/admin/notifications/broadcast (À CRÉER — voir spec backend)

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

type Target = 'ALL' | 'STUDENT' | 'PROFESSOR' | 'COLLEGE_STUDENT' | 'ADMIN';
type Channel = 'PUSH' | 'EMAIL' | 'SMS';

interface NavigationProp {
  navigate: (screen: string, params?: Record<string, any>) => void;
}
interface Props { navigation: NavigationProp; }

const TARGETS: { key: Target; label: string }[] = [
  { key: 'ALL', label: 'Tous les utilisateurs' },
  { key: 'STUDENT', label: 'Étudiants' },
  { key: 'PROFESSOR', label: 'Professeurs' },
  { key: 'COLLEGE_STUDENT', label: 'Anciens étudiants' },
  { key: 'ADMIN', label: 'Administrateurs' },
];

const CHANNELS: { key: Channel; label: string; icon: string }[] = [
  { key: 'PUSH', label: 'Push', icon: 'notifications-outline' },
  { key: 'EMAIL', label: 'Email', icon: 'mail-outline' },
  { key: 'SMS', label: 'SMS', icon: 'chatbox-outline' },
];

const RadioRow = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
  <TouchableOpacity style={styles.radioRow} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.radioCircle, selected && styles.radioCircleActive]}>
      {selected && <View style={styles.radioDot} />}
    </View>
    <Text style={styles.radioLabel}>{label}</Text>
  </TouchableOpacity>
);

export default function SuperAdminNotificationsScreen({ navigation }: Props) {
  const [target, setTarget] = useState<Target>('ALL');
  const [channel, setChannel] = useState<Channel>('PUSH');
  const [message, setMessage] = useState('');
  const [scheduled, setScheduled] = useState(false);
  const [sending, setSending] = useState(false);

  const isValid = message.trim().length > 0;

  const handleSend = async () => {
    if (!isValid) {
      Alert.alert('Message vide', 'Merci de rédiger un message avant d\'envoyer.');
      return;
    }
    try {
      setSending(true);
      await api.post('/admin/notifications/broadcast', {
        target,
        title: 'Notification BSTS',
        message: message.trim(),
        channel,
        scheduledAt: scheduled ? new Date(Date.now() + 3600_000).toISOString() : undefined,
      });
      Alert.alert('Envoyé', 'La notification a été envoyée avec succès !', [
        { text: 'OK', onPress: () => setMessage('') },
      ]);
    } catch (err: any) {
      const m = err?.response?.data?.message ?? 'Impossible d\'envoyer la notification';
      Alert.alert('Erreur', m);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Notifications</Text>
      </View>

      <View style={styles.tabRow}>
        <View style={[styles.tabBtn, styles.tabBtnActive]}>
          <Text style={styles.tabTextActive}>Envoyer</Text>
        </View>
        <TouchableOpacity style={styles.tabBtn}>
          <Text style={styles.tabText}>Historique</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Destinataires</Text>
        <View style={styles.card}>
          {TARGETS.map((t, i) => (
            <View key={t.key}>
              <RadioRow label={t.label} selected={target === t.key} onPress={() => setTarget(t.key)} />
              {i < TARGETS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Message</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Écrivez votre message..."
          placeholderTextColor={COLORS.textMuted}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        <Text style={styles.sectionTitle}>Type de notification</Text>
        <View style={styles.channelRow}>
          {CHANNELS.map((c) => {
            const active = channel === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                style={[styles.channelChip, active && styles.channelChipActive]}
                onPress={() => setChannel(c.key)}
                activeOpacity={0.85}
              >
                <Ionicons name={c.icon as any} size={16} color={active ? COLORS.white : COLORS.primary} />
                <Text style={[styles.channelText, active && styles.channelTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Programmer l'envoi</Text>
          <Switch
            value={scheduled}
            onValueChange={setScheduled}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={scheduled ? COLORS.primary : '#fff'}
          />
        </View>

        <TouchableOpacity
          style={[styles.sendBtn, (!isValid || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!isValid || sending}
          activeOpacity={0.85}
        >
          {sending ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.sendBtnText}>Envoyer maintenant</Text>}
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

  topBar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  topBarTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.3 },

  tabRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    backgroundColor: COLORS.background, alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { fontSize: 13, fontWeight: '700', color: COLORS.white },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10, marginTop: 8 },

  card: {
    backgroundColor: COLORS.white, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 8,
  },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  radioCircle: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioCircleActive: { borderColor: COLORS.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  radioLabel: { fontSize: 13, color: COLORS.textPrimary },
  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 14 },

  textArea: {
    backgroundColor: COLORS.background, borderRadius: 14,
    padding: 14, fontSize: 14, color: COLORS.textPrimary,
    minHeight: 110, marginBottom: 8,
  },

  channelRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  channelChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12,
    backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border,
  },
  channelChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  channelText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  channelTextActive: { color: COLORS.white },

  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 16, marginBottom: 8,
  },
  switchLabel: { fontSize: 13, color: COLORS.textPrimary },

  sendBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginTop: 20,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
});