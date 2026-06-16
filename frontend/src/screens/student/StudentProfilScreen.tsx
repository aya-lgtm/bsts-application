import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY = '#0D6B5E';
const GOLD = '#D4A017';
const BG = '#F9FAFB';
const CARD = '#FFFFFF';
const TEXT = '#111827';
const MUTED = '#6B7280';

const menuItems = [
  { id: 'progression', icon: 'trending-up-outline', label: 'Ma progression', screen: 'StudentProgression', color: '#3B82F6' },
  { id: 'gamification', icon: 'trophy-outline', label: 'Badges & Classement', screen: 'StudentGamification', color: GOLD },
  { id: 'abonnement', icon: 'card-outline', label: 'Mon abonnement', screen: 'StudentAbonnement', color: '#10B981' },
  { id: 'notifications', icon: 'notifications-outline', label: 'Notifications', screen: null, color: '#F59E0B' },
  { id: 'settings', icon: 'settings-outline', label: 'Paramètres', screen: null, color: MUTED },
  { id: 'help', icon: 'help-circle-outline', label: 'Aide & FAQ', screen: null, color: MUTED },
];

type Props = { navigation: { navigate: (screen: string) => void }
  onLogout?: () => void  }

export default function StudentProfilScreen({ onLogout }: Props) {
  const navigation = useNavigation<any>();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Profile header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarEmoji}>🧑‍🎓</Text>
          </View>
          <TouchableOpacity style={styles.editAvatarBtn}>
            <Ionicons name="camera" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.profileName}>Aya Benali</Text>
        <Text style={styles.profileEmail}>aya.benali@bsts.ma</Text>
        <View style={styles.levelBadge}>
          <Ionicons name="school" size={14} color={PRIMARY} />
          <Text style={styles.levelText}>Explorer · Grade 11</Text>
        </View>
      </View>

      {/* Quick stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>1 320</Text>
          <Text style={styles.statLabel}>Score SAT</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>18</Text>
          <Text style={styles.statLabel}>Cours terminés</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>12🔥</Text>
          <Text style={styles.statLabel}>Streak jours</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menuCard}>
        {menuItems.map((item, index) => (
          <React.Fragment key={item.id}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => item.screen && navigation.navigate(item.screen)}
              disabled={!item.screen}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={MUTED} />
            </TouchableOpacity>
            {index < menuItems.length - 1 && <View style={styles.menuDivider} />}
          </React.Fragment>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={() => onLogout?.()}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { paddingBottom: 20 },
  profileHeader: { backgroundColor: '#FFFFFF', paddingTop: 56, paddingBottom: 24, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  avatarWrapper: { position: 'relative', marginBottom: 12 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F0FAF8', borderWidth: 3, borderColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 40 },
  editAvatarBtn: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: 20, fontWeight: '800', color: '#111827', fontFamily: 'Montserrat-Bold' },
  profileEmail: { fontSize: 13, color: MUTED, marginTop: 3, fontFamily: 'Montserrat-Regular' },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0FAF8', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginTop: 10 },
  levelText: { fontSize: 13, color: PRIMARY, fontWeight: '600', fontFamily: 'Montserrat-SemiBold' },
  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, gap: 10 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  statValue: { fontSize: 18, fontWeight: '800', color: PRIMARY, fontFamily: 'Montserrat-Bold' },
  statLabel: { fontSize: 11, color: MUTED, marginTop: 3, textAlign: 'center', fontFamily: 'Montserrat-Regular' },
  menuCard: { backgroundColor: '#FFFFFF', borderRadius: 14, marginHorizontal: 16, marginTop: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  menuIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#111827', fontFamily: 'Montserrat-SemiBold' },
  menuDivider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 68 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 16, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#FEE2E2', backgroundColor: '#FFF5F5' },
  logoutText: { fontSize: 14, fontWeight: '700', color: '#EF4444', fontFamily: 'Montserrat-Bold' },
});