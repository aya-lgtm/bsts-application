/**
 * StudentChatConversation.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Packages requis :
 *   npx expo install expo-image-picker expo-document-picker expo-audio
 *                    (plus expo-file-system ni expo-intent-launcher requis)
 *
 * Features :
 *  • IMAGE  → Viewer natif fullscreen avec zoom (comme WhatsApp)
 *  • AUDIO  → expo-audio (enregistrement + lecture)
 *  • VIDEO  → Tap thumbnail → ouvre dans le navigateur (compatible Expo Go)
 *  • PDF    → WebView + Google Docs Viewer (dans l app, compatible Expo Go)
 *  • Suppression de n'importe quel message (appui long → corbeille)
 *  • Menu ⋮ : Fermer (X) | Rechercher | Vider | Signaler / Désignaler
 *  • Signalement toggle fonctionnel
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  PanResponder,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from 'expo-audio';

import { io, Socket } from 'socket.io-client';
import { WebView } from 'react-native-webview';
import api from '../../services/auth.service';
import * as VideoThumbnails from 'expo-video-thumbnails';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Tokens ────────────────────────────────────────────────────────────────────
const PRIMARY       = '#0D6B5E';
const PRIMARY_LIGHT = '#E6F3F1';
const BG            = '#ECE5DD'; // WhatsApp-style warm background
const SURFACE       = '#FFFFFF';
const SURFACE2      = '#F0F2F5';
const BUBBLE_SENT   = '#0D6B5E';
const BUBBLE_RECV   = '#FFFFFF';
const TEXT          = '#111B21';
const TEXT_MUTED    = '#667781';
const BORDER        = '#E9EDEF';
const ONLINE        = '#25D366';
const DANGER        = '#DC3545';
const API_BASE      = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// ─── Types ─────────────────────────────────────────────────────────────────────
type FileType = 'TEXT' | 'IMAGE' | 'PDF' | 'AUDIO' | 'VIDEO';

type Sender = { id: string; nom: string; prenom: string; photo?: string | null };

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  fileType: FileType;
  fileUrl?: string | null;
  fileSize?: number | null;
  fileDuration?: number | null;
  isRead: boolean;
  isReported?: boolean;
  createdAt: string;
  sender?: Sender;
};

type Props = {
  route: { params: { conversationId: string; title?: string; otherMemberId?: string } };
  navigation: { goBack: () => void; setOptions: (o: any) => void };
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const fmtDateSep = (d: string) => {
  const date = new Date(d); const now = new Date();
  const yd = new Date(now); yd.setDate(now.getDate() - 1);
  if (date.toDateString() === now.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === yd.toDateString()) return 'Hier';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};

const sameDay = (a: string, b: string) =>
  new Date(a).toDateString() === new Date(b).toDateString();

const fmtSize = (b?: number | null) => {
  if (!b) return '';
  if (b < 1024) return `${b} o`;
  if (b < 1048576) return `${(b / 1024).toFixed(0)} Ko`;
  return `${(b / 1048576).toFixed(1)} Mo`;
};

const fmtDur = (s?: number | null) => {
  if (!s || s < 0 || isNaN(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

const resolveUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
};

// ─── PDF Viewer Modal (WebView — 100% dans l app, compatible Expo Go) ─────────
function PDFViewer({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const viewerUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={pv.container}>
        <View style={pv.header}>
          <TouchableOpacity onPress={onClose} style={pv.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={pv.title} numberOfLines={1}>{name || 'Document PDF'}</Text>
          <TouchableOpacity onPress={() => Linking.openURL(url)} style={pv.downloadBtn}>
            <Ionicons name="download-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
        <WebView
          source={{ uri: viewerUrl }}
          style={pv.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            Alert.alert(
              'Viewer indisponible',
              'Voulez-vous ouvrir le PDF dans le navigateur ?',
              [
                { text: 'Annuler', style: 'cancel', onPress: onClose },
                { text: 'Ouvrir', onPress: () => { Linking.openURL(url); onClose(); } },
              ]
            );
          }}
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
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PRIMARY, paddingHorizontal: 12,
    paddingVertical: 12, paddingTop: Platform.OS === 'android' ? 36 : 12,
    gap: 10,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, color: '#FFF', fontSize: 15, fontWeight: '600' },
  downloadBtn: { padding: 4 },
  webview: { flex: 1, backgroundColor: '#FFF' },
  loader: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: Platform.OS === 'android' ? 84 : 56,
  },
  loaderText: { color: TEXT_MUTED, fontSize: 14 },
});

// ─── Image Viewer Modal (WhatsApp style) ──────────────────────────────────────
function ImageViewer({ uri, onClose }: { uri: string; onClose: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 10,
      onPanResponderMove: (_, gs) => {
        translateY.setValue(gs.dy);
        const prog = Math.min(Math.abs(gs.dy) / 200, 1);
        opacity.setValue(1 - prog * 0.5);
        scale.setValue(1 - prog * 0.1);
      },
      onPanResponderRelease: (_, gs) => {
        if (Math.abs(gs.dy) > 100 || Math.abs(gs.vy) > 1.2) {
          Animated.parallel([
            Animated.timing(translateY, { toValue: gs.dy > 0 ? 600 : -600, duration: 250, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          ]).start(onClose);
        } else {
          Animated.parallel([
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
            Animated.spring(opacity, { toValue: 1, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
          ]).start();
        }
      },
    })
  ).current;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[iv.overlay, { opacity }]}>
        <TouchableOpacity style={iv.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={26} color="#FFF" />
        </TouchableOpacity>
        <Animated.View
          style={{ transform: [{ translateY }, { scale }] }}
          {...panResponder.panHandlers}
        >
          <Image
            source={{ uri }}
            style={iv.image}
            resizeMode="contain"
          />
        </Animated.View>
        <Text style={iv.hint}>Glisser vers le bas pour fermer</Text>
      </Animated.View>
    </Modal>
  );
}

const iv = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    left: 16,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
  },
  image: {
    width: SCREEN_W,
    height: SCREEN_H * 0.8,
  },
  hint: {
    position: 'absolute',
    bottom: 40,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
});

// ─── Video Viewer Modal (WebView HTML5 — compatible Expo Go) ─────────────────
function VideoViewer({ uri, onClose }: { uri: string; onClose: () => void }) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; }
        video {
          width: 100vw;
          max-height: 100vh;
          outline: none;
          background: #000;
        }
      </style>
    </head>
    <body>
      <video
        src="${uri}"
        controls
        autoplay
        playsinline
        webkit-playsinline
        preload="auto"
      ></video>
    </body>
    </html>
  `;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={vv.container}>
        <View style={vv.header}>
          <TouchableOpacity onPress={onClose} style={vv.backBtn}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={vv.title}>Vidéo</Text>
          <TouchableOpacity onPress={() => Linking.openURL(uri)} style={vv.extBtn}>
            <Ionicons name="open-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
        <View style={vv.playerWrap}>
          <WebView
            source={{ html }}
            style={vv.webview}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            originWhitelist={['*']}
          />
        </View>
      </View>
    </Modal>
  );
}

const vv = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingTop: Platform.OS === 'android' ? 36 : 10,
    gap: 12,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, color: '#FFF', fontSize: 15, fontWeight: '600' },
  extBtn: { padding: 4 },
  playerWrap: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
});

// ─── Audio Bubble ──────────────────────────────────────────────────────────────
function AudioBubble({ uri, isMine, fallbackDuration }: {
  uri: string; isMine: boolean; fallbackDuration?: number | null;
}) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const toggle = () => {
    try {
      if (status.playing) { player.pause(); }
      else { if (status.didJustFinish) player.seekTo(0); player.play(); }
    } catch {}
  };

  const secs = status.playing || status.currentTime > 0
    ? status.currentTime
    : (status.duration || fallbackDuration || 0);

  return (
    <View style={ab.row}>
      <TouchableOpacity
        onPress={toggle}
        style={[ab.btn, { backgroundColor: isMine ? 'rgba(255,255,255,0.25)' : PRIMARY_LIGHT }]}
      >
        <Ionicons
          name={status.playing ? 'pause' : 'play'}
          size={18}
          color={isMine ? '#FFF' : PRIMARY}
        />
      </TouchableOpacity>
      <View style={ab.wave}>
        {Array.from({ length: 20 }).map((_, i) => (
          <View
            key={i}
            style={[ab.bar, {
              height: 4 + (i % 5) * 3,
              backgroundColor: isMine ? 'rgba(255,255,255,0.6)' : PRIMARY,
              opacity: status.playing && i / 20 < (status.currentTime / (status.duration || 1)) ? 1 : 0.4,
            }]}
          />
        ))}
      </View>
      <Text style={[ab.dur, { color: isMine ? 'rgba(255,255,255,0.75)' : TEXT_MUTED }]}>
        {fmtDur(secs)}
      </Text>
    </View>
  );
}

const ab = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 180 },
  btn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  wave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 28 },
  bar: { width: 3, borderRadius: 2 },
  dur: { fontSize: 11, minWidth: 36, textAlign: 'right' },
});

// ─── Video Thumbnail Bubble — style comme dans l'image (player stylisé) ───────
function VideoBubble({
  uri,
  isMine,
  isRead,
  onPress
}: {
  uri: string;
  isMine: boolean;
  isRead?: boolean;
  onPress: () => void;
}){
    const scale = useRef(new Animated.Value(1)).current;

  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { uri: thumbUri } =
          await VideoThumbnails.getThumbnailAsync(uri, {
            time: 1000,
          });

        setThumb(thumbUri);
      } catch (e) {
        console.log('Thumbnail error:', e);
      }
    })();
  }, [uri]);
      return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={vb.container}>
      {/* Fond sombre */}
      <Image
  source={{ uri: thumb || uri }}
  style={vb.background}
  resizeMode="cover"
