import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
  Linking,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as SecureStore from 'expo-secure-store';

// ─── Types ────────────────────────────────────────────────────────────────
interface Subscription {
  id: string;
  plan: 'FREE' | 'MONTHLY' | 'ANNUAL';
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  startDate: string;
  endDate: string | null;
  amount: number | null;
}

interface Payment {
  id: string;
  montant: number;
  devise: string;
  statut: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  plan: 'MONTHLY' | 'ANNUAL';
  codePromo: string | null;
  reductionPourcent: number;
  createdAt: string;
}

// ─── API helpers ─────────────────────────────────────────────────────────
const API_URL = 'http://192.168.1.5:3000/api/v1';

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await SecureStore.getItemAsync('accessToken');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...((options.headers as any) || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Erreur serveur');
  return data;
}

// ─── Plan labels ──────────────────────────────────────────────────────────
const PLAN_LABEL: Record<string, string> = {
  MONTHLY: 'Mensuel',
  ANNUAL: 'Annuel',
  FREE: 'Gratuit',
};

const PLAN_PRICE: Record<string, string> = {
  MONTHLY: '99 MAD / mois',
  ANNUAL: '899 MAD / an',
  FREE: 'Gratuit',
};

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── Subscription Card ─────────────────────────────────────────────────────
function SubscriptionCard({
  sub,
  onCheckout,
}: {
  sub: Subscription | null;
  onCheckout: (plan: 'MONTHLY' | 'ANNUAL') => void;
}) {
  if (!sub || sub.plan === 'FREE' || sub.status !== 'ACTIVE') {
    // No active paid subscription → show plans to subscribe
    return (
      <View style={styles.noSubCard}>
        <Ionicons name="lock-closed-outline" size={32} color="#0D6B5E" style={{ marginBottom: 12 }} />
        <Text style={styles.noSubTitle}>Aucun abonnement actif</Text>
        <Text style={styles.noSubSub}>Choisissez un plan pour accéder à tout le contenu BSTS</Text>

        <View style={styles.plansRow}>
          {/* Monthly */}
          <TouchableOpacity style={styles.planCard} onPress={() => onCheckout('MONTHLY')}>
            <Text style={styles.planCardTitle}>Mensuel</Text>
            <Text style={styles.planCardPrice}>99 MAD</Text>
            <Text style={styles.planCardPer}>/ mois</Text>
            <View style={styles.planCardBtn}>
              <Text style={styles.planCardBtnText}>Souscrire</Text>
            </View>
          </TouchableOpacity>

          {/* Annual */}
          <TouchableOpacity style={[styles.planCard, styles.planCardAnnual]} onPress={() => onCheckout('ANNUAL')}>
            <View style={styles.bestBadge}><Text style={styles.bestBadgeText}>⭐ Meilleur prix</Text></View>
            <Text style={[styles.planCardTitle, { color: '#fff' }]}>Annuel</Text>
            <Text style={[styles.planCardPrice, { color: '#fff' }]}>899 MAD</Text>
            <Text style={[styles.planCardPer, { color: '#ffffffaa' }]}>/ an · ~15% de remise</Text>
            <View style={[styles.planCardBtn, { backgroundColor: '#D4A017' }]}>
              <Text style={styles.planCardBtnText}>Souscrire</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isAnnual = sub.plan === 'ANNUAL';
  const daysLeft = sub.endDate
    ? Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <View style={[styles.subCard, isAnnual && styles.subCardAnnual]}>
      {isAnnual && (
        <View style={styles.bestValueBadge}>
          <Text style={styles.bestValueText}>⭐ Meilleur prix</Text>
        </View>
      )}

      <View style={styles.subCardTop}>
        <View style={styles.subIconWrap}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#0D6B5E" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.subPlanName}>Abonnement {PLAN_LABEL[sub.plan]}</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Actif</Text>
          </View>
        </View>
        <View style={styles.planBadge}>
          <Text style={styles.planText}>{PLAN_LABEL[sub.plan]}</Text>
        </View>
      </View>

      <View style={styles.subDivider} />

      <View style={styles.subDetails}>
        <View style={styles.subDetailItem}>
          <Text style={styles.subDetailLabel}>Montant</Text>
          <Text style={styles.subDetailValue}>
            {sub.amount ? `${Number(sub.amount).toFixed(0)} MAD` : PLAN_PRICE[sub.plan]}
          </Text>
        </View>
        <View style={styles.subDetailItem}>
          <Text style={styles.subDetailLabel}>Début</Text>
          <Text style={styles.subDetailValue}>{formatDate(sub.startDate)}</Text>
        </View>
        {sub.endDate && (
          <View style={styles.subDetailItem}>
            <Text style={styles.subDetailLabel}>Renouvellement</Text>
            <Text style={styles.subDetailValue}>{formatDate(sub.endDate)}</Text>
          </View>
        )}
      </View>

      {daysLeft !== null && daysLeft <= 7 && (
        <View style={styles.expiryWarning}>
          <Ionicons name="warning-outline" size={14} color="#E65100" />
          <Text style={styles.expiryWarningText}>Expire dans {daysLeft} jour{daysLeft > 1 ? 's' : ''}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.manageBtn}
        onPress={() =>
          Alert.alert(
            "Gérer l'abonnement",
            "Voulez-vous annuler votre abonnement ?",
            [
              { text: 'Non', style: 'cancel' },
              {
                text: 'Oui, annuler', style: 'destructive',
                onPress: () => Alert.alert('Info', 'Contactez le support pour annuler votre abonnement.'),
              },
            ]
          )
        }
      >
        <Text style={styles.manageBtnText}>Gérer l'abonnement</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── History Item ──────────────────────────────────────────────────────────
function HistoryItem({ item }: { item: Payment }) {
  const statusColor =
    item.statut === 'COMPLETED' ? '#2E7D32' :
    item.statut === 'FAILED'    ? '#E53935' :
    item.statut === 'REFUNDED'  ? '#F57C00' : '#888';

  const statusLabel =
    item.statut === 'COMPLETED' ? 'Payé' :
    item.statut === 'FAILED'    ? 'Échoué' :
    item.statut === 'REFUNDED'  ? 'Remboursé' : 'En attente';

  return (
    <View style={styles.historyRow}>
      <View style={styles.historyIcon}>
        <Ionicons name="receipt-outline" size={18} color="#0D6B5E" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.historyTitle}>
          Abonnement {PLAN_LABEL[item.plan]}
          {item.codePromo ? ` · ${item.codePromo}` : ''}
        </Text>
        <Text style={styles.historySub}>{formatDate(item.createdAt)}</Text>
        {item.reductionPourcent > 0 && (
          <Text style={styles.historyDiscount}>-{item.reductionPourcent}% de réduction</Text>
        )}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.historyAmount}>{Number(item.montant).toFixed(0)} {item.devise}</Text>
        <Text style={[styles.historyStatus, { color: statusColor }]}>{statusLabel}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────
export default function ParentPaiementsScreen({ navigation }: any) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments]         = useState<Payment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [promoCode, setPromoCode]       = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoResult, setPromoResult]   = useState<{ message: string; success: boolean } | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subRes, histRes] = await Promise.all([
        apiFetch('/payment/subscription'),
        apiFetch('/payment/history'),
      ]);
      setSubscription(subRes.subscription);
      setPayments(histRes.payments || []);
    } catch (e: any) {
      console.error('Error loading payment data:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPromo = async () => {
    if (!promoCode.trim()) return;
    try {
      setPromoLoading(true);
      setPromoResult(null);
      const data = await apiFetch('/payment/promo/verify', {
        method: 'POST',
        body: JSON.stringify({ code: promoCode.trim().toUpperCase() }),
      });
      setPromoResult({ message: `✅ ${data.reductionPourcent}% de réduction appliquée !`, success: true });
    } catch (e: any) {
      setPromoResult({ message: `❌ ${e.message}`, success: false });
    } finally {
      setPromoLoading(false);
    }
  };

  const handleCheckout = async (plan: 'MONTHLY' | 'ANNUAL') => {
    try {
      setCheckoutLoading(true);
      const data = await apiFetch('/payment/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan,
          codePromo: promoCode.trim().toUpperCase() || undefined,
        }),
      });
      // Ouvrir l'URL Stripe dans le navigateur
      if (data.url) {
        await Linking.openURL(data.url);
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de créer la session de paiement');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0D6B5E" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topbar}>
        <Text style={styles.topbarTitle}>Paiements</Text>
        <TouchableOpacity onPress={loadData} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color="#0D6B5E" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Abonnement actif ── */}
        <Text style={styles.sectionTitle}>Mon abonnement</Text>
        <SubscriptionCard sub={subscription} onCheckout={handleCheckout} />

        {checkoutLoading && (
          <View style={styles.checkoutLoading}>
            <ActivityIndicator size="small" color="#0D6B5E" />
            <Text style={styles.checkoutLoadingText}>Redirection vers le paiement...</Text>
          </View>
        )}

        {/* ── Code promo ── */}
        <View style={styles.promoCard}>
          <Ionicons name="pricetag-outline" size={20} color="#D4A017" />
          <TextInput
            style={styles.promoInput}
            placeholder="Code promo"
            placeholderTextColor="#AAA"
            value={promoCode}
            onChangeText={(t) => { setPromoCode(t); setPromoResult(null); }}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={styles.promoBtn}
            onPress={handleVerifyPromo}
            disabled={promoLoading}
          >
            {promoLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.promoBtnText}>Appliquer</Text>
            }
          </TouchableOpacity>
        </View>
        {promoResult && (
          <Text style={[styles.promoResult, { color: promoResult.success ? '#2E7D32' : '#E53935' }]}>
            {promoResult.message}
          </Text>
        )}

        {/* ── Historique ── */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Historique des paiements</Text>

        {payments.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Ionicons name="receipt-outline" size={36} color="#CCC" />
            <Text style={styles.emptyHistoryText}>Aucun paiement trouvé</Text>
          </View>
        ) : (
          <View style={styles.historyCard}>
            {payments.map((item, idx) => (
              <View key={item.id}>
                <HistoryItem item={item} />
                {idx < payments.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7F6' },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 8 },

  topbar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },
  topbarTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#0D6B5E18',
    alignItems: 'center', justifyContent: 'center',
  },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },

  // ── No sub card ──────────────────────────────────────────────────────────
  noSubCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 24,
    alignItems: 'center', marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
  },
  noSubTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 },
  noSubSub: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 20, lineHeight: 18 },

  plansRow: { flexDirection: 'row', gap: 12, width: '100%' },
  planCard: {
    flex: 1, backgroundColor: '#F5F7F6', borderRadius: 14,
    padding: 16, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  planCardAnnual: { backgroundColor: '#0D6B5E', borderColor: '#0D6B5E' },
  planCardTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  planCardPrice: { fontSize: 22, fontWeight: '800', color: '#0D6B5E' },
  planCardPer: { fontSize: 11, color: '#888', marginTop: 2, marginBottom: 12, textAlign: 'center' },
  planCardBtn: {
    backgroundColor: '#0D6B5E', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 8, width: '100%', alignItems: 'center',
  },
  planCardBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  bestBadge: {
    backgroundColor: '#D4A01730', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8,
  },
  bestBadgeText: { fontSize: 10, fontWeight: '700', color: '#D4A017' },

  // ── Active sub card ──────────────────────────────────────────────────────
  subCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18,
    marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
    position: 'relative', overflow: 'hidden',
  },
  subCardAnnual: { borderWidth: 1.5, borderColor: '#D4A01740' },
  bestValueBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: '#D4A01720', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  bestValueText: { fontSize: 10, fontWeight: '700', color: '#D4A017' },
  subCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  subIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#0D6B5E18',
    justifyContent: 'center', alignItems: 'center',
  },
  subPlanName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#2E7D32' },
  statusText: { fontSize: 12, color: '#2E7D32', fontWeight: '600' },
  planBadge: { backgroundColor: '#0D6B5E', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 },
  planText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  subDivider: { height: 1, backgroundColor: '#F0F0F0', marginBottom: 14 },
  subDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  subDetailItem: { minWidth: '28%' },
  subDetailLabel: { fontSize: 11, color: '#888', marginBottom: 3 },
  subDetailValue: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  expiryWarning: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF3E0', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7, marginBottom: 12,
  },
  expiryWarningText: { fontSize: 12, color: '#E65100', fontWeight: '600' },
  manageBtn: {
    borderWidth: 1.5, borderColor: '#0D6B5E',
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  manageBtnText: { fontSize: 13, fontWeight: '700', color: '#0D6B5E' },

  // ── Checkout loading ──────────────────────────────────────────────────────
  checkoutLoading: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    justifyContent: 'center', paddingVertical: 12,
  },
  checkoutLoadingText: { fontSize: 13, color: '#0D6B5E', fontWeight: '500' },

  // ── Promo ─────────────────────────────────────────────────────────────────
  promoCard: {
    backgroundColor: '#FFF9E6', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 6, borderWidth: 1, borderColor: '#D4A01730',
  },
  promoInput: {
    flex: 1, fontSize: 14, color: '#1A1A1A',
    fontWeight: '600', letterSpacing: 1,
  },
  promoBtn: {
    backgroundColor: '#D4A017', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8, minWidth: 80, alignItems: 'center',
  },
  promoBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  promoResult: { fontSize: 13, fontWeight: '600', marginBottom: 8, paddingHorizontal: 4 },

  // ── History ───────────────────────────────────────────────────────────────
  historyCard: {
    backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  historyRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, gap: 12,
  },
  historyIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#0D6B5E18',
    justifyContent: 'center', alignItems: 'center',
  },
  historyTitle: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  historySub: { fontSize: 11, color: '#888', marginTop: 2 },
  historyDiscount: { fontSize: 11, color: '#2E7D32', marginTop: 2, fontWeight: '600' },
  historyAmount: { fontSize: 14, fontWeight: '800', color: '#1A1A1A' },
  historyStatus: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#F0F0F0' },

  emptyHistory: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyHistoryText: { fontSize: 14, color: '#AAA', fontWeight: '500' },
});