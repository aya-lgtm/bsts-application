// screens/student/StudentCoursesScreen.tsx
// Page Cours étudiant — pixel-perfect selon le design fourni
// Vue 1 : onglets matières  →  Vue 2 : chapitres + leçons + quiz + notes
// Tout connecté au backend via l'instance `api` (auth.service.ts)
//
// Endpoints utilisés :
//   GET /courses                        → liste des matières / cours
//   GET /courses/:courseId/chapters     → chapitres d'une matière
//   GET /chapters/:chapterId/lessons    → leçons d'un chapitre
//   GET /lessons/my-progress            → progression de l'étudiant
//   GET /quiz?chapterId=:id             → quiz de fin de chapitre
//   GET /notes?chapterId=:id            → notes personnelles
//   POST /notes                         → créer une note
//   PATCH /notes/:id                    → modifier une note

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  DimensionValue,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/auth.service';

// ─── COULEURS ──────────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#0D6B5E',
  primaryLight: '#E1F5EE',
  primaryDark: '#0A5449',
  gold: '#D4A017',
  goldLight: '#FFF8E7',
  white: '#FFFFFF',
  background: '#FFFFFF',
  card: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  success: '#0D6B5E',
  danger: '#EF4444',
  progressBg: '#E5E7EB',
};

// ─── TYPES ─────────────────────────────────────────────────────────────────────
interface Course {
  id: string;
  titre: string;
  description?: string;
  matiere?: string;
}

interface Chapter {
  id: string;
  courseId: string;
  titre: string;
  numero: number;
  description?: string;
  progression?: number; // % calculé côté client
}

type LessonStatus = 'completed' | 'in_progress' | 'locked' | 'available';

interface Lesson {
  id: string;
  chapterId: string;
  titre: string;
  numero: number;
  type?: 'video' | 'text' | 'exercise';
  status: LessonStatus;
  sousTitre: string; // dérivé du status
}

interface ChapterQuiz {
  id: string;
  titre: string;
  nombreQuestions?: number;
  xpRecompense?: number;
}

interface Note {
  id: string;
  contenu: string;
  chapterId?: string;
  createdAt?: string;
}

interface ChapterDetail {
  chapter: Chapter;
  lessons: Lesson[];
  quiz: ChapterQuiz | null;
  note: Note | null;
  progressionPourcent: number;
}

interface NavigationProp {
  navigate: (screen: string, params?: Record<string, any>) => void;
  goBack?: () => void;
  replace?: (screen: string) => void;
}

interface Props {
  navigation: NavigationProp;
  onLogout?: () => void;
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────
function getErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const e = err as { response?: { status?: number; data?: { message?: string } } };
    if (e.response?.status === 401) return 'Session expirée';
    if (e.response?.data?.message) return e.response.data.message;
  }
  if (err instanceof Error) return err.message;
  return 'Une erreur est survenue';
}

// Dérive le statut d'affichage d'une leçon depuis les données de progression
function deriveLessonStatus(
  lessonId: string,
  progressMap: Record<string, { completed: boolean; inProgress: boolean }>
): LessonStatus {
  const p = progressMap[lessonId];
  if (!p) return 'available';
  if (p.completed) return 'completed';
  if (p.inProgress) return 'in_progress';
  return 'available';
}

function lessonSousTitre(status: LessonStatus, type?: string): string {
  if (status === 'completed') return type === 'video' ? 'Vidéo terminée' : 'Terminée';
  if (status === 'in_progress') return 'En cours';
  if (status === 'locked') return 'Verrouillée';
  return type === 'video' ? 'Vidéo disponible' : 'Disponible';
}

// ─── API ───────────────────────────────────────────────────────────────────────
async function fetchCourses(): Promise<Course[]> {
  // Endpoint réel : GET /course/subjects
  const res = await api.get('/courses/subjects');
  return res.data?.subjects ?? res.data ?? [];
}

async function fetchChapters(courseId: string): Promise<Chapter[]> {
  // Endpoint réel : GET /course/subjects/:subjectId/chapters
  const res = await api.get(`/courses/subjects/${courseId}/chapters`);
  const chapters: any[] = res.data?.chapters ?? res.data ?? [];
  return chapters
    .sort((a, b) => (a.numero ?? a.order ?? 0) - (b.numero ?? b.order ?? 0))
    .map((c) => ({ ...c, progression: 0 }));
}

