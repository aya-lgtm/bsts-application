// screens/SUPER_ADMIN/SuperAdminNavigator.tsx
// Navigation principale Super Admin — même pattern que StudentNavigator.tsx
// 5 onglets : Accueil / Utilisateurs / Gestion / Rapports / Paramètres
// Les écrans secondaires (Créer utilisateur, Cours, SAT, Meetings, Notifications,
// Signalements, Profil) sont accessibles en sous-écrans plein écran depuis ces onglets.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import SuperAdminDashboardScreen from './SuperAdminDashboardScreen';
import SuperAdminUsersScreen from './SuperAdminUsersScreen';
import SuperAdminCreateUserScreen from './SuperAdminCreateUserScreen';
import SuperAdminCoursesScreen from './SuperAdminCoursesScreen';
import SuperAdminSATScreen from './SuperAdminSATScreen';
import SuperAdminMeetingsScreen from './SuperAdminMeetingsScreen';
import SuperAdminPaymentsScreen from './SuperAdminPaymentsScreen';
import SuperAdminNotificationsScreen from './SuperAdminNotificationsScreen';
import SuperAdminStatsScreen from './SuperAdminStatsScreen';
import SuperAdminReportsScreen from './SuperAdminReportsScreen';
import SuperAdminSettingsScreen from './SuperAdminSettingsScreen';
import SuperAdminProfilScreen from './SuperAdminProfilScreen';

// ─── Types ────────────────────────────────────────────────────────────────────
type TabKey = 'accueil' | 'utilisateurs' | 'gestion' | 'rapports' | 'profil';

type GestionSubScreen =
  | null
  | 'Cours'
  | 'SAT'
  | 'Meetings'
  | 'Paiements';

type RapportsSubScreen =
  | null
  | 'Statistiques'
  | 'Signalements'
  | 'Notifications';

type ProfilSubScreen = null | 'Parametres';
type UtilisateursSubScreen = null | 'CreerUtilisateur';

const TABS: { key: TabKey; label: string; icon: string; iconActive: string }[] = [
  { key: 'accueil',      label: 'Accueil',      icon: 'home-outline',        iconActive: 'home'        },
  { key: 'utilisateurs', label: 'Utilisateurs', icon: 'people-outline',      iconActive: 'people'      },
  { key: 'gestion',      label: 'Gestion',       icon: 'school-outline',      iconActive: 'school'      },
  { key: 'rapports',     label: 'Rapports',      icon: 'bar-chart-outline',   iconActive: 'bar-chart'   },
  { key: 'profil',       label: 'Profil',        icon: 'person-outline',      iconActive: 'person'      },
];

