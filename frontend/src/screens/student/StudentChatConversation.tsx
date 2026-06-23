/**
 * StudentChatConversation.tsx — Style WhatsApp sombre
 * - Bulles style WhatsApp (vert foncé envoyés / surface reçus)
 * - Mode sélection de messages : appui long → sélectionner → supprimer/transférer
 * - Header : statut en ligne, avatar, menu contextuel
 * - Input : pièce jointe + emoji + vocal (appui long)
 * - PDF card, image, audio inline
 */

import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
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
  useAudioPlayer, useAudioPlayerStatus,
  useAudioRecorder, useAudioRecorderState,
  RecordingPresets, AudioModule, setAudioModeAsync,
} from 'expo-audio';
import { io, Socket } from 'socket.io-client';
import api from '../../services/auth.service';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const PRIMARY       = '#0D6B5E';
const PRIMARY_LIGHT = '#E6F3F1';
const BG            = '#FFFFFF';
const SURFACE       = '#FFFFFF';
const SURFACE2      = '#F0F2F5';
const BUBBLE_SENT   = '#0D6B5E'; // vert envoyé
const BUBBLE_RECV   = '#FFFFFF'; // blanc reçu
const TEXT          = '#111B21';
const TEXT_MUTED    = '#667781';
const BORDER        = '#E9EDEF';
const ONLINE        = '#0D6B5E';
const DANGER        = '#DC3545';
const TICK_READ     = '#0D6B5E';
const API_BASE      = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

type FileType = 'TEXT' | 'IMAGE' | 'PDF' | 'AUDIO';

type Sender = {
  id: string; nom: string; prenom: string; photo?: string | null;
};

type Message = {
  id: string; conversationId: string; senderId: string;
  content: string; fileType: FileType;
  fileUrl?: string | null; fileSize?: number | null; fileDuration?: number | null;
  isRead: boolean; createdAt: string; sender?: Sender;
};

type Props = {
  route: { params: { conversationId: string; title?: string; otherMemberId?: string } };
  navigation: { goBack: () => void; setOptions: (o: any) => void };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtTime = (d: string) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const fmtDateSep = (d: string) => {
  const date = new Date(d); const now = new Date();
  const yd = new Date(now); yd.setDate(now.getDate() - 1);
  if (date.toDateString() === now.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === yd.toDateString()) return 'Hier';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};
const sameDay = (a: string, b: string) => new Date(a).toDateString() === new Date(b).toDateString();
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

const EMOJIS = ['😀','😂','😍','🙏','👍','👏','🎉','❤️','🔥','😢','😮','🤔','👋','✅','📚','✏️','⏰','💡','🙌','😅','😴','🥳','📌','❓'];

// ─── Audio Bubble ─────────────────────────────────────────────────────────────
function AudioBubble({ uri, isMine, fallbackDuration }: { uri: string; isMine: boolean; fallbackDuration?: number | null }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const toggle = () => {
    try {
      if (status.playing) { player.pause(); }
      else { if (status.didJustFinish) player.seekTo(0); player.play(); }
    } catch {}
  };
  const secs = status.playing || status.currentTime > 0 ? status.currentTime : (status.duration || fallbackDuration || 0);
  return (
    <View style={ab.row}>
      <TouchableOpacity
        onPress={toggle}
        style={[ab.btn, { backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : PRIMARY_LIGHT }]}
      >
        <Ionicons name={status.playing ? 'pause' : 'play'} size={18} color={isMine ? '#FFF' : PRIMARY} />
      </TouchableOpacity>
      <View style={ab.wave}>
        {Array.from({ length: 18 }).map((_, i) => (
          <View key={i} style={[ab.bar, { height: 5 + (i % 4) * 4, backgroundColor: isMine ? 'rgba(255,255,255,0.5)' : PRIMARY }]} />
        ))}
      </View>
      <Text style={[ab.dur, { color: isMine ? 'rgba(255,255,255,0.7)' : TEXT_MUTED }]}>{fmtDur(secs)}</Text>
    </View>
  );
}
const ab = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 160 },
  btn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  wave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 24 },
  bar: { width: 3, borderRadius: 2 },
  dur: { fontSize: 11, minWidth: 34, textAlign: 'right' },
});

