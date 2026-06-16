import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY = '#0D6B5E';
const GOLD = '#D4A017';
const BG = '#F9FAFB';
const CARD = '#FFFFFF';
const TEXT = '#111827';
const MUTED = '#6B7280';

const badges = [
  { id: '1', icon: '🏆', name: 'Premier Quiz', earned: true },
  { id: '2', icon: '🌟', name: 'Semaine Active', earned: true },
  { id: '3', icon: '🥇', name: 'Top Score SAT', earned: true },
  { id: '4', icon: '⚡', name: 'Streak 7 jours', earned: true },
  { id: '5', icon: '👑', name: 'Champion', earned: false },
  { id: '6', icon: '🎓', name: 'Scholar', earned: false },
];

const rewards = [
  { id: '1', icon: '⭐', points: '+200 pts', desc: 'Atteindre 80% dans un cours', claimed: false },
  { id: '2', icon: '⭐', points: '+100 pts', desc: 'Compléter 5 quiz', claimed: false },
  { id: '3', icon: '⭐', points: '+50 pts', desc: 'Connexion 7 jours consécutifs', claimed: true },
];

const leaderboard = [
  { rank: 1, name: 'Karim A.', points: 4200, avatar: '🥇' },
  { rank: 2, name: 'Nour B.', points: 3850, avatar: '🥈' },
  { rank: 3, name: 'Yasmine T.', points: 3700, avatar: '🥉' },
  { rank: 24, name: 'Aya (toi)', points: 2450, avatar: '🧑‍🎓', highlight: true },
];

export default function StudentGamificationScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gamification</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Level card */}
        <View style={styles.levelCard}>
          <View style={styles.levelRow}>
            <Text style={styles.levelLabel}>Niveau actuel</Text>
            <Text style={styles.levelValue}>Explorer</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '70%' }]} />
          </View>
          <Text style={styles.levelPoints}>2 450 / 3 500 pts</Text>

          {/* Badges row */}
          <View style={styles.badgesRow}>
            {badges.filter(b => b.earned).slice(0, 5).map(badge => (
              <Text key={badge.id} style={[styles.badgeIcon, !badge.earned && { opacity: 0.3 }]}>{badge.icon}</Text>
            ))}
          </View>
        </View>

        {/* All Badges */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Badges</Text>
          <TouchableOpacity><Text style={styles.seeAll}>Voir tout &gt;</Text></TouchableOpacity>
        </View>
        <View style={styles.badgesGrid}>
          {badges.map(badge => (
            <View key={badge.id} style={[styles.badgeCard, !badge.earned && styles.badgeCardLocked]}>
              <Text style={[styles.badgeCardIcon, !badge.earned && { opacity: 0.3 }]}>{badge.icon}</Text>
              <Text style={[styles.badgeName, !badge.earned && { color: MUTED }]}>{badge.name}</Text>
            </View>
          ))}
        </View>

        {/* Rewards */}
        <Text style={styles.sectionTitle}>Récompenses</Text>
        {rewards.map(reward => (
          <View key={reward.id} style={styles.rewardRow}>
            <Text style={styles.rewardIcon}>{reward.icon}</Text>
            <View style={styles.rewardInfo}>
              <Text style={styles.rewardPoints}>{reward.points}</Text>
              <Text style={styles.rewardDesc}>{reward.desc}</Text>
            </View>
            {!reward.claimed ? (
              <TouchableOpacity style={styles.claimBtn}>
                <Text style={styles.claimBtnText}>Récupérer</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.claimedBadge}>
                <Text style={styles.claimedText}>✓ Récupéré</Text>
              </View>
            )}
          </View>
        ))}

        {/* Leaderboard */}
        <Text style={styles.sectionTitle}>Classement BSTS</Text>
        <View style={styles.leaderboardCard}>
          <Text style={styles.leaderboardPosition}>
            Ta position <Text style={{ color: PRIMARY, fontWeight: '800' }}>#24</Text>
          </Text>
          <Text style={styles.leaderboardTotal}>sur 1 250 élèves</Text>
          {leaderboard.map(entry => (
            <View key={entry.rank} style={[styles.leaderboardRow, entry.highlight && styles.leaderboardHighlight]}>
              <Text style={styles.rankText}>#{entry.rank}</Text>
              <Text style={styles.leaderboardAvatar}>{entry.avatar}</Text>
              <Text style={[styles.leaderboardName, entry.highlight && { color: PRIMARY, fontWeight: '700' }]}>{entry.name}</Text>
              <Text style={styles.leaderboardPoints}>{entry.points.toLocaleString()} pts</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: TEXT, fontFamily: 'Montserrat-Bold', textAlign: 'center' },
  content: { padding: 16 },
  levelCard: { backgroundColor: PRIMARY, borderRadius: 16, padding: 18, marginBottom: 20 },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  levelLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'Montserrat-Regular' },
  levelValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Montserrat-Bold' },
  progressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, marginBottom: 6 },
  progressFill: { height: 8, backgroundColor: GOLD, borderRadius: 4 },
  levelPoints: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'Montserrat-Regular', marginBottom: 14 },
  badgesRow: { flexDirection: 'row', gap: 8 },
  badgeIcon: { fontSize: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: TEXT, fontFamily: 'Montserrat-Bold', marginBottom: 12 },
  seeAll: { fontSize: 13, color: PRIMARY, fontFamily: 'Montserrat-Medium' },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  badgeCard: { width: '30%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  badgeCardLocked: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  badgeCardIcon: { fontSize: 28, marginBottom: 6 },
  badgeName: { fontSize: 11, color: TEXT, fontFamily: 'Montserrat-Medium', textAlign: 'center' },
  rewardRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  rewardIcon: { fontSize: 22, marginRight: 12 },
  rewardInfo: { flex: 1 },
  rewardPoints: { fontSize: 14, fontWeight: '700', color: GOLD, fontFamily: 'Montserrat-Bold' },
  rewardDesc: { fontSize: 12, color: MUTED, fontFamily: 'Montserrat-Regular', marginTop: 2 },
  claimBtn: { backgroundColor: PRIMARY, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  claimBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Montserrat-Bold' },
  claimedBadge: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  claimedText: { fontSize: 12, color: MUTED, fontFamily: 'Montserrat-Regular' },
  leaderboardCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  leaderboardPosition: { fontSize: 15, color: TEXT, fontFamily: 'Montserrat-Regular', textAlign: 'center' },
  leaderboardTotal: { fontSize: 12, color: MUTED, fontFamily: 'Montserrat-Regular', textAlign: 'center', marginBottom: 14 },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 10 },
  leaderboardHighlight: { backgroundColor: '#F0FAF8', borderRadius: 10, paddingHorizontal: 8 },
  rankText: { fontSize: 13, fontWeight: '700', color: MUTED, fontFamily: 'Montserrat-Bold', width: 28 },
  leaderboardAvatar: { fontSize: 20 },
  leaderboardName: { flex: 1, fontSize: 14, color: TEXT, fontFamily: 'Montserrat-Medium' },
  leaderboardPoints: { fontSize: 13, fontWeight: '600', color: PRIMARY, fontFamily: 'Montserrat-SemiBold' },
});