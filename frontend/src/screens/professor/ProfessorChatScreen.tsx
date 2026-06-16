import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
  KeyboardAvoidingView, Platform, Modal, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import * as SecureStore from 'expo-secure-store'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import api from '../../services/auth.service'

// ─── Couleurs ─────────────────────────────────────────────────────────────
const COLORS = {
  primary:       '#0D6B5E',
  primaryLight:  '#E8F5F3',
  bg:            '#F5F7F6',
  white:         '#FFFFFF',
  text:          '#1A1A2E',
  textSecondary: '#6B7280',
  border:        '#E5E7EB',
  unread:        '#EF4444',
  bubbleMe:      '#0D6B5E',
  bubbleOther:   '#F0F0F0',
  orange:        '#F97316',
}

// ─── Réponses rapides SAT ─────────────────────────────────────────────────
const QUICK_REPLIES = [
  { id: '1', text: 'Bon travail ! 👏' },
  { id: '2', text: 'Revois cette section 📖' },
  { id: '3', text: 'Essaie cet exercice ✏️' },
  { id: '4', text: 'Score en progression 📈' },
  { id: '5', text: 'Concentre-toi sur le Math 🔢' },
  { id: '6', text: 'Continue comme ça ! 💪' },
]

// ─── Types ────────────────────────────────────────────────────────────────
interface Conversation {
  id: string
  type: 'DIRECT' | 'GROUP'
  nom?: string
  Messages?: Message[]
  Members?: Member[]
  displayName:  string
  displayInit:  string
  lastMessage:  string
  lastTime:     string
  unreadCount:  number
  isGroup:      boolean
  satScore?:    number  // ✅ score SAT de l'étudiant
}

interface Member {
  id: string
  userId: string
  User?: { id: string; nom: string; prenom: string; role: string }
}

interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  fileUrl?:  string
  fileType?: 'TEXT' | 'IMAGE' | 'PDF'
  isRead: boolean
  isReported?: boolean
  createdAt: string
  sender?: { id: string; nom: string; prenom: string; role: string }
}

// ─── Helpers ─────────────────────────────────────────────────────────────
function formatTime(iso: string): string {
  const d   = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (diff === 1) return 'Hier'
  if (diff < 7)  return d.toLocaleDateString('fr-FR', { weekday: 'short' })
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function makeInitials(name: string): string {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'
}

function processConversation(conv: any, myId: string): Conversation {
  const isGroup  = conv.type === 'GROUP'
  const messages: Message[] = conv.Messages ?? []
  const last     = messages[messages.length - 1]

  let displayName = conv.nom ?? ''
  let otherUserId = ''
  if (!isGroup) {
    const other = (conv.ConversationMembers ?? conv.Members ?? [])
      .find((m: any) => m.userId !== myId)
    if (other?.User) {
      displayName = `${other.User.prenom} ${other.User.nom}`
      otherUserId = other.User.id
    }
  }
  if (!displayName) displayName = 'Conversation'

  let lastMessage = 'Aucun message'
  if (last) {
    if (last.fileType === 'IMAGE') lastMessage = '📷 Image'
    else if (last.fileType === 'PDF') lastMessage = '📄 PDF'
    else lastMessage = `${last.senderId === myId ? 'Vous : ' : ''}${last.content}`
  }

  const unreadCount = messages.filter(m => !m.isRead && m.senderId !== myId).length

  return {
    ...conv,
    displayName,
    displayInit:  makeInitials(displayName),
    lastMessage,
    lastTime:     last ? formatTime(last.createdAt) : '',
    unreadCount,
    isGroup,
  }
}

// ─── Conversation Row ─────────────────────────────────────────────────────
function ConvRow({ item, onPress }: { item: Conversation; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.avatar, { backgroundColor: COLORS.primary }]}>
        <Text style={styles.avatarText}>{item.displayInit}</Text>
        {item.unreadCount > 0 && <View style={styles.avatarBadge} />}
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.convName} numberOfLines={1}>{item.displayName}</Text>
            {/* ✅ Score SAT affiché sous le nom */}
            {item.satScore != null && item.satScore > 0 && (
              <Text style={styles.satScoreTag}>SAT {item.satScore}/1600</Text>
            )}
          </View>
          <Text style={styles.convTime}>{item.lastTime}</Text>
        </View>
        <View style={styles.cardBottom}>
          <Text
            style={[styles.preview, item.unreadCount > 0 && styles.previewBold]}
            numberOfLines={1}
          >
            {item.lastMessage}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount > 9 ? '9+' : item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Chat Window ──────────────────────────────────────────────────────────
