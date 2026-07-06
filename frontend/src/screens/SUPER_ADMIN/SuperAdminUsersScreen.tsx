// screens/SUPER_ADMIN/SuperAdminUsersScreen.tsx
// Liste TOUS les utilisateurs depuis GET /api/v1/users (endpoint existant ✅)
// Filtre par rôle, recherche par nom/email, suppression

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Image,
  ActivityIndicator, RefreshControl, StyleSheet, SafeAreaView,
  StatusBar, Alert, FlatList,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../../services/auth.service';

const COLORS = {
  primary:      '#0D6B5E',
  primaryLight: '#E1F5EE',
  gold:         '#D4A017',
  goldLight:    '#FFF8E7',
  white:        '#FFFFFF',
  background:   '#F5F5F0',
  textPrimary:  '#1A1A1A',
  textSecondary:'#6B6B6B',
  textMuted:    '#9E9E9E',
  border:       '#E8E8E8',
  success:      '#4CAF50',
  danger:       '#E24B4A',
  warning:      '#F59E0B',
};

// ─── Types ────────────────────────────────────────────────────────────────
type RoleFilter = 'ALL' | 'STUDENT' | 'PROFESSOR' | 'COLLEGE_STUDENT' | 'PARENT' | 'ADMIN' | 'SUPER_ADMIN';

interface UserItem {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  photo?: string | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
}

interface NavigationProp {
  navigate: (screen: string, params?: Record<string, any>) => void;
}
interface Props { navigation: NavigationProp; }

// ─── Constantes ───────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  STUDENT:         'Étudiant',
  PROFESSOR:       'Professeur',
  COLLEGE_STUDENT: 'Ancien étudiant',
  PARENT:          'Parent',
  ADMIN:           'Admin',
  SUPER_ADMIN:     'Super Admin',
};

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  STUDENT:         { bg: COLORS.primaryLight, text: COLORS.primary },
  PROFESSOR:       { bg: '#EAF2FF',           text: '#3B82F6' },
  COLLEGE_STUDENT: { bg: COLORS.goldLight,    text: COLORS.gold },
  PARENT:          { bg: '#F3E8FF',           text: '#9333EA' },
  ADMIN:           { bg: '#FDECEC',           text: COLORS.danger },
  SUPER_ADMIN:     { bg: '#FDECEC',           text: COLORS.danger },
};

const FILTERS: { key: RoleFilter; label: string }[] = [
  { key: 'ALL',             label: 'Tous' },
  { key: 'STUDENT',         label: 'Étudiants' },
  { key: 'PROFESSOR',       label: 'Professeurs' },
  { key: 'COLLEGE_STUDENT', label: 'Anciens' },
  { key: 'PARENT',          label: 'Parents' },
  { key: 'ADMIN',           label: 'Admins' },
];

function formatJoinDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return ''; }
}

// ─── Fetch ────────────────────────────────────────────────────────────────
// Endpoint existant : GET /api/v1/users → { users: [...] }
// Retourne TOUS les utilisateurs (protégé ADMIN/SUPER_ADMIN)
const fetchAllUsers = async (): Promise<UserItem[]> => {
  const res = await api.get('/users');
  const list: any[] = res.data?.users ?? [];
  return list.map((u: any) => ({
    id:         u.id,
    nom:        u.nom        ?? '',
    prenom:     u.prenom     ?? '',
    email:      u.email      ?? '',
    role:       u.role       ?? 'STUDENT',
    photo:      u.photo      ?? null,
    isActive:   u.isActive   ?? true,
    isVerified: u.isVerified ?? false,
    createdAt:  u.createdAt  ?? '',
  }));
};

// ─── Composant carte utilisateur ─────────────────────────────────────────
const UserCard = ({
  user,
  onDelete,
}: {
  user: UserItem;
  onDelete: () => void;
}) => {
  const initiales = `${user.prenom?.[0] ?? ''}${user.nom?.[0] ?? ''}`.toUpperCase() || '?';
  const roleConf  = ROLE_COLORS[user.role] ?? { bg: COLORS.background, text: COLORS.textMuted };

  return (
    <View style={styles.userCard}>
      {/* Avatar */}
      {user.photo ? (
        <Image source={{ uri: user.photo }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarInitials}>{initiales}</Text>
        </View>
      )}

      {/* Infos */}
      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>
          {user.prenom} {user.nom}
        </Text>
        <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>

        <View style={styles.userMetaRow}>
          {/* Badge rôle */}
          <View style={[styles.roleBadge, { backgroundColor: roleConf.bg }]}>
            <Text style={[styles.roleBadgeText, { color: roleConf.text }]}>
              {ROLE_LABELS[user.role] ?? user.role}
            </Text>
          </View>
          {/* Badge statut */}
          <View style={[
            styles.statusBadge,
            user.isActive ? styles.statusActive : styles.statusSuspended,
          ]}>
            <Text style={[
              styles.statusText,
              user.isActive ? styles.statusTextActive : styles.statusTextSuspended,
            ]}>
              {user.isActive ? 'Actif' : 'Suspendu'}
            </Text>
          </View>
        </View>

        <Text style={styles.userDate}>
          Inscrit le {formatJoinDate(user.createdAt)}
        </Text>
      </View>

      {/* Action supprimer */}
      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={8}>
        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
      </TouchableOpacity>
    </View>
  );
};