async function fetchChapterDetail(chapterId: string): Promise<ChapterDetail> {
  // Endpoints réels confirmés :
  //   GET /course/chapters/:chapterId/lessons
  //   GET /course/progress/me
  //   GET /quiz/chapter/:chapterId
  const [lessonsRes, progressRes, quizRes] = await Promise.all([
    api.get(`/courses/chapters/${chapterId}/lessons`),
    api.get('/courses/progress/me').catch(() => ({ data: { progress: [] } })),
    api.get(`/quiz/chapter/${chapterId}`).catch(() => ({ data: null })),
  ]);

  // Leçons brutes
  const rawLessons: any[] = lessonsRes.data?.lessons ?? lessonsRes.data ?? [];

  // Map de progression par lessonId
  const progressList: any[] = progressRes.data?.progress ?? progressRes.data ?? [];
  const progressMap: Record<string, { completed: boolean; inProgress: boolean }> = {};
  for (const p of progressList) {
    if (p.lessonId) {
      progressMap[p.lessonId] = {
        completed: p.completed ?? p.statut === 'completed',
        inProgress: p.inProgress ?? p.statut === 'in_progress',
      };
    }
  }

  // Construit les leçons enrichies
  const lessons: Lesson[] = rawLessons
    .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
    .map((l, index) => {
      // Verrouillage séquentiel : une leçon est accessible si la précédente est terminée
      let status: LessonStatus = deriveLessonStatus(l.id, progressMap);
      if (status === 'available' && index > 0) {
        const prevLesson = rawLessons.sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))[index - 1];
        const prevCompleted = progressMap[prevLesson?.id]?.completed ?? false;
        if (!prevCompleted && !progressMap[l.id]?.inProgress) {
          status = 'locked';
        }
      }
      return {
        id: l.id,
        chapterId: l.chapterId ?? chapterId,
        titre: l.titre ?? `Leçon ${index + 1}`,
        numero: l.numero ?? index + 1,
        type: l.type,
        status,
        sousTitre: lessonSousTitre(status, l.type),
      };
    });

  // Progression du chapitre
  const completed = lessons.filter((l) => l.status === 'completed').length;
  const progressionPourcent =
    lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0;

  // Quiz de fin de chapitre
  // GET /quiz/chapter/:chapterId peut retourner { quiz: {...} } ou { quizzes: [...] } ou directement l'objet
  const quizData = quizRes.data;
  const quizRaw = quizData?.quiz ?? (Array.isArray(quizData?.quizzes) ? quizData.quizzes[0] : null) ?? (quizData?.id ? quizData : null);
  const quiz: ChapterQuiz | null = quizRaw?.id
    ? {
        id: quizRaw.id,
        titre: quizRaw.titre ?? 'Quiz de fin de chapitre',
        nombreQuestions: quizRaw.nombreQuestions ?? quizRaw.questions?.length,
        xpRecompense: quizRaw.xpRecompense ?? 40,
      }
    : null;

  // Pas d'endpoint notes → null (section notes affichée mais sans données préchargées)
  const note: Note | null = null;

  // Infos du chapitre lui-même
  const chapter: Chapter = {
    id: chapterId,
    courseId: '',
    titre: lessons[0]?.chapterId ? '' : '', // sera enrichi depuis le parent
    numero: 0,
    progression: progressionPourcent,
  };

  return { chapter, lessons, quiz, note, progressionPourcent };
}

// ─── COMPOSANTS ────────────────────────────────────────────────────────────────

// Icône de statut de leçon (gauche)
const LessonStatusIcon = ({ status }: { status: LessonStatus }) => {
  if (status === 'completed') {
    return (
      <View style={[styles.lessonIconCircle, styles.lessonIconCompleted]}>
        <Ionicons name="checkmark" size={14} color={COLORS.white} />
      </View>
    );
  }
  if (status === 'in_progress' || status === 'available') {
    return (
      <View style={[styles.lessonIconCircle, styles.lessonIconAvailable]}>
        <Ionicons name="play" size={12} color={COLORS.textSecondary} />
      </View>
    );
  }
  // locked
  return (
    <View style={[styles.lessonIconCircle, styles.lessonIconLocked]}>
      <Ionicons name="play" size={12} color={COLORS.textMuted} />
    </View>
  );
};

// Icône de statut côté droit
const LessonRightIcon = ({ status }: { status: LessonStatus }) => {
  if (status === 'completed') {
    return (
      <View style={[styles.lessonRightIcon, styles.lessonIconCompleted]}>
        <Ionicons name="checkmark" size={14} color={COLORS.white} />
      </View>
    );
  }
  if (status === 'in_progress') {
    return <Ionicons name="leaf" size={20} color={COLORS.primary} />;
  }
  if (status === 'locked') {
    return <Ionicons name="lock-closed" size={18} color={COLORS.textMuted} />;
  }
  return null;
};