/>
        {/* Titre */}
        <View style={vb.topInfo}>
          <Ionicons name="musical-note" size={14} color="rgba(255,255,255,0.7)" />
          <View style={vb.topTexts}>
            <Text style={vb.videoTitle} numberOfLines={1}>Vidéo</Text>
          </View>
        </View>
        {/* Bouton play central */}
        <View style={vb.overlay}>
          <View style={vb.playCircle}>
            <Ionicons name="play" size={22} color="#FFF" style={{ marginLeft: 3 }} />
          </View>
        </View>
        {/* Barre de progression en bas */}
<View style={vb.bottomBar}>
  {isMine && (
    <Ionicons
      name={isRead ? 'checkmark-done' : 'checkmark'}
      size={16}
      color={isRead ? '#53BDEB' : '#FFFFFF'}
    />
  )}
</View>
      
    </TouchableOpacity>
  );
}

const vb = StyleSheet.create({
  container: { borderRadius: 14, overflow: 'hidden', width: 240 },
  background: {
    width: 240,
    height: 145,
    backgroundColor: '#1C1C1E',
    position: 'relative',
    justifyContent: 'space-between',
  },
  topInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    paddingBottom: 0,
  },
  topTexts: { flex: 1 },
  videoTitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
  },
  progressFill: {
    width: '15%',
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 2,
  },
  durationText: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
});

