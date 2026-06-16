import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY = '#0D6B5E';
const GOLD = '#D4A017';
const BG = '#F9FAFB';
const CARD = '#FFFFFF';
const TEXT = '#111827';
const MUTED = '#6B7280';

const paymentHistory = [
  { id: '1', type: 'Abonnement Annuel', date: '24/05/2024', amount: '299.00 €', status: 'Réussi' },
  { id: '2', type: 'Abonnement Mensuel', date: '24/04/2024', amount: '29.90 €', status: 'Réussi' },
  { id: '3', type: 'Abonnement Mensuel', date: '24/03/2024', amount: '29.90 €', status: 'Réussi' },
];

export default function StudentAbonnementScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Abonnement</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current plan */}
        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <Text style={styles.planLabel}>Plan actuel</Text>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>ACTIF</Text>
            </View>
          </View>
          <Text style={styles.planName}>Premium Annuel</Text>
          <Text style={styles.planExpiry}>Expire le 24 mai 2025</Text>
          <Text style={styles.planPrice}>299.00 € / an</Text>

          <View style={styles.planFeatures}>
            {['Accès à tous les cours', 'Quiz SAT illimités', 'Chat avec les professeurs', 'Mode SAT Simulé', 'Statistiques avancées'].map(feature => (
              <View key={feature} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color={GOLD} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Upgrade option */}
        <TouchableOpacity style={styles.upgradeCard}>
          <Ionicons name="flash" size={22} color={GOLD} />
          <View style={styles.upgradeInfo}>
            <Text style={styles.upgradeTitle}>Renouveler ou modifier</Text>
            <Text style={styles.upgradeDesc}>Gérer ton plan d'abonnement</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={MUTED} />
        </TouchableOpacity>

        {/* Payment history */}
        <Text style={styles.sectionTitle}>Historique des paiements</Text>
        {paymentHistory.map(payment => (
          <View key={payment.id} style={styles.paymentRow}>
            <View style={styles.paymentIcon}>
              <Ionicons name="calendar-outline" size={18} color={PRIMARY} />
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentType}>{payment.type}</Text>
              <Text style={styles.paymentDate}>{payment.date}</Text>
            </View>
            <View style={styles.paymentRight}>
              <Text style={styles.paymentAmount}>{payment.amount}</Text>
              <View style={styles.paymentStatus}>
                <Text style={styles.paymentStatusText}>{payment.status}</Text>
              </View>
            </View>
          </View>
        ))}

        {/* Manage subscription button */}
        <TouchableOpacity style={styles.manageBtn}>
          <Text style={styles.manageBtnText}>Gérer mon abonnement</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>Annuler mon abonnement</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: TEXT, fontFamily: 'Montserrat-Bold', textAlign: 'center' },
  content: { padding: 16 },
  planCard: { backgroundColor: PRIMARY, borderRadius: 16, padding: 20, marginBottom: 14 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  planLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'Montserrat-Regular' },
  activeBadge: { backgroundColor: '#10B981', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  activeBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Montserrat-Bold' },
  planName: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Montserrat-Bold' },
  planExpiry: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontFamily: 'Montserrat-Regular', marginTop: 4, marginBottom: 8 },
  planPrice: { fontSize: 18, fontWeight: '700', color: GOLD, fontFamily: 'Montserrat-Bold', marginBottom: 16 },
  planFeatures: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontFamily: 'Montserrat-Regular' },
  upgradeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 20, gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  upgradeInfo: { flex: 1 },
  upgradeTitle: { fontSize: 14, fontWeight: '700', color: TEXT, fontFamily: 'Montserrat-Bold' },
  upgradeDesc: { fontSize: 12, color: MUTED, fontFamily: 'Montserrat-Regular', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: TEXT, fontFamily: 'Montserrat-Bold', marginBottom: 12 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 8, gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  paymentIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F0FAF8', alignItems: 'center', justifyContent: 'center' },
  paymentInfo: { flex: 1 },
  paymentType: { fontSize: 13, fontWeight: '600', color: TEXT, fontFamily: 'Montserrat-SemiBold' },
  paymentDate: { fontSize: 12, color: MUTED, fontFamily: 'Montserrat-Regular', marginTop: 2 },
  paymentRight: { alignItems: 'flex-end' },
  paymentAmount: { fontSize: 14, fontWeight: '700', color: TEXT, fontFamily: 'Montserrat-Bold' },
  paymentStatus: { backgroundColor: '#ECFDF5', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 },
  paymentStatusText: { fontSize: 11, color: '#10B981', fontFamily: 'Montserrat-SemiBold' },
  manageBtn: { backgroundColor: PRIMARY, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20, marginBottom: 10 },
  manageBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Montserrat-Bold' },
  cancelBtn: { padding: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 13, color: '#EF4444', fontFamily: 'Montserrat-Medium' },
});