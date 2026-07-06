// ─────────────────────────────────────────────────────────────────────────────
// Ce composant s'intègre dans StudentMeetingScreen (ou StudentMentorsScreen)
// Il affiche le bouton "Rejoindre" quand statut === CONFIRMED et meetLink existe
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY      = '#0D6B5E';
const PRIMARY_DARK = '#0A5449';
const CARD         = '#FFFFFF';
const TEXT         = '#111827';
const TEXT_MUTED   = '#6B7280';
const BORDER       = '#E5E7EB';
const SUCCESS      = '#10B981';

interface Consultation {
  id: string;
  date: string;
  heure: string;
  duree: string;
  statut: string;
  isPaid: boolean;
  meetLink?: string;
  notes?: string;
  CollegeStudent?: {
    nom: string; prenom: string; photo?: string;
    universite?: string; domaine?: string;
  };
}

interface Props {
  consultation: Consultation;
  lang?: 'fr' | 'en';
}

export function MeetingJoinButton({ consultation, lang = 'fr' }: Props) {
  const canJoin = consultation.statut === 'CONFIRMED'
    && consultation.isPaid
    && !!consultation.meetLink;

  const joinMeeting = async () => {
    if (!consultation.meetLink) return;
    const canOpen = await Linking.canOpenURL(consultation.meetLink);
    if (canOpen) {
      Linking.openURL(consultation.meetLink);
    } else {
      Alert.alert(
        lang === 'fr' ? 'Erreur' : 'Error',
        lang === 'fr' ? 'Impossible d\'ouvrir le lien.' : 'Unable to open the link.'
      );
    }
  };

  if (!canJoin) return null;

  return (
    <TouchableOpacity style={styles.joinBtn} onPress={joinMeeting} activeOpacity={0.85}>
      <Ionicons name="videocam" size={20} color={CARD} style={{ marginRight: 8 }} />
      <Text style={styles.joinBtnText}>
        {lang === 'fr' ? 'Rejoindre le meeting' : 'Join the meeting'}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Card complète pour afficher une consultation confirmée côté student ──────
export function StudentConfirmedConsultationCard({
  consultation, lang = 'fr',
}: {
  consultation: Consultation; lang?: 'fr' | 'en';
}) {
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: 'long', day: '2-digit', month: 'long',
    });

  const mentor = consultation.CollegeStudent;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.statusBadge}>
          <Ionicons name="checkmark-circle" size={14} color={SUCCESS} />
          <Text style={styles.statusText}>
            {lang === 'fr' ? 'Confirmé' : 'Confirmed'}
          </Text>
        </View>
        <Text style={styles.cardDate}>{formatDate(consultation.date)}</Text>
      </View>

      {/* Mentor info */}
      {mentor && (
        <View style={styles.mentorRow}>
          <View style={styles.mentorAvatar}>
            <Text style={styles.mentorAvatarText}>
              {`${mentor.prenom[0]}${mentor.nom[0]}`.toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.mentorName}>{mentor.prenom} {mentor.nom}</Text>
            <Text style={styles.mentorSub}>{mentor.domaine} · {mentor.universite}</Text>
          </View>
        </View>
      )}

      {/* Détails */}
      <View style={styles.detailsRow}>
        <View style={styles.chip}>
          <Ionicons name="time-outline" size={14} color={PRIMARY} />
          <Text style={styles.chipText}>{consultation.heure?.slice(0, 5)}</Text>
        </View>
        <View style={styles.chip}>
          <Ionicons name="hourglass-outline" size={14} color={PRIMARY} />
          <Text style={styles.chipText}>{consultation.duree}</Text>
        </View>
        {consultation.isPaid && (
          <View style={[styles.chip, { backgroundColor: '#ECFDF5', borderColor: '#86efac' }]}>
            <Ionicons name="checkmark-done" size={14} color={SUCCESS} />
            <Text style={[styles.chipText, { color: SUCCESS }]}>
              {lang === 'fr' ? 'Payé' : 'Paid'}
            </Text>
          </View>
        )}
      </View>

      {/* Notes */}
      {consultation.notes && (
        <Text style={styles.notes} numberOfLines={2}>{consultation.notes}</Text>
      )}

      {/* Bouton rejoindre */}
      <MeetingJoinButton consultation={consultation} lang={lang} />

      {/* Message si pas encore de lien */}
      {consultation.statut === 'CONFIRMED' && !consultation.meetLink && (
        <View style={styles.waitingRow}>
          <Ionicons name="time-outline" size={16} color={TEXT_MUTED} />
          <Text style={styles.waitingText}>
            {lang === 'fr'
              ? 'Lien en cours de génération...'
              : 'Meeting link being generated...'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Join Button ──
  joinBtn: {
    backgroundColor: PRIMARY_DARK,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  joinBtnText: { color: CARD, fontSize: 15, fontWeight: '700' },

  // ── Card ──
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ECFDF5', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  statusText:  { color: SUCCESS, fontSize: 12, fontWeight: '700' },
  cardDate:    { fontSize: 12, color: TEXT_MUTED, fontWeight: '500' },

  mentorRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  mentorAvatar:    { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E6F3F1', alignItems: 'center', justifyContent: 'center' },
  mentorAvatarText:{ color: PRIMARY, fontSize: 16, fontWeight: '700' },
  mentorName:      { fontSize: 15, fontWeight: '700', color: TEXT },
  mentorSub:       { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },

  detailsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  chip:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E6F3F1', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#0D6B5E30' },
  chipText:   { fontSize: 12, color: PRIMARY, fontWeight: '600' },

  notes:      { fontSize: 13, color: TEXT_MUTED, marginBottom: 8, lineHeight: 19 },

  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 12, backgroundColor: '#F8F9FA', borderRadius: 10 },
  waitingText:{ fontSize: 13, color: TEXT_MUTED, fontStyle: 'italic' },
});