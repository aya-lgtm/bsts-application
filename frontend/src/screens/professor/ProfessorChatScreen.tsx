import React, { useState } from 'react'
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, TextInput
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const COLORS = {
  primary: '#0D6B5E',
  primaryLight: '#E8F5F3',
  bg: '#F7F8FA',
  white: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  unread: '#EF4444',
}

const conversations = [
  { id: '1', name: 'Adam Khan', preview: 'Merci professeur ! 🙏', time: '09:42', unread: 2, initials: 'AK', isGroup: false },
  { id: '2', name: 'Lina Khan', preview: "D'accord, merci beaucoup !", time: 'Hier', unread: 1, initials: 'LK', isGroup: false },
  { id: '3', name: 'Yassine Khan', preview: 'Pouvez-vous expliquer la question 15...', time: 'Hier', unread: 0, initials: 'YK', isGroup: false },
  { id: '4', name: 'Zara Ahmed', preview: 'Quand sera disponible le prochain test ?', time: '12 Mai', unread: 0, initials: 'ZA', isGroup: false },
  { id: '5', name: 'Mock SAT Group', preview: 'Vous : Nouveau test disponible demain', time: '12 Mai', unread: 0, initials: 'MSG', isGroup: true },
]

const groupConversations = [
  { id: '5', name: 'Mock SAT Group', preview: 'Vous : Nouveau test disponible demain', time: '12 Mai', unread: 0, initials: 'MSG', isGroup: true },
  { id: '6', name: 'SAT Math Avancé', preview: 'Adam: Question sur le module 3', time: '11 Mai', unread: 3, initials: 'SMA', isGroup: true },
]

interface Props {
  onNavigate: (screen: string, params?: any) => void
}

export default function ProfessorChatScreen({ onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState<'individuel' | 'groupes'>('individuel')
  const [search, setSearch] = useState('')

  const data = activeTab === 'individuel' ? conversations : groupConversations
  const filtered = search ? data.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) : data

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Chat</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn}><Text style={styles.iconText}>🔍</Text></TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}><Text style={styles.iconText}>✏️</Text></TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'individuel' && styles.tabActive]}
          onPress={() => setActiveTab('individuel')}
        >
          <Text style={[styles.tabText, activeTab === 'individuel' && styles.tabTextActive]}>Individuel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'groupes' && styles.tabActive]}
          onPress={() => setActiveTab('groupes')}
        >
          <Text style={[styles.tabText, activeTab === 'groupes' && styles.tabTextActive]}>Groupes</Text>
        </TouchableOpacity>
      </View>

      {/* Conversation List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <View style={[styles.avatar, { backgroundColor: item.isGroup ? '#7C3AED' : COLORS.primary }]}>
              <Text style={styles.avatarText}>{item.initials}</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardTop}>
                <Text style={styles.convName}>{item.name}</Text>
                <Text style={styles.convTime}>{item.time}</Text>
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.preview} numberOfLines={1}>{item.preview}</Text>
                {item.unread > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  headerIcons: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 6 },
  iconText: { fontSize: 20 },
  tabsRow: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    paddingHorizontal: 16, paddingVertical: 10, gap: 10,
  },
  tab: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: 12, backgroundColor: COLORS.bg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white },
  list: { padding: 16, gap: 4 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    gap: 12,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  convName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  convTime: { fontSize: 12, color: COLORS.textSecondary },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  preview: { fontSize: 13, color: COLORS.textSecondary, flex: 1, marginRight: 8 },
  badge: {
    backgroundColor: COLORS.unread, width: 20, height: 20,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
})