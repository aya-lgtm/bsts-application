import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import StudentHomeScreen from './StudentHomeScreen';
import StudentMentorsScreen from './Studentmentorsscreen'; // ← NOUVEAU
import StudentMeetingScreen from './Studentmeetingscreen'; // ← NOUVEAU
import StudentCoursesScreen from './StudentCoursesScreen';
import StudentCourseQuizScreen from './StudentCourseQuizScreen';
import StudentCourseExerciseScreen from './ Studentcourseexercisescreen';
import StudentLessonScreen from './StudentLessonScreen';
import StudentChatScreen from './StudentChatScreen';
import StudentChatConversation from './StudentChatConversation';
import StudentProfilScreen from './StudentProfilScreen';
import StudentProgressionScreen from './StudentProgressionScreen';
import StudentGamificationScreen from './StudentGamificationScreen';
import StudentAbonnementScreen from './StudentAbonnementScreen';

// ─── SAT Screens ──────────────────────────────────────────────────────────────
import StudentSATHomeScreen from './StudentSATHomeScreen';
import StudentSATLevelTestScreen from './StudentSATLevelTestScreen';
import StudentSATLevelResultScreen from './StudentSATLevelResultScreen';
import StudentSATUnitScreen from './StudentSATUnitScreen';
import StudentSATLessonScreen from './StudentSATLessonScreen';
import StudentSATLessonQuizScreen from './StudentSATLessonQuizScreen';
import StudentSATUnitTestScreen from './StudentSATUnitTestScreen';
import StudentSATUnitResultScreen from './StudentSATUnitResultScreen';
import StudentSATRevisionScreen from './StudentSATRevisionScreen'; // ✅ AJOUTÉ

// ─── Types ────────────────────────────────────────────────────────────────────
type TabKey = 'accueil' | 'cours' | 'sat' | 'chat' | 'profil';
type ProfilSubScreen = null | 'StudentProgression' | 'StudentGamification' | 'StudentAbonnement';
type ChatSubScreen   = null | 'StudentChatConversation' | 'StudentAIChat';
type AccueilSubScreen = null | 'StudentMentors' | 'StudentMeeting'; // ← NOUVEAU (StudentMeeting ajouté)

// ✅ Chaque entrée de l'historique SAT (stack)
type SATEntry = {
  screen: string;
  params?: any;
};

// Stack entry pour les cours
type CoursEntry = {
  screen: string;
  params?: any;
};


type ChatConversationParams = {
  conversationId: string;
  title?: string;
  otherMemberId?: string | undefined;
};

