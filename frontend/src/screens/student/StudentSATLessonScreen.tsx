/**
 * StudentSATLessonScreen.tsx
 * Une leçon peut contenir : texte + vidéo(s) + PDF(s) — comme Cisco/CVD
 * Le prof décide ce qu'il met, tout s'affiche dans l'ordre
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Linking, Modal,
  Platform, ScrollView, StyleSheet, Text,
  TouchableOpacity, View, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import api from '../../services/auth.service';

const { width: SCREEN_W } = Dimensions.get('window');

const PRIMARY       = '#0D6B5E';
const PRIMARY_LIGHT = '#E6F3F1';
const BG            = '#F8FAFB';
const CARD          = '#FFFFFF';
const TEXT          = '#111827';
const TEXT_MUTED    = '#6B7280';
const BORDER        = '#E5E7EB';
const SUCCESS       = '#16A34A';
const SUCCESS_LIGHT = '#DCFCE7';

type LessonDetail = {
  id: string;
  titre: string;
  // Multi-contenu
  contenu?:   string;
  videoUrl?:  string;
  videoUrl2?: string;
  pdfUrl?:    string;
  pdfNom?:    string;
  pdfUrl2?:   string;
  pdfNom2?:   string;
  dureeMinutes?: number;
  isCompleted?:  boolean;
  // Ancien champ (rétrocompatibilité)
  type?: 'VIDEO' | 'PDF' | 'TEXT';
  pdfUrl_legacy?: string;
  videoUrl_legacy?: string;
};

type Unit = {
  id: string; titre: string;
  domaine: 'MATH' | 'READING' | 'WRITING';
};

type Props = {
  route: { params: { lesson: LessonDetail; unit: Unit } };
  navigation: { navigate: (s: string, p?: any) => void; goBack: () => void };
};

const DOMAIN_COLOR: Record<string, string> = {
  MATH: '#3B82F6', READING: '#7C3AED', WRITING: '#EC4899',
};

// ─── PDF Viewer Modal ─────────────────────────────────────────────────────────
function PDFModal({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const viewerUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={pv.container}>
        <View style={pv.header}>
          <TouchableOpacity onPress={onClose} style={pv.btn}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={pv.title} numberOfLines={1}>{name || 'Document PDF'}</Text>
          <TouchableOpacity onPress={() => Linking.openURL(url)} style={pv.btn}>
            <Ionicons name="download-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
        <WebView
          source={{ uri: viewerUrl }}
          style={{ flex: 1 }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => { setLoading(false); onClose(); Linking.openURL(url); }}
        />
        {loading && (
          <View style={pv.loader}>
            <ActivityIndicator size="large" color={PRIMARY} />
            <Text style={pv.loaderText}>Chargement du PDF…</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
const pv = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A', paddingTop: Platform.OS === 'ios' ? 44 : 0 },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: PRIMARY, paddingHorizontal: 12, paddingVertical: 12, paddingTop: Platform.OS === 'android' ? 36 : 12, gap: 10 },
  btn:   { padding: 6 },
  title: { flex: 1, color: '#FFF', fontSize: 15, fontWeight: '600' },
  loader: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: Platform.OS === 'android' ? 84 : 56 },
  loaderText: { color: TEXT_MUTED, fontSize: 14 },
});

// ─── Video Player Modal ───────────────────────────────────────────────────────
function VideoModal({ url, titre, onClose }: { url: string; titre: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const isYT  = /youtube\.com|youtu\.be/.test(url);
  const ytId  = isYT ? url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/)?.[1] : null;
  const ytUrl = ytId ? `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1` : null;
  const videoHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"><style>*{margin:0;padding:0;background:#000}body{display:flex;align-items:center;justify-content:center;height:100vh}video{width:100vw;max-height:100vh;outline:none}</style></head><body><video src="${url}" controls autoplay playsinline webkit-playsinline preload="auto"></video></body></html>`;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={vm.container}>
        <View style={vm.header}>
          <TouchableOpacity onPress={onClose} style={vm.btn}><Ionicons name="arrow-back" size={22} color="#FFF" /></TouchableOpacity>
          <Text style={vm.title} numberOfLines={1}>{titre}</Text>
          <TouchableOpacity onPress={() => Linking.openURL(url)} style={vm.btn}><Ionicons name="open-outline" size={20} color="#FFF" /></TouchableOpacity>
        </View>
        <View style={vm.playerWrap}>
          {ytUrl
            ? <WebView source={{ uri: ytUrl }} style={vm.webview} allowsFullscreenVideo mediaPlaybackRequiresUserAction={false} onLoadEnd={() => setLoading(false)} />
            : <WebView source={{ html: videoHtml }} style={vm.webview} allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} javaScriptEnabled originWhitelist={['*']} onLoadEnd={() => setLoading(false)} />
          }
          {loading && <View style={vm.loader}><ActivityIndicator size="large" color={PRIMARY} /><Text style={vm.loaderText}>Chargement…</Text></View>}
        </View>
      </View>
    </Modal>
  );
}
const vm = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#000', paddingTop: Platform.OS === 'ios' ? 44 : 0 },
  header:     { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 12, paddingVertical: 10, paddingTop: Platform.OS === 'android' ? 36 : 10, gap: 12 },
  btn:        { padding: 6 },
  title:      { flex: 1, color: '#FFF', fontSize: 15, fontWeight: '600' },
  playerWrap: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  webview:    { flex: 1, backgroundColor: '#000' },
  loader:     { ...StyleSheet.absoluteFill, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
});

// ─── Bloc vidéo cliquable ─────────────────────────────────────────────────────
function VideoBlock({ url, titre, color, index, onOpen }: {
  url: string; titre: string; color: string; index: number; onOpen: () => void;
}) {
  const isYT   = /youtube\.com|youtu\.be/.test(url);
  const ytId   = isYT ? url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/)?.[1] : null;
  const thumbUrl = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;

  return (
    <TouchableOpacity style={[vb.card, { borderColor: color + '40' }]} onPress={onOpen} activeOpacity={0.85}>
      {/* Miniature ou fond coloré */}
      <View style={vb.thumb}>
        {thumbUrl
          ? <WebView source={{ uri: thumbUrl }} style={vb.thumbWeb} scrollEnabled={false} pointerEvents="none" />
          : <View style={[vb.thumbPlaceholder, { backgroundColor: color + '20' }]}><Ionicons name="videocam" size={36} color={color} /></View>
        }
        {/* Overlay play */}
        <View style={vb.overlay}>
          <View style={vb.playBtn}>
            <Ionicons name="play" size={26} color="#FFF" style={{ marginLeft: 3 }} />
          </View>
        </View>
        {/* Badges bas */}
        <View style={vb.bottomRow}>
          <View style={[vb.badge, { backgroundColor: color }]}>
            <Ionicons name="play-circle" size={12} color="#FFF" />
            <Text style={vb.badgeText}>Vidéo {index > 1 ? index : ''}</Text>
          </View>
          {isYT && (
            <View style={vb.ytBadge}>
              <Ionicons name="logo-youtube" size={12} color="#EF4444" />
              <Text style={vb.ytText}>YouTube</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
const vb = StyleSheet.create({
  card:        { borderRadius: 18, overflow: 'hidden', marginBottom: 16, borderWidth: 1.5 },
  thumb:       { height: 200, backgroundColor: '#111', position: 'relative' },
  thumbWeb:    { flex: 1, backgroundColor: '#111' },
  thumbPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overlay:     { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  playBtn:     { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' },
  bottomRow:   { position: 'absolute', bottom: 12, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge:       { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText:   { fontSize: 12, fontWeight: '700', color: '#FFF' },
  ytBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  ytText:      { fontSize: 11, fontWeight: '600', color: '#FFF' },
});

// ─── Bloc PDF cliquable ───────────────────────────────────────────────────────
function PDFBlock({ url, nom, color, index, onOpen }: {
  url: string; nom: string; color: string; index: number; onOpen: () => void;
}) {
  return (
    <TouchableOpacity style={[pb.card, { borderColor: color + '40' }]} onPress={onOpen} activeOpacity={0.85}>
      <View style={pb.iconWrap}>
        <View style={pb.iconBox}><Ionicons name="document-text" size={28} color="#FFF" /></View>
        <Text style={pb.ext}>PDF</Text>
      </View>
      <View style={pb.body}>
        <Text style={pb.name} numberOfLines={2}>{nom || `Document PDF${index > 1 ? ' ' + index : ''}`}</Text>
        <Text style={pb.sub}>Appuie pour lire dans l'application</Text>
      </View>
      <View style={[pb.arrow, { backgroundColor: color + '15' }]}>
        <Ionicons name="chevron-forward" size={18} color={color} />
      </View>
    </TouchableOpacity>
  );
}
const pb = StyleSheet.create({
  card:    { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 16, padding: 14, gap: 12, borderWidth: 1.5, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  iconWrap:{ alignItems: 'center', gap: 4 },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center' },
  ext:     { fontSize: 9, fontWeight: '800', color: '#E53935', letterSpacing: 0.5 },
  body:    { flex: 1 },
  name:    { fontSize: 14, fontWeight: '700', color: TEXT, lineHeight: 20, marginBottom: 3 },
  sub:     { fontSize: 11, color: TEXT_MUTED },
  arrow:   { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});

// ─── Bloc texte ───────────────────────────────────────────────────────────────
function TextBlock({ content }: { content: string }) {
  const paragraphs = content.split(/\n\n+/).filter(Boolean);
  return (
    <View style={{ marginBottom: 16 }}>
      {paragraphs.map((para, i) => {
        const isH1     = para.startsWith('# ');
        const isH2     = para.startsWith('## ');
        const isBullet = para.startsWith('- ') || para.startsWith('• ');
        const isNum    = /^\d+\.\s/.test(para);
        const clean    = para
          .replace(/^#{1,2}\s*/, '')
          .replace(/^\*\*|\*\*$/g, '')
          .replace(/^[-•]\s*/, '')
          .replace(/^\d+\.\s*/, '');
        if (isH1)    return <Text key={i} style={tx.h1}>{clean}</Text>;
        if (isH2)    return <Text key={i} style={tx.h2}>{clean}</Text>;
        if (isBullet) return (
          <View key={i} style={tx.bulletRow}>
            <Text style={tx.bullet}>•</Text>
            <Text style={tx.bulletText}>{clean}</Text>
          </View>
        );
        if (isNum) return (
          <View key={i} style={tx.bulletRow}>
            <Text style={tx.numBullet}>{para.match(/^\d+/)?.[0]}.</Text>
            <Text style={tx.bulletText}>{clean}</Text>
          </View>
        );
        return <Text key={i} style={tx.para}>{clean}</Text>;
      })}
    </View>
  );
}
const tx = StyleSheet.create({
  h1:         { fontSize: 20, fontWeight: '900', color: TEXT, marginBottom: 10, marginTop: 20, letterSpacing: -0.3 },
  h2:         { fontSize: 17, fontWeight: '800', color: TEXT, marginBottom: 8,  marginTop: 16, letterSpacing: -0.2 },
  para:       { fontSize: 15, color: TEXT, lineHeight: 26, marginBottom: 14 },
  bulletRow:  { flexDirection: 'row', gap: 8, marginBottom: 8, paddingLeft: 4 },
  bullet:     { fontSize: 15, color: TEXT_MUTED, marginTop: 4, width: 14 },
  numBullet:  { fontSize: 14, color: TEXT_MUTED, marginTop: 4, fontWeight: '700', width: 20 },
  bulletText: { flex: 1, fontSize: 15, color: TEXT, lineHeight: 24 },
});

// ─── Séparateur de section ────────────────────────────────────────────────────
function SectionDivider({ label, color }: { label: string; color: string }) {
  return (
    <View style={sd.row}>
      <View style={[sd.line, { backgroundColor: color + '30' }]} />
      <View style={[sd.pill, { backgroundColor: color + '15' }]}>
        <Text style={[sd.label, { color }]}>{label}</Text>
      </View>
      <View style={[sd.line, { backgroundColor: color + '30' }]} />
    </View>
  );
}
const sd = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 },
  line:  { flex: 1, height: 1.5, borderRadius: 1 },
  pill:  { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
});

// ─── Écran principal ──────────────────────────────────────────────────────────
export default function StudentSATLessonScreen({ route, navigation }: Props) {
  const { lesson: initialLesson, unit } = route.params;
  const domainColor = DOMAIN_COLOR[unit.domaine] || PRIMARY;

  const [lesson, setLesson]           = useState<LessonDetail>(initialLesson);
  const [loading, setLoading]         = useState(true);
  const [completing, setCompleting]   = useState(false);
  const [isCompleted, setIsCompleted] = useState(initialLesson.isCompleted ?? false);

  // State pour les modals
  const [openPdf,   setOpenPdf]   = useState<{ url: string; nom: string } | null>(null);
  const [openVideo, setOpenVideo] = useState<{ url: string; titre: string } | null>(null);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/sat/lessons/${initialLesson.id}`);
        setLesson(data.lesson || initialLesson);
        setIsCompleted(data.lesson?.isCompleted ?? initialLesson.isCompleted ?? false);
      } catch {}
      finally {
        setLoading(false);
        Animated.parallel([
          Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start();
      }
    })();
  }, [initialLesson.id]);

  const handleComplete = async () => {
    if (isCompleted || completing) return;
    setCompleting(true);
    try { await api.post(`/sat/lessons/${lesson.id}/complete`); setIsCompleted(true); }
    catch {} finally { setCompleting(false); }
  };

  // Déterminer quels contenus existent
  const hasVideo1  = !!(lesson.videoUrl);
  const hasVideo2  = !!(lesson.videoUrl2);
  const hasPDF1    = !!(lesson.pdfUrl);
  const hasPDF2    = !!(lesson.pdfUrl2);
  const hasText    = !!(lesson.contenu);
  const hasContent = hasVideo1 || hasVideo2 || hasPDF1 || hasPDF2 || hasText;

  // Compteurs pour les labels
  const videoCount = (hasVideo1 ? 1 : 0) + (hasVideo2 ? 1 : 0);
  const pdfCount   = (hasPDF1 ? 1 : 0) + (hasPDF2 ? 1 : 0);

  if (loading) {
    return <View style={s.loadingView}><ActivityIndicator size="large" color={domainColor} /></View>;
  }

  return (
    <View style={s.root}>

      {/* ── Modals ── */}
      {openPdf && (
        <PDFModal url={openPdf.url} name={openPdf.nom} onClose={() => setOpenPdf(null)} />
      )}
      {openVideo && (
        <VideoModal url={openVideo.url} titre={openVideo.titre} onClose={() => setOpenVideo(null)} />
      )}

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={navigation.goBack} style={s.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerUnit} numberOfLines={1}>{unit.titre}</Text>
          <Text style={s.headerLesson} numberOfLines={1}>{lesson.titre}</Text>
        </View>
        {isCompleted && <Ionicons name="checkmark-circle" size={24} color={SUCCESS} />}
      </View>

      {/* Barre domaine */}
      <View style={[s.domainBar, { backgroundColor: domainColor }]} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Méta ── */}
          <View style={s.metaRow}>
            {/* Badges de contenu */}
            {hasVideo1 && (
              <View style={[s.typeBadge, { backgroundColor: '#EF444418' }]}>
                <Ionicons name="play-circle" size={13} color="#EF4444" />
                <Text style={[s.typeLabel, { color: '#EF4444' }]}>
                  {videoCount > 1 ? `${videoCount} vidéos` : 'Vidéo'}
                </Text>
              </View>
            )}
            {hasPDF1 && (
              <View style={[s.typeBadge, { backgroundColor: '#E5393518' }]}>
                <Ionicons name="document-text" size={13} color="#E53935" />
                <Text style={[s.typeLabel, { color: '#E53935' }]}>
                  {pdfCount > 1 ? `${pdfCount} PDFs` : 'PDF'}
                </Text>
              </View>
            )}
            {hasText && (
              <View style={[s.typeBadge, { backgroundColor: PRIMARY + '18' }]}>
                <Ionicons name="reader" size={13} color={PRIMARY} />
                <Text style={[s.typeLabel, { color: PRIMARY }]}>Cours</Text>
              </View>
            )}
            {lesson.dureeMinutes && (
              <View style={s.durationBadge}>
                <Ionicons name="time-outline" size={13} color={TEXT_MUTED} />
                <Text style={s.durationText}>{lesson.dureeMinutes} min</Text>
              </View>
            )}
            {isCompleted && (
              <View style={s.doneBadge}>
                <Ionicons name="checkmark" size={12} color={SUCCESS} />
                <Text style={s.doneText}>Complétée</Text>
              </View>
            )}
          </View>

          {/* ── Titre ── */}
          <Text style={s.lessonTitle}>{lesson.titre}</Text>
          <View style={[s.divider, { backgroundColor: domainColor + '30' }]} />

          {/* ── CONTENUS (dans l'ordre : vidéo → PDF → texte) ── */}

          {/* Vidéo 1 */}
          {hasVideo1 && (
            <>
              {(hasPDF1 || hasText || hasVideo2) && <SectionDivider label="📹 VIDÉO" color={domainColor} />}
              <VideoBlock
                url={lesson.videoUrl!}
                titre={lesson.titre}
                color={domainColor}
                index={1}
                onOpen={() => setOpenVideo({ url: lesson.videoUrl!, titre: lesson.titre })}
              />
            </>
          )}

          {/* Vidéo 2 */}
          {hasVideo2 && (
            <VideoBlock
              url={lesson.videoUrl2!}
              titre={`${lesson.titre} — Partie 2`}
              color={domainColor}
              index={2}
              onOpen={() => setOpenVideo({ url: lesson.videoUrl2!, titre: `${lesson.titre} — Partie 2` })}
            />
          )}

          {/* PDF 1 */}
          {hasPDF1 && (
            <>
              {(hasVideo1 || hasText || hasPDF2) && <SectionDivider label="📄 DOCUMENT" color={domainColor} />}
              <PDFBlock
                url={lesson.pdfUrl!}
                nom={lesson.pdfNom || lesson.titre}
                color={domainColor}
                index={1}
                onOpen={() => setOpenPdf({ url: lesson.pdfUrl!, nom: lesson.pdfNom || lesson.titre })}
              />
            </>
          )}

          {/* PDF 2 */}
          {hasPDF2 && (
            <PDFBlock
              url={lesson.pdfUrl2!}
              nom={lesson.pdfNom2 || `${lesson.titre} — Document 2`}
              color={domainColor}
              index={2}
              onOpen={() => setOpenPdf({ url: lesson.pdfUrl2!, nom: lesson.pdfNom2 || `${lesson.titre} — Document 2` })}
            />
          )}

          {/* Texte de cours */}
          {hasText && (
            <>
              {(hasVideo1 || hasPDF1) && <SectionDivider label="📝 COURS" color={domainColor} />}
              <TextBlock content={lesson.contenu!} />
            </>
          )}

          {/* Aucun contenu */}
          {!hasContent && (
            <View style={s.noContent}>
              <Text style={{ fontSize: 44 }}>🚧</Text>
              <Text style={s.noContentTitle}>Contenu en préparation</Text>
              <Text style={s.noContentDesc}>Cette leçon sera disponible très prochainement.</Text>
            </View>
          )}

          {/* ── Actions ── */}
          <View style={s.actionsCard}>
            {!isCompleted ? (
              <TouchableOpacity
                style={[s.completeBtn, { backgroundColor: domainColor }, completing && { opacity: 0.6 }]}
                onPress={handleComplete}
                disabled={completing}
                activeOpacity={0.85}
              >
                {completing
                  ? <ActivityIndicator color="#FFF" />
                  : <>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                      <Text style={s.completeBtnText}>Marquer comme terminé</Text>
                    </>
                }
              </TouchableOpacity>
            ) : (
              <View style={s.completedInfo}>
                <Ionicons name="checkmark-circle" size={22} color={SUCCESS} />
                <Text style={s.completedInfoText}>Leçon complétée !</Text>
              </View>
            )}
            <TouchableOpacity
              style={[s.quizBtn, { borderColor: domainColor + '50' }]}
              onPress={() => navigation.navigate('StudentSATLessonQuiz', { lesson, unit })}
              activeOpacity={0.8}
            >
              <Ionicons name="help-circle-outline" size={20} color={domainColor} />
              <Text style={[s.quizBtnText, { color: domainColor }]}>Quiz de la leçon</Text>
              <Ionicons name="arrow-forward" size={16} color={domainColor} />
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
  headerUnit:    { fontSize: 11, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 0.5 },
  headerLesson:  { fontSize: 15, fontWeight: '800', color: TEXT, marginTop: 2 },
  domainBar:     { height: 3 },
  scroll:        { paddingHorizontal: 16, paddingTop: 20 },
  metaRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  typeBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  typeLabel:     { fontSize: 12, fontWeight: '700' },
  durationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#F3F4F6' },
  durationText:  { fontSize: 12, color: TEXT_MUTED, fontWeight: '600' },
  doneBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: SUCCESS_LIGHT },
  doneText:      { fontSize: 12, color: SUCCESS, fontWeight: '700' },
  lessonTitle:   { fontSize: 22, fontWeight: '900', color: TEXT, letterSpacing: -0.5, lineHeight: 30, marginBottom: 16 },
  divider:       { height: 2, borderRadius: 1, marginBottom: 20 },
  noContent:     { alignItems: 'center', paddingVertical: 48, gap: 12 },
  noContentTitle:{ fontSize: 16, fontWeight: '800', color: TEXT },
  noContentDesc: { fontSize: 13, color: TEXT_MUTED, textAlign: 'center' },
  actionsCard:   { backgroundColor: CARD, borderRadius: 18, padding: 16, gap: 12, borderWidth: 1, borderColor: BORDER, marginTop: 8 },
  completeBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 16, gap: 8 },
  completeBtnText:  { fontSize: 16, fontWeight: '800', color: '#FFF' },
  completedInfo:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  completedInfoText:{ fontSize: 15, fontWeight: '700', color: SUCCESS },
  quizBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 14, gap: 8, borderWidth: 1.5, backgroundColor: PRIMARY_LIGHT },
  quizBtnText:   { fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'center' },
});