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
const BG = '#F9FAFB';
const CARD = '#FFFFFF';
const TEXT = '#111827';
const MUTED = '#6B7280';

const modes = [
  {
    id: 'free',
    icon: 'shuffle-outline',
    iconColor: '#3B82F6',
    bgColor: '#EFF6FF',
    title: 'Entraînement libre',
    desc: 'Choisis ta matière, le nombre de questions et la difficulté.',
  },
  {
    id: 'simulated',
    icon: 'time-outline',
    iconColor: '#F59E0B',
    bgColor: '#FFFBEB',
    title: 'SAT Simulé',
    desc: 'Examen complet en conditions réelles.',
  },
  {
    id: 'rapid',
    icon: 'flash-outline',
    iconColor: '#EF4444',
    bgColor: '#FEF2F2',
    title: 'Révision rapide',
    desc: '10 questions quotidiennes pour rester affûté(e).',
  },
  {
    id: 'errors',
    icon: 'close-circle-outline',
    iconColor: '#EC4899',
    bgColor: '#FDF2F8',
    title: 'Mode Erreurs',
    desc: 'Refais uniquement tes questions ratées.',
  },
];

type Props = {
  navigation: { navigate: (screen: string, params?: any) => void }
  onLogout?: () => void // seulement dans StudentProfilScreen
}
export default function StudentSATScreen({ navigation }: Props) {
 

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SAT</Text>
        <Text style={styles.headerSubtitle}>Choisis ton mode d'entraînement</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {modes.map(mode => (
          <TouchableOpacity
            key={mode.id}
            style={styles.card}
            onPress={() => navigation.navigate('StudentSATQuiz', { mode: mode.id })}
          >
            <View style={[styles.iconContainer, { backgroundColor: mode.bgColor }]}>
              <Ionicons name={mode.icon as any} size={28} color={mode.iconColor} />
            </View>
            <View style={styles.info}>
              <Text style={styles.modeTitle}>{mode.title}</Text>
              <Text style={styles.modeDesc}>{mode.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={MUTED} />
          </TouchableOpacity>
        ))}

        {/* Stats Banner */}
        <View style={styles.statsBanner}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>1 240</Text>
            <Text style={styles.statLabel}>Score estimé</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>42</Text>
            <Text style={styles.statLabel}>Quiz réalisés</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>78%</Text>
            <Text style={styles.statLabel}>Taux de réussite</Text>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827', fontFamily: 'Montserrat-Bold' },
  headerSubtitle: { fontSize: 14, color: MUTED, marginTop: 4, fontFamily: 'Montserrat-Regular' },
  content: { padding: 16 },
  card: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 14, padding: 16, marginBottom: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  iconContainer: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  info: { flex: 1 },
  modeTitle: { fontSize: 15, fontWeight: '700', color: '#111827', fontFamily: 'Montserrat-Bold' },
  modeDesc: { fontSize: 13, color: MUTED, marginTop: 3, lineHeight: 18, fontFamily: 'Montserrat-Regular' },
  statsBanner: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 14, padding: 16, marginTop: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: PRIMARY, fontFamily: 'Montserrat-Bold' },
  statLabel: { fontSize: 11, color: MUTED, marginTop: 3, textAlign: 'center', fontFamily: 'Montserrat-Regular' },
  statDivider: { width: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },
});