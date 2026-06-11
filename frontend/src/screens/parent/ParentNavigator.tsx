import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import ParentHomeScreen from './ParentHomeScreen';
import ParentProgressionScreen from './ParentProgressionScreen';
import ParentPaiementsScreen from './ParentPaiementsScreen';
import ParentNotificationsScreen from './ParentNotificationsScreen';
import ParentProfilScreen from './ParentProfilScreen';

// ─── Tab config ────────────────────────────────────────────────────────────
type TabKey = 'accueil' | 'progression' | 'paiements' | 'notifications' | 'profil';

const TABS: { key: TabKey; label: string; icon: string; iconActive: string }[] = [
  { key: 'accueil',       label: 'Accueil',        icon: 'home-outline',          iconActive: 'home' },
  { key: 'progression',  label: 'Progression',    icon: 'bar-chart-outline',     iconActive: 'bar-chart' },
  { key: 'paiements',    label: 'Paiements',      icon: 'card-outline',          iconActive: 'card' },
  { key: 'notifications',label: 'Notifications',  icon: 'notifications-outline', iconActive: 'notifications' },
  { key: 'profil',       label: 'Profil',         icon: 'person-outline',        iconActive: 'person' },
];

// ─── Parent Navigator ──────────────────────────────────────────────────────
export default function ParentNavigator({ onLogout }: { onLogout?: () => void }) {
  const [activeTab, setActiveTab] = React.useState<TabKey>('accueil');

  const renderScreen = () => {
    switch (activeTab) {
      case 'accueil':       return <ParentHomeScreen navigation={null} />;
      case 'progression':   return <ParentProgressionScreen navigation={null} />;
      case 'paiements':     return <ParentPaiementsScreen navigation={null} />;
      case 'notifications': return <ParentNotificationsScreen navigation={null} />;
      case 'profil':        return <ParentProfilScreen navigation={null} onLogout={onLogout} />;
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Screen content */}
      <View style={styles.screenArea}>{renderScreen()}</View>

      {/* Bottom tab bar */}
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
    paddingBottom: 55, // safe area
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