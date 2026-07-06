import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LanguageProvider, useLanguage } from './LanguageContext';

import CollegeStudentHomeScreen          from './CollegeStudentHomeScreen';
import CollegeStudentMeetingsScreen      from './CollegeStudentMeetingsScreen';
import CollegeStudentNotificationsScreen from './CollegeStudentNotificationsScreen';
import CollegeStudentDisponibilitesScreen from './CollegeStudentDisponibilitesScreen';
import CollegeStudentProfilScreen        from './CollegeStudentProfilScreen';
import CollegeStudentPlanningScreen      from './CollegeStudentPlanningScreen';
import CollegeStudentDemandesScreen      from './CollegeStudentDemandesScreen';
import CollegeStudentTarifsScreen        from './CollegeStudentTarifsScreen';
import CollegeStudentAvisScreen          from './CollegeStudentAvisScreen';

type TabKey = 'accueil' | 'meetings' | 'notifications' | 'dispos' | 'profil';

// ─── Tab Bar traduite ─────────────────────────────────────────────────────────
const TABS_CONFIG: {
  key: TabKey;
  labelFr: string;
  labelEn: string;
  icon: string;
  iconActive: string;
}[] = [
  { key: 'accueil',       labelFr: 'Accueil',       labelEn: 'Home',          icon: 'home-outline',          iconActive: 'home'          },
  { key: 'meetings',      labelFr: 'Meetings',      labelEn: 'Meetings',      icon: 'calendar-outline',      iconActive: 'calendar'      },
  { key: 'notifications', labelFr: 'Notifications', labelEn: 'Notifications', icon: 'notifications-outline', iconActive: 'notifications' },
  { key: 'dispos',        labelFr: 'Disponibilités', labelEn: 'Availability', icon: 'time-outline',          iconActive: 'time'          },
  { key: 'profil',        labelFr: 'Profil',        labelEn: 'Profile',       icon: 'person-outline',        iconActive: 'person'        },
];

// ─── Inner Navigator (avec accès au hook useLanguage) ────────────────────────
function InnerNavigator({ onLogout }: { onLogout?: () => void }) {
  const { lang } = useLanguage();

  const [activeTab, setActiveTab]   = React.useState<TabKey>('accueil');
  const [subScreen, setSubScreen]   = React.useState<string | null>(null);
  const [subParams, setSubParams]   = React.useState<any>(null);
  const [unreadNotifs, setUnreadNotifs] = React.useState(0);

  const navigate = React.useCallback((screen: string, params?: any) => {
    const tabMap: Record<string, TabKey> = {
      'CollegeStudentHome':          'accueil',
      'accueil':                     'accueil',
      'CollegeStudentMeetings':      'meetings',
      'CollegeStudentNotifications': 'notifications',
      'CollegeStudentProfil':        'profil',
      'CollegeStudentDispos':        'dispos',
    };
    if (tabMap[screen]) {
      setActiveTab(tabMap[screen]);
      setSubScreen(null);
      setSubParams(null);
      return;
    }
    // Sous-écrans
    const subScreens = [
      'CollegeStudentDemandes',
      'CollegeStudentTarifs',
      'CollegeStudentAvis',
      'CollegeStudentPlanning',
    ];
    if (subScreens.includes(screen)) {
      setSubScreen(screen);
      setSubParams(params);
    }
  }, []);

  const goBack = React.useCallback(() => {
    setSubScreen(null);
    setSubParams(null);
  }, []);

  const fakeNavigation = React.useMemo(
    () => ({ navigate, goBack, setOptions: (_: any) => {} }),
    [navigate, goBack]
  );

  const handleTabPress = (key: TabKey) => {
    setActiveTab(key);
    setSubScreen(null);
    setSubParams(null);
  };

  const hideTabBar = !!subScreen;

  const renderScreen = () => {
    // ── Sous-écrans ──
    if (subScreen === 'CollegeStudentDemandes') {
      return <CollegeStudentDemandesScreen />;
    }
    if (subScreen === 'CollegeStudentTarifs') {
      return <CollegeStudentTarifsScreen navigation={fakeNavigation} />;
    }
    if (subScreen === 'CollegeStudentAvis') {
      return (
        <CollegeStudentAvisScreen
          navigation={fakeNavigation}
          onBack={() => { setSubScreen(null); setSubParams(null); }}
        />
      );
    }
    if (subScreen === 'CollegeStudentPlanning') {
      return <CollegeStudentPlanningScreen navigation={fakeNavigation} />;
    }

    // ── Tabs principaux ──
    switch (activeTab) {
      case 'accueil':
        return <CollegeStudentHomeScreen onLogout={onLogout} navigation={fakeNavigation} />;
      case 'meetings':
        return <CollegeStudentMeetingsScreen navigation={fakeNavigation} />;
      case 'notifications':
        return <CollegeStudentNotificationsScreen navigation={fakeNavigation} />;
      case 'dispos':
        return <CollegeStudentDisponibilitesScreen navigation={fakeNavigation} />;
      case 'profil':
        return <CollegeStudentProfilScreen navigation={fakeNavigation} onLogout={onLogout} />;
      default:
        return <CollegeStudentHomeScreen onLogout={onLogout} navigation={fakeNavigation} />;
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={{ flex: 1 }}>{renderScreen()}</View>

      {!hideTabBar && (
        <View style={styles.tabBar}>
          {TABS_CONFIG.map(tab => {
            const isActive  = activeTab === tab.key;
            const isNotif   = tab.key === 'notifications';
            const label     = lang === 'en' ? tab.labelEn : tab.labelFr;

            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabItem}
                onPress={() => handleTabPress(tab.key)}
                activeOpacity={0.7}
              >
                <View style={styles.iconWrap}>
                  <View style={[styles.tabIconWrap, isActive && styles.tabIconWrapActive]}>
                    <Ionicons
                      name={(isActive ? tab.iconActive : tab.icon) as any}
                      size={22}
                      color={isActive ? '#0D6B5E' : '#AAA'}
                    />
                  </View>
                  {isNotif && unreadNotifs > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unreadNotifs > 9 ? '9+' : unreadNotifs}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Export wrappé dans LanguageProvider ──────────────────────────────────────
export default function CollegeStudentNavigator({ onLogout }: { onLogout?: () => void }) {
  return (
    <LanguageProvider>
      <InnerNavigator onLogout={onLogout} />
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  wrapper:           { flex: 1, backgroundColor: '#F5F7F6' },
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#EDEDED',
    paddingBottom: 10, paddingTop: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 10,
  },
  tabItem:           { flex: 1, alignItems: 'center', gap: 3 },
  iconWrap:          { position: 'relative' },
  tabIconWrap:       { width: 40, height: 32, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  tabIconWrapActive: { backgroundColor: '#0D6B5E18' },
  badge: {
    position: 'absolute', top: -3, right: -4, minWidth: 16, height: 16,
    borderRadius: 8, backgroundColor: '#E53935', alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#fff',
  },
  badgeText:         { fontSize: 9, fontWeight: '800', color: '#fff', lineHeight: 13 },
  tabLabel:          { fontSize: 9, color: '#AAA', fontWeight: '500' },
  tabLabelActive:    { color: '#0D6B5E', fontWeight: '700' },
});