function ChatWindow({
  conversation, myId, onClose, onMessageSent,
}: {
  conversation: Conversation
  myId: string
  onClose: () => void
  onMessageSent: () => void
}) {
  const [messages,       setMessages]       = useState<Message[]>([])
  const [loading,        setLoading]        = useState(true)
  const [text,           setText]           = useState('')
  const [sending,        setSending]        = useState(false)
  const [uploading,      setUploading]      = useState(false)
  const [showQuickReply, setShowQuickReply] = useState(false)
  const [showAttach,     setShowAttach]     = useState(false)
  const listRef = useRef<FlatList>(null)

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/chat/${conversation.id}/messages`)
      const msgs: Message[] = res.data?.messages ?? []
      setMessages(msgs)
      // Marquer non lus comme lus
      for (const m of msgs.filter(m => !m.isRead && m.senderId !== myId)) {
        await api.patch(`/chat/messages/${m.id}/read`).catch(() => {})
      }
    } catch (e) {
      console.warn('fetchMessages error:', e)
    } finally {
      setLoading(false)
    }
  }, [conversation.id, myId])

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  // ── Envoyer texte ─────────────────────────────────────────────────────
  const handleSend = async (content?: string) => {
    const trimmed = (content ?? text).trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      await api.post('/chat/messages', { conversationId: conversation.id, content: trimmed })
      setText('')
      setShowQuickReply(false)
      await fetchMessages()
      onMessageSent()
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
    } catch {
      Alert.alert('Erreur', "Impossible d'envoyer le message.")
    } finally {
      setSending(false)
    }
  }

  // ── Upload fichier ────────────────────────────────────────────────────
  const handleUploadFile = async (type: 'image' | 'pdf') => {
    setShowAttach(false)
    try {
      setUploading(true)
      let fileAsset: any = null

      if (type === 'image') {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        })
        if (result.canceled || !result.assets?.[0]) return
        fileAsset = result.assets[0]
      } else {
        const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' })
        if (result.canceled || !result.assets?.[0]) return
        fileAsset = result.assets[0]
      }

      // Vérifier taille max 10 Mo
      if (fileAsset.fileSize && fileAsset.fileSize > 10 * 1024 * 1024) {
        Alert.alert('Fichier trop lourd', 'La taille maximale est de 10 Mo.')
        return
      }

      const formData = new FormData()
      formData.append('file', {
        uri:  fileAsset.uri,
        name: fileAsset.fileName ?? `file.${type === 'pdf' ? 'pdf' : 'jpg'}`,
        type: type === 'pdf' ? 'application/pdf' : 'image/jpeg',
      } as any)
      formData.append('conversationId', conversation.id)

      await api.post('/chat/messages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      await fetchMessages()
      onMessageSent()
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
    } catch (e: any) {
      Alert.alert('Erreur', "Impossible d'envoyer le fichier.")
    } finally {
      setUploading(false)
    }
  }

  // ── Signaler message ──────────────────────────────────────────────────
  const handleReport = (messageId: string) => {
    Alert.alert(
      '🚩 Signaler ce message',
      'Ce message sera signalé à l\'administration.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Signaler',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/chat/messages/${messageId}/report`)
              Alert.alert('✅ Signalé', 'Le message a été signalé.')
            } catch {
              Alert.alert('Erreur', 'Impossible de signaler ce message.')
            }
          },
        },
      ]
    )
  }

  const scrollToBottom = () =>
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.chatSafe}>

        {/* Header avec score SAT */}
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={onClose} style={styles.chatBackBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <View style={[styles.chatAvatar, { backgroundColor: COLORS.primary }]}>
            <Text style={styles.chatAvatarText}>{conversation.displayInit}</Text>
          </View>
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderName} numberOfLines={1}>
              {conversation.displayName}
            </Text>
            {/* ✅ Score SAT dans le header de la conversation */}
            {conversation.satScore != null && conversation.satScore > 0 ? (
              <View style={styles.satHeaderBadge}>
                <Ionicons name="trending-up-outline" size={11} color={COLORS.primary} />
                <Text style={styles.satHeaderText}>SAT {conversation.satScore}/1600</Text>
              </View>
            ) : (
              <Text style={styles.chatHeaderSub}>Conversation directe</Text>
            )}
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            {/* Messages */}
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={m => m.id}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={scrollToBottom}
              ListEmptyComponent={
                <View style={styles.emptyMessages}>
                  <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textSecondary} />
                  <Text style={styles.emptyText}>Aucun message. Dites bonjour !</Text>
                </View>
              }
              renderItem={({ item }) => {
                const isMe = item.senderId === myId
                const isFile = item.fileType === 'IMAGE' || item.fileType === 'PDF'
                return (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onLongPress={() => !isMe && handleReport(item.id)}
                  >
                    <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                      {!isMe && (
                        <View style={styles.msgAvatar}>
                          <Text style={styles.msgAvatarText}>
                            {item.sender
                              ? makeInitials(`${item.sender.prenom} ${item.sender.nom}`)
                              : '?'}
                          </Text>
                        </View>
                      )}
                      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                        {/* Fichier joint */}
                        {isFile && (
                          <View style={styles.fileAttach}>
                            <Ionicons
                              name={item.fileType === 'PDF' ? 'document-outline' : 'image-outline'}
                              size={18}
                              color={isMe ? COLORS.white : COLORS.primary}
                            />
                            <Text style={[styles.fileAttachName, isMe && { color: COLORS.white }]}
                              numberOfLines={1}>
                              {item.content}
                            </Text>
                          </View>
                        )}
                        {!isFile && (
                          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                            {item.content}
                          </Text>
                        )}
                        <View style={styles.bubbleFooter}>
                          {item.isReported && (
                            <Ionicons name="flag" size={10} color={isMe ? 'rgba(255,255,255,0.5)' : COLORS.unread} />
                          )}
                          <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                            {formatTime(item.createdAt)}
                            {isMe && (item.isRead ? '  ✓✓' : '  ✓')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                )
              }}
            />

            {/* ✅ Réponses rapides SAT */}
            {showQuickReply && (
              <View style={styles.quickReplyPanel}>
                <Text style={styles.quickReplyTitle}>Réponses rapides</Text>
                <ScrollViewH>
                  {QUICK_REPLIES.map(qr => (
                    <TouchableOpacity
                      key={qr.id}
                      style={styles.quickReplyChip}
                      onPress={() => handleSend(qr.text)}
                    >
                      <Text style={styles.quickReplyText}>{qr.text}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollViewH>
              </View>
            )}

            {/* ✅ Panneau pièces jointes */}
            {showAttach && (
              <View style={styles.attachPanel}>
                <TouchableOpacity style={styles.attachOption} onPress={() => handleUploadFile('image')}>
                  <View style={[styles.attachIcon, { backgroundColor: '#EEF4FF' }]}>
                    <Ionicons name="image-outline" size={22} color="#3B82F6" />
                  </View>
                  <Text style={styles.attachLabel}>Image</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachOption} onPress={() => handleUploadFile('pdf')}>
                  <View style={[styles.attachIcon, { backgroundColor: COLORS.primaryLight }]}>
                    <Ionicons name="document-outline" size={22} color={COLORS.primary} />
                  </View>
                  <Text style={styles.attachLabel}>PDF</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Barre d'envoi */}
            <View style={styles.inputBar}>
              {/* Bouton réponse rapide */}
              <TouchableOpacity
                style={styles.inputIconBtn}
                onPress={() => { setShowQuickReply(v => !v); setShowAttach(false) }}
              >
                <Ionicons
                  name="flash-outline"
                  size={22}
                  color={showQuickReply ? COLORS.primary : COLORS.textSecondary}
                />
              </TouchableOpacity>

              {/* Bouton pièce jointe */}
              <TouchableOpacity
                style={styles.inputIconBtn}
                onPress={() => { setShowAttach(v => !v); setShowQuickReply(false) }}
                disabled={uploading}
              >
                {uploading
                  ? <ActivityIndicator size="small" color={COLORS.primary} />
                  : <Ionicons
                      name="attach-outline"
                      size={22}
                      color={showAttach ? COLORS.primary : COLORS.textSecondary}
                    />
                }
              </TouchableOpacity>

              <TextInput
                style={styles.inputBarField}
                placeholder="Écrire un message..."
                placeholderTextColor={COLORS.textSecondary}
                value={text}
                onChangeText={t => { setText(t); setShowQuickReply(false); setShowAttach(false) }}
                multiline
                maxLength={1000}
              />

              <TouchableOpacity
                style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
                onPress={() => handleSend()}
                disabled={!text.trim() || sending}
              >
                {sending
                  ? <ActivityIndicator size="small" color={COLORS.white} />
                  : <Ionicons name="send" size={20} color={COLORS.white} />
                }
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  )
}

// ScrollView horizontal inline pour les réponses rapides
function ScrollViewH({ children }: { children: React.ReactNode }) {
  const { ScrollView } = require('react-native')
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
      {children}
    </ScrollView>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────
interface Props {
  onNavigate:      (screen: string, params?: any) => void
  onUnreadChange?: (count: number) => void
}

export default function ProfessorChatScreen({ onNavigate, onUnreadChange }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading,       setLoading]       = useState(true)
  const [refreshing,    setRefreshing]    = useState(false)
  const [search,        setSearch]        = useState('')
  const [showSearch,    setShowSearch]    = useState(false)
  const [myId,          setMyId]          = useState('')
  const [openConv,      setOpenConv]      = useState<Conversation | null>(null)

  useEffect(() => {
    SecureStore.getItemAsync('user').then(str => {
      if (str) setMyId(JSON.parse(str).id ?? '')
    })
  }, [])

  // ── Fetch conversations + score SAT de chaque étudiant ────────────────
  const fetchConversations = useCallback(async () => {
    if (!myId) return
    try {
      const res = await api.get('/chat/')
      const raw: any[] = res.data?.conversations ?? []
      let processed = raw.map(c => processConversation(c, myId))

      // ✅ Charger le score SAT de chaque étudiant (conversations directes)
      processed = await Promise.all(
        processed.map(async conv => {
          if (conv.isGroup) return conv
          try {
            const members = conv.Members ?? []
            const other = members.find((m: any) => m.userId !== myId)
            if (!other?.userId) return conv
            const satRes = await api.get(`/sat/progress/${other.userId}`)
            return { ...conv, satScore: satRes.data?.currentScore ?? 0 }
          } catch {
            return conv
          }
        })
      )

      setConversations(processed)
      const total = processed.reduce((acc, c) => acc + c.unreadCount, 0)
      onUnreadChange?.(total)
    } catch (e) {
      console.warn('fetchConversations error:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [myId, onUnreadChange])

  useEffect(() => { if (myId) fetchConversations() }, [myId, fetchConversations])

  useEffect(() => {
    if (!myId) return
    const interval = setInterval(fetchConversations, 10000)
    return () => clearInterval(interval)
  }, [myId, fetchConversations])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchConversations()
  }, [fetchConversations])

  // ✅ Pas de tab "Groupes" — tout est individuel
  const filtered = search
    ? conversations.filter(c => c.displayName.toLowerCase().includes(search.toLowerCase()))
    : conversations

  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0)

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Chat</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          Chat{totalUnread > 0 ? ` (${totalUnread})` : ''}
        </Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSearch(v => !v)}>
          <Ionicons
            name={showSearch ? 'close-outline' : 'search-outline'}
            size={22}
            color={COLORS.text}
          />
        </TouchableOpacity>
      </View>

      {/* Barre de recherche */}
      {showSearch && (
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un étudiant..."
            placeholderTextColor={COLORS.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>
      )}

      {/* ✅ Indicateur "conversations individuelles" */}
      <View style={styles.subtitleBar}>
        <Ionicons name="people-outline" size={14} color={COLORS.textSecondary} />
        <Text style={styles.subtitleText}>
          {conversations.length} étudiant{conversations.length > 1 ? 's' : ''}
        </Text>
      </View>

      {/* Liste */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={56} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>Aucune conversation</Text>
            <Text style={styles.emptySubtitle}>
              Les étudiants peuvent vous contacter directement depuis leur application.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ConvRow item={item} onPress={() => setOpenConv(item)} />
        )}
      />

      {/* Chat window */}
      {openConv && (
        <ChatWindow
          conversation={openConv}
          myId={myId}
          onClose={() => setOpenConv(null)}
          onMessageSent={fetchConversations}
        />
      )}
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor:  '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 25, paddingTop: 30, paddingBottom: 12,
    backgroundColor: COLORS.white,
  },
  title:   { fontSize: 25, fontWeight: '800', color: '#0D6B5E', flex: 1,textAlign: 'center'  },
  iconBtn: { padding: 0 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },

  subtitleBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 8,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  subtitleText: { fontSize: 12, color: COLORS.textSecondary },

  list:           { paddingVertical: 8 },
  emptyContainer: { flex: 1 },

  // Carte conversation
  card: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    gap: 14,
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  avatarText:  { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  avatarBadge: {
    position: 'absolute', top: 0, right: 0,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: COLORS.unread,
    borderWidth: 2, borderColor: COLORS.white,
  },
  cardContent: { flex: 1, minWidth: 0 },
  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  convName:    { fontSize: 15, fontWeight: '700', color: COLORS.text },
  // ✅ Score SAT sous le nom
  satScoreTag: {
    fontSize: 11, color: COLORS.primary, fontWeight: '600',
    marginTop: 2,
  },
  convTime:    { fontSize: 11, color: COLORS.textSecondary },
  cardBottom:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  preview:     { fontSize: 13, color: COLORS.textSecondary, flex: 1, marginRight: 8 },
  previewBold: { color: COLORS.text, fontWeight: '600' },
  badge: {
    backgroundColor: COLORS.unread, minWidth: 20, height: 20,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },

  emptyState:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },

  // ── Chat Window ──────────────────────────────────────────────────────
  chatSafe:   { flex: 1, backgroundColor: COLORS.bg },
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  chatBackBtn:    { padding: 4 },
  chatAvatar:     { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  chatAvatarText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  chatHeaderInfo: { flex: 1 },
  chatHeaderName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  chatHeaderSub:  { fontSize: 12, color: COLORS.textSecondary },
  // ✅ Badge SAT dans le header
  satHeaderBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2,
  },
  satHeaderText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  messagesList: { padding: 16, gap: 8, paddingBottom: 24 },

  msgRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 6 },
  msgRowMe: { flexDirection: 'row-reverse' },
  msgAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  msgAvatarText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },

  bubble: {
    maxWidth: '75%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10,
  },
  bubbleMe:       { backgroundColor: COLORS.bubbleMe, borderBottomRightRadius: 4 },
  bubbleOther:    { backgroundColor: COLORS.bubbleOther, borderBottomLeftRadius: 4 },
  bubbleText:     { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  bubbleTextMe:   { color: COLORS.white },
  bubbleFooter:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
  bubbleTime:     { fontSize: 10, color: COLORS.textSecondary },
  bubbleTimeMe:   { color: 'rgba(255,255,255,0.65)' },

  // Fichier joint
  fileAttach: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 4,
  },
  fileAttachName: { fontSize: 13, color: COLORS.primary, flex: 1 },

  // ✅ Réponses rapides
  quickReplyPanel: {
    backgroundColor: COLORS.white, paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: COLORS.border, gap: 8,
  },
  quickReplyTitle: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 4 },
  quickReplyChip: {
    backgroundColor: COLORS.primaryLight, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.primary + '40',
  },
  quickReplyText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  // ✅ Panneau pièces jointes
  attachPanel: {
    flexDirection: 'row', gap: 16,
    backgroundColor: COLORS.white, paddingHorizontal: 20, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  attachOption: { alignItems: 'center', gap: 6 },
  attachIcon: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  attachLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },

  // Barre d'envoi
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 6,
    paddingHorizontal: 12, paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  inputIconBtn: { padding: 8 },
  inputBarField: {
    flex: 1, minHeight: 40, maxHeight: 120,
    backgroundColor: COLORS.bg, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: COLORS.text,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },

  emptyMessages: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText:     { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
})