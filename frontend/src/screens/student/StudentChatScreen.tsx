import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY = '#0D6B5E';
const BG = '#F9FAFB';
const CARD = '#FFFFFF';
const TEXT = '#111827';
const MUTED = '#6B7280';

type TabType = 'Professeurs' | 'Annonces';

const professors = [
  { id: '1', name: 'Prof. Sarah Benali', subject: 'Math', time: '09:41', lastMsg: 'Très bonne question ! Voici une vidéo...', unread: 2, avatar: '👩‍🏫' },
  { id: '2', name: 'Prof. Yassine Amrani', subject: 'Anglais', time: 'Hier', lastMsg: 'Envoie-moi ton devoir quand tu peux.', unread: 1, avatar: '👨‍🏫' },
  { id: '3', name: 'Prof. Lina El Amrani', subject: 'Science', time: 'Hier', lastMsg: 'Merci pour ton message, bon courage !', unread: 0, avatar: '👩‍🔬' },
  { id: '4', name: 'Prof. Mehdi Toumi', subject: 'Writing', time: 'Lun', lastMsg: 'Parfait, continue comme ça 👌', unread: 0, avatar: '👨‍💼' },
];


type Props = {
  navigation: { navigate: (screen: string) => void }
}
export default function StudentChatScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('Professeurs');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['Professeurs', 'Annonces'] as TabType[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Conversations list */}
      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'Professeurs' && professors.map(prof => (
          <TouchableOpacity key={prof.id} style={styles.chatRow}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarEmoji}>{prof.avatar}</Text>
            </View>
            <View style={styles.chatInfo}>
              <View style={styles.chatMeta}>
                <Text style={styles.profName}>{prof.name}</Text>
                <Text style={styles.chatTime}>{prof.time}</Text>
              </View>
              <View style={styles.chatPreview}>
                <Text style={styles.lastMsg} numberOfLines={1}>{prof.lastMsg}</Text>
                {prof.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{prof.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {activeTab === 'Annonces' && (
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={48} color={MUTED} />
            <Text style={styles.emptyText}>Aucune annonce pour le moment</Text>
          </View>
        )}
      </ScrollView>

      {/* New message button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.newMsgBtn}>
          <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.newMsgText}>Nouveau message</Text>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>Seuls les professeurs peuvent être contactés. Tu ne peux pas discuter avec d'autres élèves.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827', fontFamily: 'Montserrat-Bold' },
  tabs: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: PRIMARY },
  tabText: { fontSize: 14, color: MUTED, fontFamily: 'Montserrat-Medium' },
  tabTextActive: { color: PRIMARY, fontWeight: '700', fontFamily: 'Montserrat-Bold' },
  content: { paddingTop: 4 },
  chatRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  avatarContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarEmoji: { fontSize: 26 },
  chatInfo: { flex: 1 },
  chatMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  profName: { fontSize: 14, fontWeight: '700', color: '#111827', fontFamily: 'Montserrat-Bold' },
  chatTime: { fontSize: 12, color: MUTED, fontFamily: 'Montserrat-Regular' },
  chatPreview: { flexDirection: 'row', alignItems: 'center' },
  lastMsg: { flex: 1, fontSize: 13, color: MUTED, fontFamily: 'Montserrat-Regular' },
  unreadBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  unreadText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Montserrat-Bold' },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 },
  emptyText: { fontSize: 14, color: MUTED, fontFamily: 'Montserrat-Regular', textAlign: 'center' },
  bottomBar: { backgroundColor: '#FFFFFF', padding: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  newMsgBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: PRIMARY, borderRadius: 12, padding: 14, gap: 8, marginBottom: 10 },
  newMsgText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Montserrat-Bold' },
  disclaimer: { fontSize: 11, color: MUTED, textAlign: 'center', lineHeight: 16, fontFamily: 'Montserrat-Regular' },
});