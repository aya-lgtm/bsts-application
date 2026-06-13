import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import ProfessorHomeScreen from './ProfessorHomeScreen';
import ProfessorStudentsScreen from './ProfessorStudentsScreen';
import ProfessorStudentProfileScreen from './ProfessorStudentProfileScreen';
import ProfessorCoursesScreen from './ProfessorCoursesScreen';
import ProfessorQuizScreen from './ProfessorQuizScreen';
import ProfessorAnalyticsScreen from './ProfessorAnalyticsScreen';
import ProfessorChatScreen from './ProfessorChatScreen';
import ProfessorProfilScreen from './ProfessorProfilScreen';

// ─── Tab config ─────────────────────────────────────────────────────────────
type TabKey = 'accueil' | 'etudiants' | 'cours' | 'quiz' | 'chat' | 'analyses' | 'profil';

const TABS: { key: TabKey; label: string; icon: string; iconActive: string }[] = [
  { key: 'accueil',   label: 'Accueil',    icon: 'home-outline',            iconActive: 'home' },
  { key: 'etudiants', label: 'Étudiants',  icon: 'people-outline',          iconActive: 'people' },
  { key: 'cours',     label: 'Cours',      icon: 'book-outline',            iconActive: 'book' },
  { key: 'quiz',      label: 'Quiz',       icon: 'create-outline',          iconActive: 'create' },
  { key: 'chat',      label: 'Chat',       icon: 'chatbubbles-outline',     iconActive: 'chatbubbles' },
  { key: 'analyses',  label: 'Analyses',   icon: 'bar-chart-outline',       iconActive: 'bar-chart' },
  { key: 'profil',    label: 'Profil',     icon: 'person-outline',          iconActive: 'person' },
];

// ─── Professor Navigator ─────────────────────────────────────────────────────
export default function ProfessorNavigator({ onLogout }: { onLogout?: () => void }) {
  const [activeTab, setActiveTab] = React.useState<TabKey>('accueil');
  const [subScreen, setSubScreen] = React.useState<string | null>(null);
  const [subParams, setSubParams] = React.useState<any>(null);

  const navigate = (screen: string, params?: any) => {
    if (screen === 'student_profile') {
      setSubScreen('student_profile');
      setSubParams(params);
      return;
    }
    if (screen === 'etudiants' || screen === 'students') { setActiveTab('etudiants'); setSubScreen(null); return; }
    if (screen === 'cours'     || screen === 'courses')  { setActiveTab('cours');     setSubScreen(null); return; }
    if (screen === 'quiz')                               { setActiveTab('quiz');       setSubScreen(null); return; }
    if (screen === 'chat')                               { setActiveTab('chat');       setSubScreen(null); return; }
    if (screen === 'analytics' || screen === 'analyses') { setActiveTab('analyses');  setSubScreen(null); return; }
    if (screen === 'profil')                             { setActiveTab('profil');     setSubScreen(null); return; }
    if (screen === 'accueil'   || screen === 'home')     { setActiveTab('accueil');   setSubScreen(null); return; }
  };

  const fakeNavigation = { navigate };

  const renderScreen = () => {
    // Sub-screen : profil étudiant (sans tab bar)
    if (subScreen === 'student_profile') {
      return (
        <ProfessorStudentProfileScreen
          student={subParams}
          onBack={() => { setSubScreen(null); setSubParams(null); }}
        />
      );
    }

    switch (activeTab) {
      case 'accueil':   return <ProfessorHomeScreen     onNavigate={navigate} />;
      case 'etudiants': return <ProfessorStudentsScreen  onNavigate={navigate} />;
      case 'cours':     return <ProfessorCoursesScreen   onNavigate={navigate} />;
      case 'quiz':      return <ProfessorQuizScreen      onNavigate={navigate} />;
      case 'chat':      return <ProfessorChatScreen      onNavigate={navigate} />;
      case 'analyses':  return <ProfessorAnalyticsScreen onNavigate={navigate} />;
      case 'profil':    return <ProfessorProfilScreen    onLogout={onLogout} />;
      default:          return <ProfessorHomeScreen     onNavigate={navigate} />;
    }
  };

  const isSubScreen = !!subScreen;

  return (
    <View style={styles.wrapper}>
      {/* Screen content */}
      <View style={styles.screenArea}>{renderScreen()}</View>

      {/* Bottom tab bar — masqué sur les sous-écrans */}
      {!isSubScreen && (
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabItem}
                onPress={() => { setActiveTab(tab.key); setSubScreen(null); }}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:     { flex: 1, backgroundColor: '#F5F7F6' },
  screenArea:  { flex: 1 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#EDEDED',
    paddingBottom: 55, // safe area iOS
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