import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import StudentHomeScreen from './StudentHomeScreen';
import StudentCoursesScreen from './StudentCoursesScreen';
import StudentSATScreen from './StudentSATScreen';
import StudentChatScreen from './StudentChatScreen';
import StudentChatConversation from './StudentChatConversation';
import StudentProfilScreen from './StudentProfilScreen';
import StudentProgressionScreen from './StudentProgressionScreen';
import StudentGamificationScreen from './StudentGamificationScreen';
import StudentAbonnementScreen from './StudentAbonnementScreen';

// ─── Types ────────────────────────────────────────────────────────────────────
type TabKey = 'accueil' | 'cours' | 'sat' | 'chat' | 'profil';

type ProfilSubScreen = null | 'StudentProgression' | 'StudentGamification' | 'StudentAbonnement';

// Sous-écrans du chat
type ChatSubScreen =
  | null
  | 'StudentChatConversation'
  | 'StudentAIChat';

// Paramètres passés à StudentChatConversation
type ChatConversationParams = {
  conversationId: string;
  title?: string;
  otherMemberId?: string | undefined; // ✅ Corrigé : null remplacé par undefined
};

const TABS: { key: TabKey; label: string; icon: string; iconActive: string }[] = [
  { key: 'accueil', label: 'Accueil', icon: 'home-outline',        iconActive: 'home' },
  { key: 'cours',   label: 'Cours',   icon: 'book-outline',        iconActive: 'book' },
  { key: 'sat',     label: 'SAT',     icon: 'school-outline',      iconActive: 'school' },
  { key: 'chat',    label: 'Chat',    icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
  { key: 'profil',  label: 'Profil',  icon: 'person-outline',      iconActive: 'person' },
];

// ─── Student Navigator ────────────────────────────────────────────────────────
export default function StudentNavigator({ onLogout }: { onLogout?: () => void }) {
  const [activeTab, setActiveTab] = React.useState<TabKey>('accueil');
  const [profilSubScreen, setProfilSubScreen] = React.useState<ProfilSubScreen>(null);

  // ── Chat sub-screens ────────────────────────────────────────────────────────
  const [chatSubScreen, setChatSubScreen] = React.useState<ChatSubScreen>(null);
  const [chatConvParams, setChatConvParams] = React.useState<ChatConversationParams | null>(null);

  // ── Navigate ────────────────────────────────────────────────────────────────
  const navigate = (screen: string, params?: any) => {
    // Tab principale
    if (screen === 'accueil')             { setActiveTab('accueil'); resetSubScreens(); return; }
    if (screen === 'StudentCourses')      { setActiveTab('cours');   resetSubScreens(); return; }
    if (screen === 'StudentLesson')       { setActiveTab('cours');   resetSubScreens(); return; }
    if (screen === 'StudentSAT')          { setActiveTab('sat');     resetSubScreens(); return; }
    if (screen === 'StudentSATQuiz')      { setActiveTab('sat');     resetSubScreens(); return; }
    if (screen === 'StudentSATResults')   { setActiveTab('sat');     resetSubScreens(); return; }
    if (screen === 'CoursTab')            { setActiveTab('cours');   resetSubScreens(); return; }
    if (screen === 'SATTab')              { setActiveTab('sat');     resetSubScreens(); return; }

    // Chat principal
    if (screen === 'StudentChat')         { setActiveTab('chat');    resetSubScreens(); return; }

    // ── CHAT SOUS-ÉCRANS ──
    if (screen === 'StudentChatConversation') {
      setActiveTab('chat');
      setProfilSubScreen(null);
      setChatSubScreen('StudentChatConversation');
      // ✅ Corrigé : on convertit null → undefined avec ?? undefined
      setChatConvParams({
        conversationId: params?.conversationId,
        title: params?.title,
        otherMemberId: params?.otherMemberId ?? undefined,
      } as ChatConversationParams);
      return;
    }
    if (screen === 'StudentAIChat') {
      setActiveTab('chat');
      setProfilSubScreen(null);
      setChatSubScreen('StudentAIChat');
      setChatConvParams(null);
      return;
    }

    // Profil sous-écrans
    if (screen === 'StudentProfil')       { setActiveTab('profil');  resetSubScreens(); return; }
    if (screen === 'StudentProgression')  { setActiveTab('profil');  setProfilSubScreen('StudentProgression'); return; }
    if (screen === 'StudentAbonnement')   { setActiveTab('profil');  setProfilSubScreen('StudentAbonnement');  return; }
    if (screen === 'StudentGamification') { setActiveTab('profil');  setProfilSubScreen('StudentGamification'); return; }
  };

  const resetSubScreens = () => {
    setProfilSubScreen(null);
    setChatSubScreen(null);
    setChatConvParams(null);
  };

  // goBack : retour logique selon le contexte
  const goBack = () => {
    if (chatSubScreen !== null) {
      setChatSubScreen(null);
      setChatConvParams(null);
      return;
    }
    if (profilSubScreen !== null) {
      setProfilSubScreen(null);
      return;
    }
  };

  const fakeNavigation = { navigate, goBack, setOptions: (_opts: any) => {} };

  // Presser un onglet de la tab bar = reset tous les sous-écrans
  const handleTabPress = (key: TabKey) => {
    setActiveTab(key);
    resetSubScreens();
  };

  // ── Rendu de l'écran courant ─────────────────────────────────────────────
  const renderScreen = () => {
    // ── Chat : sous-écrans ──
    if (activeTab === 'chat') {
      if (chatSubScreen === 'StudentChatConversation' && chatConvParams) {
        return (
          <StudentChatConversation
            navigation={fakeNavigation}
            route={{ params: chatConvParams }}
          />
        );
      }

      // Écran principal chat (liste des conversations)
      return <StudentChatScreen navigation={fakeNavigation} />;
    }

    // ── Autres onglets ──
    switch (activeTab) {
      case 'accueil': return <StudentHomeScreen navigation={fakeNavigation} />;
      case 'cours':   return <StudentCoursesScreen navigation={fakeNavigation} />;
      case 'sat':     return <StudentSATScreen navigation={fakeNavigation} />;
      case 'profil':
        if (profilSubScreen === 'StudentProgression')  return <StudentProgressionScreen navigation={fakeNavigation} />;
        if (profilSubScreen === 'StudentGamification') return <StudentGamificationScreen navigation={fakeNavigation} />;
        if (profilSubScreen === 'StudentAbonnement')   return <StudentAbonnementScreen navigation={fakeNavigation} />;
        return <StudentProfilScreen navigation={fakeNavigation} onLogout={onLogout} />;
    }
  };

  // Masquer la tab bar quand on est dans une conversation
  const hideTabBar = chatSubScreen !== null;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.screenArea, hideTabBar && styles.screenAreaFull]}>
        {renderScreen()}
      </View>

      {!hideTabBar && (
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
  wrapper: { flex: 1, backgroundColor: '#F5F7F6' },
  screenArea: { flex: 1 },
  screenAreaFull: { flex: 1 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#EDEDED',
    paddingBottom: 10,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 3 },
  tabIconWrap: {
    width: 40, height: 32, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  tabIconWrapActive: { backgroundColor: '#0D6B5E18' },
  tabLabel: { fontSize: 9, color: '#AAA', fontWeight: '500' },
  tabLabelActive: { color: '#0D6B5E', fontWeight: '700' },
});