const TABS: { key: TabKey; label: string; icon: string; iconActive: string }[] = [
  { key: 'accueil', label: 'Accueil', icon: 'home-outline',        iconActive: 'home'        },
  { key: 'cours',   label: 'Cours',   icon: 'book-outline',        iconActive: 'book'        },
  { key: 'sat',     label: 'SAT',     icon: 'school-outline',      iconActive: 'school'      },
  { key: 'chat',    label: 'Chat',    icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
  { key: 'profil',  label: 'Profil',  icon: 'person-outline',      iconActive: 'person'      },
];

export default function StudentNavigator({ onLogout }: { onLogout?: () => void }) {
  const [activeTab, setActiveTab]             = React.useState<TabKey>('accueil');
  const [profilSubScreen, setProfilSubScreen] = React.useState<ProfilSubScreen>(null);
  const [chatSubScreen, setChatSubScreen]     = React.useState<ChatSubScreen>(null);
  const [chatConvParams, setChatConvParams]   = React.useState<ChatConversationParams | null>(null);
  const [accueilSubScreen, setAccueilSubScreen] = React.useState<AccueilSubScreen>(null); // ← NOUVEAU
  const [accueilParams, setAccueilParams]     = React.useState<any>(null);                // ← NOUVEAU
  const [unreadCount, setUnreadCount]         = React.useState(0);

  // ✅ STACK SAT — historique de navigation pour le back correct
  const [satStack, setSatStack] = React.useState<SATEntry[]>([]);
  const currentSAT = satStack.length > 0 ? satStack[satStack.length - 1] : null;

  // ✅ STACK COURS
  const [coursStack, setCoursStack] = React.useState<CoursEntry[]>([]);
  const currentCours = coursStack.length > 0 ? coursStack[coursStack.length - 1] : null;

  // ─── Push dans la pile SAT ─────────────────────────────────────────────────
  const pushSAT = (screen: string, params?: any) => {
    setActiveTab('sat');
    setSatStack(prev => [...prev, { screen, params }]);
  };

  // ─── Push dans la pile Cours ──────────────────────────────────────────────
  const pushCours = (screen: string, params?: any) => {
    setActiveTab('cours');
    setCoursStack(prev => [...prev, { screen, params }]);
  };

  // ─── Navigation ────────────────────────────────────────────────────────────
  const navigate = (screen: string, params?: any) => {

    // ── Accueil ──
    if (screen === 'accueil') {
      setActiveTab('accueil'); resetSubScreens(); return;
    }

    // ── Mentors ──
    if (screen === 'StudentMentors') {
      setActiveTab('accueil');
      setAccueilSubScreen('StudentMentors');
      setAccueilParams(params);
      return;
    }

    // ── Meeting ──
    if (screen === 'StudentMeeting') {
      setActiveTab('accueil');
      setAccueilSubScreen('StudentMeeting');
      setAccueilParams(params);
      return;
    }

    // ── Cours ──
    if (screen === 'StudentCourses' || screen === 'CoursTab') {
      setActiveTab('cours'); setCoursStack([]); return;
    }
    if (screen === 'StudentLesson') {
      pushCours('StudentLesson', params); return;
    }
    if (screen === 'StudentCourseExercise') {
      pushCours('StudentCourseExercise', params); return;
    }
    if (screen === 'StudentCourseQuiz') {
      pushCours('StudentCourseQuiz', params); return;
    }

    // ── SAT accueil ──
    if (screen === 'StudentSATScreen' || screen === 'StudentSATHome' || screen === 'SATTab') {
      setActiveTab('sat'); setSatStack([]); return;
    }

    // ── SAT sous-écrans ──
    if (screen === 'StudentSATLevelTest')   { pushSAT('StudentSATLevelTest',   params); return; }
    if (screen === 'StudentSATLevelResult') { pushSAT('StudentSATLevelResult', params); return; }
    if (screen === 'StudentSATUnit')        { pushSAT('StudentSATUnit',        params); return; }
    if (screen === 'StudentSATLesson')      { pushSAT('StudentSATLesson',      params); return; }
    if (screen === 'StudentSATLessonQuiz')  { pushSAT('StudentSATLessonQuiz',  params); return; }
    if (screen === 'StudentSATUnitTest')    { pushSAT('StudentSATUnitTest',    params); return; }
    if (screen === 'StudentSATUnitResult')  { pushSAT('StudentSATUnitResult',  params); return; }
    if (screen === 'StudentSATRevision')    { pushSAT('StudentSATRevision',    params); return; } // ✅ AJOUTÉ

    // ── Chat ──
    if (screen === 'StudentChat') { setActiveTab('chat'); resetSubScreens(); return; }
    if (screen === 'StudentChatConversation') {
      setActiveTab('chat');
      setProfilSubScreen(null); setSatStack([]); setCoursStack([]);
      setChatSubScreen('StudentChatConversation');
      setChatConvParams({
        conversationId: params?.conversationId,
        title: params?.title,
        otherMemberId: params?.otherMemberId ?? undefined,
      });
      return;
    }
    if (screen === 'StudentAIChat') {
      setActiveTab('chat');
      setProfilSubScreen(null); setSatStack([]); setCoursStack([]);
      setChatSubScreen('StudentAIChat');
      setChatConvParams(null);
      return;
    }

    // ── Profil ──
    if (screen === 'StudentProfil')       { setActiveTab('profil'); resetSubScreens(); return; }
    if (screen === 'StudentProgression')  { setActiveTab('profil'); setProfilSubScreen('StudentProgression'); return; }
    if (screen === 'StudentAbonnement')   { setActiveTab('profil'); setProfilSubScreen('StudentAbonnement'); return; }
    if (screen === 'StudentGamification') { setActiveTab('profil'); setProfilSubScreen('StudentGamification'); return; }
  };

  const resetSubScreens = () => {
    setProfilSubScreen(null);
    setChatSubScreen(null);
    setChatConvParams(null);
    setCoursStack([]);
    setAccueilSubScreen(null);
    setAccueilParams(null);
    setSatStack([]);
  };

  const goBack = () => {
    if (coursStack.length > 0) {
      setCoursStack(prev => prev.slice(0, -1));
      return;
    }
    if (accueilSubScreen !== null) {
      setAccueilSubScreen(null); setAccueilParams(null); return;
    }
    if (chatSubScreen !== null) {
      setChatSubScreen(null); setChatConvParams(null); return;
    }
    if (satStack.length > 0) {
      setSatStack(prev => prev.slice(0, -1)); return;
    }
    if (profilSubScreen !== null) {
      setProfilSubScreen(null); return;
    }
  };

  const fakeNavigation = { navigate, goBack, setOptions: (_opts: any) => {} };

  const handleTabPress = (key: TabKey) => {
    setActiveTab(key);
    resetSubScreens();
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  const renderScreen = () => {

    // ── Accueil sub-screens ──
    if (activeTab === 'accueil' && accueilSubScreen === 'StudentMentors') {
      return (
        <StudentMentorsScreen
          navigation={fakeNavigation}
          route={{ params: accueilParams }}
        />
      );
    }

    if (activeTab === 'accueil' && accueilSubScreen === 'StudentMeeting') {
      return (
        <StudentMeetingScreen
          navigation={fakeNavigation}
          route={{ params: accueilParams }}
        />
      );
    }

    // ── Chat ──
    if (activeTab === 'chat') {
      if (chatSubScreen === 'StudentChatConversation' && chatConvParams) {
        return (
          <StudentChatConversation
            navigation={fakeNavigation}
            route={{ params: chatConvParams }}
          />
        );
      }
      return (
        <StudentChatScreen
          navigation={fakeNavigation}
          onUnreadCountChange={setUnreadCount}
        />
      );
    }

    // ── SAT ──
    if (activeTab === 'sat') {
      if (!currentSAT) {
        return <StudentSATHomeScreen navigation={fakeNavigation} />;
      }

      const { screen, params } = currentSAT;

      if (screen === 'StudentSATLevelTest')
        return <StudentSATLevelTestScreen navigation={fakeNavigation} />;
      if (screen === 'StudentSATLevelResult')
        return <StudentSATLevelResultScreen navigation={fakeNavigation} route={{ params }} />;
      if (screen === 'StudentSATUnit')
        return <StudentSATUnitScreen navigation={fakeNavigation} route={{ params }} />;
      if (screen === 'StudentSATLesson')
        return <StudentSATLessonScreen navigation={fakeNavigation} route={{ params }} />;
      if (screen === 'StudentSATLessonQuiz')
        return <StudentSATLessonQuizScreen navigation={fakeNavigation} route={{ params }} />;
      if (screen === 'StudentSATUnitTest')
        return <StudentSATUnitTestScreen navigation={fakeNavigation} route={{ params }} />;
      if (screen === 'StudentSATUnitResult')
        return <StudentSATUnitResultScreen navigation={fakeNavigation} route={{ params }} />;
      if (screen === 'StudentSATRevision') // ✅ AJOUTÉ
        return <StudentSATRevisionScreen navigation={fakeNavigation} />;

      return <StudentSATHomeScreen navigation={fakeNavigation} />;
    }

    // ── Cours ──
    // ✅ SOLUTION : StudentCoursesScreen reste toujours monté (jamais recréé)
    // Les sous-écrans (Leçon, Quiz, Exercices) s'affichent PAR-DESSUS avec absoluteFill
    // Quand on fait goBack() → le sous-écran disparaît → CoursesScreen réapparaît
    // avec son state interne intact (screen='detail', chapitre sélectionné, etc.)
    if (activeTab === 'cours') {
      return (
        <View style={{ flex: 1 }}>
          {/* StudentCoursesScreen toujours monté — son state est préservé */}
          <StudentCoursesScreen navigation={fakeNavigation} />

          {/* Leçon par-dessus */}
          {currentCours?.screen === 'StudentLesson' && (
            <View style={StyleSheet.absoluteFill}>
              <StudentLessonScreen
                navigation={fakeNavigation}
                route={{ params: currentCours.params }}
              />
            </View>
          )}

          {/* Quiz par-dessus */}
          {currentCours?.screen === 'StudentCourseQuiz' && (
            <View style={StyleSheet.absoluteFill}>
              <StudentCourseQuizScreen
                navigation={fakeNavigation}
                route={{ params: currentCours.params }}
              />
            </View>
          )}

          {/* Exercices par-dessus */}
          {currentCours?.screen === 'StudentCourseExercise' && (
            <View style={StyleSheet.absoluteFill}>
              <StudentCourseExerciseScreen
                navigation={fakeNavigation}
                route={{ params: currentCours.params }}
              />
            </View>
          )}
        </View>
      );
    }

    // ── Autres ──
    switch (activeTab) {
      case 'accueil': return <StudentHomeScreen navigation={fakeNavigation} />;
      case 'profil':
        if (profilSubScreen === 'StudentProgression')  return <StudentProgressionScreen navigation={fakeNavigation} />;
        if (profilSubScreen === 'StudentGamification') return <StudentGamificationScreen navigation={fakeNavigation} />;
        if (profilSubScreen === 'StudentAbonnement')   return <StudentAbonnementScreen navigation={fakeNavigation} />;
        return <StudentProfilScreen navigation={fakeNavigation} onLogout={onLogout} />;
    }
  };

  // ✅ hideTabBar : cacher quand un sous-écran cours est actif
  const hideTabBar = chatSubScreen !== null || coursStack.length > 0 || accueilSubScreen !== null;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.screenArea, hideTabBar && styles.screenAreaFull]}>
        {renderScreen()}
      </View>

      {!hideTabBar && (
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive       = activeTab === tab.key;
            const isChat         = tab.key === 'chat';
            const showBadgeCount = isChat && unreadCount > 0 && activeTab !== 'chat';
            const showRedDot     = isChat && unreadCount > 0;

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
                  {showBadgeCount && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unreadCount <= 9 ? unreadCount : '9+'}</Text>
                    </View>
                  )}
                  {showRedDot && !showBadgeCount && <View style={styles.redDot} />}
                </View>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:          { flex: 1, backgroundColor: '#F5F7F6' },
  screenArea:       { flex: 1 },
  screenAreaFull:   { flex: 1 },
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
    justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  badgeText:     { fontSize: 9, fontWeight: '800', color: '#FFFFFF', lineHeight: 13 },
  redDot: {
    position: 'absolute', top: -2, right: -2, width: 9, height: 9,
    borderRadius: 5, backgroundColor: '#E53935', borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  tabLabel:       { fontSize: 9, color: '#AAA', fontWeight: '500' },
  tabLabelActive: { color: '#0D6B5E', fontWeight: '700' },
});