// StudentCoursesScreen.tsx
// Navigation interne : home → chapters → detail
// Le back depuis Leçon/Quiz/Exercices utilise navigation.goBack() du Navigator (stack)

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Platform, RefreshControl,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/auth.service';

const PRIMARY       = '#0D6B5E';
const PRIMARY_LIGHT = '#E6F3F1';
const BG            = '#FFFFFF';
const CARD          = '#FFFFFF';
const TEXT          = '#111827';
const TEXT_MUTED    = '#6B7280';
const BORDER        = '#E5E7EB';
const SUCCESS       = '#16A34A';
const SUCCESS_LIGHT = '#DCFCE7';
const GOLD          = '#D4A017';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Subject {
  id: string; nom?: string; titre?: string; icon?: string; couleur?: string;
  progressPercent?: number; totalChapters?: number;
}
interface GlobalStats {
  totalSubjects: number; totalChapters: number; totalLessons: number; globalPercent: number;
  lastChapter?: { id: string; titre: string; subjectTitre: string; completedLessons: number; totalLessons: number; };
}
type ChapterStatus = 'available' | 'in_progress' | 'completed';
interface Chapter {
  id: string; subjectId: string; titre: string; ordre: number; description?: string;
  status: ChapterStatus; progressPercent: number; totalLessons: number; completedLessons: number;
}
type LessonStatus = 'completed' | 'in_progress' | 'available' | 'locked';
interface Lesson {
  id: string; chapterId: string; titre: string; ordre: number;
  type?: string; isFree?: boolean; status: LessonStatus; duree?: number;
}
interface ChapterQuiz { id: string; titre: string; nombreQuestions?: number; xpRecompense?: number; }
interface ChapterDetail {
  lessons: Lesson[]; quiz: ChapterQuiz | null; progressPercent: number;
  quizPassed?: boolean; exercisesExist?: boolean; exercisesPassed?: boolean;
}
type Screen = 'home' | 'chapters' | 'detail';
interface NavigationProp { navigate: (s: string, p?: any) => void; goBack?: () => void; }
interface Props { navigation: NavigationProp; }

function subjectLabel(s: Subject) { return s.nom ?? s.titre ?? '—'; }
function errMsg(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'response' in e) {
    const r = (e as any).response?.data?.message; if (r) return r;
  }
  return e instanceof Error ? e.message : 'Erreur';
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────
function ProgressBar({ value, color }: { value: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration: 700, useNativeDriver: false }).start();
  }, [value]);
  const width = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <View style={{ height: 6, backgroundColor: BORDER, borderRadius: 3, overflow: 'hidden', marginTop: 8 }}>
      <Animated.View style={{ height: 6, borderRadius: 3, width, backgroundColor: color }} />
    </View>
  );
}

// ─── API ─────────────────────────────────────────────────────────────────────
async function fetchHomeData(): Promise<{ subjects: Subject[]; stats: GlobalStats }> {
  const subjRes = await api.get('/courses/subjects');
  const subjects: Subject[] = subjRes.data?.subjects ?? subjRes.data ?? [];

  const subjectsWithProgress: Subject[] = await Promise.all(
    subjects.map(async (subj) => {
      try {
        const chapRes = await api.get(`/courses/subjects/${subj.id}/chapters`);
        const chapters: any[] = chapRes.data?.chapters ?? chapRes.data ?? [];
        if (chapters.length === 0) return { ...subj, progressPercent: 0, totalChapters: 0 };

        const progRes = await api.get('/courses/progress/me').catch(() => ({ data: { progress: [] } }));
        const rawProg = progRes.data;
        const progList: any[] = rawProg?.progress ?? rawProg?.data ?? (Array.isArray(rawProg) ? rawProg : []);
        const progMap: Record<string, boolean> = {};
        for (const p of progList) {
          const lessonId = p.lessonId ?? p.lesson_id ?? p.LessonId;
          if (lessonId) progMap[lessonId] = Boolean(p.isCompleted ?? p.is_completed ?? p.completed ?? false);
        }

        const chapterProgresses: number[] = await Promise.all(
          chapters.map(async (ch: any) => {
            try {
              const lessRes = await api.get(`/courses/chapters/${ch.id}/lessons`);
              const lessons: any[] = lessRes.data?.lessons ?? lessRes.data ?? [];
              if (lessons.length === 0) return 0;
              const done = lessons.filter((l: any) => progMap[l.id] === true).length;
              return Math.round((done / lessons.length) * 100);
            } catch { return 0; }
          })
        );

        const subjPct = chapterProgresses.length > 0
          ? Math.round(chapterProgresses.reduce((a, b) => a + b, 0) / chapterProgresses.length) : 0;
        return { ...subj, progressPercent: subjPct, totalChapters: chapters.length };
      } catch { return { ...subj, progressPercent: 0, totalChapters: 0 }; }
    })
  );

  const subjectsWithChapters = subjectsWithProgress.filter(s => (s as any).totalChapters > 0);
  const globalPercent = subjectsWithChapters.length > 0
    ? Math.round(subjectsWithChapters.reduce((acc, s) => acc + (s.progressPercent ?? 0), 0) / subjectsWithChapters.length)
    : 0;

  return {
    subjects: subjectsWithProgress,
    stats: {
      totalSubjects: subjects.length,
      totalChapters: subjectsWithProgress.reduce((s, subj) => s + ((subj as any).totalChapters ?? 0), 0),
      totalLessons: 0,
      globalPercent,
    },
  };
}

