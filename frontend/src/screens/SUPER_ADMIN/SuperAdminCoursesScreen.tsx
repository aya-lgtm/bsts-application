// screens/SUPER_ADMIN/SuperAdminCoursesScreen.tsx
// Liste des matières (Subject) avec nb chapitres / étudiants, statut publié/brouillon
// Backend : GET /api/v1/courses/subjects, GET /api/v1/courses/subjects/:id/chapters

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, StyleSheet, SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/auth.service';

const COLORS = {
  primary: '#0D6B5E', primaryLight: '#E1F5EE',
  gold: '#D4A017', goldLight: '#FFF8E7',
  white: '#FFFFFF', background: '#F5F5F0',
  textPrimary: '#1A1A1A', textSecondary: '#6B6B6B', textMuted: '#9E9E9E',
  border: '#E8E8E8', success: '#4CAF50', danger: '#E24B4A',
};

interface SubjectItem {
  id: string;
  nom: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  chapterCount: number;
  studentCount: number;
  prof?: string;
}

interface NavigationProp {
  navigate: (screen: string, params?: Record<string, any>) => void;
}
interface Props { navigation: NavigationProp; }

const fetchSubjects = async (): Promise<SubjectItem[]> => {
  const res = await api.get('/courses/subjects');
  const subjects: any[] = res.data?.subjects ?? [];

  // Récupère le nombre de chapitres par matière (en parallèle)
  const withChapters = await Promise.all(
    subjects.map(async (s) => {
      try {
        const chapRes = await api.get(`/courses/subjects/${s.id}/chapters`);
        const chapters = chapRes.data?.chapters ?? [];
        return {
          id: s.id,
          nom: s.nom,
          description: s.description,
          icon: s.icon,
          isActive: s.isActive,
          chapterCount: chapters.length,
          studentCount: s.studentCount ?? 0,
          prof: s.profName ?? undefined,
        };
      } catch {
        return {
          id: s.id, nom: s.nom, description: s.description, icon: s.icon,
          isActive: s.isActive, chapterCount: 0, studentCount: 0,
        };
      }
    })
  );

  return withChapters;
};

const SUBJECT_ICONS: Record<string, string> = {
  Mathématiques: 'calculator-outline',
  'Physique-Chimie': 'flask-outline',
  SVT: 'leaf-outline',
  Anglais: 'language-outline',
  'Histoire-Géo': 'globe-outline',
};

const SubjectCard = ({ subject, onPress }: { subject: SubjectItem; onPress: () => void }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
    <View style={styles.cardIconWrap}>
      <Ionicons name={(SUBJECT_ICONS[subject.nom] ?? 'book-outline') as any} size={22} color={COLORS.primary} />
    </View>
    <View style={styles.cardInfo}>
      <Text style={styles.cardTitle} numberOfLines={1}>{subject.nom}</Text>
      <Text style={styles.cardMeta}>
        {subject.chapterCount} chapitre{subject.chapterCount !== 1 ? 's' : ''}
        {subject.studentCount > 0 ? ` · ${subject.studentCount} étudiants` : ''}
      </Text>
      {subject.prof && <Text style={styles.cardProf}>Prof. {subject.prof}</Text>}
    </View>
    <View style={[styles.statusBadge, subject.isActive ? styles.statusActive : styles.statusDraft]}>
      <Text style={[styles.statusText, subject.isActive ? styles.statusTextActive : styles.statusTextDraft]}>
        {subject.isActive ? 'Publié' : 'Brouillon'}
      </Text>
    </View>
  </TouchableOpacity>
);

export default function SuperAdminCoursesScreen({ navigation }: Props) {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const result = await fetchSubjects();
      setSubjects(result);
    } catch (err) {
      console.error('[SuperAdminCoursesScreen] Erreur:', err);
      setSubjects([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    let list = subjects;
    if (filter === 'PUBLISHED') list = list.filter((s) => s.isActive);
    if (filter === 'DRAFT') list = list.filter((s) => !s.isActive);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.nom.toLowerCase().includes(q));
    }
    return list;
  }, [subjects, filter, search]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Cours</Text>
        <TouchableOpacity style={styles.addBtn}>
          <Ionicons name="add" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un cours..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {[
          { key: 'ALL', label: 'Tous' },
          { key: 'PUBLISHED', label: 'Publiés' },
          { key: 'DRAFT', label: 'Brouillons' },
        ].map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(f.key as any)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Ionicons name="book-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Aucun cours trouvé</Text>
            </View>
          ) : (
            filtered.map((s) => <SubjectCard key={s.id} subject={s} onPress={() => {}} />)
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12,
  },
  topBarTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.3 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: COLORS.background, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },

  filterScroll: { flexGrow: 0, marginBottom: 12 },
  filterContent: { paddingHorizontal: 20, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.background, marginRight: 8,
  },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  filterChipTextActive: { color: COLORS.white },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.white, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 14, marginBottom: 10,
  },
  cardIconWrap: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  cardProf: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusActive: { backgroundColor: COLORS.primaryLight },
  statusDraft: { backgroundColor: COLORS.goldLight },
  statusText: { fontSize: 10, fontWeight: '700' },
  statusTextActive: { color: COLORS.primary },
  statusTextDraft: { color: COLORS.gold },

  emptyBlock: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 13, color: COLORS.textMuted },
});