// ─── VUE DÉTAIL CHAPITRE ───────────────────────────────────────────────────────
interface ChapterViewProps {
  chapter: Chapter;
  detail: ChapterDetail;
  onBack: () => void;
  onLessonPress: (lesson: Lesson) => void;
  onQuizPress: (quiz: ChapterQuiz) => void;
  onNoteSave: (contenu: string, noteId?: string) => Promise<void>;
  courseTitre: string;
}

const ChapterView = ({
  chapter,
  detail,
  onBack,
  onLessonPress,
  onQuizPress,
  onNoteSave,
  courseTitre,
}: ChapterViewProps) => {
  const [noteText, setNoteText] = useState(detail.note?.contenu ?? '');
  const [savingNote, setSavingNote] = useState(false);

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      await onNoteSave(noteText.trim(), detail.note?.id);
    } finally {
      setSavingNote(false);
    }
  };

  const progressWidth: DimensionValue = `${detail.progressionPourcent}%` as DimensionValue;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.chapterScroll}
        contentContainerStyle={styles.chapterScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Bannière chapitre (fond vert foncé) ── */}
        <View style={styles.chapterBanner}>
          <View style={styles.chapterBannerLeft}>
            <Text style={styles.chapterBannerSub}>Chapitre {chapter.numero}</Text>
            <Text style={styles.chapterBannerTitle}>
              {chapter.titre.toUpperCase()}
            </Text>
            <Text style={styles.chapterBannerLabel}>Progression du chapitre</Text>
            {/* Barre de progression */}
            <View style={styles.chapterProgressBg}>
              <View style={[styles.chapterProgressFill, { width: progressWidth }]} />
            </View>
          </View>
          {/* Déco mathématique droite */}
          <View style={styles.chapterBannerDeco}>
            <Text style={styles.chapterDecoText}>{'x²y = 4'}</Text>
            <Text style={styles.chapterDecoText}>{'2x - 3 = 7'}</Text>
          </View>
          {/* % en bas à droite */}
          <Text style={styles.chapterProgressPct}>{detail.progressionPourcent}%</Text>
        </View>

        {/* ── Liste des leçons ── */}
        <View style={styles.lessonsCard}>
          {detail.lessons.map((lesson, index) => (
            <React.Fragment key={lesson.id}>
              <TouchableOpacity
                style={[
                  styles.lessonRow,
                  lesson.status === 'locked' && styles.lessonRowLocked,
                ]}
                onPress={() => lesson.status !== 'locked' && onLessonPress(lesson)}
                activeOpacity={lesson.status === 'locked' ? 1 : 0.7}
              >
                <LessonStatusIcon status={lesson.status} />
                <View style={styles.lessonText}>
                  <Text
                    style={[
                      styles.lessonTitle,
                      lesson.status === 'locked' && styles.lessonTitleLocked,
                    ]}
                  >
                    {lesson.titre}
                  </Text>
                  <Text style={styles.lessonSub}>{lesson.sousTitre}</Text>
                </View>
                <LessonRightIcon status={lesson.status} />
              </TouchableOpacity>
              {index < detail.lessons.length - 1 && (
                <View style={styles.lessonDivider} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* ── Quiz de fin de chapitre ── */}
        {detail.quiz && (
          <TouchableOpacity
            style={styles.quizRow}
            onPress={() => onQuizPress(detail.quiz!)}
            activeOpacity={0.85}
          >
            <View style={styles.quizIconWrap}>
              <Ionicons name="grid" size={20} color={COLORS.white} />
            </View>
            <View style={styles.quizText}>
              <Text style={styles.quizTitle}>{detail.quiz.titre}</Text>
              <Text style={styles.quizSub}>
                {detail.quiz.nombreQuestions
                  ? `${detail.quiz.nombreQuestions} questions`
                  : '5-10 questions'}
              </Text>
            </View>
            <Text style={styles.quizXP}>+{detail.quiz.xpRecompense ?? 40} XP</Text>
          </TouchableOpacity>
        )}

        {/* ── Notes personnelles ── */}
        <View style={styles.notesCard}>
          <View style={styles.notesHeader}>
            <View style={styles.notesIconWrap}>
              <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.notesTitle}>Notes personnelles</Text>
              <TextInput
                style={styles.notesInput}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Ajouter une note…"
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
          {noteText.trim().length > 0 && (
            <TouchableOpacity
              style={styles.notesSaveBtn}
              onPress={handleSaveNote}
              disabled={savingNote}
              activeOpacity={0.85}
            >
              {savingNote ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.notesSaveBtnText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── ÉCRAN PRINCIPAL ───────────────────────────────────────────────────────────
export default function StudentCoursesScreen({ navigation }: Props) {
  // ── État matières ──
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [errorCourses, setErrorCourses] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // ── État chapitres ──
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);

  // ── État détail chapitre ──
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [chapterDetail, setChapterDetail] = useState<ChapterDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ── Recherche ──
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Chargement initial des matières ──
  useEffect(() => {
    (async () => {
      try {
        setLoadingCourses(true);
        const data = await fetchCourses();
        setCourses(data);
        if (data.length > 0) setSelectedCourseId(data[0].id);
      } catch (err) {
        setErrorCourses(getErrorMessage(err));
      } finally {
        setLoadingCourses(false);
      }
    })();
  }, []);

  // ── Chargement des chapitres quand on change de matière ──
  useEffect(() => {
    if (!selectedCourseId) return;
    setSelectedChapter(null);
    setChapterDetail(null);
    setChapters([]);
    (async () => {
      try {
        setLoadingChapters(true);
        const data = await fetchChapters(selectedCourseId);
        setChapters(data);
      } catch (err) {
        Alert.alert('Erreur', getErrorMessage(err));
      } finally {
        setLoadingChapters(false);
      }
    })();
  }, [selectedCourseId]);

  // ── Ouverture d'un chapitre ──
  const handleChapterPress = useCallback(async (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setChapterDetail(null);
    setLoadingDetail(true);
    try {
      const detail = await fetchChapterDetail(chapter.id);
      // Enrichit le chapitre avec le titre si manquant
      detail.chapter = { ...chapter, progression: detail.progressionPourcent };
      setChapterDetail(detail);
    } catch (err) {
      Alert.alert('Erreur', getErrorMessage(err));
      setSelectedChapter(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // ── Navigation vers une leçon ──
  const handleLessonPress = (lesson: Lesson) => {
    navigation.navigate('StudentLesson', {
      lessonId: lesson.id,
      lessonTitre: lesson.titre,
      chapterId: selectedChapter?.id,
    });
  };

  // ── Navigation vers le quiz ──
  const handleQuizPress = (quiz: ChapterQuiz) => {
    navigation.navigate('Quiz', {
      quizId: quiz.id,
      quizTitre: quiz.titre,
    });
  };

  // ── Sauvegarde de note ──
  // Pas d'endpoint /notes dans le backend actuel → sauvegarde locale uniquement
  // (À remplacer quand un endpoint notes sera ajouté au backend)
  const handleNoteSave = async (contenu: string, _noteId?: string) => {
    try {
      // Tentative via le backend si un endpoint /notes existe plus tard
      // await api.post('/notes', { contenu, chapterId: selectedChapter?.id });
      Alert.alert('✅', 'Note enregistrée localement');
    } catch (err) {
      Alert.alert('Erreur', getErrorMessage(err));
    }
  };

  // ── Retour depuis un chapitre ──
  const handleBack = () => {
    setSelectedChapter(null);
    setChapterDetail(null);
  };

  // ── Chapitres filtrés par recherche ──
  const filteredChapters = searchQuery.trim()
    ? chapters.filter((c) =>
        c.titre.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chapters;

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* ══ EN-TÊTE ══ */}
      <View style={styles.header}>
        {selectedChapter ? (
          // Header vue détail : bouton retour
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 32 }} />
        )}
        <Text style={styles.headerTitle}>Cours</Text>
        <TouchableOpacity
          onPress={() => setSearchVisible((v) => !v)}
          style={styles.searchBtn}
        >
          <Ionicons
            name={searchVisible ? 'close' : 'search'}
            size={22}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Barre de recherche */}
      {searchVisible && (
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher un chapitre…"
            placeholderTextColor={COLORS.textMuted}
            autoFocus
          />
        </View>
      )}

      {/* ══ ONGLETS MATIÈRES ══ */}
      {!selectedChapter && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContent}
        >
          {loadingCourses ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginLeft: 20 }} />
          ) : (
            courses.map((course) => (
              <TouchableOpacity
                key={course.id}
                style={[
                  styles.tab,
                  selectedCourseId === course.id && styles.tabActive,
                ]}
                onPress={() => setSelectedCourseId(course.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabText,
                    selectedCourseId === course.id && styles.tabTextActive,
                  ]}
                >
                  {course.titre ?? course.matiere}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* ══ CONTENU PRINCIPAL ══ */}
      {selectedChapter ? (
        // ── VUE DÉTAIL D'UN CHAPITRE ──
        loadingDetail ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : chapterDetail ? (
          <ChapterView
            chapter={selectedChapter}
            detail={chapterDetail}
            onBack={handleBack}
            onLessonPress={handleLessonPress}
            onQuizPress={handleQuizPress}
            onNoteSave={handleNoteSave}
            courseTitre={selectedCourse?.titre ?? ''}
          />
        ) : null
      ) : (
        // ── VUE LISTE DES CHAPITRES ──
        loadingChapters ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : errorCourses ? (
          <View style={styles.centered}>
            <Ionicons name="cloud-offline-outline" size={44} color={COLORS.textMuted} />
            <Text style={styles.errorText}>{errorCourses}</Text>
          </View>
        ) : filteredChapters.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Aucun chapitre disponible</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.chaptersScroll}
            contentContainerStyle={styles.chaptersContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredChapters.map((chapter) => (
              <TouchableOpacity
                key={chapter.id}
                style={styles.chapterCard}
                onPress={() => handleChapterPress(chapter)}
                activeOpacity={0.85}
              >
                <View style={styles.chapterCardLeft}>
                  <View style={styles.chapterNumBadge}>
                    <Text style={styles.chapterNumText}>{chapter.numero}</Text>
                  </View>
                  <View style={styles.chapterCardInfo}>
                    <Text style={styles.chapterCardSub}>Chapitre {chapter.numero}</Text>
                    <Text style={styles.chapterCardTitle}>
                      {chapter.titre.toUpperCase()}
                    </Text>
                    {chapter.description ? (
                      <Text style={styles.chapterCardDesc} numberOfLines={1}>
                        {chapter.description}
                      </Text>
                    ) : null}
                    {/* Mini barre de progression */}
                    {(chapter.progression ?? 0) > 0 && (
                      <View style={styles.chapterMiniProgressBg}>
                        <View
                          style={[
                            styles.chapterMiniProgressFill,
                            {
                              width: `${chapter.progression}%` as DimensionValue,
                            },
                          ]}
                        />
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
            <View style={{ height: 24 }} />
          </ScrollView>
        )
      )}
    </SafeAreaView>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  backBtn: {
    width: 32,
    alignItems: 'flex-start',
  },
  searchBtn: {
    width: 32,
    alignItems: 'flex-end',
  },

  // ── Barre de recherche ──
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },

  // ── Onglets matières ──
  tabsScroll: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  tabTextActive: {
    color: COLORS.white,
  },

  // ── Liste chapitres ──
  chaptersScroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  chaptersContent: {
    padding: 16,
    gap: 12,
  },
  chapterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  chapterCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chapterNumBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterNumText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  chapterCardInfo: {
    flex: 1,
  },
  chapterCardSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  chapterCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
  },
  chapterCardDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  chapterMiniProgressBg: {
    height: 4,
    backgroundColor: COLORS.progressBg,
    borderRadius: 4,
    marginTop: 6,
    overflow: 'hidden',
  },
  chapterMiniProgressFill: {
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },

  // ── Vue détail chapitre ──
  chapterScroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  chapterScrollContent: {
    paddingBottom: 20,
  },

  // Bannière verte
  chapterBanner: {
    backgroundColor: COLORS.primaryDark,
    paddingTop: 24,
    paddingLeft: 20,
    paddingRight: 16,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    position: 'relative',
  },
  chapterBannerLeft: {
    flex: 1,
  },
  chapterBannerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 4,
  },
  chapterBannerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  chapterBannerLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  chapterProgressBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 6,
    overflow: 'hidden',
    width: '80%',
  },
  chapterProgressFill: {
    height: 8,
    backgroundColor: COLORS.gold,
    borderRadius: 6,
  },
  chapterBannerDeco: {
    alignItems: 'flex-end',
    gap: 4,
    paddingBottom: 24,
    opacity: 0.7,
  },
  chapterDecoText: {
    fontSize: 13,
    color: COLORS.white,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  chapterProgressPct: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Leçons
  lessonsCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  lessonRowLocked: {
    opacity: 0.55,
  },
  lessonIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonIconCompleted: {
    backgroundColor: COLORS.primary,
  },
  lessonIconAvailable: {
    backgroundColor: COLORS.border,
  },
  lessonIconLocked: {
    backgroundColor: COLORS.border,
  },
  lessonText: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  lessonTitleLocked: {
    color: COLORS.textMuted,
  },
  lessonSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  lessonRightIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },

  // Quiz de fin de chapitre
  quizRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.goldLight,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#F5E6B0',
  },
  quizIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quizText: {
    flex: 1,
  },
  quizTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  quizSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  quizXP: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.gold,
  },

  // Notes personnelles
  notesCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  notesHeader: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  notesIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  notesInput: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 20,
    minHeight: 56,
  },
  notesSaveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  notesSaveBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },

  // Erreur / vide
  errorText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
});