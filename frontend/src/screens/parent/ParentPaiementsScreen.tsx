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
  RefreshControl,
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

// ─── API ──────────────────────────────────────────────────────────────────
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

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── Active subscription banner (image 1) ────────────────────────────────
function ActiveSubBanner({ sub }: { sub: Subscription }) {
  const isAnnual = sub.plan === 'ANNUAL';
  const planLabel = isAnnual ? 'ANNUEL' : 'MENSUEL';
  const price = sub.amount
    ? `${Number(sub.amount).toFixed(2)} MAD / ${isAnnual ? 'an' : 'mois'}`
    : isAnnual ? '899 MAD / an' : '99 MAD / mois';

  return (
    <View style={styles.activeBanner}>
      <View style={styles.activeBannerLeft}>
        <Text style={styles.activeBannerEyebrow}>Abonnement actuel</Text>
        <Text style={styles.activeBannerPlan}>{planLabel}</Text>
        {sub.endDate && (
          <Text style={styles.activeBannerExpiry}>
            Expire le {formatDate(sub.endDate)}
          </Text>
        )}
      </View>
      <View style={styles.activeBannerRight}>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>ACTIF</Text>
        </View>
        <Text style={styles.activeBannerPrice}>{price}</Text>
      </View>
    </View>
  );
}

