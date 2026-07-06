import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/auth.service';
import { useLanguage } from './LanguageContext';

const PRIMARY       = '#0D6B5E';
const PRIMARY_LIGHT = '#E6F3F1';
const BG            = '#FFFFFF';
const CARD          = '#F8FAFB';
const TEXT          = '#111827';
const TEXT_MUTED    = '#6B7280';
const BORDER        = '#E5E7EB';
const DANGER        = '#EF4444';

interface FormState {
  titre: string;
  description: string;
  date: string;
  heure: string;
  duree: '30min' | '1h';
  mode: 'online' | 'inperson';
  places: number;
  niveau: string;
}

const ALL_SLOTS: string[] = [];
for (let h = 7; h <= 23; h++) {
  ALL_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 23) ALL_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

const generateDates = (lang: 'fr' | 'en'): { label: string; value: string }[] => {
  const days: { label: string; value: string }[] = [];
  const joursFr  = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const joursEn  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const moisFr   = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
  const moisEn   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const value = d.toISOString().split('T')[0];
    const jours = lang === 'en' ? joursEn : joursFr;
    const mois  = lang === 'en' ? moisEn  : moisFr;
    const label = `${jours[d.getDay()]} ${d.getDate()} ${mois[d.getMonth()]}`;
    days.push({ label, value });
  }
  return days;
};

// ─── Traductions locales pour ce screen ──────────────────────────────────────
const LABELS = {
  title:         { fr: 'Programmer un meeting', en: 'Schedule a meeting'       },
  titleField:    { fr: 'Titre du meeting',      en: 'Meeting title'            },
  titlePH:       { fr: 'Ex : Mon parcours en data science', en: 'Ex: My journey in data science' },
  titleRequired: { fr: 'Le titre est requis',   en: 'Title is required'        },
  description:   { fr: 'Description',           en: 'Description'              },
  descPH:        { fr: 'Décris le sujet que tu vas aborder...', en: 'Describe the topic you will cover...' },
  date:          { fr: 'Date',                  en: 'Date'                     },
  heure:         { fr: 'Heure',                 en: 'Time'                     },
  duree:         { fr: 'Durée',                 en: 'Duration'                 },
  duree30:       { fr: '30 minutes',            en: '30 minutes'               },
  duree60:       { fr: '60 minutes',            en: '60 minutes'               },
  mode:          { fr: 'Mode',                  en: 'Mode'                     },
  online:        { fr: 'En ligne',              en: 'Online'                   },
  onlineSub:     { fr: 'Google Meet',           en: 'Google Meet'              },
  inperson:      { fr: 'En présentiel',         en: 'In person'                },
  inpersonSub:   { fr: 'Sur le campus',         en: 'On campus'                },
  places:        { fr: 'Places disponibles',    en: 'Available spots'          },
  niveau:        { fr: 'Niveau concerné',       en: 'Target level'             },
  publish:       { fr: 'Publier le meeting',    en: 'Publish meeting'          },
  publishing:    { fr: 'Publication...',        en: 'Publishing...'            },
  successTitle:  { fr: 'Meeting publié !',      en: 'Meeting published!'       },
  successMsg:    { fr: 'Tu seras notifié dès qu\'une demande arrive.', en: 'You will be notified when a request arrives.' },
  errorMsg:      { fr: 'Une erreur est survenue.', en: 'An error occurred.'    },
  chooseDate:    { fr: 'Choisir une date',      en: 'Choose a date'            },
  chooseTime:    { fr: 'Choisir une heure',     en: 'Choose a time'            },
  back:          { fr: '‹ Retour',              en: '‹ Back'                   },
};

const NIVEAUX_FR = ['Tous les niveaux', 'Bac', '1ère année', '2ème année', '3ème année', 'Master'];
const NIVEAUX_EN = ['All levels', 'High school', '1st year', '2nd year', '3rd year', 'Master'];

// ─── Picker Sheet ─────────────────────────────────────────────────────────────
import { Modal, TouchableWithoutFeedback } from 'react-native';