async function fetchChapters(subjectId: string): Promise<Chapter[]> {
  const [chapRes, progRes] = await Promise.all([
    api.get(`/courses/subjects/${subjectId}/chapters`),
    api.get('/courses/progress/me').catch(() => ({ data: { progress: [] } })),
  ]);
  const raw: any[] = chapRes.data?.chapters ?? chapRes.data ?? [];
  const rawProg = progRes.data;
  const progList: any[] = rawProg?.progress ?? rawProg?.data ?? (Array.isArray(rawProg) ? rawProg : []);
  const progMap: Record<string, boolean> = {};
  for (const p of progList) {
    const lessonId = p.lessonId ?? p.lesson_id ?? p.LessonId;
    if (lessonId) progMap[lessonId] = Boolean(p.isCompleted ?? p.is_completed ?? p.completed ?? false);
  }

  return Promise.all(
    raw.sort((a, b) => (a.ordre ?? a.order ?? 0) - (b.ordre ?? b.order ?? 0))
      .map(async (ch, i) => {
        try {
          const r = await api.get(`/courses/chapters/${ch.id}/lessons`);
          const lessons: any[] = r.data?.lessons ?? r.data ?? [];
          const total = lessons.length;
          const done = lessons.filter((l: any) => progMap[l.id] === true).length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          return {
            id: ch.id, subjectId: ch.subjectId ?? subjectId, titre: ch.titre,
            ordre: ch.ordre ?? ch.order ?? i + 1, description: ch.description,
            status: (pct === 100 ? 'completed' : pct > 0 ? 'in_progress' : 'available') as ChapterStatus,
            progressPercent: pct, totalLessons: total, completedLessons: done,
          } as Chapter;
        } catch {
          return {
            id: ch.id, subjectId: ch.subjectId ?? subjectId, titre: ch.titre,
            ordre: ch.ordre ?? ch.order ?? i + 1, status: 'available' as ChapterStatus,
            progressPercent: 0, totalLessons: 0, completedLessons: 0,
          } as Chapter;
        }
      })
  );
}