// ─── Écran principal ──────────────────────────────────────────────────────
export default function SuperAdminUsersScreen({ navigation }: Props) {
  const [users,      setUsers]      = useState<UserItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState<RoleFilter>('ALL');
  const [error,      setError]      = useState(false);

  // ── Chargement ────────────────────────────────────────────────────────
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else           setLoading(true);
      setError(false);

      const result = await fetchAllUsers();
      // Trier : admins/super_admin en premier, puis par date décroissante
      result.sort((a, b) => {
        const priority = (role: string) =>
          role === 'SUPER_ADMIN' ? 0
          : role === 'ADMIN'     ? 1
          : role === 'PROFESSOR' ? 2
          : role === 'COLLEGE_STUDENT' ? 3
          : role === 'PARENT'    ? 4
          : 5;
        if (priority(a.role) !== priority(b.role)) return priority(a.role) - priority(b.role);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setUsers(result);
    } catch (err) {
      console.error('[SuperAdminUsersScreen] Erreur:', err);
      setError(true);
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Filtrage + recherche ──────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    let list = users;

    if (filter !== 'ALL') {
      list = list.filter((u) => u.role === filter);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (u) =>
          u.nom.toLowerCase().includes(q) ||
          u.prenom.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (ROLE_LABELS[u.role] ?? '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [users, filter, search]);

  // ── Compteurs par rôle (pour les badges de filtre) ───────────────────
  const countByRole = useMemo(() => {
    const counts: Record<string, number> = { ALL: users.length };
    users.forEach((u) => {
      counts[u.role] = (counts[u.role] ?? 0) + 1;
    });
    return counts;
  }, [users]);

  // ── Suppression ───────────────────────────────────────────────────────
  const handleDelete = (user: UserItem) => {
    Alert.alert(
      'Supprimer cet utilisateur ?',
      `${user.prenom} ${user.nom} (${user.email}) sera définitivement supprimé.\n\nCette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/users/${user.id}`);
              setUsers((prev) => prev.filter((u) => u.id !== user.id));
              Alert.alert('✅', `${user.prenom} ${user.nom} a été supprimé.`);
            } catch (err: any) {
              Alert.alert('Erreur', err?.response?.data?.message ?? 'Impossible de supprimer cet utilisateur');
            }
          },
        },
      ]
    );
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Utilisateurs</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('SuperAdminCreateUser')}
        >
          <Ionicons name="add" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom, email, rôle..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtres par rôle */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count  = countByRole[f.key] ?? 0;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {f.label}
              </Text>
              {count > 0 && (
                <View style={[styles.filterCount, active && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Résultat count */}
      {!loading && (
        <View style={styles.resultRow}>
          <Text style={styles.resultText}>
            {filteredUsers.length} utilisateur{filteredUsers.length !== 1 ? 's' : ''}
            {filter !== 'ALL' ? ` · ${ROLE_LABELS[filter] ?? filter}` : ''}
            {search ? ` · "${search}"` : ''}
          </Text>
          {!loading && users.length > 0 && (
            <TouchableOpacity onPress={() => loadData(true)}>
              <Ionicons name="refresh-outline" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Contenu */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement des utilisateurs...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={40} color={COLORS.textMuted} />
          <Text style={styles.errorText}>Impossible de charger les utilisateurs</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : filteredUsers.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={40} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>
            {search
              ? `Aucun résultat pour "${search}"`
              : 'Aucun utilisateur dans cette catégorie'}
          </Text>
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearSearch}>Effacer la recherche</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          renderItem={({ item }) => (
            <UserCard
              user={item}
              onDelete={() => handleDelete(item)}
            />
          )}
          ListFooterComponent={<View style={{ height: 24 }} />}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.white },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 12,
  },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12,
  },
  topBarTitle: { fontSize: 25, fontWeight: '800', color: COLORS.primary },
  addBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
  },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: COLORS.background, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },

  filterScroll:  { flexGrow: 0, marginBottom: 8 },
  filterContent: { paddingHorizontal: 20, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.background, marginRight: 8,
  },
  filterChipActive:      { backgroundColor: COLORS.primary },
  filterChipText:        { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  filterChipTextActive:  { color: COLORS.white },
  filterCount: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  filterCountActive:     { backgroundColor: 'rgba(255,255,255,0.3)' },
  filterCountText:       { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  filterCountTextActive: { color: COLORS.white },

  resultRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 8,
  },
  resultText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },

  listContent: { paddingHorizontal: 20, paddingTop: 4 },

  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.white, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarPlaceholder: {
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: 16, fontWeight: '800', color: COLORS.primary },

  userInfo:    { flex: 1 },
  userName:    { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  userEmail:   { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },
  userMetaRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  userDate:    { fontSize: 11, color: COLORS.textMuted },

  roleBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  roleBadgeText: { fontSize: 10, fontWeight: '700' },

  statusBadge:          { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusActive:         { backgroundColor: COLORS.primaryLight },
  statusSuspended:      { backgroundColor: '#FDECEC' },
  statusText:           { fontSize: 10, fontWeight: '700' },
  statusTextActive:     { color: COLORS.primary },
  statusTextSuspended:  { color: COLORS.danger },

  deleteBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#FDECEC', alignItems: 'center', justifyContent: 'center',
  },

  loadingText: { fontSize: 13, color: COLORS.textMuted, marginTop: 8 },
  errorText:   { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  emptyText:   { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
  clearSearch: { fontSize: 13, color: COLORS.primary, fontWeight: '600', marginTop: 4 },
  retryBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 10, marginTop: 8,
  },
  retryBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
});