// screens/student/StudentGamificationScreen.tsx
// Page Gamification — pixel-perfect selon le design fourni
//
// Design :
//   - Grille 3×N de badges hexagonaux colorés (gagnés = couleur vive, non gagnés = gris + cadenas)
//   - Carte "Niveau actuel" avec shield, nom du niveau, barre de progression XP
//
// Endpoints (confirmés dans app.js) :
//   GET /api/v1/gamification/me  → { gamification: { points, niveau, badges: string[], streak? } }
//
// Les badges sont définis localement (catalogue fixe) et croisés avec
// la liste `badges` retournée par le backend pour savoir lesquels sont débloqués.

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  DimensionValue,
} from 'react-native';
import Svg, { Polygon, Path, Circle, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/auth.service';

// ─── COULEURS ──────────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#0D6B5E',
  primaryDark: '#0A5449',
  gold: '#D4A017',
  goldDark: '#B8860B',
  orange: '#C0392B',
  purple: '#7B68EE',
  white: '#FFFFFF',
  background: '#FFFFFF',
  card: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  locked: '#D1D5DB',
  lockedBg: '#F3F4F6',
};

const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── TYPES ─────────────────────────────────────────────────────────────────────
type NiveauKey = 'STARTER' | 'EXPLORER' | 'SCHOLAR' | 'ACHIEVER' | 'CHAMPION';

interface GamificationRaw {
  points: number;
  niveau: NiveauKey;
  badges: string[]; // liste des IDs/noms de badges débloqués
  streak?: number;
}

interface BadgeDef {
  id: string;
  nom: string;
  sousTitre: string;
  couleur: string;       // couleur hexagone si gagné
  couleurDark: string;   // bordure/ombre hexagone
  icone: 'check' | 'fire' | 'diamond' | 'trophy' | 'lock';
}

interface BadgeItem extends BadgeDef {
  earned: boolean;
}

interface NiveauInfo {
  key: NiveauKey;
  label: string;
  pointsActuels: number;
  pointsProchain: number | null;
  progressionPourcent: number;
}

interface NavigationProp {
  navigate: (screen: string, params?: Record<string, any>) => void;
  goBack: () => void;
  replace?: (screen: string) => void;
}

interface Props {
  navigation: NavigationProp;
}

// ─── CATALOGUE DES BADGES ──────────────────────────────────────────────────────
// Correspond aux badges que le backend peut retourner dans `gamification.badges`
// Les IDs doivent correspondre aux valeurs retournées par le backend
const BADGE_CATALOGUE: BadgeDef[] = [
  {
    id: 'PREMIERS_PAS',
    nom: 'Premiers pas',
    sousTitre: '100 XP',
    couleur: '#0D6B5E',
    couleurDark: '#0A5449',
    icone: 'check',
  },
  {
    id: 'REGULIER',
    nom: 'Régulier',
    sousTitre: '7 jours de streak',
    couleur: '#C0392B',
    couleurDark: '#A93226',
    icone: 'fire',
  },
  {
    id: 'QUIZ_MASTER',
    nom: 'Quiz Master',
    sousTitre: 'Score 800+',
    couleur: '#7B68EE',
    couleurDark: '#6A5ACD',
    icone: 'diamond',
  },
  {
    id: 'PERSEVERANT',
    nom: 'Persévérant',
    sousTitre: '30 jours de streak',
    couleur: '#D4A017',
    couleurDark: '#B8860B',
    icone: 'fire',
  },
  {
    id: 'ACHIEVER',
    nom: 'Achiever',
    sousTitre: 'Atteins 3000 XP',
    couleur: '#D4A017',
    couleurDark: '#B8860B',
    icone: 'trophy',
  },
  {
    id: 'CHAMPION',
    nom: 'Champion',
    sousTitre: 'Atteins 7000 XP',
    couleur: COLORS.locked,
    couleurDark: '#9CA3AF',
    icone: 'lock',
  },
];

// ─── NIVEAUX ───────────────────────────────────────────────────────────────────
const NIVEAU_SEUILS: Record<NiveauKey, { min: number; next: number | null }> = {
  STARTER:  { min: 0,    next: 500  },
  EXPLORER: { min: 500,  next: 2000 },
  SCHOLAR:  { min: 2000, next: 3500 },
  ACHIEVER: { min: 3500, next: 7000 },
  CHAMPION: { min: 7000, next: null },
};

const NIVEAU_LABELS: Record<NiveauKey, string> = {
  STARTER:  'Starter',
  EXPLORER: 'Explorer',
  SCHOLAR:  'Scholar',
  ACHIEVER: 'Achiever',
  CHAMPION: 'Champion',
};

