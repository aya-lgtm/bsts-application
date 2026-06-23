// screens/student/StudentHomeScreen.tsx
// Page d'accueil étudiant BSTS — pixel-perfect selon le design fourni
// Modifications :
//  ✅ Logo logo1.png (shield BSTS) remplace le badge texte
//  ✅ Icône notification fonctionnelle avec badge dynamique → navigate('Notifications')
//  ✅ Carte Streak du jour connectée au backend (champ streak dans Gamification)
//  ✅ Section "Quiz quotidien recommandé" fidèle au design avec +XP et bouton Commencer
//  ✅ Activité récente réelle (quiz + leçons) depuis le backend
//  ✅ Pull-to-refresh, loading, error states

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  DimensionValue,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/auth.service';

// ─── ASSETS ────────────────────────────────────────────────────────────────────
const logo = require('../../assets/logo1.png');

// ─── COULEURS ──────────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#0D6B5E',
  primaryLight: '#E1F5EE',
  gold: '#D4A017',
  goldLight: '#FFF8E7',
  white: '#FFFFFF',
  background: '#F5F5F0',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textMuted: '#9E9E9E',
  border: '#E8E8E8',
  success: '#4CAF50',
  danger: '#E24B4A',
};

// ─── TYPES ─────────────────────────────────────────────────────────────────────
interface Utilisateur {
  id: string;
  nom: string;
  prenom: string;
  photo?: string | null;
}

type NiveauKey = 'STARTER' | 'EXPLORER' | 'SCHOLAR' | 'ACHIEVER' | 'CHAMPION';

interface GamificationRaw {
  userId: string;
  points: number;
  niveau: NiveauKey;
  badges: string[];
  streak?: number; // champ optionnel — exposé par le backend si disponible
}

const NIVEAU_SEUILS: Record<NiveauKey, { min: number; next: number | null; suivant: string }> = {
  STARTER:  { min: 0,    next: 500,  suivant: 'Explorer' },
  EXPLORER: { min: 500,  next: 1500, suivant: 'Scholar'  },
  SCHOLAR:  { min: 1500, next: 3500, suivant: 'Achiever' },
  ACHIEVER: { min: 3500, next: 7000, suivant: 'Champion' },
  CHAMPION: { min: 7000, next: null, suivant: 'Max'      },
};

const NIVEAU_LABELS: Record<NiveauKey, string> = {
  STARTER: 'Starter',
  EXPLORER: 'Explorer',
  SCHOLAR: 'Scholar',
  ACHIEVER: 'Achiever',
  CHAMPION: 'Champion',
};

const NIVEAU_ORDRE: NiveauKey[] = ['STARTER', 'EXPLORER', 'SCHOLAR', 'ACHIEVER', 'CHAMPION'];

interface NiveauGamification {
  key: NiveauKey;
  numero: number;
  label: string;
  progressionPourcent: number;
  pointsActuels: number;
  pointsProchainNiveau: number | null;
  prochainLabel: string;
}

interface Gamification {
  points: number;
  streak: number;
  niveau: NiveauGamification;
}

function deriveNiveau(points: number, niveauKey: NiveauKey): NiveauGamification {
  const seuils = NIVEAU_SEUILS[niveauKey];
  const numero = NIVEAU_ORDRE.indexOf(niveauKey) + 1;
  const pointsActuelsDansNiveau = points - seuils.min;
  const span = seuils.next !== null ? seuils.next - seuils.min : null;
  const progressionPourcent = span
    ? Math.min(100, Math.round((pointsActuelsDansNiveau / span) * 100))
    : 100;

  return {
    key: niveauKey,
    numero,
    label: NIVEAU_LABELS[niveauKey],
    progressionPourcent,
    pointsActuels: points,
    pointsProchainNiveau: seuils.next,
    prochainLabel: seuils.suivant,
  };
}

interface QuizResultItem {
  id: string;
  quizId: string;
  quizTitre?: string;
  score?: number;
  scoreTotal?: number;
  createdAt: string;
}

// Leçon récente (GET /lessons/my-progress ou /courses/my-progress selon le backend)
interface LessonProgressItem {
  id: string;
  lessonId?: string;
  lessonTitre?: string;
  titre?: string;
  progressionPourcent?: number;
  completedAt?: string;
  updatedAt?: string;
}

interface ActiviteItem {
  id: string;
  type: 'lesson' | 'quiz' | string;
  titre: string;
  sousTitre: string;
  date: string;
}

