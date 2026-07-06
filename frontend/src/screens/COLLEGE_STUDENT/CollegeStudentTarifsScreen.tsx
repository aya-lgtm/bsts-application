import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/auth.service';
import { useLanguage } from './LanguageContext';

const PRIMARY       = '#0D6B5E';
const PRIMARY_DARK  = '#0A5449';
const PRIMARY_LIGHT = '#E6F3F1';
const BG            = '#FFFFFF';
const CARD          = '#FFFFFF';
const TEXT          = '#111827';
const TEXT_MUTED    = '#6B7280';
const BORDER        = '#E5E7EB';

interface Profile {
  prixParHeure?: number;
  prixParDemiHeure?: number;
}

export default function CollegeStudentTarifsScreen({ navigation }: { navigation?: any }) {
  // ✅ Seul ajout
  const { lang } = useLanguage();

  const [profile, setProfile]       = useState<Profile | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/college-students/me');
      setProfile(res.data.student);
    } catch (e: any) {
      console.error('TarifsScreen:', e?.response?.data ?? e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  // ── Traductions ───────────────────────────────────────────────────────────
  const L = {
    headerTitle:  { fr: 'Mes tarifs',                                       en: 'My rates'                                        },
    heroTitle:    { fr: 'Tarifs officiels BSTS',                            en: 'Official BSTS rates'                             },
    heroSub:      { fr: "Les tarifs sont définis par\nl'administrateur de la plateforme.", en: "Rates are defined by\nthe platform administrator." },
    sectionLabel: { fr: 'Tarifs par durée',                                 en: 'Rates by duration'                               },
    min30:        { fr: '30 minutes',                                       en: '30 minutes'                                      },
    min45:        { fr: '45 minutes',                                       en: '45 minutes'                                      },
    min60:        { fr: '60 minutes',                                       en: '60 minutes'                                      },
    min90:        { fr: '90 minutes',                                       en: '90 minutes'                                      },
    popular:      { fr: 'Populaire',                                        en: 'Popular'                                         },
    infoText1:    { fr: "Ces tarifs s'appliquent à tous vos meetings.",     en: 'These rates apply to all your meetings.'         },
    infoText2:    { fr: "L'étudiant choisira la durée lors de sa réservation.", en: 'The student will choose the duration when booking.' },
    dispoBtn:     { fr: 'Voir mes disponibilités',                          en: 'See my availability'                             },
    footerNote:   { fr: "Tarifs définis par l'administrateur BSTS",         en: 'Rates defined by BSTS administrator'             },
  };

  const l = (key: keyof typeof L) => L[key][lang];

  // Calcul des 4 tarifs depuis les 2 valeurs admin
  const prix30 = profile?.prixParDemiHeure ?? null;
  const prix60 = profile?.prixParHeure     ?? null;
  const prix45 = prix60 ? Math.round(prix60 * 0.75) : null;
  const prix90 = prix60 ? Math.round(prix60 * 1.5)  : null;

  const TARIFS: { duree: string; minutes: number; prix: number | null; populaire?: boolean }[] = [
    { duree: l('min30'), minutes: 30, prix: prix30 },
    { duree: l('min45'), minutes: 45, prix: prix45, populaire: true },
    { duree: l('min60'), minutes: 60, prix: prix60 },
    { duree: l('min90'), minutes: 90, prix: prix90 },
  ];

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
          onPress={() => navigation?.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l('headerTitle')}</Text>
        <TouchableOpacity hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="information-circle-outline" size={24} color={TEXT} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
      >

        {/* ── Hero banner ── */}
        <View style={styles.heroBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{l('heroTitle')}</Text>
            <Text style={styles.heroSub}>{l('heroSub')}</Text>
          </View>
          <View style={styles.heroIconWrap}>
            <Ionicons name="pricetag" size={48} color="rgba(255,255,255,.25)" />
          </View>
        </View>

        {/* ── Tarifs par durée ── */}
        <Text style={styles.sectionLabel}>{l('sectionLabel')}</Text>

        <View style={styles.tarifsWrap}>
          {TARIFS.map((t, i) => (
            <View
              key={t.minutes}
              style={[styles.tarifCard, i < TARIFS.length - 1 && { marginBottom: 12 }]}
            >
              <View style={styles.tarifIconWrap}>
                <Ionicons name="time-outline" size={22} color={PRIMARY} />
              </View>

              <View style={styles.tarifMiddle}>
                <Text style={styles.tarifDuree}>{t.duree}</Text>
                {t.populaire && (
                  <View style={styles.populaireBadge}>
                    <Text style={styles.populaireText}>{l('popular')}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.tarifPrix}>
                {t.prix !== null ? `${t.prix} DHS` : '—'}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Note info ── */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconWrap}>
            <Ionicons name="information-circle" size={22} color={PRIMARY} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.infoText}>{l('infoText1')}</Text>
            <Text style={styles.infoText}>{l('infoText2')}</Text>
          </View>
          <Ionicons name="calendar-outline" size={36} color={PRIMARY_LIGHT} style={{ opacity: 0.6 }} />
        </View>

        {/* ── CTA disponibilités ── */}
        <TouchableOpacity
          style={styles.dispoBtn}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.85}
        >
          <Ionicons name="calendar-outline" size={20} color={CARD} style={{ marginRight: 10 }} />
          <Text style={styles.dispoBtnText}>{l('dispoBtn')}</Text>
        </TouchableOpacity>

        {/* ── Footer note ── */}
        <View style={styles.footerNote}>
          <Ionicons name="shield-checkmark-outline" size={14} color={TEXT_MUTED} />
          <Text style={styles.footerNoteText}>{l('footerNote')}</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    backgroundColor: BG,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: TEXT },

  heroBanner: {
    backgroundColor: PRIMARY,
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    overflow: 'hidden',
  },
  heroTitle:   { color: CARD, fontSize: 20, fontWeight: '800', marginBottom: 8 },
  heroSub:     { color: 'rgba(255,255,255,.75)', fontSize: 13, lineHeight: 20 },
  heroIconWrap:{ width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },

  sectionLabel: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 14 },

  tarifsWrap: { marginBottom: 20 },
  tarifCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  tarifIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  tarifMiddle:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  tarifDuree:    { fontSize: 16, fontWeight: '700', color: TEXT },
  populaireBadge:{ backgroundColor: PRIMARY, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  populaireText: { color: CARD, fontSize: 11, fontWeight: '700' },
  tarifPrix:     { fontSize: 18, fontWeight: '800', color: PRIMARY },

  infoCard: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: `${PRIMARY}20`,
  },
  infoIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: CARD,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  infoText: { fontSize: 13, color: PRIMARY, lineHeight: 20 },

  dispoBtn: {
    backgroundColor: PRIMARY_DARK,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dispoBtnText: { color: CARD, fontSize: 16, fontWeight: '700' },

  footerNote: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
  },
  footerNoteText: { color: TEXT_MUTED, fontSize: 12 },
});