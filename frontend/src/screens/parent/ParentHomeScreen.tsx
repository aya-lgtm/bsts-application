import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

// ─── Mock Data ───────────────────────────────────────────────────────────────
const MOCK_PARENT = {
  firstName: 'Fatima',
};

const MOCK_CHILDREN = [
  {
    id: '1',
    name: 'Adam Khan',
    classe: 'Classe 11',
    satScore: 1320,
    avatar: null, // replace with require('../assets/adam.jpg') when available
    progressPercent: 72,
    coursesCompleted: 16,
    coursesTotal: 20,
    streak: 12,
  },
  {
    id: '2',
    name: 'Lina Khan',
    classe: 'Classe 9',
    satScore: 1180,
    avatar: null,
    progressPercent: 58,
    coursesCompleted: 8,
    coursesTotal: 16,
    streak: 5,
  },
];

const MOCK_ACTIVITY = [
  {
    id: '1',
    childName: 'Adam',
    type: 'lesson',
    title: 'A terminé une leçon',
    subtitle: 'Quadratic functions',
    date: "Aujourd'hui",
    icon: 'checkmark-circle',
    iconColor: '#0D6B5E',
  },
  {
    id: '2',
    childName: 'Adam',
    type: 'quiz',
    title: 'A passé un quiz',
    subtitle: 'SAT Math – Module 2',
    date: 'Hier',
    icon: 'clipboard-outline',
    iconColor: '#6C63FF',
  },
  {
    id: '3',
    childName: '',
    type: 'score',
    title: 'Nouveau score SAT',
    subtitle: 'Score estimé : 1320',
    date: '12 Mai',
    icon: 'star-outline',
    iconColor: '#D4A017',
  },
];

// ─── Global stats computed from children ──────────────────────────────────
const avgProgress = Math.round(
  MOCK_CHILDREN.reduce((sum, c) => sum + c.progressPercent, 0) / MOCK_CHILDREN.length
);
const totalCourses = MOCK_CHILDREN.reduce((sum, c) => sum + c.coursesCompleted, 0);
const totalCoursesMax = MOCK_CHILDREN.reduce((sum, c) => sum + c.coursesTotal, 0);
const bestSat = Math.max(...MOCK_CHILDREN.map((c) => c.satScore));
const maxStreak = Math.max(...MOCK_CHILDREN.map((c) => c.streak));

// ─── Mini Sparkline (SVG-free, pure View) ────────────────────────────────
const SPARKLINE_POINTS = [30, 45, 38, 55, 50, 62, 58, 68]; // mock % values
const SPARK_WIDTH = 120;
const SPARK_HEIGHT = 40;

function Sparkline() {
  const max = Math.max(...SPARKLINE_POINTS);
  const min = Math.min(...SPARKLINE_POINTS);
  const range = max - min || 1;
  const step = SPARK_WIDTH / (SPARKLINE_POINTS.length - 1);

  const points = SPARKLINE_POINTS.map((v, i) => ({
    x: i * step,
    y: SPARK_HEIGHT - ((v - min) / range) * (SPARK_HEIGHT - 8) - 4,
  }));

  return (
    <View style={{ width: SPARK_WIDTH, height: SPARK_HEIGHT }}>
      {points.slice(0, -1).map((pt, i) => {
        const next = points[i + 1];
        const dx = next.x - pt.x;
        const dy = next.y - pt.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: pt.x,
              top: pt.y,
              width: length,
              height: 2,
              backgroundColor: '#0D6B5E',
              borderRadius: 1,
              transform: [{ rotate: `${angle}deg` }, { translateX: length / 2 - length / 2 }],
              transformOrigin: '0 50%',
            }}
          />
        );
      })}
      {/* Last dot */}
      <View
        style={{
          position: 'absolute',
          left: points[points.length - 1].x - 4,
          top: points[points.length - 1].y - 4,
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#0D6B5E',
        }}
      />
    </View>
  );
}

// ─── Child Card ────────────────────────────────────────────────────────────
function ChildCard({ child }: { child: typeof MOCK_CHILDREN[0] }) {
  return (
    <TouchableOpacity style={styles.childCard} activeOpacity={0.85}>
      <View style={styles.childAvatarWrap}>
        {child.avatar ? (
          <Image source={child.avatar} style={styles.childAvatar} />
        ) : (
          <View style={[styles.childAvatar, styles.childAvatarPlaceholder]}>
            <Text style={styles.childAvatarInitial}>{child.name[0]}</Text>
          </View>
        )}
      </View>
      <Text style={styles.childName} numberOfLines={1}>{child.name}</Text>
      <Text style={styles.childClasse}>{child.classe}</Text>
      <View style={styles.satBadge}>
        <Text style={styles.satScore}>{child.satScore}</Text>
      </View>
      <Text style={styles.satLabel}>Score SAT</Text>
    </TouchableOpacity>
  );
}