// ─── Plan selector (image 2) ──────────────────────────────────────────────
function PlanSelector({ onCheckout }: { onCheckout: (plan: 'MONTHLY' | 'ANNUAL') => void }) {
  const [selected, setSelected] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL');

  return (
    <View style={styles.planSelectorWrap}>
      <Text style={styles.planSelectorTitle}>Choisir un plan</Text>
      <View style={styles.planSelectorRow}>
        {/* Mensuel */}
        <TouchableOpacity
          style={[styles.planOption, selected === 'MONTHLY' && styles.planOptionSelected]}
          onPress={() => setSelected('MONTHLY')}
          activeOpacity={0.85}
        >
          <Ionicons name="calendar-outline" size={22} color={selected === 'MONTHLY' ? '#0D6B5E' : '#888'} />
          <Text style={[styles.planOptionLabel, selected === 'MONTHLY' && styles.planOptionLabelSelected]}>
            Mensuel
          </Text>
          <Text style={[styles.planOptionPrice, selected === 'MONTHLY' && styles.planOptionPriceSelected]}>
            99 MAD / mois
          </Text>
          <Text style={styles.planOptionSub}>Facturation mensuelle</Text>
          {selected === 'MONTHLY' && (
            <View style={styles.planCheckWrap}>
              <Ionicons name="checkmark-circle" size={22} color="#0D6B5E" />
            </View>
          )}
        </TouchableOpacity>

        {/* Annuel */}
        <TouchableOpacity
          style={[styles.planOption, selected === 'ANNUAL' && styles.planOptionSelected]}
          onPress={() => setSelected('ANNUAL')}
          activeOpacity={0.85}
        >
          <Ionicons name="ribbon-outline" size={22} color={selected === 'ANNUAL' ? '#D4A017' : '#888'} />
          <Text style={[styles.planOptionLabel, selected === 'ANNUAL' && styles.planOptionLabelSelected]}>
            Annuel
          </Text>
          <Text style={[styles.planOptionPrice, selected === 'ANNUAL' && styles.planOptionPriceSelected]}>
            899 MAD / an
          </Text>
          <Text style={[styles.planSavings, { color: selected === 'ANNUAL' ? '#D4A017' : '#AAA' }]}>
            Économisez ~15%
          </Text>
          {selected === 'ANNUAL' && (
            <View style={styles.planCheckWrap}>
              <Ionicons name="checkmark-circle" size={22} color="#0D6B5E" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Actions */}
      <TouchableOpacity style={styles.actionRow} onPress={() => onCheckout(selected)} activeOpacity={0.85}>
        <View style={styles.actionRowLeft}>
          <Ionicons name="refresh-outline" size={18} color="#0D6B5E" />
          <Text style={styles.actionRowText}>Souscrire à l'abonnement</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#CCC" />
      </TouchableOpacity>

      <View style={styles.actionDivider} />

      <TouchableOpacity
        style={styles.actionRow}
        onPress={() => Alert.alert('Annulation', 'Contactez le support pour annuler votre abonnement.')}
        activeOpacity={0.85}
      >
        <View style={styles.actionRowLeft}>
          <Ionicons name="close-circle-outline" size={18} color="#E53935" />
          <Text style={[styles.actionRowText, { color: '#E53935' }]}>Annuler l'abonnement</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#CCC" />
      </TouchableOpacity>
    </View>
  );
}

// ─── History Item ─────────────────────────────────────────────────────────
function HistoryItem({ item, isLast }: { item: Payment; isLast: boolean }) {
  const isPaid   = item.statut === 'COMPLETED';
  const isFailed = item.statut === 'FAILED';
  const statusLabel =
    isPaid   ? 'Réussi' :
    isFailed ? 'Échoué' :
    item.statut === 'REFUNDED' ? 'Remboursé' : 'En attente';
  const statusColor = isPaid ? '#2E7D32' : isFailed ? '#E53935' : item.statut === 'REFUNDED' ? '#F57C00' : '#888';
  const planLabel = item.plan === 'ANNUAL' ? 'Abonnement Annuel' : 'Abonnement Mensuel';

  return (
    <View style={[styles.histRow, !isLast && styles.histRowBorder]}>
      <View style={styles.histIconWrap}>
        <Ionicons name="card-outline" size={18} color="#0D6B5E" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.histTitle}>{planLabel}</Text>
        <Text style={styles.histDate}>{formatDate(item.createdAt)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.histAmount}>{Number(item.montant).toFixed(2)} {item.devise}</Text>
        <View style={[styles.histStatusBadge, { backgroundColor: statusColor + '18' }]}>
          <Text style={[styles.histStatusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────
export default function ParentPaiementsScreen({ navigation }: any) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments,     setPayments]     = useState<Payment[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [promoCode,    setPromoCode]    = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoResult,  setPromoResult]  = useState<{ message: string; success: boolean } | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async (isRefresh = false) => {
  try {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const [subRes, histRes] = await Promise.all([
      apiFetch('/payment/subscription'),
      apiFetch('/payment/history'),
    ]);
    setSubscription(subRes.subscription);
    setPayments(histRes.payments || []);
  } catch (e: any) {
    console.error('Payment error:', e.message);
  } finally {
    setLoading(false);
    setRefreshing(false);
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
      if (data.url) await Linking.openURL(data.url);
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de créer la session de paiement');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const hasActiveSub = subscription && subscription.plan !== 'FREE' && subscription.status === 'ACTIVE';

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
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={                          // ← ajouter ce prop
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => loadData(true)}
      tintColor="#0D6B5E"
    />
  }
      >
        {/* ── Abonnement ── */}
        {hasActiveSub
          ? <ActiveSubBanner sub={subscription!} />
          : <PlanSelector onCheckout={handleCheckout} />
        }

        {checkoutLoading && (
          <View style={styles.checkoutRow}>
            <ActivityIndicator size="small" color="#0D6B5E" />
            <Text style={styles.checkoutText}>Redirection vers le paiement…</Text>
          </View>
        )}

        {/* ── Code promo ── */}
        <Text style={styles.sectionLabel}>Code promo</Text>
        <View style={styles.promoCard}>
          <TextInput
            style={styles.promoInput}
            placeholder="Entrez votre code promo"
            placeholderTextColor="#BBBBBB"
            value={promoCode}
            onChangeText={(t) => { setPromoCode(t); setPromoResult(null); }}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={[styles.promoBtn, promoLoading && { opacity: 0.6 }]}
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
        <Text style={styles.sectionLabel}>Historique des paiements</Text>
        <View style={styles.histCard}>
          {payments.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="receipt-outline" size={36} color="#CCC" />
              <Text style={styles.emptyText}>Aucun paiement</Text>
            </View>
          ) : (
            payments.map((item, idx) => (
              <HistoryItem key={item.id} item={item} isLast={idx === payments.length - 1} />
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#FFFFFF' },
  scroll:    { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },

  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 115,
    paddingBottom: 12,
  },
  topbarTitle: { fontSize: 25, 
    fontWeight: '800', 
    color: '#0D6B5E',
    position: 'absolute', // Positionnement absolu
    left: 0,              // Pour ignorer le flux normal
    right: 0,             // Pour ignorer le flux normal
    textAlign: 'center',  // Centrage du texte 
    paddingTop: 30, },

  sectionLabel: {
    fontSize: 15, fontWeight: '700', color: '#1A1A1A',
    marginTop: 24, marginBottom: 12,
  },

  // ── Active banner ─────────────────────────────────────────────────────────
  activeBanner: {
    backgroundColor: '#0D6B5E',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  activeBannerLeft: { flex: 1 },
  activeBannerEyebrow: {
    fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: 4,
  },
  activeBannerPlan: {
    fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginBottom: 6,
  },
  activeBannerExpiry: {
    fontSize: 13, color: 'rgba(255,255,255,0.75)',
  },
  activeBannerRight: { alignItems: 'flex-end', gap: 10 },
  activeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  activeBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  activeBannerPrice: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },

  // ── Plan selector ─────────────────────────────────────────────────────────
  planSelectorWrap: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#E8E8E8',
    overflow: 'hidden', marginTop: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  planSelectorTitle: {
    fontSize: 17, fontWeight: '700', color: '#1A1A1A',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    textAlign: 'center',
  },
  planSelectorRow: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 16, paddingBottom: 16,
  },
  planOption: {
    flex: 1, borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#E8E8E8',
    backgroundColor: '#F7F8FA',
    alignItems: 'center', gap: 4,
    position: 'relative',
  },
  planOptionSelected: {
    borderColor: '#0D6B5E', backgroundColor: '#fff',
  },
  planOptionLabel: { fontSize: 14, fontWeight: '700', color: '#888', marginTop: 6 },
  planOptionLabelSelected: { color: '#1A1A1A' },
  planOptionPrice: { fontSize: 15, fontWeight: '800', color: '#888' },
  planOptionPriceSelected: { color: '#1A1A1A' },
  planOptionSub: { fontSize: 11, color: '#AAA', marginTop: 2 },
  planSavings:   { fontSize: 11, fontWeight: '700', marginTop: 2 },
  planCheckWrap: { position: 'absolute', top: 8, right: 8 },

  actionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  actionRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionRowText: { fontSize: 14, color: '#1A1A1A', fontWeight: '500' },
  actionDivider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 16 },

  // ── Checkout ──────────────────────────────────────────────────────────────
  checkoutRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    justifyContent: 'center', paddingVertical: 12,
  },
  checkoutText: { fontSize: 13, color: '#0D6B5E', fontWeight: '500' },

  // ── Promo ─────────────────────────────────────────────────────────────────
  promoCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: '#E8E8E8',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  promoInput: {
    flex: 1, fontSize: 14, color: '#1A1A1A',
    fontWeight: '500', paddingVertical: 10,
  },
  promoBtn: {
    backgroundColor: '#1A1A1A', borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  promoBtnText:  { fontSize: 13, fontWeight: '700', color: '#fff' },
  promoResult:   { fontSize: 13, fontWeight: '600', marginTop: 8, paddingLeft: 4 },

  // ── History ───────────────────────────────────────────────────────────────
  histCard: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#E8E8E8',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  histRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  histRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  histIconWrap: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#0D6B5E18',
    alignItems: 'center', justifyContent: 'center',
  },
  histTitle:  { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  histDate:   { fontSize: 11, color: '#888', marginTop: 2 },
  histAmount: { fontSize: 14, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  histStatusBadge: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  histStatusText: { fontSize: 11, fontWeight: '700' },

  emptyWrap: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 13, color: '#AAA', fontWeight: '500' },
});