// Quiz recommandé — construit depuis le quiz le plus récent disponible
// ou depuis un endpoint dédié si le backend l'expose
interface QuizRecommande {
  id: string;
  titre: string;
  description: string;
  xpRecompense: number;
}

interface HomeData {
  utilisateur: Utilisateur;
  gamification: Gamification;
  activiteRecente: ActiviteItem[];
  quizRecommande: QuizRecommande | null;
  unreadCount: number;
}

interface NavigationProp {
  navigate: (screen: string, params?: Record<string, any>) => void;
  replace?: (screen: string) => void; // optionnel — absent dans certains navigateurs (tabs)
  goBack?: () => void;
}

interface HomeScreenProps {
  navigation: NavigationProp;
}


// ─── API HELPER ────────────────────────────────────────────────────────────────
// Endpoints RÉELS confirmés depuis course.routes.js + quiz.routes.js :
//   GET /users/profile              → profil utilisateur
//   GET /gamification/me            → { gamification: { points, niveau, badges, streak? } }
//   GET /quiz/my-results            → derniers résultats de quiz
//   GET /course/progress/me         → progression leçons de l'étudiant
//   GET /course/subjects            → liste des matières
//   GET /course/subjects/:id/chapters → chapitres d'une matière
//   GET /quiz/chapter/:chapterId    → quiz d'un chapitre (pour le quiz recommandé)
//   GET /notifications?limit=50     → compteur non lus
const fetchHomeData = async (): Promise<HomeData> => {
  const [profileRes, gamificationRes, resultsRes, progressRes, notifRes] = await Promise.all([
    api.get('/users/profile'),
    api.get('/gamification/me'),
    api.get('/quiz/my-results').catch(() => ({ data: { results: [] } })),
    api.get('/courses/progress/me').catch(() => ({ data: { progress: [] } })),
    api.get('/notifications?limit=50').catch(() => ({ data: { notifications: [] } })),
  ]);

  // ── Utilisateur ──
  const user = profileRes.data?.user ?? profileRes.data;

  // ── Gamification ──
  const gamificationRaw: GamificationRaw =
    gamificationRes.data?.gamification ?? gamificationRes.data;

  const gamification: Gamification = {
    points: gamificationRaw.points,
    streak: gamificationRaw.streak ?? 0,
    niveau: deriveNiveau(gamificationRaw.points, gamificationRaw.niveau),
  };

  // ── Activité récente : quiz ──
  const results: QuizResultItem[] = resultsRes.data?.results ?? resultsRes.data ?? [];
  const activiteQuiz: ActiviteItem[] = results.slice(0, 3).map((r) => ({
    id: r.id,
    type: 'quiz',
    titre: r.quizTitre ?? 'Quiz complété',
    sousTitre:
      r.score !== undefined && r.scoreTotal !== undefined
        ? `Score ${r.score}/${r.scoreTotal}`
        : 'Résultat disponible',
    date: formatDate(r.createdAt),
  }));

  // ── Activité récente : leçons depuis GET /course/progress/me ──
  const progressList: any[] = progressRes.data?.progress ?? progressRes.data ?? [];
  const activiteLecon: ActiviteItem[] = progressList
    .filter((p: any) => p.completed === true || p.statut === 'completed')
    .slice(0, 2)
    .map((p: any) => ({
      id: p.id ?? p.lessonId ?? String(Math.random()),
      type: 'lesson' as const,
      titre: p.lesson?.titre ?? p.lessonTitre ?? 'Leçon complétée',
      sousTitre: 'Complétée à 100%',
      date: formatDate(p.updatedAt ?? p.createdAt ?? new Date().toISOString()),
    }));

  // Fusionne et trie par date décroissante, limite à 5
  const activiteRecente: ActiviteItem[] = [...activiteQuiz, ...activiteLecon]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // ── Quiz recommandé ──
  // Pas de /quiz/recommended → on prend le quiz du 1er chapitre du 1er subject
  let quizRecommande: QuizRecommande | null = null;
  try {
    const subjectsRes = await api.get('/courses/subjects');
    const subjects: any[] = subjectsRes.data?.subjects ?? subjectsRes.data ?? [];
    if (subjects.length > 0) {
      const chapRes = await api.get(`/courses/subjects/${subjects[0].id}/chapters`);
      const chapters: any[] = chapRes.data?.chapters ?? chapRes.data ?? [];
      if (chapters.length > 0) {
        const qRes = await api.get(`/quiz/chapter/${chapters[0].id}`);
        const q = qRes.data?.quiz ?? qRes.data;
        if (q?.id) {
          quizRecommande = {
            id: q.id,
            titre: q.titre ?? 'Révision rapide',
            description: q.description ?? '10 questions adaptées à ton niveau',
            xpRecompense: q.xpRecompense ?? 50,
          };
        }
      }
    }
  } catch {
    // Aucun quiz disponible — la carte ne s'affiche pas
  }

  // ── Notifications non lues ──
  const notifications: { read?: boolean; isRead?: boolean }[] =
    notifRes.data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.read && !n.isRead).length;

  return {
    utilisateur: {
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      photo: user.photo ?? null,
    },
    gamification,
    activiteRecente,
    quizRecommande,
    unreadCount,
  };
};