const PickerSheet = ({
  visible, title, items, selected, onSelect, onClose,
}: {
  visible: boolean; title: string;
  items: { label: string; value: string }[] | string[];
  selected: string; onSelect: (v: string) => void; onClose: () => void;
}) => {
  if (!visible) return null;
  const normalized: { label: string; value: string }[] = (items as any[]).map((i: any) =>
    typeof i === 'string' ? { label: i, value: i } : i
  );
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <TouchableWithoutFeedback>
            <View style={{ backgroundColor: BG, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: TEXT }}>{title}</Text>
                <TouchableOpacity onPress={onClose}>
                  <Text style={{ color: PRIMARY, fontSize: 15, fontWeight: '600' }}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 320 }}>
                {normalized.map(item => (
                  <TouchableOpacity
                    key={item.value}
                    onPress={() => { onSelect(item.value); onClose(); }}
                    style={{
                      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                      paddingHorizontal: 20, paddingVertical: 14,
                      borderBottomWidth: 1, borderBottomColor: BORDER,
                      backgroundColor: selected === item.value ? PRIMARY_LIGHT : BG,
                    }}
                  >
                    <Text style={{ fontSize: 15, color: selected === item.value ? PRIMARY : TEXT, fontWeight: selected === item.value ? '700' : '400' }}>
                      {item.label}
                    </Text>
                    {selected === item.value && <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function CollegeStudentPlanningScreen({ navigation }: { navigation?: any }) {
  const { lang } = useLanguage();
  const l = (key: keyof typeof LABELS) => LABELS[key][lang];

  const DATES   = generateDates(lang);
  const NIVEAUX = lang === 'en' ? NIVEAUX_EN : NIVEAUX_FR;

  const [form, setForm] = useState<FormState>({
    titre: '', description: '',
    date: DATES[0].value,
    heure: '18:00',
    duree: '1h', mode: 'online',
    places: 1, niveau: NIVEAUX[0],
  });
  const [errors, setErrors]   = useState<Partial<Record<keyof FormState, string>>>({});
  const [loading, setLoading] = useState(false);
  const [picker, setPicker]   = useState<'date' | 'heure' | null>(null);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.titre.trim()) e.titre = l('titleRequired');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const getDateLabel = () => DATES.find(d => d.value === form.date)?.label ?? form.date;

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post('/college-students/consultations/book', {
        date:  form.date,
        heure: form.heure,
        duree: form.duree,
        notes: `${form.titre}${form.description ? ' — ' + form.description : ''}`,
      });
      Alert.alert(l('successTitle'), l('successMsg'), [
        { text: 'OK', onPress: () => navigation?.navigate('CollegeStudentHome') },
      ]);
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || l('errorMsg'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>{l('back')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{l('title')}</Text>
        </View>

        <View style={styles.body}>

          {/* ── Titre ── */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>{l('titleField')} *</Text>
            <TextInput
              style={[styles.input, errors.titre && styles.inputError]}
              placeholder={l('titlePH')}
              placeholderTextColor={TEXT_MUTED}
              value={form.titre}
              onChangeText={v => update('titre', v)}
            />
            {errors.titre && <Text style={styles.errorText}>{errors.titre}</Text>}
          </View>

          {/* ── Description ── */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>{l('description')}</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder={l('descPH')}
              placeholderTextColor={TEXT_MUTED}
              multiline numberOfLines={4} textAlignVertical="top"
              value={form.description}
              onChangeText={v => update('description', v)}
            />
          </View>

          {/* ── Date + Heure ── */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{l('date')}</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => setPicker('date')}>
                <Text style={styles.pickerText}>📅 {getDateLabel()}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{l('heure')}</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => setPicker('heure')}>
                <Text style={styles.pickerText}>🕐 {form.heure}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Durée ── */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>{l('duree')}</Text>
            <View style={styles.row}>
              {(['30min', '1h'] as const).map(d => (
                <TouchableOpacity
                  key={d}
                  onPress={() => update('duree', d)}
                  style={[styles.selectBtn, form.duree === d && styles.selectBtnActive]}
                >
                  <Text style={[styles.selectBtnText, form.duree === d && styles.selectBtnTextActive]}>
                    {d === '30min' ? l('duree30') : l('duree60')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Mode ── */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>{l('mode')}</Text>
            <View style={styles.row}>
              {([
                { val: 'online'   as const, icon: '💻', label: l('online'),   sub: l('onlineSub')   },
                { val: 'inperson' as const, icon: '🏫', label: l('inperson'), sub: l('inpersonSub') },
              ]).map(m => (
                <TouchableOpacity
                  key={m.val}
                  onPress={() => update('mode', m.val)}
                  style={[styles.modeCard, form.mode === m.val && styles.modeCardActive]}
                >
                  <Text style={{ fontSize: 24, marginBottom: 4 }}>{m.icon}</Text>
                  <Text style={[styles.modeLabel, form.mode === m.val && { color: PRIMARY }]}>{m.label}</Text>
                  <Text style={styles.modeSub}>{m.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Places ── */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>{l('places')}</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => update('places', Math.max(1, form.places - 1))}>
                <Text style={styles.stepperBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepperVal}>{form.places}</Text>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => update('places', Math.min(10, form.places + 1))}>
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Niveau ── */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>{l('niveau')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {NIVEAUX.map(n => (
                <TouchableOpacity
                  key={n}
                  onPress={() => update('niveau', n)}
                  style={[styles.niveauChip, form.niveau === n && styles.niveauChipActive]}
                >
                  <Text style={[styles.niveauChipText, form.niveau === n && { color: PRIMARY }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ── Submit ── */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={submit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitBtnText}>{l('publish')}</Text>
            }
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* ── Pickers ── */}
      <PickerSheet
        visible={picker === 'date'}
        title={l('chooseDate')}
        items={DATES}
        selected={form.date}
        onSelect={v => update('date', v)}
        onClose={() => setPicker(null)}
      />
      <PickerSheet
        visible={picker === 'heure'}
        title={l('chooseTime')}
        items={ALL_SLOTS}
        selected={form.heure}
        onSelect={v => update('heure', v)}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: BG },
  header:              { padding: 20, paddingTop: 24, borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn:             { marginBottom: 10 },
  backText:            { color: PRIMARY, fontSize: 15, fontWeight: '600' },
  title:               { fontSize: 20, fontWeight: '700', color: TEXT },
  body:                { padding: 20 },
  fieldWrap:           { marginBottom: 20 },
  label:               { fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 8 },
  input:               { backgroundColor: CARD, borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: TEXT },
  textarea:            { minHeight: 100, paddingTop: 12 },
  inputError:          { borderColor: DANGER },
  errorText:           { color: DANGER, fontSize: 12, marginTop: 4 },
  row:                 { flexDirection: 'row', gap: 12 },
  pickerBtn:           { backgroundColor: CARD, borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
  pickerText:          { fontSize: 13, color: TEXT, fontWeight: '500' },
  selectBtn:           { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, alignItems: 'center', backgroundColor: CARD },
  selectBtnActive:     { borderColor: PRIMARY, backgroundColor: PRIMARY_LIGHT },
  selectBtnText:       { fontSize: 14, fontWeight: '600', color: TEXT_MUTED },
  selectBtnTextActive: { color: PRIMARY },
  modeCard:            { flex: 1, alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 2, borderColor: BORDER, backgroundColor: CARD },
  modeCardActive:      { borderColor: PRIMARY, backgroundColor: PRIMARY_LIGHT },
  modeLabel:           { fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 2 },
  modeSub:             { fontSize: 11, color: TEXT_MUTED },
  stepperRow:          { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperBtn:          { width: 38, height: 38, borderRadius: 10, backgroundColor: PRIMARY_LIGHT, alignItems: 'center', justifyContent: 'center' },
  stepperBtnText:      { fontSize: 22, color: PRIMARY, fontWeight: '700', lineHeight: 26 },
  stepperVal:          { fontSize: 20, fontWeight: '700', color: TEXT, minWidth: 32, textAlign: 'center' },
  niveauChip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5, borderColor: BORDER, backgroundColor: CARD, marginRight: 8 },
  niveauChipActive:    { borderColor: PRIMARY, backgroundColor: PRIMARY_LIGHT },
  niveauChipText:      { fontSize: 12, fontWeight: '600', color: TEXT_MUTED },
  submitBtn:           { backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitBtnText:       { color: '#fff', fontSize: 16, fontWeight: '700' },
});