// screens/SUPER_ADMIN/SuperAdminDashboardScreen.tsx
// Dashboard Super Admin — design premium, données réelles, boutons fonctionnels

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, RefreshControl, StyleSheet,
  SafeAreaView, StatusBar, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/auth.service';

const logo = require('../../assets/logo1.png');
const { width: W } = Dimensions.get('window');

// ─── Palette ──────────────────────────────────────────────────────────────
const P = {
  green:        '#0D6B5E',
  greenDark:    '#0A5449',
  greenMid:     '#128F7D',
  greenLight:   '#E8F5F3',
  greenLighter: '#F2FAF9',
  gold:         '#D4A017',
  goldLight:    '#FEF6E4',
  white:        '#FFFFFF',
  bg:           '#F4F8F7',
  text:         '#111827',
  textSub:      '#6B7280',
  textMuted:    '#9CA3AF',
  border:       '#E5E7EB',
  danger:       '#EF4444',
  dangerLight:  '#FEE2E2',
  success:      '#22C55E',
  purple:       '#7C3AED',
  purpleLight:  '#EDE9FE',
  blue:         '#2563EB',
  blueLight:    '#DBEAFE',
  orange:       '#EA580C',
  orangeLight:  '#FFEDD5',
  teal:         '#0891B2',
  tealLight:    '#E0F2FE',
  card:         '#FFFFFF',
};

// ─── Types ────────────────────────────────────────────────────────────────
interface AdminProfile { prenom: string; nom: string; email: string; }
interface StatsData {
  totalEtudiants: number;
  totalProfesseurs: number;
  totalAnciensEtudiants: number;
  totalParents: number;
  totalCours: number;
  totalQuestionsSAT: number;
  totalMeetings: number;
  revenusMois: number;
  signalementsPending: number;
  deltaEtudiants: number;
  deltaProfesseurs: number;
  deltaCours: number;
  deltaRevenus: number;
}
interface ActiviteItem {
  id: string; type: string;
  titre: string; sousTitre: string; date: string;
}
interface NavigationProp {
  navigate: (screen: string, params?: any) => void;
}
interface Props { navigation: NavigationProp; }

// ─── API — données 100% réelles ───────────────────────────────────────────
const fetchAll = async () => {
  const [profileRes, usersRes, subjectsRes, notifRes, satRes, dashRes] =
    await Promise.allSettled([
      api.get('/users/profile'),
      api.get('/users'),
      api.get('/courses/subjects'),
      api.get('/notifications?limit=100'),
      api.get('/sat/questions?domaine=MATH&limit=1000'),
      api.get('/admin/dashboard'),
    ]);

  const profile = profileRes.status === 'fulfilled'
    ? profileRes.value.data?.user ?? profileRes.value.data
    : null;

  const users: any[] = usersRes.status === 'fulfilled'
    ? usersRes.value.data?.users ?? [] : [];

  const subjects: any[] = subjectsRes.status === 'fulfilled'
    ? subjectsRes.value.data?.subjects ?? [] : [];

  const notifs: any[] = notifRes.status === 'fulfilled'
    ? notifRes.value.data?.notifications ?? [] : [];

  const satQuestions: any[] = satRes.status === 'fulfilled'
    ? satRes.value.data?.questions ?? [] : [];

  const dash = dashRes.status === 'fulfilled' ? dashRes.value.data : null;

  // Profil admin
  const adminProfile: AdminProfile = {
    prenom: profile?.prenom ?? 'Super',
    nom:    profile?.nom    ?? 'Admin',
    email:  profile?.email  ?? '',
  };

  // Stats — dashboard si dispo, sinon calcul depuis /users + /courses/subjects
  const etudiants       = users.filter((u: any) => u.role === 'STUDENT');
  const professeurs     = users.filter((u: any) => u.role === 'PROFESSOR');
  const anciens         = users.filter((u: any) => u.role === 'COLLEGE_STUDENT');
  const parents         = users.filter((u: any) => u.role === 'PARENT');
  const signalement     = users.filter((u: any) => u.isReported);

  const stats: StatsData = {
    totalEtudiants:        dash?.totalEtudiants        ?? etudiants.length,
    totalProfesseurs:      dash?.totalProfesseurs      ?? professeurs.length,
    totalAnciensEtudiants: dash?.totalAnciensEtudiants ?? anciens.length,
    totalParents:          dash?.totalParents          ?? parents.length,
    totalCours:            dash?.totalCours            ?? subjects.length,
    totalQuestionsSAT:     dash?.totalQuestionsSAT     ?? satQuestions.length,
    totalMeetings:         dash?.totalMeetings         ?? 0,
    revenusMois:           dash?.revenusMois           ?? 0,
    signalementsPending:   dash?.signalementsPending   ?? signalement.length,
    deltaEtudiants:        dash?.deltaEtudiants        ?? 0,
    deltaProfesseurs:      dash?.deltaProfesseurs      ?? 0,
    deltaCours:            dash?.deltaCours            ?? 0,
    deltaRevenus:          dash?.deltaRevenus          ?? 0,
  };

  const unreadNotifs = notifs.filter((n: any) => !n.read && !n.isRead).length;
  const activites: ActiviteItem[] = dash?.activitesRecentes ?? [];

  // Nouveaux utilisateurs cette semaine (calcul réel depuis la liste)
  const maintenant = new Date();
  const debutSemaine = new Date(maintenant);
  debutSemaine.setDate(maintenant.getDate() - 7);
  const newUsersWeek = users.filter((u: any) =>
    new Date(u.createdAt) >= debutSemaine
  ).length;

  return { adminProfile, stats, unreadNotifs, activites, newUsersWeek, totalUsers: users.length };
};

