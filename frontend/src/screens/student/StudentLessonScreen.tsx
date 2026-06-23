import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY = '#0D6B5E';
const GOLD = '#D4A017';
const BG = '#FFFFFF';
const CARD = '#FFFFFF';
const TEXT = '#111827';
const MUTED = '#6B7280';

type Tab = 'Leçon' | 'Documents' | 'Quiz';

export default function StudentLessonScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const subjectName = route.params?.subjectName ?? 'Algèbre';

  const [activeTab, setActiveTab] = useState<Tab>('Leçon');
  const [notes, setNotes] = useState('');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{subjectName} – Leçon 5</Text>
        <View style={styles.headerActions}>
          <Ionicons name="time-outline" size={22} color={MUTED} style={{ marginRight: 12 }} />
          <Ionicons name="share-outline" size={22} color={MUTED} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Video player */}
        <View style={styles.videoContainer}>
          <View style={styles.videoPlaceholder}>
            <Text style={styles.videoEquation}>2x + 5 = 15</Text>
            <Text style={styles.videoEquation}>2x = 10</Text>
            <Text style={styles.videoEquation}>x = 5</Text>
          </View>
          <View style={styles.videoControls}>
            <TouchableOpacity>
              <Ionicons name="play" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.videoProgressBar}>
              <View style={[styles.videoProgressFill, { width: '35%' }]} />
            </View>
            <Text style={styles.videoDuration}>04:12</Text>
            <Text style={styles.videoSpeed}>1.0x</Text>
            <TouchableOpacity>
              <Ionicons name="expand-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['Leçon', 'Documents', 'Quiz'] as Tab[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'Leçon' && (
          <View style={styles.section}>
            <Text style={styles.lessonTitle}>Équations linéaires</Text>
            <Text style={styles.lessonDesc}>
              Dans cette leçon, tu vas apprendre à résoudre des équations linéaires étape par étape.
            </Text>

            <Text style={styles.subSectionTitle}>Ressources</Text>
            <TouchableOpacity style={styles.resourceRow}>
              <Ionicons name="document-text-outline" size={20} color={PRIMARY} />
              <Text style={styles.resourceName}>Résumé du cours (PDF)</Text>
              <Text style={styles.resourceSize}>1.2 Mo</Text>
              <Ionicons name="download-outline" size={20} color={PRIMARY} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.resourceRow}>
              <Ionicons name="document-text-outline" size={20} color={PRIMARY} />
              <Text style={styles.resourceName}>Exercices corrigés (PDF)</Text>
              <Text style={styles.resourceSize}>2.4 Mo</Text>
              <Ionicons name="download-outline" size={20} color={PRIMARY} />
            </TouchableOpacity>

            <Text style={styles.subSectionTitle}>Mes notes personnelles</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Écris tes notes ici..."
              placeholderTextColor={MUTED}
              multiline
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        )}

        {activeTab === 'Documents' && (
          <View style={styles.section}>
            <Text style={styles.lessonDesc}>Tous les documents liés à cette leçon.</Text>
          </View>
        )}

        {activeTab === 'Quiz' && (
          <View style={styles.section}>
            <Text style={styles.lessonDesc}>Quiz de fin de chapitre disponible une fois la leçon terminée.</Text>
            <TouchableOpacity style={styles.startQuizBtn}>
              <Text style={styles.startQuizText}>Commencer le quiz</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { marginRight: 10 },
  headerTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: TEXT, fontFamily: 'Montserrat-Bold' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  videoContainer: { backgroundColor: '#1A1A2E', margin: 16, borderRadius: 14, overflow: 'hidden' },
  videoPlaceholder: { height: 180, alignItems: 'center', justifyContent: 'center' },
  videoEquation: { fontSize: 18, color: '#FFFFFF', fontFamily: 'Montserrat-Medium', marginVertical: 3 },
  videoControls: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, backgroundColor: 'rgba(0,0,0,0.3)' },
  videoProgressBar: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 },
  videoProgressFill: { height: 4, backgroundColor: PRIMARY, borderRadius: 2 },
  videoDuration: { fontSize: 12, color: '#FFFFFF', fontFamily: 'Montserrat-Regular' },
  videoSpeed: { fontSize: 12, color: '#FFFFFF', fontFamily: 'Montserrat-Regular' },
  tabs: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#F3F4F6', borderRadius: 10, padding: 4, marginBottom: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  tabText: { fontSize: 13, color: MUTED, fontFamily: 'Montserrat-Medium' },
  tabTextActive: { color: PRIMARY, fontWeight: '700' },
  content: { paddingBottom: 30 },
  section: { padding: 16 },
  lessonTitle: { fontSize: 17, fontWeight: '700', color: TEXT, fontFamily: 'Montserrat-Bold', marginBottom: 8 },
  lessonDesc: { fontSize: 14, color: MUTED, lineHeight: 21, fontFamily: 'Montserrat-Regular' },
  subSectionTitle: { fontSize: 15, fontWeight: '700', color: TEXT, fontFamily: 'Montserrat-Bold', marginTop: 20, marginBottom: 10 },
  resourceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#FFFFFF', borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  resourceName: { flex: 1, fontSize: 13, color: TEXT, fontFamily: 'Montserrat-Medium' },
  resourceSize: { fontSize: 11, color: MUTED, fontFamily: 'Montserrat-Regular' },
  notesInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, minHeight: 100, fontSize: 14, color: TEXT, fontFamily: 'Montserrat-Regular', textAlignVertical: 'top' },
  startQuizBtn: { marginTop: 16, backgroundColor: PRIMARY, borderRadius: 12, padding: 16, alignItems: 'center' },
  startQuizText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', fontFamily: 'Montserrat-Bold' },
});