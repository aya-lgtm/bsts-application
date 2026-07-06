import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, ActivityIndicator, Alert, Modal, RefreshControl,
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

// Jours en FR et EN
const JOURS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const JOURS_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const ALL_SLOTS: string[] = [];
for (let h = 7; h <= 23; h++) {
  ALL_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 23) ALL_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

interface BackendSlot { jour: string; heures: string[]; }
interface Creneau     { debut: string; fin: string; }
interface JourState   { jourFr: string; actif: boolean; creneaux: Creneau[]; }

// Toujours stocker en FR dans le backend
const backendToUI = (backendDispos: BackendSlot[]): JourState[] =>
  JOURS_FR.map(jourFr => {
    const found = backendDispos.find(d => d.jour === jourFr);
    if (!found || found.heures.length === 0) return { jourFr, actif: false, creneaux: [] };
    const creneaux: Creneau[] = [];
    for (let i = 0; i + 1 < found.heures.length; i += 2)
      creneaux.push({ debut: found.heures[i], fin: found.heures[i + 1] });
    return { jourFr, actif: true, creneaux };
  });

const uiToBackend = (jours: JourState[]): BackendSlot[] =>
  jours
    .filter(j => j.actif && j.creneaux.length > 0)
    .map(j => ({ jour: j.jourFr, heures: j.creneaux.flatMap(c => [c.debut, c.fin]) }));