function deriveNiveauInfo(points: number, niveauKey: NiveauKey): NiveauInfo {
  const seuils = NIVEAU_SEUILS[niveauKey];
  const span = seuils.next !== null ? seuils.next - seuils.min : null;
  const dans = points - seuils.min;
  const pct = span ? Math.min(100, Math.round((dans / span) * 100)) : 100;
  return {
    key: niveauKey,
    label: NIVEAU_LABELS[niveauKey],
    pointsActuels: points,
    pointsProchain: seuils.next,
    progressionPourcent: pct,
  };
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────
function getErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const e = err as { response?: { status?: number; data?: { message?: string } } };
    if (e.response?.status === 401) return 'Session expirée';
    if (e.response?.data?.message) return e.response.data.message;
  }
  if (err instanceof Error) return err.message;
  return 'Une erreur est survenue';
}

// ─── COMPOSANT HEXAGONE SVG ────────────────────────────────────────────────────
// Hexagone "flat-top" pointy-side style du design
interface HexBadgeProps {
  size: number;        // largeur totale
  couleur: string;
  couleurDark: string;
  icone: BadgeDef['icone'];
  earned: boolean;
}

const HexBadge = ({ size, couleur, couleurDark, icone, earned }: HexBadgeProps) => {
  const h = size;
  const w = size;
  const cx = w / 2;
  const cy = h / 2;
  const r = w * 0.46; // rayon hexagone

  // Points d'un hexagone "pointy-top" (sommet en haut)
  const hexPoints = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');

  // Couleurs effectives
  const fillColor = earned ? couleur : COLORS.lockedBg;
  const strokeColor = earned ? couleurDark : COLORS.locked;
  const iconColor = earned ? COLORS.white : COLORS.locked;
  const iconSize = size * 0.32;

  // Rendu de l'icône SVG
  const renderIcon = () => {
    if (!earned) {
      // Cadenas
      const lw = iconSize * 0.55;
      const lh = iconSize * 0.65;
      const lx = cx - lw / 2;
      const ly = cy - lh / 2 + iconSize * 0.06;
      return (
        <G>
          {/* Corps du cadenas */}
          <Path
            d={`M ${lx + lw * 0.2} ${ly + lh * 0.45} 
                L ${lx + lw * 0.2} ${ly + lh} 
                L ${lx + lw * 0.8} ${ly + lh} 
                L ${lx + lw * 0.8} ${ly + lh * 0.45} Z`}
            fill={COLORS.locked}
          />
          {/* Arceau */}
          <Path
            d={`M ${lx + lw * 0.25} ${ly + lh * 0.45}
                L ${lx + lw * 0.25} ${ly + lh * 0.22}
                Q ${lx + lw * 0.25} ${ly} ${lx + lw * 0.5} ${ly}
                Q ${lx + lw * 0.75} ${ly} ${lx + lw * 0.75} ${ly + lh * 0.22}
                L ${lx + lw * 0.75} ${ly + lh * 0.45}`}
            fill="none"
            stroke={COLORS.locked}
            strokeWidth={lw * 0.22}
            strokeLinecap="round"
          />
        </G>
      );
    }

    if (icone === 'check') {
      const s = iconSize * 0.7;
      return (
        <Path
          d={`M ${cx - s * 0.45} ${cy} L ${cx - s * 0.1} ${cy + s * 0.38} L ${cx + s * 0.45} ${cy - s * 0.35}`}
          fill="none"
          stroke={iconColor}
          strokeWidth={s * 0.22}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }

    if (icone === 'fire') {
      const fw = iconSize * 0.6;
      const fh = iconSize * 0.75;
      const fx = cx - fw / 2;
      const fy = cy - fh / 2;
      return (
        <Path
          d={`M ${cx} ${fy}
              C ${cx + fw * 0.3} ${fy + fh * 0.2} ${fx + fw * 0.95} ${fy + fh * 0.35}
                ${fx + fw * 0.85} ${fy + fh * 0.6}
              C ${fx + fw * 0.8} ${fy + fh * 0.85} ${cx + fw * 0.15} ${fy + fh * 0.9}
                ${fx + fw * 0.3} ${fy + fh * 0.75}
              C ${fx + fw * 0.2} ${fy + fh * 0.9} ${fx} ${fy + fh}
                ${fx + fw * 0.15} ${fy + fh * 0.7}
              C ${fx} ${fy + fh * 0.45} ${cx - fw * 0.15} ${fy + fh * 0.25} ${cx} ${fy} Z`}
          fill={iconColor}
          opacity={0.9}
        />
      );
    }

    if (icone === 'diamond') {
      const dw = iconSize * 0.65;
      const dh = iconSize * 0.65;
      const dx = cx - dw / 2;
      const dy = cy - dh / 2;
      return (
        <Path
          d={`M ${dx + dw * 0.5} ${dy}
              L ${dx + dw} ${dy + dh * 0.35}
              L ${dx + dw * 0.5} ${dy + dh}
              L ${dx} ${dy + dh * 0.35} Z
              M ${dx + dw * 0.25} ${dy + dh * 0.35}
              L ${dx + dw * 0.5} ${dy + dh * 0.1}
              L ${dx + dw * 0.75} ${dy + dh * 0.35}`}
          fill={iconColor}
          opacity={0.9}
        />
      );
    }

    if (icone === 'trophy') {
      const tw = iconSize * 0.65;
      const th = iconSize * 0.65;
      const tx = cx - tw / 2;
      const ty = cy - th / 2;
      return (
        <G>
          <Path
            d={`M ${tx + tw * 0.2} ${ty}
                L ${tx + tw * 0.8} ${ty}
                L ${tx + tw * 0.8} ${ty + th * 0.5}
                Q ${tx + tw * 0.8} ${ty + th * 0.78} ${tx + tw * 0.5} ${ty + th * 0.78}
                Q ${tx + tw * 0.2} ${ty + th * 0.78} ${tx + tw * 0.2} ${ty + th * 0.5} Z`}
            fill={iconColor}
          />
          {/* Poignées */}
          <Path
            d={`M ${tx + tw * 0.2} ${ty + th * 0.15}
                Q ${tx} ${ty + th * 0.15} ${tx} ${ty + th * 0.38}
                Q ${tx} ${ty + th * 0.55} ${tx + tw * 0.2} ${ty + th * 0.55}`}
            fill="none"
            stroke={iconColor}
            strokeWidth={tw * 0.1}
          />
          <Path
            d={`M ${tx + tw * 0.8} ${ty + th * 0.15}
                Q ${tx + tw} ${ty + th * 0.15} ${tx + tw} ${ty + th * 0.38}
                Q ${tx + tw} ${ty + th * 0.55} ${tx + tw * 0.8} ${ty + th * 0.55}`}
            fill="none"
            stroke={iconColor}
            strokeWidth={tw * 0.1}
          />
          {/* Pied */}
          <Path
            d={`M ${tx + tw * 0.35} ${ty + th * 0.78}
                L ${tx + tw * 0.35} ${ty + th * 0.92}
                L ${tx + tw * 0.65} ${ty + th * 0.92}
                L ${tx + tw * 0.65} ${ty + th * 0.78}`}
            fill={iconColor}
          />
          <Path
            d={`M ${tx + tw * 0.2} ${ty + th * 0.92}
                L ${tx + tw * 0.8} ${ty + th * 0.92}`}
            stroke={iconColor}
            strokeWidth={tw * 0.12}
            strokeLinecap="round"
          />
        </G>
      );
    }

    return null;
  };

  return (
    <Svg width={w} height={h}>
      {/* Ombre légère */}
      <Polygon
        points={hexPoints}
        fill={strokeColor}
        opacity={0.3}
        translateY={2}
      />
      {/* Hexagone principal */}
      <Polygon
        points={hexPoints}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={2}
      />
      {/* Reflet clair en haut */}
      {earned && (
        <Polygon
          points={hexPoints}
          fill={COLORS.white}
          opacity={0.12}
        />
      )}
      {/* Icône */}
      {renderIcon()}
    </Svg>
  );
};

// ─── COMPOSANT SHIELD NIVEAU ───────────────────────────────────────────────────
const ShieldIcon = ({ size = 52 }: { size?: number }) => {
  const w = size;
  const h = size * 1.15;
  return (
    <Svg width={w} height={h} viewBox="0 0 52 60">
      <Path
        d="M26 2 L48 12 L48 30 Q48 48 26 58 Q4 48 4 30 L4 12 Z"
        fill={COLORS.primary}
        stroke={COLORS.primaryDark}
        strokeWidth={1.5}
      />
      {/* Déco intérieure */}
      <Circle cx={26} cy={26} r={10} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} />
      <Path
        d="M20 26 L24 30 L32 22"
        fill="none"
        stroke={COLORS.white}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

// ─── API ───────────────────────────────────────────────────────────────────────
async function fetchGamification(): Promise<{
  badges: BadgeItem[];
  niveau: NiveauInfo;
}> {
  const res = await api.get('/gamification/me');
  const raw: GamificationRaw = res.data?.gamification ?? res.data;

  // Croise le catalogue local avec les badges débloqués par le backend
  const earnedIds: string[] = raw.badges ?? [];
  const badges: BadgeItem[] = BADGE_CATALOGUE.map((def) => ({
    ...def,
    // Considère le badge gagné si son ID figure dans la liste backend
    // OU si les points actuels dépassent le seuil (fallback logique)
    earned:
      earnedIds.some(
        (id) =>
          id === def.id ||
          id?.toLowerCase() === def.id.toLowerCase() ||
          id?.toLowerCase().includes(def.id.toLowerCase())
      ) || isEarnedByPoints(def.id, raw.points, raw.streak ?? 0),
  }));

  const niveau = deriveNiveauInfo(raw.points, raw.niveau);
  return { badges, niveau };
}

// Fallback : déduit si un badge est gagné depuis les points/streak si le backend
// ne renvoie pas encore les IDs structurés
function isEarnedByPoints(badgeId: string, points: number, streak: number): boolean {
  switch (badgeId) {
    case 'PREMIERS_PAS':    return points >= 100;
    case 'REGULIER':        return streak >= 7;
    case 'QUIZ_MASTER':     return false; // nécessite score quiz, pas déduit ici
    case 'PERSEVERANT':     return streak >= 30;
    case 'ACHIEVER':        return points >= 3000;
    case 'CHAMPION':        return points >= 7000;
    default:                return false;
  }
}

// ─── ÉCRAN PRINCIPAL ───────────────────────────────────────────────────────────
export default function StudentGamificationScreen({ navigation }: Props) {
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [niveau, setNiveau] = useState<NiveauInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchGamification();
      setBadges(result.badges);
      setNiveau(result.niveau);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Taille des hexagones : 3 colonnes avec espacement
  const HEX_SIZE = Math.floor((SCREEN_WIDTH - 32 - 24) / 3); // 16px padding × 2 + 2 gaps × 12

  // ── Loading ──
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Erreur ──
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={44} color={COLORS.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const progressWidth: DimensionValue =
    `${niveau?.progressionPourcent ?? 0}%` as DimensionValue;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <Header onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Grille de badges hexagonaux ── */}
        <View style={styles.badgesGrid}>
          {badges.map((badge) => (
            <View key={badge.id} style={styles.badgeCell}>
              <HexBadge
                size={HEX_SIZE}
                couleur={badge.earned ? badge.couleur : COLORS.lockedBg}
                couleurDark={badge.earned ? badge.couleurDark : COLORS.locked}
                icone={badge.earned ? badge.icone : 'lock'}
                earned={badge.earned}
              />
              <Text style={[styles.badgeName, !badge.earned && styles.badgeNameLocked]}>
                {badge.nom}
              </Text>
              <Text style={[styles.badgeSub, !badge.earned && styles.badgeSubLocked]}>
                {badge.sousTitre}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Carte Niveau actuel ── */}
        {niveau && (
          <View style={styles.niveauCard}>
            {/* Shield */}
            <ShieldIcon size={52} />

            {/* Infos niveau */}
            <View style={styles.niveauInfo}>
              <Text style={styles.niveauLabel}>Niveau actuel</Text>
              <Text style={styles.niveauValue}>{niveau.label}</Text>

              {/* Barre de progression */}
              <View style={styles.progressRow}>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: progressWidth }]} />
                </View>
                <Text style={styles.progressText}>
                  {niveau.pointsActuels.toLocaleString('fr-FR')} /{' '}
                  {niveau.pointsProchain
                    ? niveau.pointsProchain.toLocaleString('fr-FR')
                    : '∞'}{' '}
                  XP
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Header séparé ──────────────────────────────────────────────────────────
const Header = ({ onBack }: { onBack: () => void }) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onBack} style={styles.backBtn}>
      <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>Mes badges</Text>
    <View style={{ width: 32 }} />
  </View>
);

// ─── STYLES ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 25, fontWeight: '800', color: '#0D6B5E'
  },
  backBtn: {
    width: 32,
  },

  // ── Grille badges ──
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
    justifyContent: 'space-between',
  },
  badgeCell: {
    alignItems: 'center',
    width: Math.floor((SCREEN_WIDTH - 32 - 24) / 3),
  },
  badgeName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: -0.1,
  },
  badgeNameLocked: {
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  badgeSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  badgeSubLocked: {
    color: COLORS.textMuted,
  },

  // ── Carte niveau ──
  niveauCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  niveauInfo: {
    flex: 1,
  },
  niveauLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  niveauValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  progressRow: {
    gap: 6,
  },
  progressBg: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'right',
  },

  // ── Erreur ──
  errorText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});