// ─── Add Child Card ────────────────────────────────────────────────────────
function AddChildCard() {
  return (
    <TouchableOpacity style={[styles.childCard, styles.addChildCard]} activeOpacity={0.85}>
      <View style={styles.addChildIcon}>
        <Ionicons name="add" size={28} color="#0D6B5E" />
      </View>
      <Text style={styles.addChildLabel}>Ajouter{'\n'}un enfant</Text>
    </TouchableOpacity>
  );
}

// ─── Activity Item ─────────────────────────────────────────────────────────
function ActivityItem({ item }: { item: typeof MOCK_ACTIVITY[0] }) {
  return (
    <View style={styles.activityRow}>
      <View style={[styles.activityIcon, { backgroundColor: item.iconColor + '18' }]}>
        <Ionicons name={item.icon as any} size={18} color={item.iconColor} />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>
          {item.childName ? <Text style={{ fontWeight: '700' }}>{item.childName} </Text> : null}
          {item.title}
        </Text>
        <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
      </View>
      <Text style={styles.activityDate}>{item.date}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────
export default function ParentHomeScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjour,</Text>
            <Text style={styles.parentName}>
              {MOCK_PARENT.firstName} 👋
            </Text>
            <Text style={styles.subtitle}>Voici le résumé de vos enfants.</Text>
          </View>
          <TouchableOpacity style={styles.bellWrap}>
            <Ionicons name="notifications-outline" size={24} color="#1A1A1A" />
            <View style={styles.bellDot} />
          </TouchableOpacity>
        </View>

        {/* Mes enfants */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mes enfants</Text>
          <TouchableOpacity>
            <Text style={styles.voirTout}>Voir tout &gt;</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.childrenRow}
        >
          {MOCK_CHILDREN.map((child) => (
            <ChildCard key={child.id} child={child} />
          ))}
          <AddChildCard />
        </ScrollView>

        {/* Progression globale */}
        <View style={styles.progressCard}>
          <View style={styles.progressLeft}>
            <Text style={styles.progressLabel}>Progression globale</Text>
            <Text style={styles.progressPercent}>{avgProgress}%</Text>
            <Text style={styles.progressSub}>Moyenne de vos enfants</Text>
          </View>
          <Sparkline />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Ionicons name="book-outline" size={18} color="#0D6B5E" />
            <Text style={styles.statValue}>
              {totalCourses} / {totalCoursesMax}
            </Text>
            <Text style={styles.statLabel}>Cours complétés</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxMid]}>
            <MaterialCommunityIcons name="trending-up" size={18} color="#0D6B5E" />
            <Text style={styles.statValue}>{bestSat}</Text>
            <Text style={styles.statLabel}>Score SAT{'\n'}estimé</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statValue}>{maxStreak} jours</Text>
            <Text style={styles.statLabel}>Série actuelle</Text>
          </View>
        </View>

        {/* Activité récente */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Activité récente</Text>
          <TouchableOpacity>
            <Text style={styles.voirTout}>Voir tout &gt;</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityCard}>
          {MOCK_ACTIVITY.map((item, idx) => (
            <View key={item.id}>
              <ActivityItem item={item} />
              {idx < MOCK_ACTIVITY.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F7F6',
  },
  scroll: { flex: 1 },
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 15,
    color: '#555',
    fontWeight: '400',
  },
  parentName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 3,
  },
  bellWrap: {
    position: 'relative',
    padding: 4,
  },
  bellDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
    borderWidth: 1.5,
    borderColor: '#F5F7F6',
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  voirTout: {
    fontSize: 13,
    color: '#0D6B5E',
    fontWeight: '600',
  },

  // Children cards
  childrenRow: {
    paddingBottom: 4,
    marginBottom: 20,
    gap: 12,
  },
  childCard: {
    width: 120,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  childAvatarWrap: { marginBottom: 8 },
  childAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  childAvatarPlaceholder: {
    backgroundColor: '#0D6B5E22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  childAvatarInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0D6B5E',
  },
  childName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  childClasse: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
    marginBottom: 8,
  },
  satBadge: {
    backgroundColor: '#E8F5F2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  satScore: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0D6B5E',
  },
  satLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 3,
  },

  // Add child
  addChildCard: {
    borderWidth: 1.5,
    borderColor: '#0D6B5E33',
    borderStyle: 'dashed',
    backgroundColor: '#F0FAF8',
    justifyContent: 'center',
  },
  addChildIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0D6B5E18',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  addChildLabel: {
    fontSize: 12,
    color: '#0D6B5E',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Progression card
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  progressLeft: { flex: 1 },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
  },
  progressPercent: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0D6B5E',
  },
  progressSub: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statBoxMid: {
    borderTopWidth: 3,
    borderTopColor: '#0D6B5E',
  },
  statEmoji: { fontSize: 18 },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: 6,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
    marginTop: 3,
  },

  // Activity
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: { flex: 1 },
  activityTitle: {
    fontSize: 13,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  activityDate: {
    fontSize: 11,
    color: '#AAA',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: -16,
  },
});