// Formate une date ISO en "Aujourd'hui", "Hier" ou "DD MMM"
function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.setHours(0, 0, 0, 0) - date.setHours(0, 0, 0, 0)) / 86_400_000
    );
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    return new Date(isoString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return '';
  }
}

function getErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
    if (axiosErr.response?.status === 401) return 'Session expirée';
    if (axiosErr.response?.data?.message) return axiosErr.response.data.message;
  }
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Une erreur est survenue';
}

// ─── SOUS-COMPOSANTS ───────────────────────────────────────────────────────────

// ── TopBar : logo shield + hamburger + notification ──
interface TopBarProps {
  unreadCount: number;
  onMenuPress: () => void;
  onNotifPress: () => void;
}

const TopBar = ({ unreadCount, onMenuPress, onNotifPress }: TopBarProps) => (
  <View style={styles.topBar}>
    {/* Hamburger */}
    <TouchableOpacity onPress={onMenuPress} style={styles.topBarSide}>
      <Ionicons name="menu-outline" size={28} color={COLORS.textPrimary} />
    </TouchableOpacity>

    {/* Logo shield BSTS centré */}
    <Image source={logo} style={styles.topBarLogo} resizeMode="contain" />

    {/* Cloche notification */}
    <TouchableOpacity onPress={onNotifPress} style={styles.topBarSide}>
      <View>
        <Ionicons name="notifications-outline" size={26} color={COLORS.textPrimary} />
        {unreadCount > 0 && (
          <View style={styles.notifBadge}>
            <Text style={styles.notifBadgeText}>
              {unreadCount > 9 ? '9+' : String(unreadCount)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  </View>
);

// ── Salutation ──
interface GreetingProps {
  prenom: string;
  photo?: string | null;
}

const Greeting = ({ prenom, photo }: GreetingProps) => (
  <View style={styles.greetingRow}>
    {photo ? (
      <Image source={{ uri: photo }} style={styles.greetingAvatar} />
    ) : null}
    <View>
      <Text style={styles.greetingTitle}>Bonjour, {prenom} 👋</Text>
      <Text style={styles.greetingSub}>Prête à atteindre ton objectif aujourd'hui ?</Text>
    </View>
  </View>
);

// ── Streak du jour ──
interface StreakCardProps {
  streak: number;
}

const StreakCard = ({ streak }: StreakCardProps) => (
  <View style={styles.streakCard}>
    <View style={styles.streakLeft}>
      <Text style={styles.streakEmoji}>🔥</Text>
      <View>
        <Text style={styles.streakLabel}>Streak du jour</Text>
        <Text style={styles.streakValue}>{streak} jour{streak !== 1 ? 's' : ''}</Text>
      </View>
    </View>
    <Text style={styles.streakXP}>+10 XP</Text>
  </View>
);

// ── XP + Niveau ──
interface XPNiveauRowProps {
  gamification: Gamification;
}

const XPNiveauRow = ({ gamification }: XPNiveauRowProps) => {
  const { points, niveau } = gamification;
  return (
    <View style={styles.xpNiveauRow}>
      {/* XP Card */}
      <View style={[styles.xpCard, { flex: 1, marginRight: 8 }]}>
        <View style={styles.xpCardHeader}>
          <View style={styles.xpIcon}>
            <Ionicons name="ellipse" size={14} color={COLORS.primary} />
          </View>
          <Text style={styles.xpCardLabel}>XP actuel</Text>
        </View>
        <Text style={styles.xpCardValue}>{points.toLocaleString('fr-FR')}</Text>
      </View>

      {/* Niveau Card */}
      <View style={[styles.xpCard, { flex: 1, marginLeft: 8 }]}>
        <Text style={styles.xpCardLabel}>Niveau</Text>
        <Text style={[styles.xpCardValue, { color: COLORS.primary }]}>
          {niveau.label}
        </Text>
        <View style={styles.niveauBadge}>
          <Text style={styles.niveauBadgeText}>Niveau {niveau.numero}</Text>
          {/* Hexagone étoile doré fidèle au design */}
          <View style={styles.niveauHexagon}>
            <Text style={styles.niveauStar}>⭐</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// ── Barre de progression ──
interface ProgressionBarProps {
  gamification: Gamification;
}

const ProgressionBar = ({ gamification }: ProgressionBarProps) => {
  const { niveau } = gamification;
  const progressWidth: DimensionValue = `${niveau.progressionPourcent}%` as DimensionValue;

  return (
    <View style={styles.progressionContainer}>
      <View style={styles.progressionHeader}>
        <Text style={styles.progressionLabel}>
          Progression vers {niveau.prochainLabel}
        </Text>
        <Text style={styles.progressionValue}>
          {niveau.pointsActuels.toLocaleString('fr-FR')} /{' '}
          {niveau.pointsProchainNiveau
            ? niveau.pointsProchainNiveau.toLocaleString('fr-FR')
            : '∞'}{' '}
          XP
        </Text>
      </View>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: progressWidth }]} />
      </View>
    </View>
  );
};

// ── Quiz quotidien recommandé ──
interface QuizCardProps {
  quiz: QuizRecommande;
  onPress: () => void;
}

const QuizCard = ({ quiz, onPress }: QuizCardProps) => (
  <View style={styles.sectionBlock}>
    <Text style={styles.sectionTitle}>Quiz quotidien recommandé</Text>
    <View style={styles.quizCard}>
      <View style={styles.quizCardInner}>
        {/* Icône gauche */}
        <View style={styles.quizIconContainer}>
          <Ionicons name="grid-outline" size={22} color={COLORS.white} />
        </View>

        {/* Texte centre */}
        <View style={styles.quizCardText}>
          <Text style={styles.quizCardTitle}>{quiz.titre}</Text>
          <Text style={styles.quizCardSub}>{quiz.description}</Text>
        </View>

        {/* XP + bouton droite */}
        <View style={styles.quizCardRight}>
          <Text style={styles.quizXP}>+{quiz.xpRecompense} XP</Text>
          <TouchableOpacity style={styles.quizBtn} onPress={onPress} activeOpacity={0.85}>
            <Text style={styles.quizBtnText}>Commencer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </View>
);

// ── Activité récente ──
interface ActivityItemProps {
  item: ActiviteItem;
}

const ActivityItemRow = ({ item }: ActivityItemProps) => {
  const isLesson = item.type === 'lesson';
  return (
    <View style={styles.activityItem}>
      <View style={[
        styles.activityIcon,
        isLesson ? styles.activityIconGreen : styles.activityIconGold,
      ]}>
        <Ionicons
          name={isLesson ? 'play-circle-outline' : 'star-outline'}
          size={20}
          color={isLesson ? COLORS.primary : COLORS.gold}
        />
      </View>
      <View style={styles.activityText}>
        <Text style={styles.activityTitle}>{item.titre}</Text>
        <Text style={styles.activitySub}>{item.sousTitre}</Text>
      </View>
      <Text style={styles.activityDate}>{item.date}</Text>
    </View>
  );
};

interface ActiviteRecenteProps {
  activites: ActiviteItem[];
}

const ActiviteRecente = ({ activites }: ActiviteRecenteProps) => (
  <View style={styles.sectionBlock}>
    <Text style={styles.sectionTitle}>Activité récente</Text>
    <View style={styles.activityCard}>
      {activites.length === 0 ? (
        <Text style={styles.emptyText}>Aucune activité pour le moment</Text>
      ) : (
        activites.map((item, index) => (
          <View key={item.id}>
            <ActivityItemRow item={item} />
            {index < activites.length - 1 && <View style={styles.activityDivider} />}
          </View>
        ))
      )}
    </View>
  </View>
);

// ─── ÉCRAN PRINCIPAL ───────────────────────────────────────────────────────────
export default function StudentHomeScreen({ navigation }: HomeScreenProps) {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const result = await fetchHomeData();
        setData(result);
      } catch (err: unknown) {
        const message = getErrorMessage(err);
        console.error('[StudentHomeScreen] Erreur:', message);
        setError(message);

        if (message === 'Session expirée') {
          Alert.alert('Session expirée', 'Veuillez vous reconnecter.', [
            {
              text: 'OK',
              onPress: () =>
                navigation.replace
                  ? navigation.replace('Login')
                  : navigation.navigate('Login'),
            },
          ]);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigation]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Handlers navigation ──
  const handleNotifPress = () => navigation.navigate('Notifications');
  const handleMenuPress = () => navigation.navigate('Menu'); // ou drawer open si utilisé
  const handleQuizPress = (quizId?: string) => {
    if (quizId) {
      navigation.navigate('Quiz', { quizId });
    } else {
      navigation.navigate('StudentCourses');
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  // ── Erreur fatale ──
  if (error && !data) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!data) return null;

  const { utilisateur, gamification, activiteRecente, quizRecommande, unreadCount } = data;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* ── TopBar : hamburger | logo shield | cloche ── */}
      <TopBar
        unreadCount={unreadCount}
        onMenuPress={handleMenuPress}
        onNotifPress={handleNotifPress}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Salutation */}
        <Greeting prenom={utilisateur.prenom} photo={utilisateur.photo} />

        {/* Streak du jour */}
        <StreakCard streak={gamification.streak} />

        {/* XP + Niveau */}
        <XPNiveauRow gamification={gamification} />

        {/* Barre de progression */}
        <ProgressionBar gamification={gamification} />

        {/* Quiz quotidien recommandé */}
        {quizRecommande ? (
          <QuizCard
            quiz={quizRecommande}
            onPress={() => handleQuizPress(quizRecommande.id)}
          />
        ) : (
          // Fallback si aucun quiz disponible
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Quiz quotidien recommandé</Text>
            <TouchableOpacity
              style={styles.quizFallbackCard}
              onPress={() => handleQuizPress()}
              activeOpacity={0.85}
            >
              <View style={styles.quizIconContainer}>
                <Ionicons name="grid-outline" size={22} color={COLORS.white} />
              </View>
              <View style={styles.quizCardText}>
                <Text style={styles.quizCardTitle}>Révision rapide</Text>
                <Text style={styles.quizCardSub}>Choisissez un chapitre pour commencer</Text>
              </View>
              <TouchableOpacity
                style={styles.quizBtn}
                onPress={() => handleQuizPress()}
                activeOpacity={0.85}
              >
                <Text style={styles.quizBtnText}>Commencer</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        )}

        {/* Activité récente */}
        <ActiviteRecente activites={activiteRecente} />

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    gap: 12,
  },

  // ── TopBar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 0,
  },
  topBarSide: {
    width: 40,
    alignItems: 'center',
  },
  topBarLogo: {
    width: 72,
    height: 72,
    // Le logo logo1.png est le shield BSTS — on le centre et on lui donne de la hauteur
  },

  // ── Notification badge ──
  notifBadge: {
    position: 'absolute',
    top: -3,
    right: -5,
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '700',
  },

  // ── Salutation ──
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    gap: 10,
  },
  greetingAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  greetingSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // ── Streak ──
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.goldLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F5E6B0',
    padding: 16,
    marginBottom: 16,
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakEmoji: {
    fontSize: 28,
  },
  streakLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  streakValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  streakXP: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.gold,
  },

  // ── XP + Niveau ──
  xpNiveauRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  xpCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  xpCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  xpIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpCardLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  xpCardValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  niveauBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  niveauBadgeText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  niveauHexagon: {
    width: 22,
    height: 22,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  niveauStar: {
    fontSize: 12,
  },

  // ── Progression ──
  progressionContainer: {
    marginBottom: 24,
  },
  progressionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  progressionValue: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },

  // ── Sections ──
  sectionBlock: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.2,
  },

  // ── Quiz quotidien ──
  quizCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  quizCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quizIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  quizCardText: {
    flex: 1,
  },
  quizCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  quizCardSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  quizCardRight: {
    alignItems: 'flex-end',
    gap: 8,
    flexShrink: 0,
  },
  quizXP: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gold,
  },
  quizBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  quizBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  quizFallbackCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  // ── Activité récente ──
  activityCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIconGreen: {
    backgroundColor: COLORS.primaryLight,
  },
  activityIconGold: {
    backgroundColor: COLORS.goldLight,
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  activitySub: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  activityDate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  activityDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 14,
  },

  // ── Erreur ──
  errorText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  retryBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    padding: 20,
  },
});