// ─── Bubble ───────────────────────────────────────────────────────────────────
function Bubble({ msg, isMine, showAvatar, selected, onLongPress, onPress }: {
  msg: Message; isMine: boolean; showAvatar: boolean;
  selected: boolean; onLongPress: () => void; onPress: () => void;
}) {
  const fullUrl = msg.fileUrl ? `${API_BASE}${msg.fileUrl}` : null;

  return (
    <TouchableOpacity
      onLongPress={onLongPress}
      onPress={onPress}
      activeOpacity={0.75}
      style={[bs.row, isMine && bs.rowMine, selected && bs.rowSelected]}
    >
      {!isMine && (
        <View style={bs.avatarSlot}>
          {showAvatar ? (
            msg.sender?.photo ? (
              <Image source={{ uri: msg.sender.photo }} style={bs.avatar} />
            ) : (
              <View style={bs.avatarFallback}>
                <Text style={bs.avatarInitial}>{msg.sender?.prenom?.[0]?.toUpperCase() || '?'}</Text>
              </View>
            )
          ) : null}
        </View>
      )}

      <View style={{ maxWidth: '78%' }}>
        <View style={[bs.bubble, isMine ? bs.bubbleMine : bs.bubbleRecv]}>
          {msg.fileType === 'IMAGE' && fullUrl ? (
            <TouchableOpacity onPress={() => Linking.openURL(fullUrl)}>
              <Image source={{ uri: fullUrl }} style={bs.img} resizeMode="cover" />
            </TouchableOpacity>
          ) : msg.fileType === 'AUDIO' && fullUrl ? (
            <AudioBubble uri={fullUrl} isMine={isMine} fallbackDuration={msg.fileDuration} />
          ) : msg.fileType === 'PDF' && fullUrl ? (
            <TouchableOpacity style={bs.pdfRow} onPress={() => Linking.openURL(fullUrl)}>
              <View style={bs.pdfIcon}>
                <Ionicons name="document-text" size={22} color={isMine ? '#FFFFFFCC' : DANGER} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[bs.pdfName, isMine && { color: '#FFF' }]} numberOfLines={2}>{msg.content}</Text>
                <Text style={[bs.pdfMeta, isMine && { color: '#FFFFFF77' }]}>PDF{msg.fileSize ? ` • ${fmtSize(msg.fileSize)}` : ''}</Text>
              </View>
              <Ionicons name="download-outline" size={18} color={isMine ? '#FFFFFF77' : TEXT_MUTED} />
            </TouchableOpacity>
          ) : (
            <Text style={[bs.text, isMine && { color: '#FFF' }]}>{msg.content}</Text>
          )}

          {/* Heure + coches */}
          <View style={[bs.meta, isMine && bs.metaMine]}>
            <Text style={isMine ? bs.timeMine : bs.timeRecv}>{fmtTime(msg.createdAt)}</Text>
            {isMine && (
              <Ionicons
                name={msg.isRead ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={msg.isRead ? '#FFFFFF' : 'rgba(255,255,255,0.6)'}
                style={{ marginLeft: 3 }}
              />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const bs = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 2, alignItems: 'flex-end', paddingHorizontal: 12 },
  rowMine: { justifyContent: 'flex-end' },
  rowSelected: { backgroundColor: '#D9EDE9' },
  avatarSlot: { width: 30, marginRight: 6, alignItems: 'center', justifyContent: 'flex-end' },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarFallback: { width: 28, height: 28, borderRadius: 14, backgroundColor: SURFACE2, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 10, fontWeight: '700', color: TEXT_MUTED },
  bubble: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6, borderRadius: 18 },

  bubbleMine: { backgroundColor: BUBBLE_SENT, borderBottomRightRadius: 4 },
  bubbleRecv: {
    backgroundColor: BUBBLE_RECV, borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  text: { fontSize: 15, color: TEXT, lineHeight: 22 },
  img: { width: 220, height: 160, borderRadius: 10 },
  pdfRow: { flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: 240 },
  pdfIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  pdfName: { fontSize: 13, fontWeight: '600', color: TEXT },
  pdfMeta: { fontSize: 11, color: TEXT_MUTED, marginTop: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  metaMine: { justifyContent: 'flex-end' },
  timeMine: { fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  timeRecv: { fontSize: 11, color: TEXT_MUTED },
});

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function StudentChatConversation({ route, navigation }: Props) {
  const { conversationId, title = 'Conversation', otherMemberId } = route.params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [profPhoto, setProfPhoto] = useState<string | null>(null);

  const [infoVisible, setInfoVisible] = useState(false);
  const [emojiVisible, setEmojiVisible] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifMuted, setNotifMuted] = useState(false);

  // ── Sélection de messages ──
  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<string>>(new Set());
  const isSelectingMsgs = selectedMsgIds.size > 0;

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 200);
  const recordingActiveRef = useRef(false);
  const recordingCancelledRef = useRef(false);

  const flatRef = useRef<FlatList>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const { data } = await api.get(`/chat/${conversationId}/messages`);
      setMessages(data.messages || []);
      await api.patch(`/chat/${conversationId}/read-all`).catch(() => {});
      const first = (data.messages || []).find((m: Message) => m.sender && m.sender.id !== myId);
      if (first?.sender?.photo) setProfPhoto(first.sender.photo);
    } catch {} finally { setLoading(false); }
  }, [conversationId, myId]);

  useEffect(() => {
    api.get('/auth/me').then(({ data }) => setMyId(data.user?.id || data.id || null)).catch(() => {});
  }, []);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages.length]);

  useEffect(() => {
    const token = (api.defaults?.headers?.common?.['Authorization'] as string)?.replace('Bearer ', '') || '';
    const socket: Socket = io(API_BASE, { auth: { token }, transports: ['websocket'], reconnection: true });
    socketRef.current = socket;
    socket.emit('join_conversation', { conversationId });

    socket.on('new_message', (msg: Message) => {
      if (msg.conversationId !== conversationId) return;
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
      if (msg.senderId !== myId) api.patch(`/chat/messages/${msg.id}/read`).catch(() => {});
    });
    socket.on('typing', (p: { userId: string; conversationId: string }) => {
      if (p.conversationId !== conversationId || p.userId === myId) return;
      setIsTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setIsTyping(false), 3000);
    });
    socket.on('messages_read', (p: { conversationId: string }) => {
      if (p.conversationId !== conversationId) return;
      setMessages(prev => prev.map(m => m.senderId === myId ? { ...m, isRead: true } : m));
    });
    socket.on('online_users', (ids: string[]) => { if (otherMemberId) setIsOnline(ids.includes(otherMemberId)); });
    socket.on('user_online', (uid: string) => { if (uid === otherMemberId) setIsOnline(true); });
    socket.on('user_offline', (uid: string) => { if (uid === otherMemberId) setIsOnline(false); });

    return () => { socket.emit('leave_conversation', { conversationId }); socket.disconnect(); if (typingTimer.current) clearTimeout(typingTimer.current); };
  }, [conversationId, myId, otherMemberId]);

  const emitTyping = () => socketRef.current?.emit('typing', { conversationId });

  // ── Envoyer ──
  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setSending(true); setInputText('');
    try {
      const { data } = await api.post('/chat/messages', { conversationId, content: text });
      setMessages(prev => prev.find(m => m.id === data.data?.id) ? prev : [...prev, data.data]);
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message || "Impossible d'envoyer."); setInputText(text);
    } finally { setSending(false); }
  };

  const sendImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission requise', "Accès galerie nécessaire."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const form = new FormData();
      form.append('conversationId', conversationId);
      form.append('file', { uri: asset.uri, name: asset.fileName || 'photo.jpg', type: asset.mimeType || 'image/jpeg' } as any);
      const { data } = await api.post('/chat/messages/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (data.message) setMessages(prev => prev.find(m => m.id === data.message.id) ? prev : [...prev, data.message]);
    } catch (e: any) { Alert.alert('Erreur', e?.response?.data?.message || "Impossible d'envoyer l'image."); }
    finally { setUploading(false); }
  };

  const sendPDF = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const form = new FormData();
      form.append('conversationId', conversationId);
      form.append('file', { uri: asset.uri, name: asset.name || 'document.pdf', type: 'application/pdf' } as any);
      const { data } = await api.post('/chat/messages/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (data.message) setMessages(prev => prev.find(m => m.id === data.message.id) ? prev : [...prev, data.message]);
    } catch (e: any) { Alert.alert('Erreur', e?.response?.data?.message || "Impossible d'envoyer le fichier."); }
    finally { setUploading(false); }
  };

  const showAttachment = () => Alert.alert('Joindre', '', [
    { text: '📷 Photo', onPress: sendImage },
    { text: '📎 Document PDF', onPress: sendPDF },
    { text: 'Annuler', style: 'cancel' },
  ]);

  // ── Sélection de messages ──
  const toggleMsgSelect = (id: string) => {
    setSelectedMsgIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const deleteSelectedMessages = () => {
    Alert.alert(
      `Supprimer ${selectedMsgIds.size} message${selectedMsgIds.size > 1 ? 's' : ''}`,
      'Action irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            const ids = [...selectedMsgIds];
            setSelectedMsgIds(new Set());
            setMessages(prev => prev.filter(m => !ids.includes(m.id)));
            try { await Promise.all(ids.map(id => api.delete(`/chat/messages/${id}`))); }
            catch { fetchMessages(); }
          },
        },
      ]
    );
  };

  // ── Vocal ──
  const startRecording = async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission requise', 'Accès micro nécessaire.'); return; }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      recordingCancelledRef.current = false;
      recordingActiveRef.current = true;
    } catch { Alert.alert('Erreur', "Impossible de démarrer l'enregistrement."); }
  };

  const cancelRecording = () => { recordingCancelledRef.current = true; finishRecording(); };

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
      setUploading(true);
      const form = new FormData();
      form.append('conversationId', conversationId);
      form.append('duration', String(secs));
      form.append('file', { uri, name: `voice-${Date.now()}.m4a`, type: 'audio/m4a' } as any);
      const { data } = await api.post('/chat/messages/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (data.message) setMessages(prev => prev.find(m => m.id === data.message.id) ? prev : [...prev, data.message]);
    } catch { Alert.alert('Erreur', "Impossible d'envoyer le message vocal."); }
    finally { setUploading(false); }
  };

  // ── Menu ──
  const openMenu = () => Alert.alert('Options', undefined, [
    { text: '🔍 Rechercher', onPress: () => setSearchActive(true) },
    {
      text: notifMuted ? '🔔 Réactiver les notifications' : '🔕 Couper les notifications',
      onPress: async () => {
        const next = !notifMuted; setNotifMuted(next);
        try { await api.patch(`/chat/${conversationId}/mute`, { muted: next }); } catch {}
      },
    },
    { text: '🗑️ Vider la conversation', style: 'destructive',
      onPress: () => Alert.alert('Vider ?', 'Supprimer tous les messages ?', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Vider', style: 'destructive', onPress: async () => {
          try { await api.delete(`/chat/${conversationId}/clear`); } catch {}
          setMessages([]);
        }},
      ]),
    },
    { text: '🚫 Bloquer ce professeur', style: 'destructive',
      onPress: () => Alert.alert('Bloquer ?', '', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Bloquer', style: 'destructive', onPress: async () => {
          if (otherMemberId) try { await api.post(`/chat/${otherMemberId}/block`); } catch {}
          navigation.goBack();
        }},
      ]),
    },
    { text: 'Annuler', style: 'cancel' },
  ]);

  // ── List data ──
  const listData = useMemo(() => {
    const items: Array<{ type: 'sep'; date: string } | { type: 'msg'; msg: Message }> = [];
    messages.forEach((msg, idx) => {
      const prev = messages[idx - 1];
      if (!prev || !sameDay(prev.createdAt, msg.createdAt)) items.push({ type: 'sep', date: msg.createdAt });
      items.push({ type: 'msg', msg });
    });
    return items;
  }, [messages]);

  const displayData = useMemo(() => {
    if (!searchActive) return listData;
    const q = searchQuery.trim().toLowerCase();
    return (q ? messages.filter(m => m.content?.toLowerCase().includes(q)) : messages)
      .map(msg => ({ type: 'msg' as const, msg }));
  }, [searchActive, searchQuery, messages, listData]);

  const canSend = inputText.trim().length > 0 && !sending;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={ms.container}>
      <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />

      {/* ── Header ── */}
      <View style={ms.header}>
        {isSelectingMsgs ? (
          <>
            <TouchableOpacity onPress={() => setSelectedMsgIds(new Set())} style={{ padding: 8 }}>
              <Ionicons name="close" size={22} color={TEXT} />
            </TouchableOpacity>
            <Text style={ms.headerTitle}>{selectedMsgIds.size} sélectionné{selectedMsgIds.size > 1 ? 's' : ''}</Text>
            <TouchableOpacity onPress={deleteSelectedMessages} style={{ padding: 8, marginLeft: 8 }}>
              <Ionicons name="trash-outline" size={22} color={DANGER} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={navigation.goBack} style={{ padding: 6 }}>
              <Ionicons name="arrow-back" size={22} color={TEXT} />
            </TouchableOpacity>

            {searchActive ? (
              <View style={ms.searchBar}>
                <TextInput
                  autoFocus style={ms.searchInput}
                  placeholder="Rechercher…" placeholderTextColor={TEXT_MUTED}
                  value={searchQuery} onChangeText={setSearchQuery}
                />
                <TouchableOpacity onPress={() => { setSearchActive(false); setSearchQuery(''); }}>
                  <Ionicons name="close" size={18} color={TEXT_MUTED} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity style={ms.headerAvatarWrap} onPress={() => setInfoVisible(true)}>
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
                </TouchableOpacity>

                <TouchableOpacity style={{ flex: 1 }} onPress={() => setInfoVisible(true)}>
                  <Text style={ms.headerTitle} numberOfLines={1}>{title}</Text>
                  <Text style={isTyping ? ms.typingText : ms.statusText}>
                    {isTyping ? 'en train d\'écrire…' : isOnline ? 'en ligne' : ''}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ padding: 8 }} onPress={openMenu}>
                  <Ionicons name="ellipsis-vertical" size={20} color={TEXT_MUTED} />
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </View>

      {/* ── Messages ── */}
      {loading ? (
        <View style={ms.loading}><ActivityIndicator size="large" color={PRIMARY} /></View>
      ) : (
        <FlatList
          ref={flatRef}
          data={displayData}
          keyExtractor={(item, idx) => item.type === 'sep' ? `sep-${item.date}` : item.msg.id || String(idx)}
          contentContainerStyle={ms.msgList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => { if (!searchActive) flatRef.current?.scrollToEnd({ animated: false }); }}
          ListEmptyComponent={
            <View style={ms.empty}>
              <Ionicons name={searchActive ? 'search-outline' : 'lock-closed-outline'} size={36} color={TEXT_MUTED} />
              <Text style={ms.emptyTitle}>{searchActive ? 'Aucun message trouvé' : 'Conversation chiffrée'}</Text>
              <Text style={ms.emptyText}>
                {searchActive ? `Rien pour "${searchQuery}"` : 'Les messages sont privés entre vous et votre professeur.'}
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
                msg={msg} isMine={isMine} showAvatar={showAvatar}
                selected={selected}
                onLongPress={() => toggleMsgSelect(msg.id)}
                onPress={() => isSelectingMsgs ? toggleMsgSelect(msg.id) : undefined}
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

      {/* ── Bandeau vocal ── */}
      {recorderState.isRecording && (
        <View style={ms.recBar}>
          <View style={ms.recDot} />
          <Text style={ms.recText}>Enregistrement… {fmtDur(Math.round((recorderState.durationMillis || 0) / 1000))}</Text>
          <TouchableOpacity onPress={cancelRecording} style={{ paddingHorizontal: 10 }}>
            <Text style={{ color: DANGER, fontWeight: '700' }}>Annuler</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Emoji panel ── */}
      {emojiVisible && (
        <View style={ms.emojiPanel}>
          <View style={ms.emojiGrid}>
            {EMOJIS.map((e, i) => (
              <TouchableOpacity key={i} style={ms.emojiBtn} onPress={() => setInputText(t => t + e)}>
                <Text style={{ fontSize: 24 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── Input bar ── */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={ms.inputBar}>
          <TouchableOpacity style={ms.inputAction} onPress={showAttachment}>
            <Ionicons name="attach" size={22} color={TEXT_MUTED} />
          </TouchableOpacity>

          <TextInput
            style={ms.input}
            placeholder="Message…"
            placeholderTextColor={TEXT_MUTED}
            value={inputText}
            onChangeText={t => { setInputText(t); emitTyping(); }}
            multiline maxLength={2000}
          />

          <TouchableOpacity style={ms.inputAction} onPress={() => setEmojiVisible(v => !v)}>
            <Ionicons name="happy-outline" size={22} color={emojiVisible ? PRIMARY : TEXT_MUTED} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[ms.sendBtn, canSend && ms.sendBtnActive, recorderState.isRecording && ms.sendBtnRec]}
            onPress={canSend ? sendMessage : undefined}
            onPressIn={!canSend ? startRecording : undefined}
            onPressOut={!canSend ? finishRecording : undefined}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : canSend ? (
              <Ionicons name="send" size={18} color="#FFF" />
            ) : (
              <Ionicons name={recorderState.isRecording ? 'radio' : 'mic'} size={20} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Modal profil ── */}
      <Modal visible={infoVisible} transparent animationType="fade" onRequestClose={() => setInfoVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setInfoVisible(false)}>
          <View style={ms.infoOverlay}>
            <TouchableWithoutFeedback>
              <View style={ms.infoSheet}>
                <TouchableOpacity style={ms.infoClose} onPress={() => setInfoVisible(false)}>
                  <Ionicons name="close" size={20} color={TEXT_MUTED} />
                </TouchableOpacity>
                {profPhoto ? (
                  <Image source={{ uri: profPhoto }} style={ms.infoAvatar} />
                ) : (
                  <View style={ms.infoAvatarFallback}>
                    <Text style={{ fontSize: 30, fontWeight: '700', color: TEXT_MUTED }}>
                      {title.charAt(title.lastIndexOf(' ') + 1)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
                <Text style={ms.infoName}>{title}</Text>
                <View style={ms.infoStatus}>
                  <View style={[ms.infoStatusDot, { backgroundColor: isOnline ? ONLINE : TEXT_MUTED }]} />
                  <Text style={[ms.infoStatusText, { color: isOnline ? ONLINE : TEXT_MUTED }]}>
                    {isOnline ? 'En ligne' : 'Hors ligne'}
                  </Text>
                </View>
                <View style={ms.infoActions}>
                  <TouchableOpacity style={ms.infoActionBtn} onPress={() => { setInfoVisible(false); setSearchActive(true); }}>
                    <Ionicons name="search" size={18} color={PRIMARY} />
                    <Text style={ms.infoActionText}>Rechercher</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[ms.infoActionBtn, { borderColor: DANGER + '44' }]}
                    onPress={() => { setInfoVisible(false); /* openBlock */ }}>
                    <Ionicons name="ban-outline" size={18} color={DANGER} />
                    <Text style={[ms.infoActionText, { color: DANGER }]}>Bloquer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ms = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingHorizontal: 12, paddingBottom: 10,
    backgroundColor: SURFACE, gap: 8,
  },
  headerAvatarWrap: { position: 'relative' },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerAvatarFallback: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: SURFACE2, alignItems: 'center', justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: ONLINE, borderWidth: 2, borderColor: SURFACE,
  },
  headerTitle: { fontSize: 16, fontWeight: '600', color: TEXT },
  typingText: { fontSize: 12, color: PRIMARY, fontStyle: 'italic' },
  statusText: { fontSize: 12, color: TEXT_MUTED },

  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: SURFACE2, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  searchInput: { flex: 1, fontSize: 14, color: TEXT },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  msgList: { paddingVertical: 12, flexGrow: 1 },

  dateSep: { alignItems: 'center', marginVertical: 14 },
  datePill: {
    backgroundColor: '#D9EDE9', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 4,
  },
  dateText: { fontSize: 12, color: PRIMARY, fontWeight: '600', opacity: 1 },

  empty: { alignItems: 'center', paddingTop: 80, gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: TEXT },
  emptyText: { fontSize: 13, color: TEXT_MUTED, textAlign: 'center', lineHeight: 20 },

  uploadBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: SURFACE,
  },
  uploadText: { fontSize: 13, color: PRIMARY },

  recBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: SURFACE, borderTopWidth: 1, borderTopColor: '#F8D7DA',
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: DANGER },
  recText: { flex: 1, fontSize: 13, color: DANGER, fontWeight: '600' },

  emojiPanel: { maxHeight: 160, backgroundColor: SURFACE, borderTopWidth: 1, borderTopColor: BORDER },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 2 },
  emojiBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: SURFACE,
    paddingHorizontal: 8, paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 26 : 8,
    gap: 6, borderTopWidth: 1, borderTopColor: BORDER,
  },
  inputAction: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1, backgroundColor: SURFACE2,
    borderRadius: 24, paddingHorizontal: 14, paddingVertical: 9,
    fontSize: 15, color: TEXT, maxHeight: 120,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: SURFACE2,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnActive: { backgroundColor: PRIMARY },
  sendBtnRec: { backgroundColor: DANGER },

  infoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  infoSheet: {
    width: '100%', maxWidth: 340,
    backgroundColor: '#FFFFFF', borderRadius: 20,
    paddingTop: 36, paddingBottom: 22, paddingHorizontal: 22,
    alignItems: 'center',
  },
  infoClose: { position: 'absolute', top: 14, right: 14, padding: 4 },
  infoAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  infoAvatarFallback: {
    width: 80, height: 80, borderRadius: 40, marginBottom: 12,
    backgroundColor: SURFACE2, alignItems: 'center', justifyContent: 'center',
  },
  infoName: { fontSize: 18, fontWeight: '700', color: TEXT, marginBottom: 6 },
  infoStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoStatusDot: { width: 8, height: 8, borderRadius: 4 },
  infoStatusText: { fontSize: 13, fontWeight: '600' },
  infoActions: { flexDirection: 'row', gap: 12, marginTop: 22, width: '100%' },
  infoActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: PRIMARY + '44',
    borderRadius: 12, paddingVertical: 10, backgroundColor: SURFACE2,
  },
  infoActionText: { fontSize: 13, fontWeight: '600', color: PRIMARY },
});