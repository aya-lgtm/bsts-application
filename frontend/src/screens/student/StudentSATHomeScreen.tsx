/**
 * StudentSATHomeScreen.tsx — Style Altissia Premium
 * Design amélioré avec données fictives en attendant le backend
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/auth.service';
import { calcProgressPct } from './satProgressUtils';

// ─── Palette ──────────────────────────────────────────────────────────────────
const P = {
  green:        '#0D6B5E',
  greenMid:     '#0F8A78',
  greenLight:   '#E6F3F1',
  greenLighter: '#F2FAF9',
  bg:           '#FFFFFF',
  white:        '#FFFFFF',
  text:         '#111827',
  textSub:      '#4B5563',
  textMuted:    '#9CA3AF',
  border:       '#E5E7EB',
  gold:         '#D97706',
  goldLight:    '#FEF3C7',
  purple:       '#7C3AED',
  purpleLight:  '#EDE9FE',
  blue:         '#2563EB',
  blueLight:    '#DBEAFE',
  orange:       '#EA580C',
  orangeLight:  '#FFEDD5',
  red:          '#DC2626',
  redLight:     '#FEE2E2',
};

// ─── Types ────────────────────────────────────────────────────────────────────
type LevelKey  = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
type DomainKey = 'MATH' | 'READING' | 'WRITING';

type Unit = {
  id: string; titre: string; description: string;
  domaine: DomainKey; niveau: LevelKey; ordre: number;
  lessonsTotal: number; lessonsCompleted: number;
  quizCompleted: number; unitTestDone: number;
  isRecommended?: boolean;
};

type Props = { navigation: { navigate: (screen: string, params?: any) => void } };

// ─── Config niveaux ───────────────────────────────────────────────────────────
const LEVEL_CONFIG: Record<LevelKey, {
  emoji: string; label: string; labelFr: string;
  color: string; bgColor: string; gradColors: [string, string]; range: string;
}> = {
  BEGINNER:     { emoji: '🌱', label: 'Beginner',     labelFr: 'Débutant',      color: '#0D6B5E', bgColor: '#E6F3F1',  gradColors: ['#0D6B5E', '#0F8A78'], range: '400–800'   },
  INTERMEDIATE: { emoji: '📘', label: 'Intermediate', labelFr: 'Intermédiaire', color: '#2563EB', bgColor: '#DBEAFE',  gradColors: ['#1D4ED8', '#2563EB'], range: '800–1100'  },
  ADVANCED:     { emoji: '🔥', label: 'Advanced',     labelFr: 'Avancé',        color: '#D97706', bgColor: '#FEF3C7',  gradColors: ['#B45309', '#D97706'], range: '1100–1400' },
  EXPERT:       { emoji: '🏆', label: 'Expert',       labelFr: 'Expert',        color: '#7C3AED', bgColor: '#EDE9FE',  gradColors: ['#6D28D9', '#7C3AED'], range: '1400–1600' },
};

const DOMAIN_CONFIG: Record<DomainKey, {
  label: string; icon: string; color: string; bgColor: string; gradColors: [string, string];
}> = {
  MATH:    { label: 'Math',    icon: 'calculator-outline',  color: '#0D6B5E', bgColor: '#E6F3F1', gradColors: ['#0D6B5E', '#0F8A78'] },
  READING: { label: 'Reading', icon: 'book-outline',        color: '#2563EB', bgColor: '#DBEAFE', gradColors: ['#1D4ED8', '#2563EB'] },
  WRITING: { label: 'Writing', icon: 'pencil-outline',      color: '#D97706', bgColor: '#FEF3C7', gradColors: ['#B45309', '#D97706'] },
};

const DOMAIN_KEYS: DomainKey[] = ['MATH', 'READING', 'WRITING'];
const LEVEL_KEYS: LevelKey[]   = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

// ─── Données fictives ─────────────────────────────────────────────────────────
const MOCK_UNITS: Unit[] = [
  { id: '1', titre: 'Les bases de l\'algèbre',    description: 'Équations, variables et expressions',     domaine: 'MATH',    niveau: 'BEGINNER',     ordre: 1, lessonsTotal: 3, lessonsCompleted: 3, quizCompleted: 2, unitTestDone: 0, isRecommended: true },
  { id: '2', titre: 'Arithmétique et nombres',    description: 'Fractions, pourcentages et décimaux',     domaine: 'MATH',    niveau: 'BEGINNER',     ordre: 2, lessonsTotal: 2, lessonsCompleted: 1, quizCompleted: 1, unitTestDone: 0, isRecommended: true },
  { id: '3', titre: 'Compréhension de texte',     description: 'Analyse et interprétation de passages',   domaine: 'READING', niveau: 'BEGINNER',     ordre: 1, lessonsTotal: 4, lessonsCompleted: 2, quizCompleted: 1, unitTestDone: 0, isRecommended: true },
  { id: '4', titre: 'Grammaire de base',          description: 'Règles essentielles de grammaire',        domaine: 'WRITING', niveau: 'BEGINNER',     ordre: 1, lessonsTotal: 3, lessonsCompleted: 0, quizCompleted: 0, unitTestDone: 0, isRecommended: true },
  { id: '5', titre: 'Algèbre avancée',            description: 'Polynômes et fonctions complexes',        domaine: 'MATH',    niveau: 'INTERMEDIATE', ordre: 1, lessonsTotal: 4, lessonsCompleted: 0, quizCompleted: 0, unitTestDone: 0 },
  { id: '6', titre: 'Analyse littéraire',         description: 'Décrypter le sens implicite d\'un texte', domaine: 'READING', niveau: 'INTERMEDIATE', ordre: 1, lessonsTotal: 3, lessonsCompleted: 0, quizCompleted: 0, unitTestDone: 0 },
  { id: '7', titre: 'Style et argumentation',     description: 'Construire un argument convaincant',      domaine: 'WRITING', niveau: 'INTERMEDIATE', ordre: 1, lessonsTotal: 3, lessonsCompleted: 0, quizCompleted: 0, unitTestDone: 0 },
  { id: '8', titre: 'Géométrie et trigonométrie', description: 'Formes, angles et fonctions trig',        domaine: 'MATH',    niveau: 'ADVANCED',     ordre: 1, lessonsTotal: 5, lessonsCompleted: 0, quizCompleted: 0, unitTestDone: 0 },
  { id: '9', titre: 'Textes complexes SAT',       description: 'Passages scientifiques et historiques',   domaine: 'READING', niveau: 'ADVANCED',     ordre: 1, lessonsTotal: 4, lessonsCompleted: 0, quizCompleted: 0, unitTestDone: 0 },
  { id: '10', titre: 'Statistiques & données',    description: 'Interprétation graphiques et tableaux',   domaine: 'MATH',    niveau: 'EXPERT',       ordre: 1, lessonsTotal: 4, lessonsCompleted: 0, quizCompleted: 0, unitTestDone: 0 },
];

// ─── AnimBar ──────────────────────────────────────────────────────────────────
function AnimBar({ value, color, height = 5 }: { value: number; color: string; height?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration: 800, useNativeDriver: false }).start();
  }, [value]);
  const width = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <View style={{ height, backgroundColor: '#E5E7EB', borderRadius: height, overflow: 'hidden' }}>
      <Animated.View style={{ height, borderRadius: height, backgroundColor: color, width }} />
    </View>
  );
}

// ─── UnitCard ─────────────────────────────────────────────────────────────────
function UnitCard({ unit, domainColor, domainGrad, index, onPress }: {
  unit: Unit; domainColor: string; domainGrad: [string,string]; index: number; onPress: () => void;
}) {
  const lessons = Array.from({ length: unit.lessonsTotal }, (_, i) => ({
    isCompleted: i < unit.lessonsCompleted,
    quizPassed:  i < unit.quizCompleted,
  }));
  const pct    = calcProgressPct(lessons);
  const isDone = pct === 100;
  const num    = String(index + 1).padStart(2, '0');

  return (
    <TouchableOpacity style={[uc.card, isDone && { borderColor: '#BBF7D0' }]} onPress={onPress} activeOpacity={0.78}>
      {/* Numéro */}
      <View style={[uc.numBadge, { backgroundColor: domainColor + '18' }]}>
        <Text style={[uc.numText, { color: domainColor }]}>{num}</Text>
      </View>

      {/* Contenu */}
      <View style={uc.body}>
        <Text style={uc.title} numberOfLines={1}>{unit.titre}</Text>
        <Text style={uc.desc}  numberOfLines={1}>{unit.description}</Text>
        <View style={{ marginTop: 7 }}>
          <AnimBar value={pct} color={isDone ? '#16A34A' : domainColor} height={4} />
        </View>
        <View style={uc.statsRow}>
          <View style={uc.statChip}>
            <Ionicons name="book-outline" size={10} color={P.textMuted} />
            <Text style={uc.statText}>{unit.lessonsCompleted}/{unit.lessonsTotal}</Text>
          </View>
          <View style={uc.statChip}>
            <Ionicons name="help-circle-outline" size={10} color={P.textMuted} />
            <Text style={uc.statText}>{unit.quizCompleted}/{unit.lessonsTotal}</Text>
          </View>
          <Text style={[uc.pct, { color: isDone ? '#16A34A' : P.textMuted }]}>{pct}%</Text>
        </View>
      </View>

      {/* Action */}
      <View style={[uc.arrow, isDone && { backgroundColor: '#DCFCE7' }]}>
        <Ionicons name={isDone ? 'checkmark' : 'chevron-forward'} size={14} color={isDone ? '#16A34A' : P.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const uc = StyleSheet.create({
  card:     { flexDirection: 'row', alignItems: 'center', backgroundColor: P.white, borderRadius: 18, padding: 14, gap: 12, borderWidth: 1, borderColor: P.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  numBadge: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  numText:  { fontSize: 15, fontWeight: '900' },
  body:     { flex: 1 },
  title:    { fontSize: 13, fontWeight: '800', color: P.text, marginBottom: 2 },
  desc:     { fontSize: 11, color: P.textMuted, marginBottom: 2 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F3F4F6', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  statText: { fontSize: 10, color: P.textMuted, fontWeight: '600' },
  pct:      { fontSize: 10, fontWeight: '700', marginLeft: 'auto' },
  arrow:    { width: 28, height: 28, borderRadius: 9, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});

// ─── DomainSection ────────────────────────────────────────────────────────────
function DomainSection({ domainKey, units, navigation }: {
  domainKey: DomainKey; units: Unit[]; navigation: Props['navigation'];
}) {
  const cfg = DOMAIN_CONFIG[domainKey];
  if (units.length === 0) return null;
  const lessons = units.flatMap(u => Array.from({ length: u.lessonsTotal }, (_, i) => ({
    isCompleted: i < u.lessonsCompleted, quizPassed: i < u.quizCompleted,
  })));
  const pct = calcProgressPct(lessons);
  return (
    <View style={ds.wrapper}>
      <View style={ds.header}>
        <LinearGradient colors={cfg.gradColors} style={ds.iconWrap}>
          <Ionicons name={cfg.icon as any} size={14} color={P.white} />
        </LinearGradient>
        <Text style={[ds.label, { color: cfg.color }]}>{cfg.label}</Text>
        <View style={[ds.pctBadge, { backgroundColor: cfg.bgColor }]}>
          <Text style={[ds.pctText, { color: cfg.color }]}>{pct}%</Text>
        </View>
      </View>
      <View style={ds.units}>
        {units.map((unit, i) => (
          <UnitCard
            key={unit.id}
            unit={unit}
            domainColor={cfg.color}
            domainGrad={cfg.gradColors}
            index={i}
            onPress={() => navigation.navigate('StudentSATUnit', { unit })}
          />
        ))}
      </View>
    </View>
  );
}

const ds = StyleSheet.create({
  wrapper:  { marginBottom: 18 },
  header:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  iconWrap: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  label:    { fontSize: 13, fontWeight: '800', flex: 1 },
  pctBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pctText:  { fontSize: 11, fontWeight: '800' },
  units:    { gap: 8 },
});

// ─── LevelBlock ───────────────────────────────────────────────────────────────
function LevelBlock({ levelKey, units, isRecommended, navigation, defaultOpen }: {
  levelKey: LevelKey; units: Unit[]; isRecommended: boolean;
  navigation: Props['navigation']; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const rotateAnim = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;
  const cfg = LEVEL_CONFIG[levelKey];

  const toggle = () => {
    Animated.timing(rotateAnim, { toValue: open ? 0 : 1, duration: 200, useNativeDriver: true }).start();
    setOpen(o => !o);
  };

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  const allLessons = units.flatMap(u => Array.from({ length: u.lessonsTotal }, (_, i) => ({
    isCompleted: i < u.lessonsCompleted,
    quizPassed:  i < u.quizCompleted,
  })));
  const pct = calcProgressPct(allLessons);
  const totalUnits = units.length;
  const doneUnits  = units.filter(u => {
    const lessons = Array.from({ length: u.lessonsTotal }, (_, i) => ({
      isCompleted: i < u.lessonsCompleted, quizPassed: i < u.quizCompleted,
    }));
    return calcProgressPct(lessons) === 100;
  }).length;

  return (
    <View style={[lb.wrapper, isRecommended && { borderColor: cfg.color + '60', borderWidth: 2 }]}>
      <TouchableOpacity onPress={toggle} activeOpacity={0.8} style={lb.headerBtn}>
        {/* Emoji + infos */}
        <LinearGradient colors={cfg.gradColors} style={lb.emojiWrap}>
          <Text style={{ fontSize: 22 }}>{cfg.emoji}</Text>
        </LinearGradient>

        <View style={lb.headerCenter}>
          <View style={lb.titleRow}>
            <Text style={lb.levelLabel}>{cfg.labelFr}</Text>
            {isRecommended && (
              <View style={[lb.recBadge, { backgroundColor: cfg.bgColor }]}>
                <Ionicons name="star" size={10} color={cfg.color} />
                <Text style={[lb.recText, { color: cfg.color }]}>Mon niveau</Text>
              </View>
            )}
          </View>
          <Text style={lb.scoreRange}>Score SAT {cfg.range}</Text>
          {totalUnits > 0 && (
            <Text style={lb.unitsCount}>{doneUnits}/{totalUnits} unités terminées</Text>
          )}
        </View>

        <View style={lb.rightSide}>
          <View style={[lb.pctCircle, { borderColor: cfg.color + '40' }]}>
            <Text style={[lb.pctNum, { color: cfg.color }]}>{pct}%</Text>
          </View>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons name="chevron-down" size={18} color={P.textMuted} />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Barre de progression dans l'en-tête */}
      {pct > 0 && (
        <View style={{ paddingHorizontal: 16, paddingBottom: open ? 0 : 12 }}>
          <AnimBar value={pct} color={cfg.color} height={3} />
        </View>
      )}

      {/* Contenu */}
      {open && (
        <View style={lb.content}>
          <View style={lb.divider} />
          {totalUnits === 0 ? (
            <View style={lb.empty}>
              <Ionicons name="hourglass-outline" size={28} color={P.textMuted} />
              <Text style={lb.emptyText}>Contenu en préparation</Text>
            </View>
          ) : (
            DOMAIN_KEYS.map(dk => (
              <DomainSection
                key={dk}
                domainKey={dk}
                units={units.filter(u => u.domaine === dk)}
                navigation={navigation}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
}

const lb = StyleSheet.create({
  wrapper:      { backgroundColor: P.white, borderRadius: 22, marginBottom: 12, borderWidth: 1, borderColor: P.border, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  headerBtn:    { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  emojiWrap:    { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  headerCenter: { flex: 1 },
  titleRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 },
  levelLabel:   { fontSize: 17, fontWeight: '900', color: P.text, letterSpacing: -0.3 },
  recBadge:     { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  recText:      { fontSize: 10, fontWeight: '800' },
  scoreRange:   { fontSize: 11, color: P.textMuted, fontWeight: '500', marginBottom: 1 },
  unitsCount:   { fontSize: 11, color: P.textSub, fontWeight: '600' },
  rightSide:    { alignItems: 'center', gap: 4, flexShrink: 0 },
  pctCircle:    { width: 46, height: 46, borderRadius: 23, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: P.white },
  pctNum:       { fontSize: 13, fontWeight: '900' },
  content:      { paddingHorizontal: 16, paddingBottom: 16 },
  divider:      { height: 1, backgroundColor: P.border, marginBottom: 16 },
  empty:        { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText:    { fontSize: 13, color: P.textMuted },
});

// ─── QuickAction ──────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { id: 'rapid',    emoji: '⚡', label: 'Quiz rapide',        sub: '10 questions', gradColors: ['#0D6B5E','#0F8A78'] as [string,string], mode: 'REVIEW'    },
  { id: 'free',     emoji: '📋', label: 'Exercices',          sub: 'Par thème',    gradColors: ['#1D4ED8','#2563EB'] as [string,string], mode: 'FREE'      },
  { id: 'simulated',emoji: '🏆', label: 'Test simulé',        sub: '98 questions', gradColors: ['#6D28D9','#7C3AED'] as [string,string], mode: 'SIMULATED' },
  { id: 'revision', emoji: '🔄', label: 'Centre de révision', sub: 'Mes erreurs',  gradColors: ['#B45309','#D97706'] as [string,string], mode: 'REVISION'  },
];

// ─── Modal Exercices ──────────────────────────────────────────────────────────
function FreeModal({ visible, onClose, onStart }: {
  visible: boolean; onClose: () => void;
  onStart: (nb: number, domaine: string) => void;
}) {
  const [nb, setNb]   = useState(10);
  const [dom, setDom] = useState('ALL');
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={fm.overlay}>
          <TouchableWithoutFeedback>
            <View style={fm.sheet}>
              <View style={fm.handle} />
              <Text style={fm.title}>Exercices libres</Text>
              <Text style={fm.label}>NOMBRE DE QUESTIONS</Text>
              <View style={fm.row}>
                {[10, 20, 30, 40].map(n => (
                  <TouchableOpacity key={n} style={[fm.pill, nb === n && fm.pillActive]} onPress={() => setNb(n)}>
                    <Text style={[fm.pillText, nb === n && { color: P.white }]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={fm.label}>DOMAINE</Text>
              <View style={fm.grid}>
                {[
                  { key: 'ALL',     label: 'Tout',    icon: 'apps-outline' },
                  { key: 'MATH',    label: 'Math',    icon: 'calculator-outline' },
                  { key: 'READING', label: 'Reading', icon: 'book-outline' },
                  { key: 'WRITING', label: 'Writing', icon: 'pencil-outline' },
                ].map(d => (
                  <TouchableOpacity key={d.key} style={[fm.dpill, dom === d.key && { borderColor: P.green, backgroundColor: P.greenLight }]} onPress={() => setDom(d.key)}>
                    <Ionicons name={d.icon as any} size={14} color={dom === d.key ? P.green : P.textMuted} />
                    <Text style={[fm.dtext, dom === d.key && { color: P.green }]}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={fm.btn} onPress={() => onStart(nb, dom)} activeOpacity={0.85}>
                <Text style={fm.btnText}>Commencer</Text>
                <Ionicons name="arrow-forward" size={18} color={P.white} />
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const fm = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: P.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 28 },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: P.border, alignSelf: 'center', marginBottom: 24 },
  title:      { fontSize: 22, fontWeight: '900', color: P.text, marginBottom: 24, letterSpacing: -0.5 },
  label:      { fontSize: 10, fontWeight: '800', color: P.textMuted, letterSpacing: 1.5, marginBottom: 12 },
  row:        { flexDirection: 'row', gap: 10, marginBottom: 24 },
  pill:       { flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  pillActive: { backgroundColor: P.green, borderColor: P.green },
  pillText:   { fontSize: 15, fontWeight: '800', color: P.textSub },
  grid:       { flexDirection: 'row', gap: 10, marginBottom: 28 },
  dpill:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11, borderRadius: 14, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent' },
  dtext:      { fontSize: 12, fontWeight: '700', color: P.textMuted },
  btn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: P.green, borderRadius: 18, paddingVertical: 17, gap: 8 },
  btnText:    { fontSize: 16, fontWeight: '900', color: P.white },
});

// ─── Écran principal ──────────────────────────────────────────────────────────
export default function StudentSATHomeScreen({ navigation }: Props) {
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [satLevel, setSatLevel]     = useState<LevelKey>('BEGINNER');
  const [units, setUnits]           = useState<Unit[]>(MOCK_UNITS);
  const [startingMode, setStartingMode] = useState<string | null>(null);
  const [freeModal, setFreeModal]   = useState(false);
  const [simModal, setSimModal]     = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const load = useCallback(async () => {
    try {
      const { data: levelData } = await api.get('/sat/level');
      if (!levelData.hasTakenTest) { navigation.navigate('StudentSATLevelTest'); return; }
      setSatLevel(levelData.satLevel as LevelKey);
      const { data: unitsData } = await api.get('/sat/units');
      if (unitsData.units?.length > 0) setUnits(unitsData.units);
    } catch {
      // Utilise les données fictives
    } finally {
      setLoading(false); setRefreshing(false);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const launchSession = async (mode: string, opts?: { totalQuestions?: number; domaine?: string }) => {
    setStartingMode(mode);
    try {
      const { data } = await api.post('/sat/sessions/start', {
        mode, domaine: opts?.domaine || 'ALL', totalQuestions: opts?.totalQuestions || 10,
      });
      if (!data.questions?.length) { Alert.alert('Aucune question', 'Pas encore de questions disponibles.'); return; }
      navigation.navigate('StudentSATUnitTest', {
        unit: { id: 'quick', titre: mode, domaine: 'ALL', niveau: satLevel },
        sessionOverride: { sessionId: data.session.id, questions: data.questions },
      });
    } catch { Alert.alert('Erreur', 'Impossible de démarrer ce mode. Vérifie ta connexion.'); }
    finally { setStartingMode(null); }
  };

  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    if (action.mode === 'REVISION')  { navigation.navigate('StudentSATRevision'); return; }
    if (action.mode === 'FREE')      { setFreeModal(true); return; }
    if (action.mode === 'SIMULATED') { setSimModal(true); return; }
    launchSession(action.mode, { totalQuestions: 10 });
  };

  const lvl = LEVEL_CONFIG[satLevel];
  const recommendedUnits = units.filter(u => u.niveau === satLevel);
  const otherLevels = LEVEL_KEYS.filter(l => l !== satLevel);

  // Progression globale
  const allLessons = units.flatMap(u => Array.from({ length: u.lessonsTotal }, (_, i) => ({
    isCompleted: i < u.lessonsCompleted, quizPassed: i < u.quizCompleted,
  })));
  const globalPct = calcProgressPct(allLessons);
  const recLessons = recommendedUnits.flatMap(u => Array.from({ length: u.lessonsTotal }, (_, i) => ({
    isCompleted: i < u.lessonsCompleted, quizPassed: i < u.quizCompleted,
  })));
  const recPct = calcProgressPct(recLessons);

  if (loading) {
    return <View style={s.loadingView}><ActivityIndicator size="large" color={P.green} /></View>;
  }

  return (
    <View style={s.root}>
      {/* ── Header ── */}
      <LinearGradient colors={[P.white, P.greenLighter]} style={s.header}>
        <View style={s.headerContent}>
          <View>
            <Text style={s.headerEyebrow}>PRÉPARATION</Text>
            <Text style={s.headerTitle}>SAT</Text>
            <Text style={s.headerSub}>Prépare ton avenir, un score à la fois ! 🎯</Text>
          </View>
          <View style={s.headerRight}>
            {/* Badge niveau */}
            <TouchableOpacity
              style={[s.levelBadge, { borderColor: lvl.color }]}
              onPress={() => navigation.navigate('StudentSATLevelTest')}
              activeOpacity={0.8}
            >
              <LinearGradient colors={lvl.gradColors} style={s.levelBadgeGrad}>
                <Text style={{ fontSize: 18 }}>{lvl.emoji}</Text>
              </LinearGradient>
              <View style={s.levelBadgeInfo}>
                <Text style={[s.levelBadgeLabel, { color: lvl.color }]}>{lvl.labelFr}</Text>
                <Text style={s.levelBadgeRange}>{lvl.range}</Text>
              </View>
              <Ionicons name="chevron-down" size={12} color={lvl.color} />
            </TouchableOpacity>
            {/* Score global */}
            <View style={s.globalScore}>
              <Text style={s.globalScoreNum}>{globalPct}%</Text>
              <Text style={s.globalScoreLabel}>progression</Text>
            </View>
          </View>
        </View>
        {/* Barre globale */}
        <View style={s.globalBar}>
          <AnimBar value={globalPct} color={P.green} height={5} />
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={P.green} />}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Repasser le test ── */}
          <TouchableOpacity style={s.retestCard} onPress={() => navigation.navigate('StudentSATLevelTest')} activeOpacity={0.85}>
            <LinearGradient colors={['#F0FDF4', '#DCFCE7']} style={s.retestGrad}>
              <View style={s.retestLeft}>
                <View style={s.retestIconWrap}>
                  <Ionicons name="analytics-outline" size={20} color={P.green} />
                </View>
                <View>
                  <Text style={s.retestTitle}>Test de niveau</Text>
                  <Text style={s.retestDesc}>Évalue et mets à jour ton niveau SAT</Text>
                </View>
              </View>
              <View style={[s.retestBtn, { backgroundColor: P.green }]}>
                <Text style={s.retestBtnText}>Commencer</Text>
                <Ionicons name="arrow-forward" size={13} color={P.white} />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* ── Quick actions ── */}
          <Text style={s.sectionTitle}>Entraîne-toi à ton rythme</Text>
          <View style={s.quickGrid}>
            {QUICK_ACTIONS.map(action => {
              const isLoading = startingMode === action.id;
              return (
                <TouchableOpacity
                  key={action.id}
                  style={s.quickCard}
                  onPress={() => handleQuickAction(action)}
                  disabled={startingMode !== null}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={action.gradColors} style={s.quickGrad}>
                    {isLoading
                      ? <ActivityIndicator color={P.white} size="small" />
                      : <Text style={{ fontSize: 26 }}>{action.emoji}</Text>
                    }
                  </LinearGradient>
                  <Text style={s.quickLabel}>{action.label}</Text>
                  <Text style={s.quickSub}>{action.sub}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── MON PROGRAMME ── */}
          <View style={s.sectionHeaderRow}>
            <View>
              <Text style={s.sectionTitle}>Mon programme</Text>
              <Text style={s.sectionSub}>Ton parcours personnalisé · {recPct}% complété</Text>
            </View>
            <View style={[s.recPill, { backgroundColor: lvl.bgColor }]}>
              <Text style={{ fontSize: 14 }}>{lvl.emoji}</Text>
              <Text style={[s.recPillText, { color: lvl.color }]}>{lvl.labelFr}</Text>
            </View>
          </View>

          <LevelBlock
            levelKey={satLevel}
            units={recommendedUnits}
            isRecommended
            navigation={navigation}
            defaultOpen
          />

          {/* ── TOUS LES PROGRAMMES ── */}
          <View style={[s.sectionHeaderRow, { marginTop: 8 }]}>
            <View>
              <Text style={s.sectionTitle}>Tous les programmes</Text>
              <Text style={s.sectionSub}>Accès libre à tous les niveaux</Text>
            </View>
          </View>

          {otherLevels.map(level => (
            <LevelBlock
              key={level}
              levelKey={level}
              units={units.filter(u => u.niveau === level)}
              isRecommended={false}
              navigation={navigation}
              defaultOpen={false}
            />
          ))}

        </Animated.View>
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Modals ── */}
      <FreeModal
        visible={freeModal}
        onClose={() => setFreeModal(false)}
        onStart={(nb, dom) => { setFreeModal(false); launchSession('FREE', { totalQuestions: nb, domaine: dom }); }}
      />

      {/* Modal SAT Simulé */}
      <Modal visible={simModal} transparent animationType="fade" onRequestClose={() => setSimModal(false)}>
        <TouchableWithoutFeedback onPress={() => setSimModal(false)}>
          <View style={sm.overlay}>
            <TouchableWithoutFeedback>
              <View style={sm.card}>
                <LinearGradient colors={['#6D28D9', '#7C3AED']} style={sm.topGrad}>
                  <Text style={sm.emoji}>🏆</Text>
                  <Text style={sm.title}>SAT Simulé</Text>
                  <Text style={sm.subtitle}>Conditions d'examen réelles</Text>
                </LinearGradient>
                <View style={sm.body}>
                  {[
                    { icon: 'help-circle-outline', label: '98 questions au total' },
                    { icon: 'time-outline',         label: '2h 14min chronométrées' },
                    { icon: 'phone-portrait-outline', label: 'Ne quitte pas l\'application' },
                    { icon: 'trophy-outline',        label: '+200 XP à la clé' },
                  ].map((item, i) => (
                    <View key={i} style={sm.infoRow}>
                      <View style={sm.infoIcon}>
                        <Ionicons name={item.icon as any} size={16} color={P.purple} />
                      </View>
                      <Text style={sm.infoText}>{item.label}</Text>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={sm.startBtn}
                    onPress={() => { setSimModal(false); launchSession('SIMULATED', { totalQuestions: 98 }); }}
                    activeOpacity={0.85}
                  >
                    <Text style={sm.startBtnText}>Commencer l'examen</Text>
                    <Ionicons name="arrow-forward" size={18} color={P.white} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setSimModal(false)} style={sm.cancelBtn}>
                    <Text style={sm.cancelText}>Pas maintenant</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const sm = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card:         { backgroundColor: P.white, borderRadius: 28, width: '100%', overflow: 'hidden' },
  topGrad:      { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 },
  emoji:        { fontSize: 52, marginBottom: 12 },
  title:        { fontSize: 26, fontWeight: '900', color: P.white, letterSpacing: -0.5, marginBottom: 4 },
  subtitle:     { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  body:         { padding: 24 },
  infoRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  infoIcon:     { width: 34, height: 34, borderRadius: 10, backgroundColor: P.purpleLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  infoText:     { fontSize: 14, fontWeight: '600', color: P.text },
  startBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: P.purple, borderRadius: 16, paddingVertical: 16, gap: 8, marginTop: 8, marginBottom: 10 },
  startBtnText: { fontSize: 16, fontWeight: '900', color: P.white },
  cancelBtn:    { alignItems: 'center', paddingVertical: 8 },
  cancelText:   { fontSize: 14, color: P.textMuted, fontWeight: '600' },
});

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: P.bg },
  loadingView: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: P.bg },

  // Header
  header:        { paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 20, paddingBottom: 16 },
  headerContent: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  headerEyebrow: { fontSize: 11, fontWeight: '800', color: P.green, letterSpacing: 2.5, marginBottom: 4 },
  headerTitle:   { fontSize: 36, fontWeight: '900', color: P.text, letterSpacing: -1.5, marginBottom: 4 },
  headerSub:     { fontSize: 12, color: P.textSub },
  headerRight:   { alignItems: 'flex-end', gap: 10 },
  levelBadge:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: P.white, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1.5, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  levelBadgeGrad:{ width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  levelBadgeInfo:{ },
  levelBadgeLabel:{ fontSize: 12, fontWeight: '800' },
  levelBadgeRange:{ fontSize: 9, color: P.textMuted, fontWeight: '500' },
  globalScore:   { alignItems: 'center' },
  globalScoreNum:{ fontSize: 22, fontWeight: '900', color: P.green, letterSpacing: -0.5 },
  globalScoreLabel:{ fontSize: 9, color: P.textMuted, fontWeight: '600', letterSpacing: 0.5 },
  globalBar:     { marginTop: 4 },

  // Scroll
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },

  // Retest
  retestCard:  { borderRadius: 20, marginBottom: 22, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  retestGrad:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  retestLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  retestIconWrap:{ width: 40, height: 40, borderRadius: 12, backgroundColor: P.greenLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  retestTitle: { fontSize: 14, fontWeight: '800', color: P.text, marginBottom: 2 },
  retestDesc:  { fontSize: 11, color: P.textSub },
  retestBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  retestBtnText:{ fontSize: 12, fontWeight: '800', color: P.white },

  // Section
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle:     { fontSize: 17, fontWeight: '900', color: P.text, letterSpacing: -0.3 },
  sectionSub:       { fontSize: 12, color: P.textMuted, marginTop: 2 },
  recPill:          { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  recPillText:      { fontSize: 12, fontWeight: '800' },

  // Quick actions
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 26 },
  quickCard: { width: '47.5%', backgroundColor: P.white, borderRadius: 18, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: P.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  quickGrad: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  quickLabel:{ fontSize: 13, fontWeight: '800', color: P.text, textAlign: 'center', marginBottom: 3 },
  quickSub:  { fontSize: 10, color: P.textMuted, textAlign: 'center' },
});