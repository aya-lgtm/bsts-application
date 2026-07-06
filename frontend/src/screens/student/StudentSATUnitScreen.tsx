/**
 * StudentSATUnitScreen.tsx
 * Formule progression : (leçons terminées + quiz réussis) / (N × 2)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Platform,
  ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
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
const LOCKED_BG     = '#F3F4F6';

type LessonType = 'VIDEO' | 'PDF' | 'TEXT';

type Lesson = {
  id: string;
  titre: string;
  type?: LessonType;
  dureeMinutes?: number;
  ordre: number;
  isCompleted: boolean;
  quizPassed:  boolean;
  isUnlocked:  boolean;
  videoUrl?:  string;
  videoUrl2?: string;
  pdfUrl?:    string;
  contenu?:   string;
};

type Unit = {
  id: string;
  titre: string;
  description: string;
  domaine: 'MATH' | 'READING' | 'WRITING';
  niveau: string;
  lessonsTotal: number;
  lessonsCompleted: number;
};

type Props = {
  route: { params: { unit: Unit } };
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
};

const DOMAIN_COLOR: Record<string, string> = {
  MATH:    '#3B82F6',
  READING: '#7C3AED',
  WRITING: '#EC4899',
};

import { calcProgressPct } from './satProgressUtils';

// ─── ContentBadges ────────────────────────────────────────────────────────────
function ContentBadges({ lesson, color }: { lesson: Lesson; color: string }) {
  const hasVideo = !!(lesson.videoUrl || lesson.videoUrl2);
  const hasPDF   = !!(lesson.pdfUrl);
  const hasText  = !!(lesson.contenu);
  return (
    <View style={cb.row}>
      {hasVideo && (
        <View style={[cb.badge, { backgroundColor: '#EF444415' }]}>
          <Ionicons name="play-circle" size={11} color="#EF4444" />
          <Text style={[cb.text, { color: '#EF4444' }]}>Vidéo</Text>
        </View>
      )}
      {hasPDF && (
        <View style={[cb.badge, { backgroundColor: '#E5393515' }]}>
          <Ionicons name="document-text" size={11} color="#E53935" />
          <Text style={[cb.text, { color: '#E53935' }]}>PDF</Text>
        </View>
      )}
      {hasText && (
        <View style={[cb.badge, { backgroundColor: color + '15' }]}>
          <Ionicons name="reader" size={11} color={color} />
          <Text style={[cb.text, { color }]}>Cours</Text>
        </View>
      )}
      {lesson.dureeMinutes && (
        <View style={[cb.badge, { backgroundColor: '#F3F4F6' }]}>
          <Ionicons name="time-outline" size={11} color={TEXT_MUTED} />
          <Text style={[cb.text, { color: TEXT_MUTED }]}>{lesson.dureeMinutes} min</Text>
        </View>
      )}
    </View>
  );
}
const cb = StyleSheet.create({
  row:   { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  text:  { fontSize: 10, fontWeight: '700' },
});

// ─── LessonRow ────────────────────────────────────────────────────────────────
function LessonRow({ lesson, index, isLast, domainColor, onPress, fadeAnim }: {
  lesson: Lesson; index: number; isLast: boolean;
  domainColor: string; onPress: () => void; fadeAnim: Animated.Value;
}) {
  const isLocked    = !lesson.isUnlocked;
  const isCompleted = lesson.isCompleted;
  const quizDone    = lesson.quizPassed;
  const inProgress  = lesson.isUnlocked && !isCompleted;
  const fullyDone   = isCompleted && quizDone;

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity
        style={[
          lr.row,
          fullyDone  && lr.rowDone,
          isLocked   && lr.rowLocked,
          inProgress && { borderColor: domainColor + '60' },
        ]}
        onPress={onPress}
        disabled={isLocked}
        activeOpacity={0.75}
      >
        <View style={lr.connectorCol}>
          <View style={[
            lr.circle,
            fullyDone  && { backgroundColor: SUCCESS,    borderColor: SUCCESS    },
            inProgress && { backgroundColor: CARD,       borderColor: domainColor },
            isLocked   && { backgroundColor: LOCKED_BG, borderColor: BORDER     },
            !fullyDone && !inProgress && !isLocked && { backgroundColor: CARD, borderColor: BORDER },
          ]}>
            {fullyDone
              ? <Ionicons name="checkmark" size={16} color="#FFF" />
              : isLocked
                ? <Ionicons name="lock-closed" size={13} color={TEXT_MUTED} />
                : <Text style={[lr.circleNum, { color: domainColor }]}>{index + 1}</Text>
            }
          </View>
          {!isLast && (
            <View style={[lr.line, { backgroundColor: fullyDone ? SUCCESS_LIGHT : BORDER }]} />
          )}
        </View>

        <View style={lr.content}>
          <Text style={[lr.title, isLocked && { color: TEXT_MUTED }]} numberOfLines={2}>
            {lesson.titre}
          </Text>
          {!isLocked && <ContentBadges lesson={lesson} color={domainColor} />}
          <View style={lr.statusRow}>
            <View style={[lr.statusBadge, {
              backgroundColor: isCompleted ? SUCCESS_LIGHT : isLocked ? LOCKED_BG : domainColor + '12',
            }]}>
              <Ionicons
                name={isCompleted ? 'checkmark-circle' : isLocked ? 'lock-closed' : 'book-outline'}
                size={11}
                color={isCompleted ? SUCCESS : isLocked ? TEXT_MUTED : domainColor}
              />
              <Text style={[lr.statusText, {
                color: isCompleted ? SUCCESS : isLocked ? TEXT_MUTED : domainColor,
              }]}>
                {isCompleted ? 'Leçon ✓' : isLocked ? 'Verrouillé' : 'À faire'}
              </Text>
            </View>
            {!isLocked && (
              <View style={[lr.statusBadge, { backgroundColor: quizDone ? SUCCESS_LIGHT : '#FFF7ED' }]}>
                <Ionicons
                  name={quizDone ? 'checkmark-circle' : 'help-circle-outline'}
                  size={11}
                  color={quizDone ? SUCCESS : '#F59E0B'}
                />
                <Text style={[lr.statusText, { color: quizDone ? SUCCESS : '#F59E0B' }]}>
                  {quizDone ? 'Quiz ✓' : 'Quiz requis'}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={lr.actionCol}>
          {fullyDone ? (
            <View style={lr.replayBtn}>
              <Ionicons name="refresh" size={13} color={SUCCESS} />
              <Text style={lr.replayText}>Revoir</Text>
            </View>
          ) : isLocked ? (
            <Ionicons name="lock-closed-outline" size={20} color={BORDER} />
          ) : (
            <View style={[lr.startBtn, { backgroundColor: domainColor }]}>
              <Text style={lr.startBtnText}>
                {isCompleted && !quizDone ? 'Réviser' : 'Commencer'}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const lr = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: CARD, borderRadius: 16, paddingVertical: 14, paddingRight: 14, borderWidth: 1.5, borderColor: BORDER },
  rowDone:     { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
  rowLocked:   { opacity: 0.6 },
  connectorCol:{ width: 60, alignItems: 'center', paddingTop: 2 },
  circle:      { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  circleNum:   { fontSize: 14, fontWeight: '900' },
  line:        { width: 2, flex: 1, minHeight: 12, marginTop: 4 },
  content:     { flex: 1, gap: 4, paddingRight: 8, paddingTop: 2 },
  title:       { fontSize: 14, fontWeight: '700', color: TEXT, lineHeight: 20 },
  statusRow:   { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  statusText:  { fontSize: 10, fontWeight: '700' },
  actionCol:   { alignItems: 'flex-end', justifyContent: 'center', paddingTop: 2 },
  startBtn:    { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  startBtnText:{ fontSize: 11, fontWeight: '800', color: '#FFF' },
  replayBtn:   { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: SUCCESS_LIGHT, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 7 },
  replayText:  { fontSize: 11, fontWeight: '700', color: SUCCESS },
});

// ─── Écran principal ──────────────────────────────────────────────────────────
export default function StudentSATUnitScreen({ route, navigation }: Props) {
  const { unit }    = route.params;
  const domainColor = DOMAIN_COLOR[unit.domaine] || PRIMARY;

  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/sat/units/${unit.id}/lessons`);
      setLessons(data.lessons || []);
    } catch {}
    finally {
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]).start();
    }
  }, [unit.id]);

  useEffect(() => { load(); }, [load]);

  const totalCount     = lessons.length;
  const lessonsCount   = lessons.filter(l => l.isCompleted).length;
  const quizCount      = lessons.filter(l => l.quizPassed).length;
  const fullyDoneCount = lessons.filter(l => l.isCompleted && l.quizPassed).length;
  const allDone        = totalCount > 0 && fullyDoneCount >= totalCount;

  // ✅ FORMULE UNIQUE — utilisée aussi dans StudentSATHomeScreen
  const progressPct = calcProgressPct(lessons);

  const handleLessonPress = (lesson: Lesson) => {
    if (!lesson.isUnlocked) return;
    navigation.navigate('StudentSATLesson', { lesson, unit });
  };

  if (loading) {
    return <View style={s.loadingView}><ActivityIndicator size="large" color={domainColor} /></View>;
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={navigation.goBack} style={s.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>{unit.titre}</Text>
          <Text style={s.headerSub}>
            {lessonsCount}/{totalCount} leçons · {quizCount}/{totalCount} quiz
          </Text>
        </View>
        <View style={[s.pctBadge, { borderColor: domainColor + '40' }]}>
          <Text style={[s.pctText, { color: domainColor }]}>{progressPct}%</Text>
        </View>
      </View>

      {/* Barre de progression */}
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${progressPct}%` as any, backgroundColor: domainColor }]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Description */}
        <Animated.View style={[s.descCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={s.descText}>{unit.description}</Text>
          <View style={s.legendRow}>
            <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: SUCCESS }]} /><Text style={s.legendText}>Leçon + Quiz réussis</Text></View>
            <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#F59E0B' }]} /><Text style={s.legendText}>Quiz requis</Text></View>
            <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: BORDER }]} /><Text style={s.legendText}>Verrouillée</Text></View>
          </View>
        </Animated.View>

        {/* Section */}
        <Animated.View style={[s.sectionRow, { opacity: fadeAnim }]}>
          <Text style={s.sectionTitle}>PROGRAMME</Text>
          <Text style={s.sectionSub}>{totalCount} leçon{totalCount !== 1 ? 's' : ''}</Text>
        </Animated.View>

        {/* Liste leçons */}
        {lessons.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyEmoji}>📭</Text>
            <Text style={s.emptyTitle}>Aucune leçon disponible</Text>
            <Text style={s.emptyDesc}>Le contenu de cette unité arrive bientôt.</Text>
          </View>
        ) : (
          <View style={s.lessonList}>
            {lessons.map((lesson, i) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                index={i}
                isLast={i === lessons.length - 1}
                domainColor={domainColor}
                fadeAnim={fadeAnim}
                onPress={() => handleLessonPress(lesson)}
              />
            ))}
          </View>
        )}

        {/* Info */}
        {fullyDoneCount < totalCount && lessons.length > 0 && (
          <View style={s.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={domainColor} />
            <Text style={[s.infoText, { color: domainColor }]}>
              Réussis le quiz de chaque leçon pour déverrouiller la suivante.
              {fullyDoneCount > 0 ? ` ${fullyDoneCount}/${totalCount} quiz validés.` : ''}
            </Text>
          </View>
        )}

        {/* SAT Blanc */}
        <Animated.View style={[s.testSection, { opacity: fadeAnim }]}>
          <View style={[s.testDivider, { backgroundColor: allDone ? domainColor + '30' : BORDER }]} />
          <View style={[s.testCard, allDone && { borderColor: domainColor + '40', backgroundColor: domainColor + '08' }]}>
            <View style={s.testCardLeft}>
              <Text style={{ fontSize: 32 }}>📝</Text>
              <View style={s.testCardBody}>
                <Text style={[s.testCardTitle, allDone && { color: domainColor }]}>SAT Blanc</Text>
                <Text style={s.testCardDesc}>
                  {allDone ? 'Toutes les leçons validées ! Lance le test.' : 'Complète et valide toutes les leçons pour déverrouiller.'}
                </Text>
                {!allDone && (
                  <View style={s.testProgress}>
                    <View style={[s.testProgressBar, { backgroundColor: BORDER }]}>
                      <View style={[s.testProgressFill, { width: `${Math.round((fullyDoneCount / Math.max(totalCount, 1)) * 100)}%` as any, backgroundColor: domainColor }]} />
                    </View>
                    <Text style={s.testProgressText}>{fullyDoneCount}/{totalCount} validées</Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={[s.testBtn, { backgroundColor: allDone ? domainColor : BORDER }]}
              disabled={!allDone}
              onPress={() => navigation.navigate('StudentSATUnitTest', { unit })}
              activeOpacity={0.8}
            >
              <Ionicons name={allDone ? 'rocket' : 'lock-closed'} size={18} color={allDone ? '#FFF' : TEXT_MUTED} />
              <Text style={[s.testBtnText, !allDone && { color: TEXT_MUTED }]}>
                {allDone ? 'Lancer' : 'Verrouillé'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: BG },
  loadingView:   { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },
  header:        { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 12 },
  backBtn:       { padding: 4 },
  headerCenter:  { flex: 1 },
  headerTitle:   { fontSize: 17, fontWeight: '800', color: TEXT, letterSpacing: -0.3 },
  headerSub:     { fontSize: 12, color: TEXT_MUTED, fontWeight: '500', marginTop: 2 },
  pctBadge:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, backgroundColor: CARD },
  pctText:       { fontSize: 13, fontWeight: '900' },
  progressTrack: { height: 3, backgroundColor: BORDER },
  progressFill:  { height: 3 },
  scroll:        { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 },
  descCard:      { backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 20, gap: 12, borderWidth: 1, borderColor: BORDER },
  descText:      { fontSize: 14, color: TEXT_MUTED, lineHeight: 21 },
  legendRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:     { width: 8, height: 8, borderRadius: 4 },
  legendText:    { fontSize: 11, color: TEXT_MUTED, fontWeight: '500' },
  sectionRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle:  { fontSize: 11, fontWeight: '800', color: TEXT_MUTED, letterSpacing: 1.5 },
  sectionSub:    { fontSize: 12, color: TEXT_MUTED, fontWeight: '600' },
  lessonList:    { gap: 10, marginBottom: 12 },
  emptyBox:      { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyEmoji:    { fontSize: 40 },
  emptyTitle:    { fontSize: 15, fontWeight: '800', color: TEXT },
  emptyDesc:     { fontSize: 13, color: TEXT_MUTED, textAlign: 'center' },
  infoBox:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: PRIMARY_LIGHT, borderRadius: 12, padding: 12, marginBottom: 16 },
  infoText:      { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '500' },
  testSection:   { marginTop: 8 },
  testDivider:   { height: 2, borderRadius: 1, marginBottom: 16 },
  testCard:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: CARD, borderRadius: 18, padding: 16, borderWidth: 1.5, borderColor: BORDER, gap: 12 },
  testCardLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  testCardBody:  { flex: 1, gap: 4 },
  testCardTitle: { fontSize: 15, fontWeight: '800', color: TEXT },
  testCardDesc:  { fontSize: 12, color: TEXT_MUTED, lineHeight: 17 },
  testProgress:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  testProgressBar:  { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  testProgressFill: { height: 4, borderRadius: 2 },
  testProgressText: { fontSize: 11, fontWeight: '700', color: TEXT_MUTED },
  testBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  testBtnText:   { fontSize: 13, fontWeight: '800', color: '#FFF' },
});