export default function SuperAdminNavigator({ onLogout }: { onLogout?: () => void }) {
  const [activeTab, setActiveTab] = React.useState<TabKey>('accueil');

  const [utilisateursSubScreen, setUtilisateursSubScreen] = React.useState<UtilisateursSubScreen>(null);
  const [gestionSubScreen, setGestionSubScreen]           = React.useState<GestionSubScreen>(null);
  const [rapportsSubScreen, setRapportsSubScreen]         = React.useState<RapportsSubScreen>(null);
  const [profilSubScreen, setProfilSubScreen]             = React.useState<ProfilSubScreen>(null);

  // ─── Navigation ────────────────────────────────────────────────────────────
  const navigate = (screen: string, params?: any) => {
    // ── Accueil ──
    if (screen === 'accueil' || screen === 'SuperAdminDashboard') {
      setActiveTab('accueil'); resetSubScreens(); return;
    }

    // ── Utilisateurs ──
    if (screen === 'SuperAdminUsers') {
      setActiveTab('utilisateurs'); setUtilisateursSubScreen(null); return;
    }
    if (screen === 'SuperAdminCreateUser') {
      setActiveTab('utilisateurs'); setUtilisateursSubScreen('CreerUtilisateur'); return;
    }

    // ── Gestion (Cours / SAT / Meetings / Paiements) ──
    if (screen === 'SuperAdminCourses')  { setActiveTab('gestion'); setGestionSubScreen('Cours');     return; }
    if (screen === 'SuperAdminSAT')      { setActiveTab('gestion'); setGestionSubScreen('SAT');       return; }
    if (screen === 'SuperAdminMeetings') { setActiveTab('gestion'); setGestionSubScreen('Meetings');  return; }
    if (screen === 'SuperAdminPayments') { setActiveTab('gestion'); setGestionSubScreen('Paiements'); return; }

    // ── Rapports (Statistiques / Signalements / Notifications) ──
    if (screen === 'SuperAdminStats')         { setActiveTab('rapports'); setRapportsSubScreen('Statistiques');   return; }
    if (screen === 'SuperAdminReports')       { setActiveTab('rapports'); setRapportsSubScreen('Signalements');   return; }
    if (screen === 'SuperAdminNotifications') { setActiveTab('rapports'); setRapportsSubScreen('Notifications');  return; }

    // ── Profil ──
    if (screen === 'SuperAdminProfil')   { setActiveTab('profil'); setProfilSubScreen(null);          return; }
    if (screen === 'SuperAdminSettings') { setActiveTab('profil'); setProfilSubScreen('Parametres');  return; }
  };

  const resetSubScreens = () => {
    setUtilisateursSubScreen(null);
    setGestionSubScreen(null);
    setRapportsSubScreen(null);
    setProfilSubScreen(null);
  };

  const goBack = () => {
    if (utilisateursSubScreen !== null) { setUtilisateursSubScreen(null); return; }
    if (gestionSubScreen !== null)      { setGestionSubScreen(null);      return; }
    if (rapportsSubScreen !== null)     { setRapportsSubScreen(null);     return; }
    if (profilSubScreen !== null)       { setProfilSubScreen(null);       return; }
  };

  const fakeNavigation = { navigate, goBack, setOptions: (_opts: any) => {} };

  const handleTabPress = (key: TabKey) => {
    setActiveTab(key);
    resetSubScreens();
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  const renderScreen = () => {
    if (activeTab === 'accueil') {
      return <SuperAdminDashboardScreen navigation={fakeNavigation} />;
    }

    if (activeTab === 'utilisateurs') {
      if (utilisateursSubScreen === 'CreerUtilisateur') {
        return <SuperAdminCreateUserScreen navigation={fakeNavigation} />;
      }
      return <SuperAdminUsersScreen navigation={fakeNavigation} />;
    }

    if (activeTab === 'gestion') {
      if (gestionSubScreen === 'SAT')       return <SuperAdminSATScreen navigation={fakeNavigation} />;
      if (gestionSubScreen === 'Meetings')  return <SuperAdminMeetingsScreen navigation={fakeNavigation} />;
      if (gestionSubScreen === 'Paiements') return <SuperAdminPaymentsScreen navigation={fakeNavigation} />;
      return <SuperAdminCoursesScreen navigation={fakeNavigation} />;
    }

    if (activeTab === 'rapports') {
      if (rapportsSubScreen === 'Signalements')   return <SuperAdminReportsScreen navigation={fakeNavigation} />;
      if (rapportsSubScreen === 'Notifications')  return <SuperAdminNotificationsScreen navigation={fakeNavigation} />;
      return <SuperAdminStatsScreen navigation={fakeNavigation} />;
    }

    if (activeTab === 'profil') {
      if (profilSubScreen === 'Parametres') return <SuperAdminSettingsScreen navigation={fakeNavigation} />;
      return <SuperAdminProfilScreen navigation={fakeNavigation} onLogout={onLogout} />;
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.screenArea}>
        {renderScreen()}
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => handleTabPress(tab.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.tabIconWrap, isActive && styles.tabIconWrapActive]}>
                <Ionicons
                  name={(isActive ? tab.iconActive : tab.icon) as any}
                  size={22}
                  color={isActive ? '#0D6B5E' : '#AAA'}
                />
              </View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:    { flex: 1, backgroundColor: '#F5F7F6' },
  screenArea: { flex: 1 },
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#EDEDED',
    paddingBottom: 10, paddingTop: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 10,
  },
  tabItem:           { flex: 1, alignItems: 'center', gap: 3 },
  tabIconWrap:        { width: 40, height: 32, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  tabIconWrapActive:  { backgroundColor: '#0D6B5E18' },
  tabLabel:       { fontSize: 9, color: '#AAA', fontWeight: '500' },
  tabLabelActive: { color: '#0D6B5E', fontWeight: '700' },
});