async function fetchChapterDetail(chapterId: string): Promise<ChapterDetail> {
  const [lessRes, progRes, quizRes, exerciseRes] = await Promise.all([
    api.get(`/courses/chapters/${chapterId}/lessons`),
    api.get('/courses/progress/me').catch(() => ({ data: { progress: [] } })),
    api.get(`/quiz/chapter/${chapterId}`).catch(() => ({ data: null })),
    api.get(`/courses/chapters/${chapterId}/exercises`).catch(() => ({ data: null })),
  ]);

  const rawLessons: any[] = lessRes.data?.lessons ?? lessRes.data ?? [];
  const progList: any[] = progRes.data?.progress ?? [];
  const progMap: Record<string, { completed: boolean; inProgress: boolean }> = {};
  for (const p of progList) {
    const lessonId = p.lessonId ?? p.lesson_id;
    if (lessonId) progMap[lessonId] = {
      completed: p.isCompleted ?? false,
      inProgress: !!(p.watchedSeconds > 0 && !p.isCompleted),
    };
  }

  const qd = quizRes.data;
  const qr = qd?.quiz ?? (Array.isArray(qd?.quizzes) ? qd.quizzes[0] : null) ?? (qd?.id ? qd : null);
  const quiz: ChapterQuiz | null = qr?.id ? {
    id: qr.id, titre: qr.titre ?? 'Quiz du chapitre',
    nombreQuestions: qr.nombreQuestions ?? qr.questions?.length, xpRecompense: qr.xpRecompense ?? 40,
  } : null;

  const quizPassed: boolean = qd?.myResult?.passed ?? qd?.passed ?? false;
  const exercisesExist = !!(exerciseRes.data?.exercises?.length > 0 || exerciseRes.data?.length > 0);
  const exercisesPassed = exerciseRes.data?.myResult?.passed ?? false;

  const sorted = [...rawLessons].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));

  const isLessonFullyDone = (lessonId: string, isLast: boolean): boolean => {
    if (!progMap[lessonId]?.completed) return false;
    if (!isLast) return true;
    if (quiz && !quizPassed) return false;
    if (exercisesExist && !exercisesPassed) return false;
    return true;
  };

  const lessons: Lesson[] = sorted.map((l, i) => {
    const pg = progMap[l.id];
    let status: LessonStatus = 'available';
    if (pg?.completed) status = 'completed';
    else if (pg?.inProgress) status = 'in_progress';
    if (i > 0 && status !== 'completed') {
      const prev = sorted[i - 1];
      if (!isLessonFullyDone(prev.id, i - 1 === sorted.length - 1)) status = 'locked';
    }
    return {
      id: l.id, chapterId: l.chapterId ?? chapterId,
      titre: l.titre ?? `Leçon ${i + 1}`, ordre: l.ordre ?? i + 1,
      type: (l.type ?? 'text').toLowerCase(), isFree: l.isFree, status, duree: l.duree,
    };
  });

  const done = lessons.filter(l => l.status === 'completed').length;
  const pct = lessons.length > 0 ? Math.round((done / lessons.length) * 100) : 0;
  return { lessons, quiz, progressPercent: pct, quizPassed, exercisesExist, exercisesPassed };
}

// ─── SUBJECT COLORS ──────────────────────────────────────────────────────────
const SUBJECT_COLORS = [
  { color: PRIMARY,   bg: PRIMARY_LIGHT, icon: 'calculator'   },
  { color: '#3B82F6', bg: '#EFF6FF',     icon: 'flask'        },
  { color: '#7C3AED', bg: '#F5F3FF',     icon: 'leaf'         },
  { color: '#F59E0B', bg: '#FFFBEB',     icon: 'language'     },
  { color: '#EC4899', bg: '#FDF2F8',     icon: 'globe'        },
];

const LESSON_TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  video:    { icon: 'play-circle-outline',   label: 'Vidéo',    color: '#EF4444' },
  pdf:      { icon: 'document-text-outline', label: 'PDF',      color: GOLD      },
  exercise: { icon: 'pencil-outline',        label: 'Exercice', color: '#7C3AED' },
  text:     { icon: 'reader-outline',        label: 'Cours',    color: PRIMARY   },
};

