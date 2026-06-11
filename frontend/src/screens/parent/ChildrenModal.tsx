// ─── src/screens/parent/ChildrenModal.tsx ────────────────────────────────────
// Remplace le contenu du modal "Multi-child Management" dans ParentProfilScreen
// Usage : <ChildrenModal visible={showChildrenModal} onClose={() => setShowChildrenModal(false)} />

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as SecureStore from 'expo-secure-store';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SATScore {
  total: number;
  math: number;
  reading: number;
}

interface GamificationData {
   points: number;        // était totalPoints
  niveau: string;        // était level (c'est un ENUM string ici)
  streak: number;        // était currentStreak
  badges: string[];
}

interface UserProfileData {
  niveauScolaire: string | null;
  photo: string | null;
  progression: Record<string, unknown> | null;
}

interface Child {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  photo: string | null;
  profile: UserProfileData | null;
  gamification: GamificationData | null;
  satBestScore: SATScore | null;
}

interface ChildrenModalProps {
  visible: boolean;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ACTIVE_CHILD_KEY = 'active_child_id';

const getInitials = (prenom: string, nom: string) =>
  `${prenom?.[0] ?? ''}${nom?.[0] ?? ''}`.toUpperCase() || '?';

const getLevelColor = (niveau: string) => {
  if (niveau === 'CHAMPION' || niveau === 'ACHIEVER') return '#7C3AED';
  if (niveau === 'SCHOLAR'  || niveau === 'EXPLORER') return '#0D6B5E';
  return '#F59E0B'; // STARTER
};

const getLevelLabel = (niveau: string) => {
  const labels: Record<string, string> = {
    CHAMPION: 'Champion',
    ACHIEVER: 'Achiever',
    SCHOLAR:  'Scholar',
    EXPLORER: 'Explorer',
    STARTER:  'Débutant',
  };
  return labels[niveau] ?? 'Débutant';
};

const formatSATScore = (score: number | undefined | null) =>
  score != null ? score.toString() : '—';

// ─── Child Card ───────────────────────────────────────────────────────────────
function ChildCard({
  child,
  isActive,
  onSelect,
}: {
  child: Child;
  isActive: boolean;
  onSelect: () => void;
}) {
  const fullName = `${child.prenom} ${child.nom}`;
  const initials = getInitials(child.prenom, child.nom);
  const level  = child.gamification?.niveau ?? 'STARTER';  // string, pas number
const points = child.gamification?.points ?? 0;
const streak = child.gamification?.streak ?? 0;
  const satTotal = child.satBestScore?.total;
  const niveauScolaire = child.profile?.niveauScolaire ?? 'Non renseigné';
  const avatarUri = child.photo ?? child.profile?.photo ?? null;
  const levelColor = getLevelColor(level);

  return (
    <TouchableOpacity
      style={[styles.card, isActive && styles.cardActive]}
      onPress={onSelect}
      activeOpacity={0.85}
    >
      {/* Active badge */}
      {isActive && (
        <View style={styles.activeBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#0D6B5E" />
          <Text style={styles.activeBadgeText}>Actif</Text>
        </View>
      )}

      {/* Header row */}
      <View style={styles.cardHeader}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: levelColor + '22' }]}>
              <Text style={[styles.avatarInitials, { color: levelColor }]}>{initials}</Text>
            </View>
          )}
          {/* Level ring */}
          <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
               <Text style={styles.levelBadgeText}>{level[0]}</Text>
          </View>
        </View>

        {/* Name + school level */}
        <View style={styles.cardIdentity}>
          <Text style={styles.childName}>{fullName}</Text>
          <View style={styles.schoolRow}>
            <Ionicons name="school-outline" size={12} color="#888" />
            <Text style={styles.schoolLabel}>{niveauScolaire}</Text>
          </View>
          <Text style={[styles.levelLabel, { color: levelColor }]}>{getLevelLabel(level)}</Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatSATScore(satTotal)}</Text>
          <Text style={styles.statLabel}>Score SAT</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{points.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={styles.streakRow}>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.streakFire}>🔥</Text>
          </View>
          <Text style={styles.statLabel}>Série</Text>
        </View>
      </View>

      {/* SAT detail (only if available) */}
      {child.satBestScore && (
        <View style={styles.satDetail}>
          <View style={styles.satChip}>
            <Text style={styles.satChipLabel}>Maths</Text>
            <Text style={styles.satChipValue}>{child.satBestScore.math ?? '—'}</Text>
          </View>
          <View style={styles.satChip}>
            <Text style={styles.satChipLabel}>Lecture</Text>
            <Text style={styles.satChipValue}>{child.satBestScore.reading ?? '—'}</Text>
          </View>
        </View>
      )}

      {/* Select button */}
      {!isActive && (
        <TouchableOpacity style={styles.selectBtn} onPress={onSelect}>
          <Text style={styles.selectBtnText}>Sélectionner</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function ChildrenModal({ visible, onClose }: ChildrenModalProps) {
  const [children, setChildren]       = useState<Child[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);

 const fetchChildren = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      
      const token = await SecureStore.getItemAsync('accessToken');
      
      if (!token) throw new Error('Non authentifié');

      // 1. La base doit juste être le serveur (ex: http://192.168.1.5:3000)
      const SERVER_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.5:3000';
      
      // 2. Le chemin complet de la route
      const ENDPOINT = `${SERVER_URL}/api/v1/users/my-children`;

      const response = await fetch(ENDPOINT, {
        method: 'GET', // Précisez bien la méthode
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Log pour voir exactement l'URL en cas d'erreur
        console.log("Erreur sur l'URL:", ENDPOINT);
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? `Erreur ${response.status}`);
      }

      const data = await response.json();
      setChildren(data.children ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (visible) fetchChildren();
  }, [visible, fetchChildren]);

  const handleSelectChild = async (child: Child) => {
    try {
      await SecureStore.setItemAsync(ACTIVE_CHILD_KEY, child.id);
      setActiveChildId(child.id);
      Alert.alert(
        '✅ Enfant sélectionné',
        `${child.prenom} ${child.nom} est maintenant l'enfant actif.`
      );
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder la sélection.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Mes enfants</Text>
              {children.length > 0 && (
                <Text style={styles.sheetSubtitle}>
                  {children.length} enfant{children.length > 1 ? 's' : ''} lié{children.length > 1 ? 's' : ''}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#555" />
            </TouchableOpacity>
          </View>

          {/* Info banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={15} color="#0D6B5E" />
            <Text style={styles.infoBannerText}>
              Sélectionnez un enfant pour voir ses stats sur les autres écrans.
            </Text>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#0D6B5E" />
              <Text style={styles.loadingText}>Chargement…</Text>
            </View>
          ) : error ? (
            <View style={styles.centerBox}>
              <Ionicons name="alert-circle-outline" size={40} color="#E53935" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => fetchChildren()}>
                <Text style={styles.retryBtnText}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          ) : children.length === 0 ? (
            <View style={styles.centerBox}>
              <Ionicons name="people-outline" size={48} color="#DDD" />
              <Text style={styles.emptyTitle}>Aucun enfant lié</Text>
              <Text style={styles.emptySubtitle}>
                Contactez l'administrateur pour lier un compte enfant.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              contentContainerStyle={{ paddingBottom: 32 }}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => fetchChildren(true)}
                  tintColor="#0D6B5E"
                />
              }
            >
              {children.map((child) => (
                <ChildCard
                  key={child.id}
                  child={child}
                  isActive={child.id === activeChildId}
                  onSelect={() => handleSelectChild(child)}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: 300,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  sheetSubtitle: { fontSize: 13, color: '#888', marginTop: 2 },
  closeBtn: { padding: 4, marginTop: 2 },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0D6B5E0D',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  infoBannerText: { flex: 1, fontSize: 12, color: '#0D6B5E', lineHeight: 17 },

  list: { paddingHorizontal: 20, paddingTop: 12 },

  // ── Card ──
  card: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
  },
  cardActive: {
    borderColor: '#0D6B5E',
    backgroundColor: '#0D6B5E08',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  activeBadgeText: { fontSize: 11, fontWeight: '700', color: '#0D6B5E' },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitials: { fontSize: 20, fontWeight: '800' },
  levelBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  levelBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  cardIdentity: { flex: 1 },
  childName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 3 },
  schoolRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  schoolLabel: { fontSize: 12, color: '#888' },
  levelLabel: { fontSize: 11, fontWeight: '600' },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  statLabel: { fontSize: 10, color: '#AAA', marginTop: 2, fontWeight: '500' },
  statDivider: { width: 1, height: 32, backgroundColor: '#F0F0F0' },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  streakFire: { fontSize: 14 },

  satDetail: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  satChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F7F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  satChipLabel: { fontSize: 12, color: '#888', fontWeight: '500' },
  satChipValue: { fontSize: 14, fontWeight: '700', color: '#0D6B5E' },

  selectBtn: {
    backgroundColor: '#0D6B5E',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  selectBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // ── States ──
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: '#888' },
  errorText: { marginTop: 12, fontSize: 14, color: '#E53935', textAlign: 'center' },
  retryBtn: {
    marginTop: 16, backgroundColor: '#0D6B5E',
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: '#888', marginTop: 6, textAlign: 'center', lineHeight: 19 },
});