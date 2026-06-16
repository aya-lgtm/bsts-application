import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import ProfessorHomeScreen         from './ProfessorHomeScreen';
import ProfessorStudentsScreen     from './ProfessorStudentsScreen';
import ProfessorStudentProfileScreen from './ProfessorStudentProfileScreen';
import ProfessorCoursesScreen      from './ProfessorCoursesScreen';
import ProfessorQuizScreen         from './ProfessorQuizScreen';
import ProfessorAnalyticsScreen    from './ProfessorNotificationsScreen';
import ProfessorChatScreen         from './ProfessorChatScreen';
import ProfessorProfilScreen       from './ProfessorProfilScreen';

// ─── Tab config ──────────────────────────────────────────────────────────────
type TabKey = 'accueil' | 'etudiants' | 'cours' | 'quiz' | 'chat' | 'analyses' | 'profil';

const TABS: { key: TabKey; label: string; icon: string; iconActive: string }[] = [
  { key: 'accueil',   label: 'Accueil',   icon: 'home-outline',        iconActive: 'home' },
  { key: 'etudiants', label: 'Étudiants', icon: 'people-outline',      iconActive: 'people' },
  { key: 'cours',     label: 'Cours',     icon: 'book-outline',        iconActive: 'book' },
  { key: 'quiz',      label: 'Quiz',      icon: 'create-outline',      iconActive: 'create' },
  { key: 'chat',      label: 'Chat',      icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
  { key: 'analyses', label: 'Notifs', icon: 'notifications-outline', iconActive: 'notifications' },
  { key: 'profil',    label: 'Profil',    icon: 'person-outline',      iconActive: 'person' },
];

// ─── Navigator ───────────────────────────────────────────────────────────────
export default function ProfessorNavigator({ onLogout }: { onLogout?: () => void }) {
  const [activeTab,    setActiveTab]    = React.useState<TabKey>('accueil');
  const [subScreen,    setSubScreen]    = React.useState<string | null>(null);
  const [subParams,    setSubParams]    = React.useState<any>(null);
  // ✅ Nombre total de messages non lus — mis à jour par ProfessorChatScreen
  const [unreadCount,  setUnreadCount]  = useState(0);

  const navigate = (screen: string, params?: any) => {
    if (screen === 'student_profile') {
      setSubScreen('student_profile'); setSubParams(params); return;
    }
    const tabMap: Record<string, TabKey> = {
      etudiants: 'etudiants', students: 'etudiants',
      cours: 'cours',         courses:  'cours',
      quiz:  'quiz',
      chat:  'chat',
      analytics: 'analyses',  analyses: 'analyses',
      profil: 'profil',
      accueil: 'accueil',     home: 'accueil',
    };
    if (tabMap[screen]) { setActiveTab(tabMap[screen]); setSubScreen(null); }
  };

  const renderScreen = () => {
    if (subScreen === 'student_profile') {
      return (
        <ProfessorStudentProfileScreen
          student={subParams}
          onBack={() => { setSubScreen(null); setSubParams(null); }}
        />
      );
    }
    switch (activeTab) {
      case 'accueil':   return <ProfessorHomeScreen      onNavigate={navigate} />;
      case 'etudiants': return <ProfessorStudentsScreen   onNavigate={navigate} />;
      case 'cours':     return <ProfessorCoursesScreen    onNavigate={navigate} />;
      case 'quiz':      return <ProfessorQuizScreen       onNavigate={navigate} />;
      case 'chat':      return (
        <ProfessorChatScreen
          onNavigate={navigate}
          onUnreadChange={setUnreadCount}   // ← callback badge
        />
      );
      case 'analyses':  return <ProfessorAnalyticsScreen  onNavigate={navigate} />;
      case 'profil':    return <ProfessorProfilScreen      onLogout={onLogout} />;
      default:          return <ProfessorHomeScreen      onNavigate={navigate} />;
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.screenArea}>{renderScreen()}</View>

      {/* Tab bar — masqué sur les sous-écrans */}
      {!subScreen && (
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive  = activeTab === tab.key;
            const showBadge = tab.key === 'chat' && unreadCount > 0;

            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabItem}
                onPress={() => { setActiveTab(tab.key); setSubScreen(null); }}
                activeOpacity={0.7}
              >
                {/* Icône + badge rouge */}
                <View style={styles.iconWrapper}>
                  <View style={[styles.tabIconWrap, isActive && styles.tabIconWrapActive]}>
                    <Ionicons
                      name={(isActive ? tab.iconActive : tab.icon) as any}
                      size={22}
                      color={isActive ? '#0D6B5E' : '#AAA'}
                    />
                  </View>
                  {/* ✅ Point rouge si messages non lus */}
                  {showBadge && (
                    <View style={styles.badgeDot}>
                      {unreadCount > 9
                        ? <Text style={styles.badgeDotText}>9+</Text>
                        : null
                      }
                    </View>
                  )}
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

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper:    { flex: 1, backgroundColor: '#F5F7F6' },
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

  // Wrapper relatif pour positionner le badge par rapport à l'icône
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
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

  // ✅ Point rouge — positionné en haut à droite de l'icône
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeDotText: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '800',
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