// ─── SlotPicker ───────────────────────────────────────────────────────────────
const SlotPicker = ({
  visible, title, slots, selected, onSelect, onClose,
}: {
  visible: boolean; title: string; slots: string[];
  selected: string; onSelect: (v: string) => void; onClose: () => void;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={20} color={TEXT} />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
          {slots.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.slotOption, selected === s && styles.slotOptionActive]}
              onPress={() => { onSelect(s); onClose(); }}
            >
              <View style={styles.slotLeft}>
                <Ionicons name="time-outline" size={16} color={selected === s ? PRIMARY : TEXT_MUTED} />
                <Text style={[styles.slotOptionText, selected === s && styles.slotOptionTextActive]}>{s}</Text>
              </View>
              {selected === s && <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function CollegeStudentDisponibilitesScreen({ navigation }: { navigation?: any }) {
  const { t, lang } = useLanguage();

  // Jours affichés selon la langue
  const JOURS_DISPLAY = lang === 'en' ? JOURS_EN : JOURS_FR;

  const [jours, setJours]           = useState<JourState[]>(
    JOURS_FR.map(jourFr => ({ jourFr, actif: false, creneaux: [] }))
  );
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [picker, setPicker] = useState<{
    visible: boolean; jourIdx: number; creneauIdx: number; field: 'debut' | 'fin';
  }>({ visible: false, jourIdx: 0, creneauIdx: 0, field: 'debut' });

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/college-students/me');
      const student = res.data.student;
      if (student.disponibilites?.length > 0)
        setJours(backendToUI(student.disponibilites));
    } catch (e: any) {
      console.error('DisponibilitesScreen:', e?.response?.data ?? e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  const toggleJour = (idx: number, val: boolean) => {
    setJours(prev => prev.map((j, i) => {
      if (i !== idx) return j;
      return {
        ...j, actif: val,
        creneaux: val && j.creneaux.length === 0 ? [{ debut: '09:00', fin: '12:00' }] : j.creneaux,
      };
    }));
  };

  const addCreneau = (jourIdx: number) => {
    setJours(prev => prev.map((j, i) => {
      if (i !== jourIdx) return j;
      const lastFin  = j.creneaux[j.creneaux.length - 1]?.fin ?? '12:00';
      const lastFinH = parseInt(lastFin.split(':')[0]);
      return {
        ...j,
        creneaux: [...j.creneaux, {
          debut: `${String(Math.min(lastFinH + 1, 22)).padStart(2, '0')}:00`,
          fin:   `${String(Math.min(lastFinH + 3, 23)).padStart(2, '0')}:00`,
        }],
      };
    }));
  };

  const removeCreneau = (jourIdx: number, ci: number) => {
    setJours(prev => prev.map((j, i) => {
      if (i !== jourIdx) return j;
      const newCreneaux = j.creneaux.filter((_, k) => k !== ci);
      return { ...j, creneaux: newCreneaux, actif: newCreneaux.length > 0 };
    }));
  };

  const updateCreneau = (jourIdx: number, ci: number, field: 'debut' | 'fin', value: string) => {
    setJours(prev => prev.map((j, i) => {
      if (i !== jourIdx) return j;
      return { ...j, creneaux: j.creneaux.map((c, k) => k === ci ? { ...c, [field]: value } : c) };
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/college-students/me', { disponibilites: uiToBackend(jours) });
      Alert.alert(t('common', 'success'), t('dispos', 'savedOk'));
    } catch (e: any) {
      Alert.alert(t('common', 'error'), e?.response?.data?.message ?? '');
    } finally {
      setSaving(false);
    }
  };

  const openPicker = (jourIdx: number, creneauIdx: number, field: 'debut' | 'fin') =>
    setPicker({ visible: true, jourIdx, creneauIdx, field });

  const currentPickerValue =
    picker.visible
      ? (jours[picker.jourIdx]?.creneaux[picker.creneauIdx]?.[picker.field] ?? '09:00')
      : '09:00';

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
        <Text style={styles.headerTitle}>{t('dispos', 'title')}</Text>
        <TouchableOpacity
          style={styles.tarifsBtn}
          onPress={() => navigation?.navigate('CollegeStudentTarifs')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="pricetag-outline" size={16} color={PRIMARY} />
          <Text style={styles.tarifsBtnText}>{t('tarifs', 'title')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
      >

        {/* ── Info banner ── */}
        <View style={styles.infoBanner}>
          <View style={styles.infoBannerIcon}>
            <Ionicons name="calendar-outline" size={26} color={PRIMARY} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoBannerTitle}>{t('dispos', 'banner')}</Text>
            <Text style={styles.infoBannerSub}>{t('dispos', 'bannerSub')}</Text>
          </View>
        </View>

        {/* ── Jours ── */}
        <View style={styles.joursCard}>
          {jours.map((jour, jourIdx) => {
            // Afficher le nom du jour dans la bonne langue
            const jourDisplay = JOURS_DISPLAY[jourIdx];
            return (
              <View
                key={jour.jourFr}
                style={[styles.jourSection, jourIdx < jours.length - 1 && { borderBottomWidth: 1, borderBottomColor: BORDER }]}
              >
                <View style={styles.jourHeader}>
                  <Text style={styles.jourNom}>{jourDisplay}</Text>
                  {!jour.actif && (
                    <Text style={styles.indisponibleLabel}>{t('dispos', 'unavailable')}</Text>
                  )}
                  <Switch
                    value={jour.actif}
                    onValueChange={val => toggleJour(jourIdx, val)}
                    trackColor={{ false: BORDER, true: PRIMARY }}
                    thumbColor={CARD}
                  />
                </View>

                {jour.actif && (
                  <View style={styles.creneauxWrap}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.creneauxScroll}>
                      {jour.creneaux.map((c, ci) => (
                        <View key={ci} style={styles.creneauGroup}>
                          <View style={styles.creneauChip}>
                            <Ionicons name="time-outline" size={14} color={PRIMARY} style={{ marginRight: 6 }} />
                            <TouchableOpacity onPress={() => openPicker(jourIdx, ci, 'debut')}>
                              <Text style={styles.creneauTime}>{c.debut}</Text>
                            </TouchableOpacity>
                            <Text style={styles.creneauSep}> – </Text>
                            <TouchableOpacity onPress={() => openPicker(jourIdx, ci, 'fin')}>
                              <Text style={styles.creneauTime}>{c.fin}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => removeCreneau(jourIdx, ci)}
                              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                              style={{ marginLeft: 8 }}
                            >
                              <Ionicons name="close-circle" size={16} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}

                      <TouchableOpacity style={styles.addCreneauBtn} onPress={() => addCreneau(jourIdx)}>
                        <Ionicons name="add" size={16} color={TEXT_MUTED} />
                        <Text style={styles.addCreneauText}>{t('dispos', 'add')}</Text>
                      </TouchableOpacity>
                    </ScrollView>

                    <View style={styles.chevronRight}>
                      <Ionicons name="chevron-forward" size={18} color={BORDER} />
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ── Bouton Enregistrer ── */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={save}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color={CARD} />
            : <>
                <Ionicons name="checkmark-circle-outline" size={20} color={CARD} style={{ marginRight: 8 }} />
                <Text style={styles.saveBtnText}>{t('dispos', 'save')}</Text>
              </>
          }
        </TouchableOpacity>

        {/* ── Note bas ── */}
        <View style={styles.footerNote}>
          <Ionicons name="information-circle-outline" size={14} color={TEXT_MUTED} />
          <Text style={styles.footerNoteText}>{t('dispos', 'note')}</Text>
        </View>

      </ScrollView>

      {/* ── Picker ── */}
      <SlotPicker
        visible={picker.visible}
        title={picker.field === 'debut' ? t('dispos', 'startTime') : t('dispos', 'endTime')}
        slots={ALL_SLOTS}
        selected={currentPickerValue}
        onSelect={v => updateCreneau(picker.jourIdx, picker.creneauIdx, picker.field, v)}
        onClose={() => setPicker(p => ({ ...p, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14, backgroundColor: BG },
  headerTitle:      { fontSize: 22, fontWeight: '800', color: TEXT },
  tarifsBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: PRIMARY_LIGHT, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8 },
  tarifsBtnText:    { color: PRIMARY, fontSize: 13, fontWeight: '700' },
  infoBanner:       { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: CARD, marginHorizontal: 20, marginBottom: 16, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  infoBannerIcon:   { width: 52, height: 52, borderRadius: 14, backgroundColor: PRIMARY_LIGHT, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  infoBannerTitle:  { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 4 },
  infoBannerSub:    { fontSize: 12, color: TEXT_MUTED, lineHeight: 17 },
  joursCard:        { backgroundColor: CARD, marginHorizontal: 20, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, marginBottom: 20 },
  jourSection:      { paddingHorizontal: 18, paddingVertical: 16 },
  jourHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  jourNom:          { fontSize: 16, fontWeight: '700', color: TEXT, flex: 1 },
  indisponibleLabel:{ fontSize: 13, color: TEXT_MUTED, marginRight: 12 },
  creneauxWrap:     { flexDirection: 'row', alignItems: 'center' },
  creneauxScroll:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 8 },
  creneauGroup:     {},
  creneauChip:      { flexDirection: 'row', alignItems: 'center', backgroundColor: PRIMARY_LIGHT, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: `${PRIMARY}30` },
  creneauTime:      { fontSize: 13, fontWeight: '700', color: PRIMARY },
  creneauSep:       { fontSize: 13, color: TEXT_MUTED },
  addCreneauBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: BORDER, borderStyle: 'dashed', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: BG },
  addCreneauText:   { fontSize: 13, color: TEXT_MUTED, fontWeight: '600' },
  chevronRight:     { marginLeft: 4 },
  saveBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: PRIMARY_DARK, borderRadius: 16, paddingVertical: 18, marginHorizontal: 20, marginBottom: 16 },
  saveBtnText:      { color: CARD, fontSize: 16, fontWeight: '700' },
  footerNote:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 24, marginBottom: 8 },
  footerNoteText:   { flex: 1, fontSize: 12, color: TEXT_MUTED, lineHeight: 17 },
  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:       { backgroundColor: CARD, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40 },
  modalHandle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  modalHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  modalTitle:       { fontSize: 17, fontWeight: '700', color: TEXT },
  modalCloseBtn:    { width: 32, height: 32, borderRadius: 16, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  slotOption:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  slotLeft:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  slotOptionActive: { backgroundColor: PRIMARY_LIGHT },
  slotOptionText:   { fontSize: 15, color: TEXT },
  slotOptionTextActive: { color: PRIMARY, fontWeight: '700' },
});