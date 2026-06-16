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

const subjects = [
  { id: '1', name: 'Mathématiques', icon: '📐', color: '#3B82F6', progress: 72 },
  { id: '2', name: 'Reading & Writing', icon: '📖', color: '#8B5CF6', progress: 65 },
  { id: '3', name: 'Writing', icon: '✏️', color: '#F59E0B', progress: 56 },
  { id: '4', name: 'Grammar', icon: '🔤', color: '#10B981', progress: 70 },
  { id: '5', name: 'Essays', icon: '📝', color: '#EF4444', progress: 45 },
  { id: '6', name: 'Sciences', icon: '🔬', color: '#06B6D4', progress: 30 },
];

type Props = {
  navigation: { navigate: (screen: string, params?: any) => void }
  onLogout?: () => void // seulement dans StudentProfilScreen
}

export default function StudentCoursesScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cours</Text>
        <Text style={styles.headerSubtitle}>Matières</Text>
        <Text style={styles.headerDesc}>Choisis une matière pour continuer ton apprentissage.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {subjects.map(subject => (
          <TouchableOpacity
            key={subject.id}
            style={styles.card}
            onPress={() => navigation.navigate('StudentLesson', { subjectId: subject.id, subjectName: subject.name })}
          >
            <View style={[styles.iconContainer, { backgroundColor: subject.color + '20' }]}>
              <Text style={styles.icon}>{subject.icon}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.subjectName}>{subject.name}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${subject.progress}%`, backgroundColor: subject.color }]} />
              </View>
              <Text style={styles.progressText}>{subject.progress}% terminé</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={MUTED} />
          </TouchableOpacity>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: TEXT, fontFamily: 'Montserrat-Bold' },
  headerSubtitle: { fontSize: 18, fontWeight: '700', color: TEXT, fontFamily: 'Montserrat-Bold', marginTop: 4 },
  headerDesc: { fontSize: 13, color: MUTED, marginTop: 4, fontFamily: 'Montserrat-Regular' },
  content: { padding: 16 },
  card: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 14, padding: 16, marginBottom: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  iconContainer: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  icon: { fontSize: 24 },
  info: { flex: 1 },
  subjectName: { fontSize: 15, fontWeight: '700', color: TEXT, fontFamily: 'Montserrat-Bold' },
  progressBar: { height: 5, backgroundColor: '#E5E7EB', borderRadius: 3, marginTop: 8 },
  progressFill: { height: 5, borderRadius: 3 },
  progressText: { fontSize: 11, color: MUTED, marginTop: 4, fontFamily: 'Montserrat-Regular' },
});