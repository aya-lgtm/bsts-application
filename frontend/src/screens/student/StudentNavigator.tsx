import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import StudentHomeScreen from './StudentHomeScreen';
import StudentCoursesScreen from './StudentCoursesScreen';
import StudentSATScreen from './StudentSATScreen';
import StudentChatScreen from './StudentChatScreen';
import StudentProfilScreen from './StudentProfilScreen';

// ─── Types ─────────────────────────────────────────────────────────────────
type TabKey = 'accueil' | 'cours' | 'sat' | 'chat' | 'profil';

const TABS: { key: TabKey; label: string; icon: string; iconActive: string }[] = [
  { key: 'accueil', label: 'Accueil', icon: 'home-outline',        iconActive: 'home' },
  { key: 'cours',   label: 'Cours',   icon: 'book-outline',        iconActive: 'book' },
  { key: 'sat',     label: 'SAT',     icon: 'school-outline',      iconActive: 'school' },
  { key: 'chat',    label: 'Chat',    icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
  { key: 'profil',  label: 'Profil',  icon: 'person-outline',      iconActive: 'person' },
];

// ─── Student Navigator ─────────────────────────────────────────────────────
export default function StudentNavigator({ onLogout }: { onLogout?: () => void }) {
  const [activeTab, setActiveTab] = React.useState<TabKey>('accueil');

  const navigate = (screen: string) => {
    if (screen === 'accueil')             setActiveTab('accueil');
    if (screen === 'StudentCourses')      setActiveTab('cours');
    if (screen === 'StudentSAT')          setActiveTab('sat');
    if (screen === 'StudentChat')         setActiveTab('chat');
    if (screen === 'StudentProfil')       setActiveTab('profil');
    if (screen === 'StudentProgression')  setActiveTab('profil');
    if (screen === 'StudentAbonnement')   setActiveTab('profil');
    if (screen === 'StudentGamification') setActiveTab('profil');
  };

  const fakeNavigation = { navigate };

  const renderScreen = () => {
    switch (activeTab) {
      case 'accueil': return <StudentHomeScreen navigation={fakeNavigation} />;
      case 'cours':   return <StudentCoursesScreen navigation={fakeNavigation} />;
      case 'sat':     return <StudentSATScreen navigation={fakeNavigation} />;
      case 'chat':    return <StudentChatScreen navigation={fakeNavigation} />;
      case 'profil':  return <StudentProfilScreen navigation={fakeNavigation} onLogout={onLogout} />;
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.screenArea}>{renderScreen()}</View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.tabIconWrap, isActive && styles.tabIconWrapActive]}>
                <Ionicons
                  name={(isActive ? tab.iconActive : tab.icon) as any}
                  size={22}
                  color={isActive ? '#0D6B5E' : '#AAA'}
                />
              </View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#F5F7F6' },
  screenArea: { flex: 1 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#EDEDED',
    paddingBottom: 55,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  tabIconWrap: {
    width: 40,
    height: 32,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: '#0D6B5E18',
  },
  tabLabel: {
    fontSize: 9,
    color: '#AAA',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#0D6B5E',
    fontWeight: '700',
  },
});