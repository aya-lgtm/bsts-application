// screens/SUPER_ADMIN/SuperAdminSettingsScreen.tsx
// Paramètres de l'application — informations générales, abonnements & tarifs,
// emails & notifications, sauvegardes, politique & mentions légales

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, Alert, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#0D6B5E', primaryLight: '#E1F5EE',
  gold: '#D4A017', goldLight: '#FFF8E7',
  white: '#FFFFFF', background: '#F5F5F0',
  textPrimary: '#1A1A1A', textSecondary: '#6B6B6B', textMuted: '#9E9E9E',
  border: '#E8E8E8', danger: '#E24B4A',
};

interface NavigationProp {
  navigate: (screen: string, params?: Record<string, any>) => void;
  goBack?: () => void;
}
interface Props { navigation: NavigationProp; }

const SettingRow = ({
  icon, label, sublabel, onPress, rightElement, danger,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}) => (
  <TouchableOpacity
    style={styles.settingRow}
    onPress={onPress}
    activeOpacity={onPress ? 0.7 : 1}
    disabled={!onPress}
  >
    <View style={[styles.settingIconWrap, danger && styles.settingIconWrapDanger]}>
      <Ionicons name={icon as any} size={18} color={danger ? COLORS.danger : COLORS.primary} />
    </View>
    <View style={styles.settingInfo}>
      <Text style={[styles.settingLabel, danger && styles.settingLabelDanger]}>{label}</Text>
      {sublabel ? <Text style={styles.settingSubLabel}>{sublabel}</Text> : null}
    </View>
    {rightElement ?? (onPress ? <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} /> : null)}
  </TouchableOpacity>
);

const SectionTitle = ({ label }: { label: string }) => (
  <Text style={styles.sectionTitle}>{label}</Text>
);

const Divider = () => <View style={styles.divider} />;

export default function SuperAdminSettingsScreen({ navigation }: Props) {
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const handleSauvegarde = () => {
    Alert.alert('Sauvegarde', 'Lancer une sauvegarde manuelle des données ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Lancer', onPress: () => Alert.alert('✅', 'Sauvegarde lancée avec succès') },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Paramètres</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Informations générales */}
        <SectionTitle label="Informations générales" />
        <View style={styles.card}>
          <SettingRow
            icon="information-circle-outline"
            label="Informations générales"
            sublabel="Nom, logo, contact..."
            onPress={() => Alert.alert('À venir', 'Édition des infos générales')}
          />
          <Divider />
          <SettingRow
            icon="construct-outline"
            label="Paramètres de l'application"
            sublabel="Général, maintenance, sécurité..."
            rightElement={
              <Switch
                value={maintenanceMode}
                onValueChange={setMaintenanceMode}
                trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                thumbColor={maintenanceMode ? COLORS.primary : '#fff'}
              />
            }
          />
        </View>

        {/* Abonnements & Tarifs */}
        <SectionTitle label="Abonnements & Tarifs" />
        <View style={styles.card}>
          <SettingRow
            icon="card-outline"
            label="Abonnements & Tarifs"
            sublabel="Gérer les plans et les prix..."
            onPress={() => Alert.alert('À venir', 'Gestion des tarifs')}
          />
          <Divider />
          <SettingRow
            icon="pricetag-outline"
            label="Codes promo"
            sublabel="Créer et gérer les codes promotionnels"
            onPress={() => Alert.alert('À venir', 'Gestion des codes promo')}
          />
          <Divider />
          <SettingRow
            icon="cash-outline"
            label="Paiements & Commissions"
            sublabel="Commissions, méthodes de paiement..."
            onPress={() => navigation.navigate('SuperAdminPayments')}
          />
        </View>

        {/* Emails & Notifications */}
        <SectionTitle label="Emails & Notifications" />
        <View style={styles.card}>
          <SettingRow
            icon="mail-outline"
            label="Notifications email"
            sublabel="Activer les emails automatiques"
            rightElement={
              <Switch
                value={emailNotifs}
                onValueChange={setEmailNotifs}
                trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                thumbColor={emailNotifs ? COLORS.primary : '#fff'}
              />
            }
          />
          <Divider />
          <SettingRow
            icon="notifications-outline"
            label="Notifications push"
            sublabel="Activer les notifications push"
            rightElement={
              <Switch
                value={pushNotifs}
                onValueChange={setPushNotifs}
                trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                thumbColor={pushNotifs ? COLORS.primary : '#fff'}
              />
            }
          />
          <Divider />
          <SettingRow
            icon="settings-outline"
            label="Configurer les emails système"
            sublabel="Templates, expéditeurs..."
            onPress={() => Alert.alert('À venir', 'Configuration des emails')}
          />
        </View>

        {/* Sauvegardes */}
        <SectionTitle label="Sauvegardes" />
        <View style={styles.card}>
          <SettingRow
            icon="cloud-upload-outline"
            label="Sauvegardes"
            sublabel="Sauvegarder et restaurer les données"
            onPress={handleSauvegarde}
          />
        </View>

        {/* Politique & Mentions légales */}
        <SectionTitle label="Politique & Mentions légales" />
        <View style={styles.card}>
          <SettingRow
            icon="document-text-outline"
            label="Politique & Mentions légales"
            sublabel="CGU, Confidentialité, Conditions..."
            onPress={() => Alert.alert('À venir', 'Gestion des mentions légales')}
          />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  topBar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, backgroundColor: COLORS.white },
  topBarTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.3 },

  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: 20, marginBottom: 8, marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.white, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  settingIconWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  settingIconWrapDanger: { backgroundColor: '#FDECEC' },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  settingLabelDanger: { color: COLORS.danger },
  settingSubLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 14 },
});