// ─── ÉCRAN PRINCIPAL ─────────────────────────────────────────────────────────
export default function StudentCoursesScreen({ navigation }: Props) {
  // Navigation interne gérée ici — le Navigator gère le back depuis Leçon/Quiz
  const [screen, setScreen]               = useState<Screen>('home');
  const [subjects, setSubjects]           = useState<Subject[]>([]);
  const [stats, setStats]                 = useState<GlobalStats>({ totalSubjects: 0, totalChapters: 0, totalLessons: 0, globalPercent: 0 });
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [chapters, setChapters]           = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [chapterDetail, setChapterDetail] = useState<ChapterDetail | null>(null);
  const [loading, setLoading]             = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [refreshing, setRefreshing]       = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  const loadHome = useCallback(async () => {
    try {
      const { subjects: s, stats: st } = await fetchHomeData();
      setSubjects(s); setStats(st);
    } catch (e) { Alert.alert('Erreur', errMsg(e)); }
    finally {
      setLoading(false); setRefreshing(false);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]).start();
    }
  }, []);

  useEffect(() => { loadHome(); }, []);

  // Clique sur une matière → navigation interne vers chapitres
  const handleSubjectPress = useCallback(async (subject: Subject) => {
    setSelectedSubject(subject);
    setScreen('chapters');
    setLoadingChapters(true);
    try { setChapters(await fetchChapters(subject.id)); }
    catch (e) { Alert.alert('Erreur', errMsg(e)); }
    finally { setLoadingChapters(false); }
  }, []);

  // Clique sur un chapitre → navigation interne vers détail
  const handleChapterPress = useCallback(async (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setScreen('detail');
    setLoadingDetail(true);
    try { setChapterDetail(await fetchChapterDetail(chapter.id)); }
    catch (e) { Alert.alert('Erreur', errMsg(e)); }
    finally { setLoadingDetail(false); }
  }, []);

  // Clique sur une leçon → Navigator stack (back revient ici)
  const handleLessonPress = (lesson: Lesson) => {
    navigation.navigate('StudentLesson', {
      lessonId: lesson.id, lessonTitre: lesson.titre,
      chapterId: selectedChapter?.id,
      subjectName: selectedSubject ? subjectLabel(selectedSubject) : undefined,
    });
  };

  // Clique sur quiz → Navigator stack
  const handleQuizPress = (quiz: ChapterQuiz) => {
    navigation.navigate('StudentCourseQuiz', {
      quizId: quiz.id, quizTitre: quiz.titre,
      chapterId: selectedChapter?.id, chapterTitre: selectedChapter?.titre,
    });
  };

  // Back interne (bouton ← dans l'écran)
  const handleBack = () => {
    if (screen === 'detail') { setScreen('chapters'); setChapterDetail(null); }
    else if (screen === 'chapters') { setScreen('home'); setSelectedSubject(null); }
  };

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG }}>
      <ActivityIndicator size="large" color={PRIMARY} />
    </View>
  );

  // ─── VUE HOME ──────────────────────────────────────────────────────────────
  if (screen === 'home') return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadHome(); }} tintColor={PRIMARY} />}
      >
        {/* Header SAT style */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.headerEyebrow}>MES ÉTUDES</Text>
            <Text style={s.headerTitle}>Cours</Text>
            <Text style={s.headerSub}>Apprends à ton rythme, un chapitre à la fois 📚</Text>
          </View>
          <View style={s.illustrationWrap}>
            <View style={s.bubble1} /><View style={s.bubble2} /><View style={s.bubble3} />
            <Text style={s.capEmoji}>📖</Text>
          </View>
        </View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Carte continuer */}
          {stats.lastChapter && (
            <TouchableOpacity style={s.retestCard} activeOpacity={0.85}>
              <View style={s.retestIcon}><Ionicons name="play-circle" size={20} color={PRIMARY} /></View>
              <View style={s.retestBody}>
                <Text style={s.retestTitle}>Continuer mes révisions</Text>
                <Text style={s.retestDesc}>{stats.lastChapter.subjectTitre} · {stats.lastChapter.titre}</Text>
                <ProgressBar
                  value={stats.lastChapter.totalLessons > 0 ? Math.round((stats.lastChapter.completedLessons / stats.lastChapter.totalLessons) * 100) : 0}
                  color={PRIMARY}
                />
              </View>
              <View style={s.retestBtn}>
                <Text style={s.retestBtnText}>Continuer</Text>
                <Ionicons name="chevron-forward" size={14} color="#FFF" />
              </View>
            </TouchableOpacity>
          )}

          {/* Progression matières (domainCard SAT) */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Ma progression</Text>
            <Text style={s.sectionLink}>{stats.globalPercent}% global</Text>
          </View>
          <View style={s.domainsRow}>
            {subjects.slice(0, 3).map((subj, i) => {
              const cfg = SUBJECT_COLORS[i % 5];
              const pct = subj.progressPercent ?? 0;
              return (
                <TouchableOpacity key={subj.id} style={s.domainCard} onPress={() => handleSubjectPress(subj)} activeOpacity={0.8}>
                  <View style={[s.domainIconCircle, { backgroundColor: cfg.color }]}>
                    <Ionicons name={cfg.icon as any} size={20} color="#FFF" />
                  </View>
                  <Text style={[s.domainLabel, { color: cfg.color }]} numberOfLines={1}>{subjectLabel(subj)}</Text>
                  <Text style={[s.domainPct, { color: cfg.color }]}>{pct}%</Text>
                  <ProgressBar value={pct} color={cfg.color} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Liste matières (unitCard SAT) */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Étudier par matière</Text>
            <View style={s.unitCountBadge}><Text style={s.unitCountText}>{subjects.length} matière{subjects.length !== 1 ? 's' : ''}</Text></View>
          </View>
          <View style={s.unitsList}>
            {subjects.map((subj, i) => {
              const cfg = SUBJECT_COLORS[i % 5];
              const numLabel = String(i + 1).padStart(2, '0');
              return (
                <TouchableOpacity key={subj.id} style={s.unitCard} onPress={() => handleSubjectPress(subj)} activeOpacity={0.78}>
                  <View style={[s.unitNum, { backgroundColor: cfg.bg }]}>
                    <Text style={[s.unitNumText, { color: cfg.color }]}>{numLabel}</Text>
                  </View>
                  <View style={s.unitBody}>
                    <Text style={s.unitTitle}>{subjectLabel(subj)}</Text>
                    <Text style={s.unitDesc}>{(subj as any).totalChapters ? `${(subj as any).totalChapters} chapitres` : 'Voir les chapitres'}</Text>
                    <ProgressBar value={subj.progressPercent ?? 0} color={cfg.color} />
                  </View>
                  <View style={s.unitArrow}><Ionicons name="chevron-forward" size={16} color={TEXT_MUTED} /></View>
                </TouchableOpacity>
              );
            })}
          </View>

        </Animated.View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );

  // ─── VUE CHAPITRES ────────────────────────────────────────────────────────
  if (screen === 'chapters' && selectedSubject) {
    const done  = chapters.filter(c => c.status === 'completed').length;
    const total = chapters.length;
    const subjectPct = chapters.length > 0
      ? Math.round(chapters.reduce((acc, ch) => acc + ch.progressPercent, 0) / chapters.length) : 0;

    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <TouchableOpacity onPress={handleBack} style={{ marginBottom: 8 }}>
              <Ionicons name="arrow-back" size={22} color={TEXT} />
            </TouchableOpacity>
            <Text style={s.headerEyebrow}>MATIÈRE</Text>
            <Text style={[s.headerTitle, { fontSize: 26 }]}>{subjectLabel(selectedSubject)}</Text>
            <Text style={s.headerSub}>{total} chapitre{total !== 1 ? 's' : ''}</Text>
          </View>
          <View style={s.illustrationWrap}>
            <View style={s.bubble1} /><View style={s.bubble2} />
            <Text style={s.capEmoji}>📚</Text>
          </View>
        </View>

        {loadingChapters ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={PRIMARY} />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
            {/* Carte progression */}
            <View style={s.retestCard}>
              <View style={s.retestIcon}><Ionicons name="stats-chart" size={20} color={PRIMARY} /></View>
              <View style={s.retestBody}>
                <Text style={s.retestTitle}>Progression en {subjectLabel(selectedSubject)}</Text>
                <Text style={s.retestDesc}>{done}/{total} chapitres terminés</Text>
                <ProgressBar value={subjectPct} color={PRIMARY} />
              </View>
              <View style={[s.retestBtn, { paddingHorizontal: 14, paddingVertical: 10 }]}>
                <Text style={[s.retestBtnText, { fontSize: 16, fontWeight: '900' }]}>{subjectPct}%</Text>
              </View>
            </View>

            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Chapitres</Text>
              <View style={s.unitCountBadge}><Text style={s.unitCountText}>{total} chapitre{total !== 1 ? 's' : ''}</Text></View>
            </View>

            {chapters.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyEmoji}>📭</Text>
                <Text style={s.emptyTitle}>Pas encore de chapitres</Text>
              </View>
            ) : (
              <View style={s.unitsList}>
                {chapters.map((ch, i) => {
                  const isDone = ch.status === 'completed';
                  const numLabel = String(i + 1).padStart(2, '0');
                  return (
                    <TouchableOpacity key={ch.id} style={[s.unitCard, isDone && s.unitCardDone]} onPress={() => handleChapterPress(ch)} activeOpacity={0.78}>
                      <View style={[s.unitNum, { backgroundColor: isDone ? SUCCESS_LIGHT : PRIMARY_LIGHT }]}>
                        {isDone ? <Ionicons name="checkmark" size={18} color={SUCCESS} /> : <Text style={[s.unitNumText, { color: PRIMARY }]}>{numLabel}</Text>}
                      </View>
                      <View style={s.unitBody}>
                        <Text style={s.unitTitle}>{ch.titre}</Text>
                        <Text style={s.unitDesc}>{ch.completedLessons}/{ch.totalLessons} leçon{ch.totalLessons !== 1 ? 's' : ''} complétée{ch.totalLessons !== 1 ? 's' : ''}</Text>
                        <ProgressBar value={ch.progressPercent} color={isDone ? SUCCESS : PRIMARY} />
                      </View>
                      <View style={[s.unitArrow, isDone && { backgroundColor: SUCCESS_LIGHT }]}>
                        <Ionicons name={isDone ? 'checkmark' : 'chevron-forward'} size={16} color={isDone ? SUCCESS : TEXT_MUTED} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    );
  }

  // ─── VUE DÉTAIL CHAPITRE ─────────────────────────────────────────────────
  if (screen === 'detail' && selectedChapter) {
    if (loadingDetail) return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG }}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
    if (!chapterDetail) return null;

    const pct = chapterDetail.progressPercent;
    const done = chapterDetail.lessons.filter(l => l.status === 'completed').length;
    const total = chapterDetail.lessons.length;

    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <TouchableOpacity onPress={handleBack} style={{ marginBottom: 8 }}>
              <Ionicons name="arrow-back" size={22} color={TEXT} />
            </TouchableOpacity>
            <Text style={s.headerEyebrow}>{selectedSubject ? subjectLabel(selectedSubject).toUpperCase() : ''}</Text>
            <Text style={[s.headerTitle, { fontSize: 22 }]} numberOfLines={2}>{selectedChapter.titre}</Text>
          </View>
          <View style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingRight: 16 }}>
            <View style={[s.pctCircle, { borderColor: pct === 100 ? SUCCESS : PRIMARY }]}>
              <Text style={[s.pctCircleText, { color: pct === 100 ? SUCCESS : PRIMARY }]}>{pct}%</Text>
            </View>
            <Text style={s.pctCircleLabel}>{done}/{total} leçons</Text>
          </View>
        </View>
        <View style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER }}>
          <ProgressBar value={pct} color={pct === 100 ? SUCCESS : PRIMARY} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* Leçons */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Leçons</Text>
            <View style={s.unitCountBadge}><Text style={s.unitCountText}>{total} leçon{total !== 1 ? 's' : ''}</Text></View>
          </View>
          <View style={s.unitsList}>
            {chapterDetail.lessons.map((lesson, i) => {
              const isDone   = lesson.status === 'completed';
              const isInprog = lesson.status === 'in_progress';
              const isLocked = lesson.status === 'locked';
              const typeKey  = lesson.type?.toLowerCase() ?? 'text';
              const cfg      = LESSON_TYPE_CONFIG[typeKey] ?? LESSON_TYPE_CONFIG.text;
              const isLast   = i === chapterDetail.lessons.length - 1;
              const showReq  = isDone && isLast && ((chapterDetail.quiz && !chapterDetail.quizPassed) || (chapterDetail.exercisesExist && !chapterDetail.exercisesPassed));
              return (
                <TouchableOpacity
                  key={lesson.id}
                  style={[s.unitCard, isDone && s.unitCardDone, isLocked && { opacity: 0.5 }]}
                  onPress={() => !isLocked && handleLessonPress(lesson)}
                  activeOpacity={isLocked ? 1 : 0.78}
                >
                  <View style={[s.unitNum, { backgroundColor: isLocked ? BORDER : isDone ? SUCCESS_LIGHT : cfg.color + '18' }]}>
                    {isLocked ? <Ionicons name="lock-closed" size={16} color={TEXT_MUTED} />
                      : isDone ? <Ionicons name="checkmark" size={18} color={SUCCESS} />
                      : <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />}
                  </View>
                  <View style={s.unitBody}>
                    <Text style={[s.unitTitle, isLocked && { color: TEXT_MUTED }]} numberOfLines={1}>{lesson.titre}</Text>
                    <Text style={s.unitDesc}>
                      {isLocked ? 'Termine la leçon précédente pour débloquer'
                        : `${cfg.label}${lesson.duree ? ` · ${lesson.duree} min` : ''}${lesson.isFree ? ' · Gratuit' : ''}`}
                    </Text>
                    {isInprog && <ProgressBar value={50} color={cfg.color} />}
                    {showReq && (
                      <View style={{ marginTop: 8, backgroundColor: '#FEF2F2', borderRadius: 8, padding: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444', marginBottom: 3 }}>Pour continuer :</Text>
                        {chapterDetail.quiz && !chapterDetail.quizPassed && (
                          <Text style={{ fontSize: 11, color: '#EF4444' }}>⛔ Quiz du chapitre non réussi</Text>
                        )}
                        {chapterDetail.exercisesExist && !chapterDetail.exercisesPassed && (
                          <Text style={{ fontSize: 11, color: '#EF4444' }}>⛔ Exercices non complétés</Text>
                        )}
                      </View>
                    )}
                  </View>
                  <View style={[s.unitArrow, isDone && { backgroundColor: SUCCESS_LIGHT }, isLocked && { backgroundColor: '#F3F4F6' }]}>
                    <Ionicons name={isLocked ? 'lock-closed' : isDone ? 'checkmark' : isInprog ? 'play' : 'chevron-forward'}
                      size={16} color={isLocked ? TEXT_MUTED : isDone ? SUCCESS : isInprog ? PRIMARY : TEXT_MUTED} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* S'entraîner */}
          <Text style={[s.sectionTitle, { marginTop: 28, marginBottom: 14, marginHorizontal: 16 }]}>S'entraîner</Text>
          <View style={s.quickGrid}>
            <TouchableOpacity
              style={[s.quickCard, !chapterDetail.quiz && { opacity: 0.5 }]}
              onPress={() => {
                if (chapterDetail.quiz) handleQuizPress(chapterDetail.quiz);
                else Alert.alert('Quiz non disponible', 'Aucun quiz pour ce chapitre pour le moment.');
              }}
              activeOpacity={0.8}
            >
              <View style={[s.quickIconWrap, { backgroundColor: PRIMARY + '15' }]}><Text style={{ fontSize: 26 }}>🎯</Text></View>
              <Text style={s.quickLabel}>Quiz</Text>
              <Text style={s.quickSub}>{chapterDetail.quiz ? `${chapterDetail.quiz.nombreQuestions ?? '?'} questions` : 'Bientôt dispo'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.quickCard}
              onPress={() => navigation.navigate('StudentCourseExercise', { chapterId: selectedChapter.id, chapterTitre: selectedChapter.titre })}
              activeOpacity={0.8}
            >
              <View style={[s.quickIconWrap, { backgroundColor: '#7C3AED15' }]}><Text style={{ fontSize: 26 }}>📋</Text></View>
              <Text style={s.quickLabel}>Exercices</Text>
              <Text style={s.quickSub}>S'entraîner</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.quickCard}
              onPress={() => navigation.navigate('StudentCourseQuiz', {
                quizId: `exam_${selectedChapter.id}`,
                quizTitre: `Examen — ${selectedChapter.titre}`,
                chapterId: selectedChapter.id, chapterTitre: selectedChapter.titre, isExam: true,
              })}
              activeOpacity={0.8}
            >
              <View style={[s.quickIconWrap, { backgroundColor: GOLD + '15' }]}><Text style={{ fontSize: 26 }}>📊</Text></View>
              <Text style={s.quickLabel}>Examen</Text>
              <Text style={s.quickSub}>Test complet</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>
    );
  }

  return null;
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header: {
    backgroundColor: CARD, flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 20, paddingBottom: 24, overflow: 'hidden',
  },
  headerLeft:    { flex: 1, zIndex: 2 },
  headerEyebrow: { fontSize: 11, fontWeight: '800', color: PRIMARY, letterSpacing: 2, marginBottom: 4 },
  headerTitle:   { fontSize: 34, fontWeight: '900', color: TEXT, letterSpacing: -1, marginBottom: 4 },
  headerSub:     { fontSize: 13, color: TEXT_MUTED, fontWeight: '500', marginBottom: 12 },
  illustrationWrap: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 8 },
  capEmoji: { fontSize: 60, zIndex: 2 },
  bubble1: { position: 'absolute', width: 12, height: 12, borderRadius: 6,  backgroundColor: PRIMARY_LIGHT, top: 4,   left: -16 },
  bubble2: { position: 'absolute', width: 18, height: 18, borderRadius: 9,  backgroundColor: PRIMARY_LIGHT + '80', top: -2, right: 4 },
  bubble3: { position: 'absolute', width: 8,  height: 8,  borderRadius: 4,  backgroundColor: '#3B82F620', bottom: 8, left: -6 },
  retestCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: CARD,
    borderRadius: 18, padding: 16, marginHorizontal: 16, marginBottom: 20,
    borderWidth: 1, borderColor: BORDER, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  retestIcon:    { width: 42, height: 42, borderRadius: 12, backgroundColor: PRIMARY_LIGHT, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  retestBody:    { flex: 1 },
  retestTitle:   { fontSize: 14, fontWeight: '800', color: TEXT, marginBottom: 3 },
  retestDesc:    { fontSize: 11, color: TEXT_MUTED, lineHeight: 16 },
  retestBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: PRIMARY, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  retestBtnText: { fontSize: 12, fontWeight: '800', color: '#FFF' },
  sectionHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle:    { fontSize: 16, fontWeight: '800', color: TEXT },
  sectionLink:     { fontSize: 13, fontWeight: '700', color: PRIMARY },
  unitCountBadge:  { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: PRIMARY_LIGHT },
  unitCountText:   { fontSize: 12, fontWeight: '800', color: PRIMARY },
  domainsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 24 },
  domainCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 18, padding: 12,
    alignItems: 'center', gap: 3, borderWidth: 1.5, borderColor: BORDER,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  domainIconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  domainLabel:      { fontSize: 11, fontWeight: '800', textAlign: 'center' },
  domainPct:        { fontSize: 18, fontWeight: '900', marginTop: 2 },
  unitsList: { paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  unitCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: CARD,
    borderRadius: 18, padding: 16, gap: 14,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  unitCardDone:    { borderColor: '#BBF7D0' },
  unitNum:         { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  unitNumText:     { fontSize: 16, fontWeight: '900' },
  unitBody:        { flex: 1 },
  unitTitle:       { fontSize: 14, fontWeight: '800', color: TEXT, marginBottom: 3 },
  unitDesc:        { fontSize: 12, color: TEXT_MUTED, lineHeight: 17, marginBottom: 4 },
  unitArrow:       { width: 30, height: 30, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  pctCircle:       { width: 64, height: 64, borderRadius: 32, borderWidth: 3, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center' },
  pctCircleText:   { fontSize: 16, fontWeight: '900' },
  pctCircleLabel:  { fontSize: 10, color: TEXT_MUTED, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  quickCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 18, padding: 14,
    alignItems: 'center', gap: 4, borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  quickIconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  quickLabel:    { fontSize: 12, fontWeight: '800', color: TEXT, textAlign: 'center' },
  quickSub:      { fontSize: 10, color: TEXT_MUTED, fontWeight: '500', textAlign: 'center' },
  emptyBox:  { alignItems: 'center', paddingVertical: 36, gap: 8 },
  emptyEmoji:{ fontSize: 40 },
  emptyTitle:{ fontSize: 15, fontWeight: '800', color: TEXT },
});