// ─── Bubble ────────────────────────────────────────────────────────────────────
function Bubble({ msg, isMine, showAvatar, selected, onLongPress, onPress, onImagePress, onVideoPress, onPDFPress }: {
  msg: Message; isMine: boolean; showAvatar: boolean;
  selected: boolean; onLongPress: () => void; onPress: () => void;
  onImagePress: (url: string) => void;
  onVideoPress: (url: string) => void;
  onPDFPress: (url: string, name: string) => void;
}) {
  const fullUrl = resolveUrl(msg.fileUrl);
  const filename = (msg.content
    ? msg.content.replace(/[^a-zA-Z0-9._-]/g, '_')
    : `document_${msg.id}`) + '.pdf';

  const isMedia = msg.fileType === 'IMAGE' || msg.fileType === 'VIDEO';

  return (
    <TouchableOpacity
      onLongPress={onLongPress}
      onPress={onPress}
      activeOpacity={0.75}
      style={[bs.row, isMine && bs.rowMine, selected && bs.rowSelected]}
    >
      {/* Avatar (messages reçus) */}
      {!isMine && (
        <View style={bs.avatarSlot}>
          {showAvatar ? (
            msg.sender?.photo ? (
              <Image source={{ uri: msg.sender.photo }} style={bs.avatar} />
            ) : (
              <View style={bs.avatarFallback}>
                <Text style={bs.avatarInitial}>
                  {msg.sender?.prenom?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
            )
          ) : null}
        </View>
      )}

      <View style={{ maxWidth: '78%' }}>
        <View style={[
          bs.bubble,
          isMine ? bs.bubbleMine : bs.bubbleRecv,
          isMedia && bs.bubbleMedia,
        ]}>

          {/* ── IMAGE ── tap → viewer fullscreen */}
          {msg.fileType === 'IMAGE' && fullUrl ? (
            <TouchableOpacity onPress={() => onImagePress(fullUrl)} activeOpacity={0.9}>
              <Image source={{ uri: fullUrl }} style={bs.img} resizeMode="cover" />
              {/* Timestamp overlay sur l'image */}
              <View style={bs.imgMeta}>
                <Text style={bs.imgTime}>{fmtTime(msg.createdAt)}</Text>
                {isMine && (
                  <Ionicons
                    name={msg.isRead ? 'checkmark-done' : 'checkmark'}
                    size={13}
                    color="rgba(255,255,255,0.9)"
                    style={{ marginLeft: 3 }}
                  />
                )}
              </View>
            </TouchableOpacity>

          /* ── AUDIO ── */
          ) : msg.fileType === 'AUDIO' && fullUrl ? (
            <>
              <AudioBubble uri={fullUrl} isMine={isMine} fallbackDuration={msg.fileDuration} />
              <View style={[bs.meta, isMine && bs.metaMine]}>
                <Text style={isMine ? bs.timeMine : bs.timeRecv}>{fmtTime(msg.createdAt)}</Text>
                {isMine && (
                  <Ionicons
                    name={msg.isRead ? 'checkmark-done' : 'checkmark'}
                    size={13}
                    color={msg.isRead ? '#FFF' : 'rgba(255,255,255,0.6)'}
                    style={{ marginLeft: 3 }}
                  />
                )}
              </View>
            </>

          /* ── VIDEO ── thumbnail + tap → player fullscreen */
          ) : msg.fileType === 'VIDEO' && fullUrl ? (
           <VideoBubble
  uri={fullUrl}
  isMine={isMine}
  isRead={msg.isRead}
  onPress={() => onVideoPress(fullUrl)}
/>

          /* ── PDF ── style comme dans l'image : icône rouge + nom + taille */
          ) : msg.fileType === 'PDF' && fullUrl ? (
             <TouchableOpacity
    style={[
      bs.pdfCard,
      isMine && bs.pdfCardMine
    ]}
    onPress={() => onPDFPress(fullUrl, msg.content || filename)}
    activeOpacity={0.85}
  >
    <View style={bs.pdfLeft}>
      <View style={bs.pdfIconBox}>
        <Ionicons
          name="document-text"
          size={28}
          color="#FFF"
        />
      </View>
    </View>

    <View style={bs.pdfContent}>
      <Text
        numberOfLines={1}
        style={[
          bs.pdfFileName,
          isMine && { color: '#FFF' }
        ]}
      >
        {msg.content}
      </Text>

      <Text
        style={[
          bs.pdfFileInfo,
          isMine && { color: 'rgba(255,255,255,0.75)' }
        ]}
      >
        PDF {msg.fileSize ? `• ${fmtSize(msg.fileSize)}` : ''}
      </Text>
    </View>

    
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <Text
    style={[
      bs.pdfTime,
      isMine && { color: 'rgba(255,255,255,0.75)' }
    ]}
  >
    {fmtTime(msg.createdAt)}
  </Text>

  {isMine && (
    <Ionicons
      name={msg.isRead ? 'checkmark-done' : 'checkmark'}
      size={14}
      color={msg.isRead ? '#53BDEB' : '#999'}
      style={{ marginLeft: 4 }}
    />
  )}
</View>
  </TouchableOpacity>

          /* ── TEXT ── */
          ) : (
            <>
              <Text style={[bs.text, isMine && { color: '#FFF' }]}>
                {msg.content}
              </Text>
              {/* Heure + coches alignées à droite en bas */}
              <View style={[bs.meta, isMine && bs.metaMine]}>
                <Text style={isMine ? bs.timeMine : bs.timeRecv}>
                  {fmtTime(msg.createdAt)}
                </Text>
                {isMine && (
                  <Ionicons
                    name={msg.isRead ? 'checkmark-done' : 'checkmark'}
                    size={13}
                    color={msg.isRead ? '#FFFFFF' : 'rgba(255,255,255,0.6)'}
                    style={{ marginLeft: 3 }}
                  />
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const bs = StyleSheet.create({
  row: {
    flexDirection: 'row', marginBottom: 3,
    alignItems: 'flex-end', paddingHorizontal: 8,
  },
  rowMine: { justifyContent: 'flex-end' },
  rowSelected: { backgroundColor: 'rgba(13,107,94,0.12)' },

  avatarSlot: { width: 32, marginRight: 4, alignItems: 'center', justifyContent: 'flex-end' },
  avatar: { width: 30, height: 30, borderRadius: 15 },
  avatarFallback: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#DDD', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 11, fontWeight: '700', color: TEXT_MUTED },

  bubble: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 18,
    maxWidth: '100%',
  },
  bubbleMedia: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    overflow: 'hidden',
  },
  bubbleMine: {
    backgroundColor: BUBBLE_SENT,
    borderBottomRightRadius: 4,
    // Queue de bulle droite
  },
  bubbleRecv: {
    backgroundColor: BUBBLE_RECV,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  text: { fontSize: 15, color: TEXT, lineHeight: 21 },

  img: { width: 230, height: 170, borderRadius: 0 },
  imgMeta: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  imgTime: { fontSize: 11, color: '#FFF' },

  // PDF
  pdfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 4,
    maxWidth: 260,
  },
  pdfIconWrap: { },
  pdfIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DANGER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfName: { fontSize: 13, fontWeight: '700', color: TEXT, lineHeight: 18 },
  pdfMeta: { fontSize: 11, color: TEXT_MUTED, marginTop: 2 },

  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    paddingHorizontal: 2,
  },
  metaMine: { justifyContent: 'flex-end' },
  timeMine: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  timeRecv: { fontSize: 11, color: TEXT_MUTED },
  pdfCard: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FFFFFF',
  borderRadius: 14,
  paddingHorizontal: 12,
  paddingVertical: 10,
  minWidth: 280,
  maxWidth: 320,
},

pdfCardMine: {
  backgroundColor: '#0D6B5E',
},

pdfLeft: {
  marginRight: 12,
},

pdfIconBox: {
  width: 42,
  height: 42,
  borderRadius: 10,
  backgroundColor: '#E53935',
  alignItems: 'center',
  justifyContent: 'center',
},

pdfContent: {
  flex: 1,
},

pdfFileName: {
  fontSize: 14,
  fontWeight: '600',
  color: '#222',
},

pdfFileInfo: {
  fontSize: 12,
  color: '#777',
  marginTop: 2,
},

pdfTime: {
  fontSize: 11,
  color: '#999',
  marginLeft: 8,
  alignSelf: 'flex-end',
},
});

// ─── Menu options ──────────────────────────────────────────────────────────────
type MenuOption = {
  icon: string;
  label: string;
  color?: string;
  onPress: () => void;
};

function OptionsMenu({ options, onClose }: { options: MenuOption[]; onClose: () => void }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={om.overlay}>
          <TouchableWithoutFeedback>
            <View style={om.sheet}>
              <TouchableOpacity style={om.closeRow} onPress={onClose}>
                <Ionicons name="close" size={20} color={TEXT_MUTED} />
                <Text style={om.closeLabel}>Fermer</Text>
              </TouchableOpacity>
              <View style={om.divider} />
              {options.map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={om.item}
                  onPress={() => { onClose(); setTimeout(opt.onPress, 150); }}
                >
                  <Ionicons name={opt.icon as any} size={20} color={opt.color || TEXT} />
                  <Text style={[om.itemLabel, opt.color ? { color: opt.color } : {}]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const om = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-start', alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 90 : 70, paddingRight: 12,
  },
  sheet: {
    backgroundColor: '#FFF', borderRadius: 14, minWidth: 240,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
    overflow: 'hidden',
  },
  closeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  closeLabel: { fontSize: 15, color: TEXT_MUTED, fontWeight: '500' },
  divider: { height: 1, backgroundColor: BORDER },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  itemLabel: { fontSize: 15, fontWeight: '500', color: TEXT },
});

function AttachmentMenu({
  visible,
  onClose,
  onPhoto,
  onVideo,
  onPDF,
}: any) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={attach.overlay}>
          <TouchableWithoutFeedback>
            <View style={attach.sheet}>

              <Text style={attach.title}>
                Joindre un fichier
              </Text>

              <View style={attach.row}>

                <TouchableOpacity
                  style={attach.item}
                  onPress={onPhoto}
                >
                  <View style={[attach.circle,{backgroundColor:'#25D366'}]}>
                    <Ionicons
                      name="image"
                      size={26}
                      color="#FFF"
                    />
                  </View>

                  <Text style={attach.label}>
                    Photo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={attach.item}
                  onPress={onVideo}
                >
                  <View style={[attach.circle,{backgroundColor:'#5E5CE6'}]}>
                    <Ionicons
                      name="videocam"
                      size={26}
                      color="#FFF"
                    />
                  </View>

                  <Text style={attach.label}>
                    Vidéo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={attach.item}
                  onPress={onPDF}
                >
                  <View style={[attach.circle,{backgroundColor:'#FF3B30'}]}>
                    <Ionicons
                      name="document-text"
                      size={26}
                      color="#FFF"
                    />
                  </View>

                  <Text style={attach.label}>
                    PDF
                  </Text>
                </TouchableOpacity>

              </View>

            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── Emojis ────────────────────────────────────────────────────────────────────
const EMOJIS = [
  '😀','😂','😍','🙏','👍','👏','🎉','❤️',
  '🔥','😢','😮','🤔','👋','✅','📚','✏️',
  '⏰','💡','🙌','😅',
];

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function StudentChatConversation({ route, navigation }: Props) {
  const { conversationId, title = 'Conversation', otherMemberId } = route.params;

  const [messages,    setMessages]    = useState<Message[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [inputText,   setInputText]   = useState('');
  const [sending,     setSending]     = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [isOnline,    setIsOnline]    = useState(false);
  const [isTyping,    setIsTyping]    = useState(false);
  const [myId,        setMyId]        = useState<string | null>(null);
  const [profPhoto,   setProfPhoto]   = useState<string | null>(null);

  const [menuVisible,   setMenuVisible]   = useState(false);
  const [searchActive,  setSearchActive]  = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [emojiVisible,  setEmojiVisible]  = useState(false);

  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null);
  const [pdfViewer, setPdfViewer] = useState<{ url: string; name: string } | null>(null);
  const [videoViewerUrl, setVideoViewerUrl] = useState<string | null>(null);

  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<string>>(new Set());
  const isSelectingMsgs = selectedMsgIds.size > 0;

  const [reportedByMe, setReportedByMe] = useState<Set<string>>(new Set());

  const audioRecorder  = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState  = useAudioRecorderState(audioRecorder, 200);
  const recordingActiveRef    = useRef(false);
  const recordingCancelledRef = useRef(false);

  const flatRef     = useRef<FlatList>(null);
  const socketRef   = useRef<Socket | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [attachVisible,setAttachVisible] = useState(false);

  // ── Fetch messages ──────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    try {
      const { data } = await api.get(`/chat/${conversationId}/messages`);
      setMessages(data.messages || []);
      await api.patch(`/chat/${conversationId}/read-all`).catch(() => {});
      const first = (data.messages || []).find(
        (m: Message) => m.sender && m.sender.id !== myId
      );
      if (first?.sender?.photo) setProfPhoto(first.sender.photo);
    } catch {}
    finally { setLoading(false); }
  }, [conversationId, myId]);

  useEffect(() => {
    api.get('/auth/me')
      .then(({ data }) => setMyId(data.user?.id || data.id || null))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    if (messages.length > 0)
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages.length]);

  // ── Socket.io ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const token =
      (api.defaults?.headers?.common?.['Authorization'] as string)
        ?.replace('Bearer ', '') || '';
    const socket: Socket = io(API_BASE, {
      auth: { token }, transports: ['websocket'], reconnection: true,
    });
    socketRef.current = socket;
    socket.emit('join_conversation', { conversationId });

    socket.on('new_message', (msg: Message) => {
      if (msg.conversationId !== conversationId) return;
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
      if (msg.senderId !== myId)
        api.patch(`/chat/messages/${msg.id}/read`).catch(() => {});
    });
    socket.on('typing', (p: { userId: string; conversationId: string }) => {
      if (p.conversationId !== conversationId || p.userId === myId) return;
      setIsTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setIsTyping(false), 3000);
    });
    socket.on('messages_read', (p: { conversationId: string }) => {
      if (p.conversationId !== conversationId) return;
      setMessages(prev =>
        prev.map(m => m.senderId === myId ? { ...m, isRead: true } : m)
      );
    });
    socket.on('message_deleted', (payload: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m.id !== payload.messageId));
    });
    socket.on('online_users', (ids: string[]) => {
      if (otherMemberId) setIsOnline(ids.includes(otherMemberId));
    });
    socket.on('user_online',  (uid: string) => { if (uid === otherMemberId) setIsOnline(true); });
    socket.on('user_offline', (uid: string) => { if (uid === otherMemberId) setIsOnline(false); });

    return () => {
      socket.emit('leave_conversation', { conversationId });
      socket.disconnect();
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [conversationId, myId, otherMemberId]);

  const emitTyping = () => socketRef.current?.emit('typing', { conversationId });

  // ── Envoyer texte ───────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setSending(true); setInputText('');
    try {
      const { data } = await api.post('/chat/messages', { conversationId, content: text });
      setMessages(prev =>
        prev.find(m => m.id === data.data?.id) ? prev : [...prev, data.data]
      );
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message || "Impossible d'envoyer.");
      setInputText(text);
    } finally { setSending(false); }
  };

  // ── Upload générique ────────────────────────────────────────────────────────
  const uploadFile = async (form: FormData) => {
    setUploading(true);
    try {
      const { data } = await api.post('/chat/messages/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.message)
        setMessages(prev =>
          prev.find(m => m.id === data.message.id) ? prev : [...prev, data.message]
        );
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message || "Impossible d'envoyer le fichier.");
    } finally { setUploading(false); }
  };

  // ── Envoyer image ───────────────────────────────────────────────────────────
  const sendImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Accès galerie nécessaire.'); return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const form = new FormData();
    form.append('conversationId', conversationId);
    form.append('file', {
      uri: asset.uri,
      name: asset.fileName || 'photo.jpg',
      type: asset.mimeType || 'image/jpeg',
    } as any);
    await uploadFile(form);
  };

  // ── Envoyer vidéo ───────────────────────────────────────────────────────────
  const sendVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Accès galerie nécessaire.'); return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const form = new FormData();
    form.append('conversationId', conversationId);
    form.append('file', {
      uri: asset.uri,
      name: asset.fileName || 'video.mp4',
      type: asset.mimeType || 'video/mp4',
    } as any);
    await uploadFile(form);
  };

  // ── Envoyer PDF ─────────────────────────────────────────────────────────────
  const sendPDF = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf', copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const form = new FormData();
    form.append('conversationId', conversationId);
    form.append('file', {
      uri: asset.uri,
      name: asset.name || 'document.pdf',
      type: 'application/pdf',
    } as any);
    await uploadFile(form);
  };

  const showAttachment = () =>
    Alert.alert('Joindre un fichier', '', [
      { text: '📷 Photo', onPress: sendImage },
      { text: '🎬 Vidéo', onPress: sendVideo },
      { text: '📎 Document PDF', onPress: sendPDF },
      { text: 'Annuler', style: 'cancel' },
    ]);

  // ── Suppression messages sélectionnés ──────────────────────────────────────
  const deleteSelectedMessages = () => {
    const count = selectedMsgIds.size;
    Alert.alert(
      `Supprimer ${count} message${count > 1 ? 's' : ''}`,
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            const ids = [...selectedMsgIds];
            setSelectedMsgIds(new Set());
            setMessages(prev => prev.filter(m => !ids.includes(m.id)));
            try {
              await Promise.all(ids.map(id => api.delete(`/chat/messages/${id}`)));
            } catch { fetchMessages(); }
          },
        },
      ]
    );
  };

  // ── Vider la conversation ───────────────────────────────────────────────────
  const clearConversation = () => {
    Alert.alert(
      'Vider la conversation',
      'Tous vos messages seront supprimés définitivement.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/chat/${conversationId}/clear`);
              setMessages([]);
            } catch {
              Alert.alert('Erreur', 'Impossible de vider la conversation.');
            }
          },
        },
      ]
    );
  };

  // ── Signaler / Désignaler ───────────────────────────────────────────────────
  const toggleReport = () => {
    if (!otherMemberId) return;
    const alreadyReported = reportedByMe.has(otherMemberId);
    Alert.alert(
      alreadyReported ? 'Retirer le signalement' : 'Signaler ce profil',
      alreadyReported
        ? 'Voulez-vous retirer votre signalement contre ce professeur ?'
        : 'Voulez-vous signaler ce professeur à un administrateur ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: alreadyReported ? 'Retirer' : 'Signaler',
          style: alreadyReported ? 'default' : 'destructive',
          onPress: async () => {
            try {
              if (alreadyReported) {
                await api.post(`/chat/users/${otherMemberId}/unreport`);
                setReportedByMe(prev => { const n = new Set(prev); n.delete(otherMemberId); return n; });
                Alert.alert('Retiré', 'Votre signalement a été retiré.');
              } else {
                await api.post(`/chat/users/${otherMemberId}/report`);
                setReportedByMe(prev => new Set(prev).add(otherMemberId));
                Alert.alert('Signalé', 'Le profil a été signalé à un administrateur.');
              }
            } catch {
              Alert.alert('Erreur', "L'opération a échoué.");
            }
          },
        },
      ]
    );
  };

  // ── Items du menu ⋮ ─────────────────────────────────────────────────────────
  const menuOptions: MenuOption[] = [
    {
      icon: 'search-outline',
      label: 'Rechercher',
      onPress: () => { setSearchActive(true); setSearchQuery(''); },
    },
    {
      icon: 'trash-outline',
      label: 'Vider la conversation',
      color: DANGER,
      onPress: clearConversation,
    },
    {
      icon: reportedByMe.has(otherMemberId || '') ? 'flag' : 'flag-outline',
      label: reportedByMe.has(otherMemberId || '')
        ? '✅ Retirer le signalement'
        : 'Signaler ce profil',
      color: reportedByMe.has(otherMemberId || '') ? TEXT_MUTED : DANGER,
      onPress: toggleReport,
    },
  ];

  // ── Vocal ───────────────────────────────────────────────────────────────────
  const startRecording = async () => {
  try {
    const perm = await AudioModule.requestRecordingPermissionsAsync();

    if (!perm.granted) {
      Alert.alert('Permission requise', 'Accès micro nécessaire.');
      return;
    }

    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true,
    });

    await audioRecorder.prepareToRecordAsync();

    audioRecorder.record();

    recordingCancelledRef.current = false;
    recordingActiveRef.current = true;

  } catch {
    Alert.alert(
      'Erreur',
      "Impossible de démarrer l'enregistrement."
    );
  }
};
const stopRecordingAndSend = async () => {
  try {
    await audioRecorder.stop();

    recordingActiveRef.current = false;

    const uri = audioRecorder.uri;

    const secs = Math.round(
      (recorderState.durationMillis || 0) / 1000
    );

    if (!uri || secs < 1) return;

    const form = new FormData();

    form.append('conversationId', conversationId);
    form.append('duration', String(secs));

    form.append('file', {
      uri,
      name: `voice-${Date.now()}.m4a`,
      type: 'audio/m4a',
    } as any);

    await uploadFile(form);

  } catch {
    Alert.alert(
      'Erreur',
      "Impossible d'envoyer le message vocal."
    );
  }
};

  const cancelRecording = () => {
    recordingCancelledRef.current = true;
    finishRecording();
  };

  const finishRecording = async () => {
    if (!recordingActiveRef.current) return;
    recordingActiveRef.current = false;
    const wasCancelled = recordingCancelledRef.current;
    const secs = Math.round((recorderState.durationMillis || 0) / 1000);
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      await setAudioModeAsync({ allowsRecording: false });
      if (wasCancelled || !uri || secs < 1) return;
      const form = new FormData();
      form.append('conversationId', conversationId);
      form.append('duration', String(secs));
      form.append('file', { uri, name: `voice-${Date.now()}.m4a`, type: 'audio/m4a' } as any);
      await uploadFile(form);
    } catch { Alert.alert('Erreur', "Impossible d'envoyer le message vocal."); }
  };

  // ── Sélection messages ──────────────────────────────────────────────────────
  const toggleMsgSelect = (id: string) => {
    setSelectedMsgIds(prev => {
      const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
    });
  };

  // ── List data ───────────────────────────────────────────────────────────────
  const listData = useMemo(() => {
    const src = searchActive && searchQuery.trim()
      ? messages.filter(m =>
          m.content?.toLowerCase().includes(searchQuery.trim().toLowerCase())
        )
      : messages;

    const items: Array<{ type: 'sep'; date: string } | { type: 'msg'; msg: Message }> = [];
    src.forEach((msg, idx) => {
      const prev = src[idx - 1];
      if (!prev || !sameDay(prev.createdAt, msg.createdAt))
        items.push({ type: 'sep', date: msg.createdAt });
      items.push({ type: 'msg', msg });
    });
    return items;
  }, [messages, searchActive, searchQuery]);

  const canSend = inputText.trim().length > 0 && !sending;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={ms.container}>
      <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />

      {imageViewerUrl && (
        <ImageViewer uri={imageViewerUrl} onClose={() => setImageViewerUrl(null)} />
      )}
      {videoViewerUrl && (
        <VideoViewer uri={videoViewerUrl} onClose={() => setVideoViewerUrl(null)} />
      )}
      {pdfViewer && (
        <PDFViewer
          url={pdfViewer.url}
          name={pdfViewer.name}
          onClose={() => setPdfViewer(null)}
        />
      )}

      {/* ── Header ── */}
      <View style={ms.header}>
        {isSelectingMsgs ? (
          <>
            <TouchableOpacity onPress={() => setSelectedMsgIds(new Set())} style={{ padding: 8 }}>
              <Ionicons name="close" size={22} color={TEXT} />
            </TouchableOpacity>
            <Text style={ms.headerTitle}>
              {selectedMsgIds.size} sélectionné{selectedMsgIds.size > 1 ? 's' : ''}
            </Text>
            <TouchableOpacity onPress={deleteSelectedMessages} style={{ padding: 8, marginLeft: 8 }}>
              <Ionicons name="trash-outline" size={22} color={DANGER} />
            </TouchableOpacity>
          </>
        ) : searchActive ? (
          <>
            <TouchableOpacity
              onPress={() => { setSearchActive(false); setSearchQuery(''); }}
              style={{ padding: 8 }}
            >
              <Ionicons name="arrow-back" size={22} color={TEXT} />
            </TouchableOpacity>
            <View style={ms.searchBar}>
              <TextInput
                autoFocus
                style={ms.searchInput}
                placeholder="Rechercher…"
                placeholderTextColor={TEXT_MUTED}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close" size={16} color={TEXT_MUTED} />
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={navigation.goBack} style={{ padding: 6 }}>
              <Ionicons name="arrow-back" size={22} color={TEXT} />
            </TouchableOpacity>
            <View style={ms.headerAvatarWrap}>
              {profPhoto ? (
                <Image source={{ uri: profPhoto }} style={ms.headerAvatar} />
              ) : (
                <View style={ms.headerAvatarFallback}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT_MUTED }}>
                    {title.charAt(title.lastIndexOf(' ') + 1)?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
              {isOnline && <View style={ms.onlineDot} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ms.headerTitle} numberOfLines={1}>{title}</Text>
              <Text style={isTyping ? ms.typingText : ms.statusText}>
                {isTyping ? "en train d'écrire…" : isOnline ? 'en ligne' : ''}
              </Text>
            </View>
            <TouchableOpacity style={{ padding: 8 }} onPress={() => setMenuVisible(true)}>
              <Ionicons name="ellipsis-vertical" size={20} color={TEXT_MUTED} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ── Messages ── */}
      {loading ? (
        <View style={ms.loading}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={listData}
          keyExtractor={(item, idx) =>
            item.type === 'sep'
              ? `sep-${item.date}-${idx}`
              : item.msg.id || String(idx)
          }
          contentContainerStyle={ms.msgList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            if (!searchActive) flatRef.current?.scrollToEnd({ animated: false });
          }}
          ListEmptyComponent={
            <View style={ms.empty}>
              <Ionicons
                name={searchActive ? 'search-outline' : 'chatbubble-ellipses-outline'}
                size={40}
                color={TEXT_MUTED}
              />
              <Text style={ms.emptyTitle}>
                {searchActive ? 'Aucun résultat' : 'Aucun message'}
              </Text>
              <Text style={ms.emptyText}>
                {searchActive
                  ? `Rien pour "${searchQuery}"`
                  : 'Dites bonjour à votre professeur 👋'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            if (item.type === 'sep') {
              return (
                <View style={ms.dateSep}>
                  <View style={ms.datePill}>
                    <Text style={ms.dateText}>{fmtDateSep(item.date)}</Text>
                  </View>
                </View>
              );
            }
            const msg = item.msg;
            const isMine = msg.senderId === myId;
            const idx = messages.findIndex(m => m.id === msg.id);
            const prevMsg = messages[idx - 1];
            const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId || searchActive;
            const selected = selectedMsgIds.has(msg.id);

            return (
              <Bubble
                msg={msg}
                isMine={isMine}
                showAvatar={showAvatar}
                selected={selected}
                onLongPress={() => toggleMsgSelect(msg.id)}
                onPress={() => { if (isSelectingMsgs) toggleMsgSelect(msg.id); }}
                onImagePress={(url) => setImageViewerUrl(url)}
                onVideoPress={(url) => setVideoViewerUrl(url)}
                onPDFPress={(url, name) => setPdfViewer({ url, name })}
              />
            );
          }}
        />
      )}

      {/* ── Upload bar ── */}
      {uploading && (
        <View style={ms.uploadBar}>
          <ActivityIndicator size="small" color={PRIMARY} />
          <Text style={ms.uploadText}>Envoi en cours…</Text>
        </View>
      )}

      {/* ── Bandeau enregistrement vocal ── */}
      {recorderState.isRecording && (
        <View style={ms.recBar}>
          <View style={ms.recDot} />
          <Text style={ms.recText}>
            {fmtDur(Math.round((recorderState.durationMillis || 0) / 1000))} Enregistrement…
          </Text>
          <TouchableOpacity onPress={cancelRecording} style={{ paddingHorizontal: 12 }}>
            <Text style={{ color: DANGER, fontWeight: '700' }}>Annuler</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Panel emoji ── */}
      {emojiVisible && (
        <View style={ms.emojiPanel}>
          <View style={ms.emojiGrid}>
            {EMOJIS.map((e, i) => (
              <TouchableOpacity
                key={i} style={ms.emojiBtn}
                onPress={() => setInputText(t => t + e)}
              >
                <Text style={{ fontSize: 24 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── Input bar ── */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={ms.inputBar}>
          {/* Trombone à gauche */}
          <TouchableOpacity style={ms.inputAction} onPress={() => setAttachVisible(true)}>
            <Ionicons name="attach" size={24} color={TEXT_MUTED} />
          </TouchableOpacity>

          {/* Champ texte */}
          <TextInput
            style={ms.input}
            placeholder="Écrire un message..."
            placeholderTextColor={TEXT_MUTED}
            value={inputText}
            onChangeText={t => { setInputText(t); emitTyping(); }}
            multiline
            maxLength={2000}
          />

          {/* Smiley */}
          <TouchableOpacity
  style={ms.inputAction}
  onPress={() => setAttachVisible(true)}
>
            <Ionicons
              name="happy-outline"
              size={24}
              color={emojiVisible ? PRIMARY : TEXT_MUTED}
            />
          </TouchableOpacity>

          {/* Bouton send / micro — rond vert comme dans l'image */}
          <TouchableOpacity
  style={[
    ms.sendBtn,
    ms.sendBtnActive,
    recorderState.isRecording && ms.sendBtnRec,
  ]}
  disabled={sending}
  onPress={() => {

  if (canSend) {
    sendMessage();
    return;
  }

  if (recorderState.isRecording) {
    stopRecordingAndSend();
    return;
  }

  startRecording();
}}
>
            {sending ? (
  <ActivityIndicator size="small" color="#FFF" />
) : canSend ? (
  <Ionicons
    name="send"
    size={19}
    color="#FFF"
  />
) : recorderState.isRecording ? (
  <Ionicons
    name="send"
    size={19}
    color="#FFF"
  />
) : (
  <Ionicons
    name="mic"
    size={22}
    color="#FFF"
  />
)}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

<AttachmentMenu
  visible={attachVisible}
  onClose={() => setAttachVisible(false)}
  onPhoto={() => {
    setAttachVisible(false);
    sendImage();
  }}
  onVideo={() => {
    setAttachVisible(false);
    sendVideo();
  }}
  onPDF={() => {
    setAttachVisible(false);
    sendPDF();
  }}
/>
      {/* ── Menu options ── */}
      {menuVisible && (
        <OptionsMenu
          options={menuOptions}
          onClose={() => setMenuVisible(false)}
        />
      )}
    </View>
  );
}


const attach = StyleSheet.create({

  overlay:{
    flex:1,
    justifyContent:'flex-end',
    backgroundColor:'rgba(0,0,0,0.35)',
  },

  sheet:{
    backgroundColor:'#FFF',
    borderTopLeftRadius:28,
    borderTopRightRadius:28,
    paddingTop:20,
    paddingBottom:35,
    paddingHorizontal:20,
  },

  title:{
    textAlign:'center',
    fontSize:16,
    fontWeight:'700',
    marginBottom:25,
    color:'#111',
  },

  row:{
    flexDirection:'row',
    justifyContent:'space-around',
  },

  item:{
    alignItems:'center',
  },

  circle:{
    width:65,
    height:65,
    borderRadius:32.5,
    alignItems:'center',
    justifyContent:'center',
    marginBottom:10,
  },

  label:{
    fontSize:13,
    fontWeight:'600',
    color:'#444',
  },

});
// ─── Styles ────────────────────────────────────────────────────────────────────
const ms = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingHorizontal: 12, paddingBottom: 10,
    backgroundColor: SURFACE,
    borderBottomWidth: 1, borderBottomColor: BORDER,
    gap: 8,
  },
  headerAvatarWrap: { position: 'relative' },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerAvatarFallback: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: SURFACE2, alignItems: 'center', justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: ONLINE, borderWidth: 2, borderColor: SURFACE,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  typingText: { fontSize: 12, color: PRIMARY, fontStyle: 'italic' },
  statusText: { fontSize: 12, color: TEXT_MUTED },

  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: SURFACE2, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  searchInput: { flex: 1, fontSize: 14, color: TEXT },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  msgList: { paddingVertical: 10, paddingHorizontal: 0, flexGrow: 1 },

  // Séparateur de date — pill gris clair centré
  dateSep: { alignItems: 'center', marginVertical: 12 },
  datePill: {
    backgroundColor: 'rgba(225,245,254,0.92)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  dateText: { fontSize: 12, color: '#555', fontWeight: '500' },

  empty: { alignItems: 'center', paddingTop: 80, gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: TEXT },
  emptyText: { fontSize: 13, color: TEXT_MUTED, textAlign: 'center', lineHeight: 20 },

  uploadBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: SURFACE,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  uploadText: { fontSize: 13, color: PRIMARY },

  recBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#FFF5F5', borderTopWidth: 1, borderTopColor: '#F8D7DA',
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: DANGER },
  recText: { flex: 1, fontSize: 13, color: DANGER, fontWeight: '600' },

  emojiPanel: {
    maxHeight: 160, backgroundColor: SURFACE,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 2 },
  emojiBtn: {
    width: 44, height: 44, alignItems: 'center',
    justifyContent: 'center', borderRadius: 8,
  },

  // Barre de saisie — comme dans l'image
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: SURFACE,
    paddingHorizontal: 8, paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    gap: 6, borderTopWidth: 1, borderTopColor: BORDER,
  },
  inputAction: {
    width: 38, height: 38, alignItems: 'center', justifyContent: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: SURFACE2,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 9,
    fontSize: 15,
    color: TEXT,
    maxHeight: 120,
    minHeight: 42,
  },
  // Bouton micro/send — rond vert comme dans l'image
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: PRIMARY, // toujours vert comme dans l'image
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  sendBtnActive: { backgroundColor: PRIMARY },
  sendBtnRec: { backgroundColor: DANGER },
});