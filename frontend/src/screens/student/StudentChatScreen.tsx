/**
 * StudentChatScreen.tsx — Style WhatsApp
 * Filtres 100% fonctionnels :
 *  • Tous         → toutes les conversations NON archivées
 *  • Non lus      → conversations avec unreadCount > 0
 *  • Favoris      → toggle favori (étoile) avec API + optimistic update
 *  • Archivés     → conversations archivées, désarchivage depuis la liste
 *  • Signalements → conversations dont l'autre membre est signalé
 *
 * Actions sur sélection multiple (appui long) :
 *  • Archiver / Désarchiver selon le filtre actif
 *  • Supprimer
 *  • Ajouter / Retirer des favoris
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { io, Socket } from 'socket.io-client';
import api from '../../services/auth.service';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const PRIMARY       = '#0D6B5E';
const PRIMARY_LIGHT = '#E6F3F1';
const BG            = '#FFFFFF';
const SURFACE       = '#FFFFFF';
const SURFACE2      = '#F0F2F5';
const TEXT          = '#111B21';
const TEXT_MUTED    = '#667781';
const BORDER        = '#E9EDEF';
const ONLINE        = '#0D6B5E';
const UNREAD_BG     = '#0D6B5E';
const SELECTED_BG   = '#D9EDE9';
const DANGER        = '#DC3545';
const WARN          = '#F59E0B';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// ─── Types ────────────────────────────────────────────────────────────────────
type SidebarSection = 'conversations' | 'nonlus' | 'favoris' | 'archives' | 'signalements';

type OtherMember = {
  id: string;
  nom: string;
  prenom: string;
  photo?: string | null;
  matiere?: string | null;
  isReported?: boolean;
};

type LastMessage = {
  content: string;
  fileType?: 'TEXT' | 'IMAGE' | 'PDF' | 'AUDIO' | 'VIDEO';
  createdAt: string;
  senderId: string;
};

type ConversationDTO = {
  id: string;
  type: 'DIRECT' | 'GROUP';
  otherMember?: OtherMember | null;
  unreadCount?: number;
  lastMessage?: LastMessage | null;
  Messages?: LastMessage[];
  messages?: LastMessage[];
  createdAt?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
};

type Professor = {
  id: string;
  nom: string;
  prenom: string;
  photo?: string | null;
  matiere?: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getLastMessage(conv: ConversationDTO): LastMessage | null {
  return conv.lastMessage ?? conv.Messages?.[0] ?? conv.messages?.[0] ?? null;
}

function formatTime(dateString?: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  if (date.toDateString() === now.toDateString())
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Hier';
  const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diff < 7) return date.toLocaleDateString('fr-FR', { weekday: 'short' });
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function getDisplayName(conv: ConversationDTO): string {
  if (conv.otherMember) return `${conv.otherMember.prenom} ${conv.otherMember.nom}`;
  return 'Conversation';
}

function getLastMessagePreview(msg: LastMessage | null, isMine: boolean): string {
  if (!msg) return 'Appuie pour commencer';
  const prefix = isMine ? 'Vous : ' : '';
  if (msg.fileType === 'IMAGE') return `${prefix}📷 Photo`;
  if (msg.fileType === 'VIDEO') return `${prefix}🎬 Vidéo`;
  if (msg.fileType === 'PDF') return `${prefix}📎 ${msg.content}`;
  if (msg.fileType === 'AUDIO') return `${prefix}🎤 Message vocal`;
  return `${prefix}${msg.content}`;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ member, online, size = 50, selected }: {
  member?: OtherMember | Professor | null;
  online?: boolean;
  size?: number;
  selected?: boolean;
}) {
  return (
    <View style={{ width: size, height: size }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: PRIMARY_LIGHT, overflow: 'hidden',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: selected ? 2 : 0, borderColor: PRIMARY,
      }}>
        {selected ? (
          <View style={{
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
          }}>
            <Ionicons name="checkmark" size={size * 0.45} color="#FFF" />
          </View>
        ) : member?.photo ? (
          <Image source={{ uri: member.photo }} style={{ width: size, height: size }} />
        ) : (
          <Text style={{ fontSize: size * 0.38, fontWeight: '600', color: TEXT_MUTED }}>
            {(member?.prenom?.[0] || '?').toUpperCase()}
          </Text>
        )}
      </View>
      {online && !selected && (
        <View style={{
          position: 'absolute', bottom: 0, right: 0,
          width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14,
          backgroundColor: ONLINE, borderWidth: 2, borderColor: BG,
        }} />
      )}
    </View>
  );
}

// ─── Swipeable Row (glisser pour actions rapides) ─────────────────────────────
function ConvRow({
  item, myId, isOnline, isSelected,
  onPress, onLongPress,
  onToggleFavorite, onToggleArchive,
}: {
  item: ConversationDTO;
  myId: string | null;
  isOnline: boolean;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onToggleFavorite: () => void;
  onToggleArchive: () => void;
}) {
  const lastMsg = getLastMessage(item);
  const unread = item.unreadCount || 0;
  const isMine = lastMsg?.senderId === myId;
  const translateX = useRef(new Animated.Value(0)).current;
  const [swiped, setSwiped] = useState(false);

  const swipeOpen = () => {
    Animated.spring(translateX, { toValue: -120, useNativeDriver: true, friction: 8 }).start();
    setSwiped(true);
  };
  const swipeClose = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    setSwiped(false);
  };

  return (
    <View style={{ overflow: 'hidden', backgroundColor: BG }}>
      {/* Actions cachées derrière */}
      <View style={s.swipeActions}>
        <TouchableOpacity
          style={[s.swipeAction, { backgroundColor: item.isFavorite ? WARN : '#F59E0B' }]}
          onPress={() => { swipeClose(); onToggleFavorite(); }}
        >
          <Ionicons name={item.isFavorite ? 'star' : 'star-outline'} size={22} color="#FFF" />
          <Text style={s.swipeActionText}>{item.isFavorite ? 'Retirer' : 'Favori'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.swipeAction, { backgroundColor: item.isArchived ? PRIMARY : '#607D8B' }]}
          onPress={() => { swipeClose(); onToggleArchive(); }}
        >
          <Ionicons name={item.isArchived ? 'archive' : 'archive-outline'} size={22} color="#FFF" />
          <Text style={s.swipeActionText}>{item.isArchived ? 'Désarchiver' : 'Archiver'}</Text>
        </TouchableOpacity>
      </View>

      {/* Ligne principale animée */}
      <Animated.View style={{ transform: [{ translateX }] }}>
        <TouchableOpacity
          style={[s.convRow, isSelected && s.convRowSelected]}
          onPress={() => { if (swiped) { swipeClose(); return; } onPress(); }}
          onLongPress={onLongPress}
          activeOpacity={0.6}
        >
          <Avatar member={item.otherMember} online={isOnline} selected={isSelected} />

          <View style={s.convBody}>
            <View style={s.convTop}>
              <View style={s.convNameRow}>
                {item.isFavorite && (
                  <Ionicons name="star" size={12} color={WARN} style={{ marginRight: 4 }} />
                )}
                {item.otherMember?.isReported && (
                  <Ionicons name="flag" size={12} color={DANGER} style={{ marginRight: 4 }} />
                )}
                <Text style={[s.convName, unread > 0 && s.convNameBold]} numberOfLines={1}>
                  {getDisplayName(item)}
                </Text>
              </View>
              <Text style={[s.convTime, unread > 0 && { color: PRIMARY }]}>
                {formatTime(lastMsg?.createdAt || item.createdAt)}
              </Text>
            </View>

            {item.otherMember?.matiere && (
              <Text style={s.convMatiere}>{item.otherMember.matiere}</Text>
            )}

            <View style={s.convBottom}>
              {isMine && lastMsg && (
                <Ionicons name="checkmark-done" size={14} color={PRIMARY} style={{ marginRight: 4 }} />
              )}
              <Text style={[s.convPreview, unread > 0 && s.convPreviewBold]} numberOfLines={1}>
                {getLastMessagePreview(lastMsg, isMine)}
              </Text>
              {unread > 0 && (
                <View style={s.unreadBadge}>
                  <Text style={s.unreadText}>{unread > 99 ? '99+' : unread}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
  navigation: { navigate: (screen: string, params?: any) => void };
  onUnreadCountChange?: (count: number) => void;
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function StudentChatScreen({ navigation, onUnreadCountChange }: Props) {
  const [activeSection, setActiveSection] = useState<SidebarSection>('conversations');
  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [myId, setMyId] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isSelecting = selectedIds.size > 0;

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loadingProfessors, setLoadingProfessors] = useState(false);
  const [startingWith, setStartingWith] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/auth/me')
      .then(({ data }) => setMyId(data.user?.id || data.id || null))
      .catch(() => {});
  }, []);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/chat');
      setConversations(
        (data.conversations || []).filter((c: ConversationDTO) => c.type === 'DIRECT')
      );
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // ── Socket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = (api.defaults?.headers?.common?.['Authorization'] as string)
      ?.replace('Bearer ', '') || '';
    const socket: Socket = io(SOCKET_URL, {
      auth: { token }, transports: ['websocket'], reconnection: true,
    });
    socketRef.current = socket;

    socket.on('new_message', (p: { conversationId: string; message: LastMessage }) => {
      setConversations(prev => prev.map(c =>
        c.id === p.conversationId
          ? { ...c, lastMessage: p.message, unreadCount: (c.unreadCount || 0) + 1 }
          : c
      ));
    });
    socket.on('online_users', (ids: string[]) => setOnlineUsers(new Set(ids)));
    socket.on('user_online', (uid: string) => setOnlineUsers(p => new Set(p).add(uid)));
    socket.on('user_offline', (uid: string) => setOnlineUsers(p => {
      const n = new Set(p); n.delete(uid); return n;
    }));
    socket.on('messages_read', (p: { conversationId: string }) =>
      setConversations(prev => prev.map(c =>
        c.id === p.conversationId ? { ...c, unreadCount: 0 } : c
      ))
    );
    return () => { socket.disconnect(); };
  }, []);

  // ── Compteurs ─────────────────────────────────────────────────────────────
  const totalUnread = useMemo(
    () => conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0),
    [conversations]
  );
  const unreadCount = useMemo(
    () => conversations.filter(c => (c.unreadCount || 0) > 0).length,
    [conversations]
  );
  const favCount = useMemo(
    () => conversations.filter(c => c.isFavorite && !c.isArchived).length,
    [conversations]
  );
  const archiveCount = useMemo(
    () => conversations.filter(c => c.isArchived).length,
    [conversations]
  );
  const reportCount = useMemo(
    () => conversations.filter(c => c.otherMember?.isReported).length,
    [conversations]
  );

  useEffect(() => { onUnreadCountChange?.(totalUnread); }, [totalUnread, onUnreadCountChange]);

  // ── Filtres ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...conversations];

    switch (activeSection) {
      case 'conversations':
        // Tous sauf archivés
        list = list.filter(c => !c.isArchived);
        break;
      case 'nonlus':
        // Non lus et non archivés
        list = list.filter(c => !c.isArchived && (c.unreadCount || 0) > 0);
        break;
      case 'favoris':
        // Favoris seulement (archivés exclus)
        list = list.filter(c => c.isFavorite && !c.isArchived);
        break;
      case 'archives':
        // Archivés seulement
        list = list.filter(c => c.isArchived);
        break;
      case 'signalements':
        // Membres signalés
        list = list.filter(c => c.otherMember?.isReported);
        break;
    }

    if (search.trim()) {
      list = list.filter(c =>
        getDisplayName(c).toLowerCase().includes(search.trim().toLowerCase())
      );
    }

    return list.sort((a, b) => {
      const da = getLastMessage(a)?.createdAt || a.createdAt || '';
      const db = getLastMessage(b)?.createdAt || b.createdAt || '';
      return db.localeCompare(da);
    });
  }, [conversations, search, activeSection]);

  // ── Sélection ─────────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  // Toutes les conv sélectionnées sont-elles favorites ?
  const allSelectedFav = useMemo(() => {
    const ids = [...selectedIds];
    return ids.length > 0 && ids.every(id => conversations.find(c => c.id === id)?.isFavorite);
  }, [selectedIds, conversations]);

  // Toutes archivées ?
  const allSelectedArchived = useMemo(() => {
    const ids = [...selectedIds];
    return ids.length > 0 && ids.every(id => conversations.find(c => c.id === id)?.isArchived);
  }, [selectedIds, conversations]);

  // ── Toggle Favori (optimistic) ────────────────────────────────────────────
  const toggleFavorite = async (convId: string) => {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    const newVal = !conv.isFavorite;

    // Optimistic update
    setConversations(prev =>
      prev.map(c => c.id === convId ? { ...c, isFavorite: newVal } : c)
    );
    try {
      await api.patch(`/chat/${convId}/favorite`, { favorite: newVal });
    } catch {
      // Rollback
      setConversations(prev =>
        prev.map(c => c.id === convId ? { ...c, isFavorite: !newVal } : c)
      );
      Alert.alert('Erreur', 'Impossible de modifier les favoris.');
    }
  };

  // Toggle favoris pour la sélection multiple
  const toggleFavoriteSelected = async () => {
    const ids = [...selectedIds];
    const newVal = !allSelectedFav;
    clearSelection();
    setConversations(prev =>
      prev.map(c => ids.includes(c.id) ? { ...c, isFavorite: newVal } : c)
    );
    try {
      await Promise.all(ids.map(id => api.patch(`/chat/${id}/favorite`, { favorite: newVal })));
    } catch { fetchConversations(); }
  };

  // ── Toggle Archive (optimistic) ───────────────────────────────────────────
  const toggleArchive = async (convId: string) => {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    const newVal = !conv.isArchived;

    setConversations(prev =>
      prev.map(c => c.id === convId ? { ...c, isArchived: newVal } : c)
    );
    try {
      await api.patch(`/chat/${convId}/archive`, { archived: newVal });
      // Toast textuel discret
    } catch {
      setConversations(prev =>
        prev.map(c => c.id === convId ? { ...c, isArchived: !newVal } : c)
      );
      Alert.alert('Erreur', 'Impossible de modifier l\'archive.');
    }
  };

  // Toggle archive pour la sélection multiple
  const toggleArchiveSelected = async () => {
    const ids = [...selectedIds];
    const newVal = !allSelectedArchived;
    clearSelection();
    setConversations(prev =>
      prev.map(c => ids.includes(c.id) ? { ...c, isArchived: newVal } : c)
    );
    try {
      await Promise.all(ids.map(id => api.patch(`/chat/${id}/archive`, { archived: newVal })));
    } catch { fetchConversations(); }
  };

  // ── Suppression ───────────────────────────────────────────────────────────
  const deleteSelected = () => {
    Alert.alert(
      `Supprimer ${selectedIds.size} conversation${selectedIds.size > 1 ? 's' : ''}`,
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            const ids = [...selectedIds];
            clearSelection();
            setConversations(prev => prev.filter(c => !ids.includes(c.id)));
            try {
              await Promise.all(ids.map(id => api.delete(`/chat/${id}`)));
            } catch { fetchConversations(); }
          },
        },
      ]
    );
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const openConversation = (conv: ConversationDTO) => {
    if (isSelecting) { toggleSelect(conv.id); return; }
    setConversations(prev =>
      prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c)
    );
    navigation.navigate('StudentChatConversation', {
      conversationId: conv.id,
      title: getDisplayName(conv),
      otherMemberId: conv.otherMember?.id ?? undefined,
    });
  };

  // ── Professeurs ───────────────────────────────────────────────────────────
  const openNewConversationPicker = async () => {
    setDrawerVisible(false);
    setPickerVisible(true);
    setLoadingProfessors(true);
    try {
      const { data } = await api.get('/chat/professors');
      setProfessors(data.professors || []);
    } catch {
      Alert.alert('Indisponible', 'Impossible de charger les professeurs.');
    } finally { setLoadingProfessors(false); }
  };

  const startConversationWith = async (prof: Professor) => {
    setStartingWith(prof.id);
    try {
      const { data } = await api.post('/chat/direct', { professorId: prof.id });
      setPickerVisible(false);
      fetchConversations();
      navigation.navigate('StudentChatConversation', {
        conversationId: data.conversation.id,
        title: `${prof.prenom} ${prof.nom}`,
        otherMemberId: prof.id,
      });
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message || 'Impossible de démarrer la conversation.');
    } finally { setStartingWith(null); }
  };

  // ── Labels des filtres ────────────────────────────────────────────────────
  const sectionMeta: Record<SidebarSection, { icon: string; label: string; color?: string; count?: number }> = {
    conversations: { icon: 'chatbubbles',  label: 'Toutes',       count: conversations.filter(c => !c.isArchived).length },
    nonlus:        { icon: 'mail-unread',  label: 'Non lus',      count: unreadCount, color: PRIMARY },
    favoris:       { icon: 'star',         label: 'Favoris',      count: favCount,    color: WARN },
    archives:      { icon: 'archive',      label: 'Archivés',     count: archiveCount },
    signalements:  { icon: 'flag',         label: 'Signalements', count: reportCount, color: DANGER },
  };

  const emptyMessages: Record<SidebarSection, string> = {
    conversations: 'Appuie sur le crayon pour contacter un professeur',
    nonlus:        'Tous vos messages ont été lus 👍',
    favoris:       'Glissez une conversation vers la gauche pour l\'ajouter en favori',
    archives:      'Glissez une conversation vers la gauche pour l\'archiver',
    signalements:  'Aucun profil signalé',
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />

      {/* ── Header ── */}
      <View style={s.header}>
        {isSelecting ? (
          <>
            <TouchableOpacity onPress={clearSelection} style={s.headerBtn}>
              <Ionicons name="close" size={24} color={TEXT} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>
              {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
            </Text>
            <View style={s.headerRight}>
              {/* Favori toggle */}
              <TouchableOpacity style={s.headerBtn} onPress={toggleFavoriteSelected}>
                <Ionicons
                  name={allSelectedFav ? 'star' : 'star-outline'}
                  size={22}
                  color={WARN}
                />
              </TouchableOpacity>
              {/* Archive / Désarchive toggle */}
              <TouchableOpacity style={s.headerBtn} onPress={toggleArchiveSelected}>
                <Ionicons
                  name={allSelectedArchived ? 'arrow-undo-outline' : 'archive-outline'}
                  size={22}
                  color={TEXT}
                />
              </TouchableOpacity>
              {/* Supprimer */}
              <TouchableOpacity style={s.headerBtn} onPress={deleteSelected}>
                <Ionicons name="trash-outline" size={22} color={DANGER} />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={s.headerBrand}>Messages</Text>
            <View style={s.headerRight}>
              {totalUnread > 0 && (
                <View style={s.headerBadge}>
                  <Text style={s.headerBadgeText}>{totalUnread > 99 ? '99+' : totalUnread}</Text>
                </View>
              )}
              <TouchableOpacity style={s.headerBtn} onPress={() => setDrawerVisible(true)}>
                <Ionicons name="options-outline" size={22} color={TEXT} />
              </TouchableOpacity>
              <TouchableOpacity style={s.newBtn} onPress={openNewConversationPicker}>
                <Ionicons name="create-outline" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* ── Barre de recherche ── */}
      {!isSelecting && (
        <View style={s.searchRow}>
          <Ionicons name="search" size={16} color={TEXT_MUTED} style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Rechercher…"
            placeholderTextColor={TEXT_MUTED}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={TEXT_MUTED} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Bandeau info section archives ── */}
      {activeSection === 'archives' && !isSelecting && (
        <View style={s.sectionBanner}>
          <Ionicons name="information-circle-outline" size={16} color={TEXT_MUTED} />
          <Text style={s.sectionBannerText}>
            Glissez à gauche sur une conversation pour la désarchiver
          </Text>
        </View>
      )}

      {/* ── Liste ── */}
      {loading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchConversations(); }}
              tintColor={PRIMARY}
            />
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <View style={s.emptyIcon}>
                <Ionicons
                  name={sectionMeta[activeSection].icon as any}
                  size={40}
                  color={TEXT_MUTED}
                />
              </View>
              <Text style={s.emptyTitle}>
                {search ? 'Aucun résultat' : `Aucune conversation`}
              </Text>
              <Text style={s.emptyText}>
                {search ? `Rien pour "${search}"` : emptyMessages[activeSection]}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isOnline = item.otherMember ? onlineUsers.has(item.otherMember.id) : false;
            const isSelected = selectedIds.has(item.id);
            return (
              <ConvRow
                item={item}
                myId={myId}
                isOnline={isOnline}
                isSelected={isSelected}
                onPress={() => openConversation(item)}
                onLongPress={() => toggleSelect(item.id)}
                onToggleFavorite={() => toggleFavorite(item.id)}
                onToggleArchive={() => toggleArchive(item.id)}
              />
            );
          }}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}

      {/* ── Drawer menu ── */}
      <Modal visible={drawerVisible} animationType="slide" onRequestClose={() => setDrawerVisible(false)}>
        <View style={s.drawer}>
          <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />
          <View style={s.drawerHeader}>
            <TouchableOpacity onPress={() => setDrawerVisible(false)} style={s.headerBtn}>
              <Ionicons name="arrow-back" size={22} color={TEXT} />
            </TouchableOpacity>
            <Text style={s.drawerTitle}>Filtres</Text>
            <TouchableOpacity style={s.newBtn} onPress={openNewConversationPicker}>
              <Ionicons name="create-outline" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={s.drawerSecurity}>
            <Ionicons name="shield-checkmark" size={18} color={PRIMARY} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.drawerSecTitle}>Communication sécurisée</Text>
              <Text style={s.drawerSecSub}>Échanges privés entre élève et professeur.</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {(Object.entries(sectionMeta) as [SidebarSection, typeof sectionMeta[SidebarSection]][]).map(([key, meta]) => {
              const active = activeSection === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[s.drawerItem, active && s.drawerItemActive]}
                  onPress={() => { setActiveSection(key); setDrawerVisible(false); }}
                >
                  <Ionicons name={meta.icon as any} size={20} color={active ? PRIMARY : (meta.color || TEXT_MUTED)} />
                  <Text style={[s.drawerItemLabel, active && { color: PRIMARY }]}>{meta.label}</Text>
                  {meta.count !== undefined && meta.count > 0 && (
                    <View style={[s.drawerBadge, meta.color ? { backgroundColor: meta.color } : {}]}>
                      <Text style={s.drawerBadgeText}>{meta.count > 99 ? '99+' : meta.count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Modal professeurs ── */}
      <Modal visible={pickerVisible} animationType="slide" transparent onRequestClose={() => setPickerVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setPickerVisible(false)}>
          <View style={s.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={s.modalSheet}>
                <View style={s.modalHandle} />
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Nouveau message</Text>
                  <TouchableOpacity onPress={() => setPickerVisible(false)}>
                    <Ionicons name="close" size={22} color={TEXT} />
                  </TouchableOpacity>
                </View>
                <Text style={s.modalSub}>Choisissez un professeur</Text>

                {loadingProfessors ? (
                  <ActivityIndicator size="large" color={PRIMARY} style={{ marginVertical: 40 }} />
                ) : (
                  <FlatList
                    data={professors}
                    keyExtractor={p => p.id}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                      <View style={{ alignItems: 'center', padding: 40 }}>
                        <Text style={{ color: TEXT_MUTED }}>Aucun professeur disponible.</Text>
                      </View>
                    }
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={s.profRow}
                        onPress={() => startConversationWith(item)}
                        disabled={startingWith !== null}
                      >
                        <Avatar member={item} size={46} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={s.profName}>{item.prenom} {item.nom}</Text>
                          {item.matiere && <Text style={s.profMatiere}>{item.matiere}</Text>}
                        </View>
                        {startingWith === item.id ? (
                          <ActivityIndicator size="small" color={PRIMARY} />
                        ) : (
                          <View style={s.msgBtn}>
                            <Ionicons name="chatbubble-outline" size={16} color={PRIMARY} />
                            <Text style={s.msgBtnText}>Message</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={s.separator} />}
                  />
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : 40,
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: SURFACE,
  },
  headerBrand: { flex: 1, fontSize: 25, fontWeight: '800', color: PRIMARY, letterSpacing: -0.3 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: TEXT },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerBtn: { padding: 8 },
  headerBadge: {
    backgroundColor: PRIMARY, borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5, marginRight: 6,
  },
  headerBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  newBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', marginLeft: 4,
  },


  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: 12, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: SURFACE2, borderRadius: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: TEXT },

  sectionBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#F8F9FA', borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  sectionBannerText: { fontSize: 12, color: TEXT_MUTED, flex: 1 },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Swipe actions
  swipeActions: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    flexDirection: 'row', width: 120,
  },
  swipeAction: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  swipeActionText: { color: '#FFF', fontSize: 11, fontWeight: '600' },

  convRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: BG,
  },
  convRowSelected: { backgroundColor: SELECTED_BG },
  convBody: { flex: 1, marginLeft: 12 },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  convNameRow: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  convName: { flex: 1, fontSize: 16, fontWeight: '500', color: TEXT },
  convNameBold: { fontWeight: '700' },
  convTime: { fontSize: 12, color: TEXT_MUTED },
  convMatiere: { fontSize: 12, color: PRIMARY, fontWeight: '600', marginBottom: 2 },
  convBottom: { flexDirection: 'row', alignItems: 'center' },
  convPreview: { flex: 1, fontSize: 13, color: TEXT_MUTED },
  convPreviewBold: { color: TEXT, fontWeight: '500' },
  unreadBadge: {
    backgroundColor: UNREAD_BG, borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5, marginLeft: 8,
  },
  unreadText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  separator: { height: 1, backgroundColor: BORDER, marginLeft: 78 },

  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: SURFACE2,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
  emptyText: { fontSize: 14, color: TEXT_MUTED, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },

  drawer: { flex: 1, backgroundColor: BG, paddingTop: Platform.OS === 'ios' ? 54 : 40 },
  drawerHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: SURFACE,
  },
  drawerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: TEXT, marginLeft: 8 },
  drawerSecurity: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, padding: 14,
    backgroundColor: SURFACE, borderRadius: 14,
    borderWidth: 1, borderColor: PRIMARY_LIGHT,
  },
  drawerSecTitle: { fontSize: 13, fontWeight: '700', color: TEXT },
  drawerSecSub: { fontSize: 12, color: TEXT_MUTED, marginTop: 1 },
  drawerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  drawerItemActive: { backgroundColor: PRIMARY_LIGHT },
  drawerItemLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: TEXT },
  drawerBadge: {
    backgroundColor: UNREAD_BG, borderRadius: 10,
    minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  drawerBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16, maxHeight: '80%',
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: SURFACE2,
    alignSelf: 'center', marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
  modalSub: { fontSize: 13, color: TEXT_MUTED, marginBottom: 12 },
  profRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  profName: { fontSize: 15, fontWeight: '600', color: TEXT },
  profMatiere: { fontSize: 13, color: PRIMARY, marginTop: 2 },
  msgBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: PRIMARY_LIGHT, borderRadius: 10,
  },
  msgBtnText: { fontSize: 13, fontWeight: '600', color: PRIMARY },
});