// ─── Helpers ──────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (m < 1) return "À l'instant";
    if (m < 60) return `Il y a ${m} min`;
    if (h < 24) return `Il y a ${h} h`;
    if (d === 1) return 'Hier';
    return `Il y a ${d} j`;
  } catch { return ''; }
}

function todayLabel() {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

const ACTIVITY_CONF: Record<string, { icon: string; grad: [string, string]; color: string }> = {
  user_created:   { icon: 'person-add',  grad: [P.greenLight,  '#D1FAE5'], color: P.green  },
  meeting_booked: { icon: 'calendar',    grad: [P.blueLight,   '#BFDBFE'], color: P.blue   },
  payment:        { icon: 'cash',        grad: [P.goldLight,   '#FDE68A'], color: P.gold   },
  course_created: { icon: 'book',        grad: [P.purpleLight, '#DDD6FE'], color: P.purple },
  report:         { icon: 'flag',        grad: [P.dangerLight, '#FECACA'], color: P.danger },
  default:        { icon: 'time-outline',grad: [P.tealLight,   '#BAE6FD'], color: P.teal   },
};

// ─── COMPOSANTS ───────────────────────────────────────────────────────────

// Header
const Header = ({
  unread, onNotif,
}: { unread: number; onNotif: () => void }) => (
  <View style={s.header}>
    <Image source={logo} style={s.logo} resizeMode="contain" />
    <TouchableOpacity onPress={onNotif} style={s.notifWrap} activeOpacity={0.7}>
      <View style={s.notifIconBg}>
        <Ionicons name="notifications-outline" size={22} color={P.text} />
      </View>
      {unread > 0 && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  </View>
);

// Hero card (remplace le greeting simple)
const HeroCard = ({
  admin, totalUsers, newUsersWeek, signalementsPending,
}: {
  admin: AdminProfile;
  totalUsers: number;
  newUsersWeek: number;
  signalementsPending: number;
}) => {
  const h = new Date().getHours();
  const salut = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
  const initials = `${admin.prenom[0] ?? ''}${admin.nom[0] ?? ''}`.toUpperCase();

  return (
    <LinearGradient
      colors={[P.green, P.greenDark]}
      style={s.heroCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Cercles décoratifs */}
      <View style={s.heroCircle1} />
      <View style={s.heroCircle2} />

      {/* Top row */}
      <View style={s.heroTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.heroSalut}>{salut} 👋</Text>
          <Text style={s.heroName}>{admin.prenom} {admin.nom}</Text>
          <Text style={s.heroDate}>{todayLabel()}</Text>
        </View>
        <View style={s.heroAvatar}>
          <Text style={s.heroAvatarText}>{initials}</Text>
        </View>
      </View>

      {/* 3 metrics */}
      <View style={s.heroMetrics}>
        <View style={s.heroMetric}>
          <Text style={s.heroMetricValue}>{totalUsers.toLocaleString('fr-FR')}</Text>
          <Text style={s.heroMetricLabel}>Utilisateurs</Text>
        </View>
        <View style={s.heroMetricDivider} />
        <View style={s.heroMetric}>
          <Text style={s.heroMetricValue}>
            +{newUsersWeek}
          </Text>
          <Text style={s.heroMetricLabel}>Cette semaine</Text>
        </View>
        <View style={s.heroMetricDivider} />
        <View style={s.heroMetric}>
          <View style={s.heroAlertRow}>
            {signalementsPending > 0 && (
              <View style={s.heroDot} />
            )}
            <Text style={[
              s.heroMetricValue,
              signalementsPending > 0 && { color: '#FCA5A5' },
            ]}>
              {signalementsPending}
            </Text>
          </View>
          <Text style={s.heroMetricLabel}>Signalements</Text>
        </View>
      </View>
    </LinearGradient>
  );
};

// KPI card améliorée
const KpiCard = ({
  icon, label, value, delta, deltaPos, bg, color, onPress,
}: {
  icon: string; label: string; value: string | number;
  delta?: string; deltaPos?: boolean;
  bg: string; color: string; onPress?: () => void;
}) => (
  <TouchableOpacity
    style={s.kpiCard}
    onPress={onPress}
    activeOpacity={0.82}
    disabled={!onPress}
  >
    <View style={[s.kpiTop]}>
      <View style={[s.kpiIconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      {delta !== undefined && (
        <View style={[s.deltaBadge, { backgroundColor: deltaPos ? '#DCFCE7' : '#FEE2E2' }]}>
          <Text style={[s.deltaBadgeText, { color: deltaPos ? P.success : P.danger }]}>
            {delta}
          </Text>
        </View>
      )}
    </View>
    <Text style={s.kpiVal}>
      {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
    </Text>
    <Text style={s.kpiLbl}>{label}</Text>
    {onPress && (
      <View style={s.kpiArrow}>
        <Ionicons name="arrow-forward" size={12} color={color} />
      </View>
    )}
  </TouchableOpacity>
);

// Section KPIs
const KpisSection = ({
  stats, navigation,
}: { stats: StatsData; navigation: NavigationProp }) => {
  const kpis = [
    {
      key: 'etudiants', icon: 'school-outline', label: 'Étudiants',
      value: stats.totalEtudiants,
      delta: stats.deltaEtudiants !== 0 ? `${stats.deltaEtudiants >= 0 ? '+' : ''}${stats.deltaEtudiants}` : undefined,
      deltaPos: stats.deltaEtudiants >= 0,
      bg: P.greenLight, color: P.green,
      onPress: () => navigation.navigate('SuperAdminUsers'),
    },
    {
      key: 'profs', icon: 'person-outline', label: 'Professeurs',
      value: stats.totalProfesseurs,
      delta: stats.deltaProfesseurs !== 0 ? `${stats.deltaProfesseurs >= 0 ? '+' : ''}${stats.deltaProfesseurs}` : undefined,
      deltaPos: stats.deltaProfesseurs >= 0,
      bg: P.blueLight, color: P.blue,
      onPress: () => navigation.navigate('SuperAdminUsers'),
    },
    {
      key: 'anciens', icon: 'people-outline', label: 'Anciens étudiants',
      value: stats.totalAnciensEtudiants,
      bg: P.purpleLight, color: P.purple,
      onPress: () => navigation.navigate('SuperAdminUsers'),
    },
    {
      key: 'parents', icon: 'home-outline', label: 'Parents',
      value: stats.totalParents,
      bg: P.tealLight, color: P.teal,
      onPress: () => navigation.navigate('SuperAdminUsers'),
    },
    {
      key: 'cours', icon: 'book-outline', label: 'Cours publiés',
      value: stats.totalCours,
      delta: stats.deltaCours !== 0 ? `${stats.deltaCours >= 0 ? '+' : ''}${stats.deltaCours}` : undefined,
      deltaPos: stats.deltaCours >= 0,
      bg: P.goldLight, color: P.gold,
      onPress: () => navigation.navigate('SuperAdminCourses'),
    },
    {
      key: 'sat', icon: 'document-text-outline', label: 'Questions SAT',
      value: stats.totalQuestionsSAT,
      bg: P.orangeLight, color: P.orange,
      onPress: () => navigation.navigate('SuperAdminSAT'),
    },
    {
      key: 'meetings', icon: 'videocam-outline', label: 'Meetings',
      value: stats.totalMeetings,
      bg: P.greenLight, color: P.greenMid,
      onPress: () => navigation.navigate('SuperAdminMeetings'),
    },
    {
      key: 'revenus', icon: 'cash-outline', label: 'Revenus (mois)',
      value: stats.revenusMois > 0 ? `${stats.revenusMois.toLocaleString('fr-FR')} €` : '—',
      delta: stats.deltaRevenus !== 0 ? `${stats.deltaRevenus >= 0 ? '+' : ''}${stats.deltaRevenus} €` : undefined,
      deltaPos: stats.deltaRevenus >= 0,
      bg: '#D1FAE5', color: P.success,
      onPress: () => navigation.navigate('SuperAdminPayments'),
    },
  ];

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Vue d'ensemble</Text>
      <View style={s.kpiGrid}>
        {kpis.map((k) => (
          <View key={k.key} style={s.kpiWrap}>
            <KpiCard
              icon={k.icon} label={k.label} value={k.value}
              delta={k.delta} deltaPos={k.deltaPos}
              bg={k.bg} color={k.color} onPress={k.onPress}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

// Section alertes (si signalements en attente)
const AlertsSection = ({
  signalementsPending, navigation,
}: { signalementsPending: number; navigation: NavigationProp }) => {
  if (signalementsPending === 0) return null;
  return (
    <TouchableOpacity
      style={s.alertCard}
      onPress={() => navigation.navigate('SuperAdminReports')}
      activeOpacity={0.85}
    >
      <LinearGradient colors={[P.dangerLight, '#FECACA']} style={s.alertGradient}>
        <View style={s.alertLeft}>
          <View style={s.alertIconWrap}>
            <Ionicons name="warning" size={22} color={P.danger} />
          </View>
          <View>
            <Text style={s.alertTitle}>
              {signalementsPending} signalement{signalementsPending > 1 ? 's' : ''} en attente
            </Text>
            <Text style={s.alertSub}>Appuyez pour traiter</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={P.danger} />
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Actions rapides
const ActionsSection = ({ navigation }: { navigation: NavigationProp }) => {
  const actions = [
    {
      key: 'user',
      icon: 'person-add',
      label: 'Créer un\nutilisateur',
      grad: [P.green, P.greenMid] as [string, string],
      onPress: () => navigation.navigate('SuperAdminCreateUser'),
    },
    {
      key: 'notif',
      icon: 'megaphone',
      label: 'Notifier\ntous',
      grad: ['#7C3AED', '#6D28D9'] as [string, string],
      onPress: () => navigation.navigate('SuperAdminNotifications'),
    },
    {
      key: 'stats',
      icon: 'bar-chart',
      label: 'Statistiques\nglobales',
      grad: [P.blue, '#1D4ED8'] as [string, string],
      onPress: () => navigation.navigate('SuperAdminStats'),
    },
    {
      key: 'reports',
      icon: 'flag',
      label: 'Gérer\nsignalements',
      grad: [P.orange, '#C2410C'] as [string, string],
      onPress: () => navigation.navigate('SuperAdminReports'),
    },
    {
      key: 'payments',
      icon: 'cash',
      label: 'Paiements\n& revenus',
      grad: [P.gold, '#B45309'] as [string, string],
      onPress: () => navigation.navigate('SuperAdminPayments'),
    },
    {
      key: 'settings',
      icon: 'settings',
      label: 'Paramètres\napp',
      grad: [P.teal, '#0E7490'] as [string, string],
      onPress: () => navigation.navigate('SuperAdminSettings'),
    },
  ];

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Actions rapides</Text>
      <View style={s.actionsGrid}>
        {actions.map((a) => (
          <TouchableOpacity
            key={a.key}
            style={s.actionCard}
            onPress={a.onPress}
            activeOpacity={0.82}
          >
            <LinearGradient colors={a.grad} style={s.actionGrad}>
              <Ionicons name={a.icon as any} size={24} color={P.white} />
            </LinearGradient>
            <Text style={s.actionLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// Activités récentes
const ActivitesSection = ({
  activites, navigation,
}: { activites: ActiviteItem[]; navigation: NavigationProp }) => (
  <View style={s.section}>
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle}>Activités récentes</Text>
      <TouchableOpacity onPress={() => navigation.navigate('SuperAdminStats')}>
        <Text style={s.seeAll}>Tout voir</Text>
      </TouchableOpacity>
    </View>

    <View style={s.activiteCard}>
      {activites.length === 0 ? (
        <View style={s.emptyBlock}>
          <Ionicons name="time-outline" size={30} color={P.textMuted} />
          <Text style={s.emptyTitle}>Aucune activité récente</Text>
          <Text style={s.emptyHint}>
            Les activités apparaîtront ici une fois{'\n'}/admin/dashboard disponible
          </Text>
        </View>
      ) : (
        activites.map((item, i) => {
          const conf = ACTIVITY_CONF[item.type] ?? ACTIVITY_CONF.default;
          return (
            <View key={item.id}>
              <View style={s.actRow}>
                <LinearGradient colors={conf.grad} style={s.actIcon}>
                  <Ionicons name={conf.icon as any} size={15} color={conf.color} />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={s.actTitle} numberOfLines={1}>{item.titre}</Text>
                  <Text style={s.actSub}   numberOfLines={1}>{item.sousTitre}</Text>
                </View>
                <Text style={s.actDate}>{formatDate(item.date)}</Text>
              </View>
              {i < activites.length - 1 && <View style={s.sep} />}
            </View>
          );
        })
      )}
    </View>
  </View>
);

// ─── Écran principal ──────────────────────────────────────────────────────
export default function SuperAdminDashboardScreen({ navigation }: Props) {
  const [adminProfile,  setAdminProfile]  = useState<AdminProfile | null>(null);
  const [stats,         setStats]         = useState<StatsData | null>(null);
  const [activites,     setActivites]     = useState<ActiviteItem[]>([]);
  const [unread,        setUnread]        = useState(0);
  const [newUsersWeek,  setNewUsersWeek]  = useState(0);
  const [totalUsers,    setTotalUsers]    = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const res = await fetchAll();
      setAdminProfile(res.adminProfile);
      setStats(res.stats);
      setActivites(res.activites);
      setUnread(res.unreadNotifs);
      setNewUsersWeek(res.newUsersWeek);
      setTotalUsers(res.totalUsers);
    } catch (err) {
      console.error('[SuperAdminDashboard]', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <SafeAreaView style={s.centered}>
        <ActivityIndicator size="large" color={P.green} />
        <Text style={s.loadingText}>Chargement...</Text>
      </SafeAreaView>
    );
  }

  if (!adminProfile || !stats) return null;

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={P.white} />
      <Header
        unread={unread}
        onNotif={() => navigation.navigate('SuperAdminNotifications')}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: P.bg }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            colors={[P.green]}
            tintColor={P.green}
          />
        }
      >
        {/* Hero */}
        <View style={s.heroPad}>
          <HeroCard
            admin={adminProfile}
            totalUsers={totalUsers}
            newUsersWeek={newUsersWeek}
            signalementsPending={stats.signalementsPending}
          />
        </View>

        {/* Alerte signalements */}
        <View style={s.alertPad}>
          <AlertsSection
            signalementsPending={stats.signalementsPending}
            navigation={navigation}
          />
        </View>

        {/* KPIs */}
        <KpisSection stats={stats} navigation={navigation} />

        {/* Actions rapides */}
        <ActionsSection navigation={navigation} />

        {/* Activités récentes */}
        <ActivitesSection activites={activites} navigation={navigation} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: P.white },
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: P.white, gap: 12 },
  loadingText: { fontSize: 14, color: P.textMuted, fontWeight: '500' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 6,
    backgroundColor: P.white,
    borderBottomWidth: 1, borderBottomColor: P.border,
  },
  logo:       { width: 62, height: 62 },
  notifWrap:  { position: 'relative' },
  notifIconBg:{
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: P.danger, borderRadius: 10,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4, borderWidth: 2, borderColor: P.white,
  },
  badgeText: { color: P.white, fontSize: 9, fontWeight: '800' },

  // Hero card
  heroPad: { paddingHorizontal: 16, paddingTop: 16 },
  heroCard: {
    borderRadius: 24, padding: 22, overflow: 'hidden',
    shadowColor: P.green, shadowOpacity: 0.3,
    shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  heroCircle1: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -60, right: -40,
  },
  heroCircle2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -30, left: 20,
  },
  heroTop:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  heroSalut:     { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginBottom: 2 },
  heroName:      { fontSize: 22, color: P.white, fontWeight: '900', letterSpacing: -0.5 },
  heroDate:      { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 4, textTransform: 'capitalize' },
  heroAvatar:    {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
  },
  heroAvatarText:{ fontSize: 20, color: P.white, fontWeight: '900' },
  heroMetrics:   { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 14 },
  heroMetric:    { flex: 1, alignItems: 'center' },
  heroMetricDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },
  heroMetricValue:   { fontSize: 20, color: P.white, fontWeight: '900', letterSpacing: -0.5 },
  heroMetricLabel:   { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 3, fontWeight: '600' },
  heroAlertRow:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FCA5A5' },

  // Alert
  alertPad:    { paddingHorizontal: 16, marginTop: 12 },
  alertCard:   { borderRadius: 16, overflow: 'hidden' },
  alertGradient:{
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  alertLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  alertIconWrap:{ width: 38, height: 38, borderRadius: 12, backgroundColor: P.dangerLight, alignItems: 'center', justifyContent: 'center' },
  alertTitle:   { fontSize: 13, fontWeight: '800', color: P.danger },
  alertSub:     { fontSize: 11, color: P.textSub, marginTop: 1 },

  // Sections
  section:     { paddingHorizontal: 16, marginTop: 24 },
  sectionRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle:{ fontSize: 17, fontWeight: '900', color: P.text, marginBottom: 14, letterSpacing: -0.3 },
  seeAll:      { fontSize: 13, color: P.green, fontWeight: '700' },

  // KPI
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiWrap: { width: (W - 32 - 10) / 2 },
  kpiCard: {
    backgroundColor: P.card, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: P.border,
    shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    position: 'relative', overflow: 'hidden',
  },
  kpiTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  kpiIconWrap:{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  kpiVal:     { fontSize: 24, fontWeight: '900', color: P.text, letterSpacing: -0.5, marginBottom: 4 },
  kpiLbl:     { fontSize: 11, color: P.textSub, fontWeight: '600' },
  kpiArrow:   { position: 'absolute', bottom: 12, right: 12, opacity: 0.6 },
  deltaBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  deltaBadgeText: { fontSize: 10, fontWeight: '800' },

  // Actions
  actionsGrid:{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: {
    width: (W - 32 - 20) / 3,
    backgroundColor: P.card, borderRadius: 18, padding: 12,
    alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: P.border,
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  actionGrad: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionLabel:{ fontSize: 11, fontWeight: '700', color: P.text, textAlign: 'center', lineHeight: 15 },

  // Activités
  activiteCard:{
    backgroundColor: P.card, borderRadius: 20, borderWidth: 1, borderColor: P.border,
    overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  actRow:  { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  actIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  actTitle:{ fontSize: 13, fontWeight: '700', color: P.text },
  actSub:  { fontSize: 11, color: P.textMuted, marginTop: 1 },
  actDate: { fontSize: 11, color: P.textMuted, flexShrink: 0 },
  sep:     { height: 1, backgroundColor: P.border, marginHorizontal: 14 },

  emptyBlock:{ alignItems: 'center', padding: 32, gap: 8 },
  emptyTitle:{ fontSize: 14, fontWeight: '700', color: P.textSub },
  emptyHint: { fontSize: 12, color: P.textMuted, textAlign: 'center', lineHeight: 18 },
});