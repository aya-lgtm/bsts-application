// screens/student/StudentAbonnementScreen.tsx
//
// ✅ Plan actuel + features + barre durée restante
// ✅ Badge statut : ACTIF / EXPIRÉ / ANNULÉ
// ✅ Bouton "Annuler mon abonnement" visible quand abonnement actif
// ✅ État expiré/annulé avec message + CTA renouvellement
// ✅ Sélecteur de plan si pas abonné
// ✅ Code promo
// ✅ Historique des paiements avec statuts colorés
// ✅ Erreur chargement visible pour l'utilisateur
// ✅ Pull-to-refresh

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  TextInput,
  Linking,
  RefreshControl,
  DimensionValue,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/auth.service';

// ─── COULEURS ──────────────────────────────────────────────────────────────────
const C = {
  primary:   '#0D6B5E',
  primaryBg: '#E8F5F2',
  gold:      '#D4A017',
  white:     '#FFFFFF',
  bg:        '#F9FAFB',
  text:      '#1A1A1A',
  muted:     '#888888',
  border:    '#E8E8E8',
  danger:    '#E53935',
  success:   '#2E7D32',
  warning:   '#F57C00',
};

// ─── TYPES ─────────────────────────────────────────────────────────────────────
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

// ─── HELPERS ───────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function getErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const e = err as { response?: { data?: { message?: string } } };
    if (e.response?.data?.message) return e.response.data.message;
  }
  if (err instanceof Error) return err.message;
  return 'Une erreur est survenue';
}

// Calcule le % de durée restante pour la barre de progression
function calcDurationProgress(startDate: string, endDate: string | null): number {
  if (!endDate) return 100;
  const start = new Date(startDate).getTime();
  const end   = new Date(endDate).getTime();
  const now   = Date.now();
  if (now >= end) return 0;
  if (now <= start) return 100;
  return Math.round(((end - now) / (end - start)) * 100);
}

// Jours restants
function daysLeft(endDate: string | null): number {
  if (!endDate) return 0;
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

// ─── FEATURES INCLUSES ────────────────────────────────────────────────────────
const PLAN_FEATURES = [
  'Accès à tous les cours',
  'Quiz SAT illimités',
  'Chat avec les professeurs',
  'Mode SAT Simulé',
  'Statistiques avancées',
  'Support prioritaire',
];

// ─── BANNIÈRE ABONNEMENT ACTIF ─────────────────────────────────────────────────
function ActiveSubBanner({
  sub,
  onCancel,
}: {
  sub: Subscription;
  onCancel: () => void;
}) {
  const isAnnual  = sub.plan === 'ANNUAL';
  const planLabel = isAnnual ? 'ANNUEL' : 'MENSUEL';
  const price     = sub.amount
    ? `${Number(sub.amount).toFixed(2)} MAD / ${isAnnual ? 'an' : 'mois'}`
    : isAnnual ? '899 MAD / an' : '99 MAD / mois';

  const remaining = sub.endDate ? calcDurationProgress(sub.startDate, sub.endDate) : 100;
  const days      = daysLeft(sub.endDate);
  const progressW: DimensionValue = `${remaining}%` as DimensionValue;

  // Couleur barre selon urgence
  const barColor = days < 15 ? C.danger : days < 30 ? C.warning : C.gold;

  return (
    <View>
      {/* Carte principale */}
      <View style={styles.activeBanner}>
        <View style={styles.activeBannerTop}>
          <View>
            <Text style={styles.activeBannerEyebrow}>Abonnement actuel</Text>
            <Text style={styles.activeBannerPlan}>{planLabel}</Text>
          </View>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>✓ ACTIF</Text>
          </View>
        </View>

        <Text style={styles.activeBannerPrice}>{price}</Text>

        {/* Barre durée restante */}
        {sub.endDate && (
          <View style={styles.durationWrap}>
            <View style={styles.durationHeader}>
              <Text style={styles.durationLabel}>Durée restante</Text>
              <Text style={styles.durationDays}>
                {days} jour{days !== 1 ? 's' : ''} · expire le {formatDate(sub.endDate)}
              </Text>
            </View>
            <View style={styles.durationBarBg}>
              <View style={[styles.durationBarFill, { width: progressW, backgroundColor: barColor }]} />
            </View>
          </View>
        )}
      </View>

      {/* Features incluses */}
      <View style={styles.featuresCard}>
        <Text style={styles.featuresTitle}>Inclus dans ton plan</Text>
        {PLAN_FEATURES.map((f) => (
          <View key={f} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color={C.primary} />
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      {/* Bouton annuler */}
      <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
        <Ionicons name="close-circle-outline" size={16} color={C.danger} />
        <Text style={styles.cancelBtnText}>Annuler mon abonnement</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── BANNIÈRE ABONNEMENT EXPIRÉ / ANNULÉ ─────────────────────────────────────
function ExpiredSubBanner({
  sub,
  onRenew,
}: {
  sub: Subscription;
  onRenew: () => void;
}) {
  const isExpired   = sub.status === 'EXPIRED';
  const label       = isExpired ? 'EXPIRÉ' : 'ANNULÉ';
  const bgColor     = isExpired ? '#FFF3F3' : '#F5F5F5';
  const borderColor = isExpired ? '#FFCDD2' : '#E0E0E0';
  const textColor   = isExpired ? C.danger : C.muted;

  return (
    <View style={[styles.expiredBanner, { backgroundColor: bgColor, borderColor }]}>
      <View style={styles.expiredTop}>
        <Ionicons
          name={isExpired ? 'time-outline' : 'close-circle-outline'}
          size={28}
          color={textColor}
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.expiredLabel, { color: textColor }]}>
            Abonnement {label.toLowerCase()}
          </Text>
          {sub.endDate && (
            <Text style={styles.expiredDate}>
              {isExpired ? 'Expiré' : 'Annulé'} le {formatDate(sub.endDate)}
            </Text>
          )}
        </View>
        <View style={[styles.expiredBadge, { backgroundColor: textColor + '18' }]}>
          <Text style={[styles.expiredBadgeText, { color: textColor }]}>{label}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.renewBtn} onPress={onRenew} activeOpacity={0.85}>
        <Text style={styles.renewBtnText}>Renouveler mon abonnement</Text>
        <Ionicons name="arrow-forward" size={16} color={C.white} />
      </TouchableOpacity>
    </View>
  );
}

// ─── SÉLECTEUR DE PLAN ────────────────────────────────────────────────────────
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
          <Ionicons name="calendar-outline" size={22} color={selected === 'MONTHLY' ? C.primary : '#888'} />
          <Text style={[styles.planOptionLabel, selected === 'MONTHLY' && styles.planOptionLabelSelected]}>
            Mensuel
          </Text>
          <Text style={[styles.planOptionPrice, selected === 'MONTHLY' && styles.planOptionPriceSelected]}>
            99 MAD / mois
          </Text>
          <Text style={styles.planOptionSub}>Facturation mensuelle</Text>
          {selected === 'MONTHLY' && (
            <View style={styles.planCheckWrap}>
              <Ionicons name="checkmark-circle" size={22} color={C.primary} />
            </View>
          )}
        </TouchableOpacity>

        {/* Annuel */}
        <TouchableOpacity
          style={[styles.planOption, selected === 'ANNUAL' && styles.planOptionSelected]}
          onPress={() => setSelected('ANNUAL')}
          activeOpacity={0.85}
        >
          <Ionicons name="ribbon-outline" size={22} color={selected === 'ANNUAL' ? C.gold : '#888'} />
          <Text style={[styles.planOptionLabel, selected === 'ANNUAL' && styles.planOptionLabelSelected]}>
            Annuel
          </Text>
          <Text style={[styles.planOptionPrice, selected === 'ANNUAL' && styles.planOptionPriceSelected]}>
            899 MAD / an
          </Text>
          <Text style={[styles.planSavings, { color: selected === 'ANNUAL' ? C.gold : '#AAA' }]}>
            Économisez ~15%
          </Text>
          {selected === 'ANNUAL' && (
            <View style={styles.planCheckWrap}>
              <Ionicons name="checkmark-circle" size={22} color={C.primary} />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Features */}
      <View style={styles.planFeaturesWrap}>
        {PLAN_FEATURES.map((f) => (
          <View key={f} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={14} color={C.primary} />
            <Text style={[styles.featureText, { fontSize: 12 }]}>{f}</Text>
          </View>
        ))}
      </View>

      {/* Souscrire */}
      <TouchableOpacity style={styles.subscribeBtn} onPress={() => onCheckout(selected)} activeOpacity={0.85}>
        <Text style={styles.subscribeBtnText}>Souscrire maintenant</Text>
        <Ionicons name="arrow-forward" size={16} color={C.white} />
      </TouchableOpacity>
    </View>
  );
}

// ─── LIGNE HISTORIQUE ─────────────────────────────────────────────────────────
function HistoryItem({ item, isLast }: { item: Payment; isLast: boolean }) {
  const isPaid    = item.statut === 'COMPLETED';
  const isFailed  = item.statut === 'FAILED';
  const statusLabel =
    isPaid   ? 'Réussi' :
    isFailed ? 'Échoué' :
    item.statut === 'REFUNDED' ? 'Remboursé' : 'En attente';
  const statusColor =
    isPaid   ? C.success :
    isFailed ? C.danger  :
    item.statut === 'REFUNDED' ? C.warning : C.muted;
  const planLabel = item.plan === 'ANNUAL' ? 'Abonnement Annuel' : 'Abonnement Mensuel';

  return (
    <View style={[styles.histRow, !isLast && styles.histRowBorder]}>
      <View style={styles.histIconWrap}>
        <Ionicons name="card-outline" size={18} color={C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.histTitle}>{planLabel}</Text>
        {item.codePromo && (
          <Text style={styles.histPromo}>🏷 Code : {item.codePromo}</Text>
        )}
        <Text style={styles.histDate}>{formatDate(item.createdAt)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.histAmount}>
          {Number(item.montant).toFixed(2)} {item.devise}
        </Text>
        {item.reductionPourcent > 0 && (
          <Text style={styles.histDiscount}>-{item.reductionPourcent}%</Text>
        )}
        <View style={[styles.histStatusBadge, { backgroundColor: statusColor + '18' }]}>
          <Text style={[styles.histStatusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── ÉCRAN PRINCIPAL ───────────────────────────────────────────────────────────
interface Props {
  navigation: {
    navigate: (screen: string, params?: Record<string, any>) => void;
    goBack: () => void;
  };
}

export default function StudentAbonnementScreen({ navigation }: Props) {
  const [subscription,    setSubscription]    = useState<Subscription | null>(null);
  const [payments,        setPayments]        = useState<Payment[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [loadError,       setLoadError]       = useState<string | null>(null);
  const [promoCode,       setPromoCode]       = useState('');
  const [promoLoading,    setPromoLoading]    = useState(false);
  const [promoResult,     setPromoResult]     = useState<{ message: string; success: boolean } | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  // Pour afficher le sélecteur de plan depuis la bannière expirée
  const [showPlanSelector, setShowPlanSelector] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setLoadError(null);

      const [subRes, histRes] = await Promise.all([
        api.get('/payment/subscription'),
        api.get('/payment/history'),
      ]);
      setSubscription(subRes.data?.subscription ?? null);
      setPayments(histRes.data?.payments ?? []);
    } catch (err) {
      setLoadError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleVerifyPromo = async () => {
    if (!promoCode.trim()) return;
    try {
      setPromoLoading(true);
      setPromoResult(null);
      const res = await api.post('/payment/promo/verify', {
        code: promoCode.trim().toUpperCase(),
      });
      setPromoResult({
        message: `✅ ${res.data.reductionPourcent}% de réduction appliquée !`,
        success: true,
      });
    } catch (err) {
      setPromoResult({ message: `❌ ${getErrorMessage(err)}`, success: false });
    } finally {
      setPromoLoading(false);
    }
  };

  const handleCheckout = async (plan: 'MONTHLY' | 'ANNUAL') => {
    try {
      setCheckoutLoading(true);
      const res = await api.post('/payment/checkout', {
        plan,
        codePromo: promoCode.trim().toUpperCase() || undefined,
      });
      if (res.data?.url) await Linking.openURL(res.data.url);
    } catch (err) {
      Alert.alert('Erreur', getErrorMessage(err));
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Annuler mon abonnement',
      'Es-tu sûr(e) de vouloir annuler ? Tu garderas l\'accès jusqu\'à la fin de la période en cours.',
      [
        { text: 'Pas maintenant', style: 'cancel' },
        {
          text: 'Confirmer l\'annulation',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post('/payment/cancel');
              Alert.alert('Abonnement annulé', 'Tu garderas l\'accès jusqu\'à la fin de la période.');
              loadData();
            } catch (err) {
              Alert.alert('Erreur', getErrorMessage(err));
            }
          },
        },
      ]
    );
  };

  const hasActiveSub  = subscription?.plan !== 'FREE' && subscription?.status === 'ACTIVE';
  const hasInactiveSub = subscription && subscription.plan !== 'FREE' &&
    (subscription.status === 'EXPIRED' || subscription.status === 'CANCELLED');

  // ── Loading ──
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Erreur chargement ──
  if (loadError) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={44} color="#CCC" />
          <Text style={styles.loadErrorText}>{loadError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />
      <TopBar onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
      >
        {/* ── Section abonnement ── */}
        {hasActiveSub && !showPlanSelector && (
          <ActiveSubBanner sub={subscription!} onCancel={handleCancel} />
        )}

        {hasInactiveSub && !showPlanSelector && (
          <ExpiredSubBanner
            sub={subscription!}
            onRenew={() => setShowPlanSelector(true)}
          />
        )}

        {(!subscription || subscription.plan === 'FREE' || showPlanSelector) && (
          <PlanSelector onCheckout={handleCheckout} />
        )}

        {/* Indicateur redirection paiement */}
        {checkoutLoading && (
          <View style={styles.checkoutRow}>
            <ActivityIndicator size="small" color={C.primary} />
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
              ? <ActivityIndicator size="small" color={C.white} />
              : <Text style={styles.promoBtnText}>Appliquer</Text>
            }
          </TouchableOpacity>
        </View>
        {promoResult && (
          <Text style={[styles.promoResult, { color: promoResult.success ? C.success : C.danger }]}>
            {promoResult.message}
          </Text>
        )}

        {/* ── Historique des paiements ── */}
        <Text style={styles.sectionLabel}>Historique des paiements</Text>
        <View style={styles.histCard}>
          {payments.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="receipt-outline" size={36} color="#CCC" />
              <Text style={styles.emptyText}>Aucun paiement</Text>
            </View>
          ) : (
            payments.map((item, idx) => (
              <HistoryItem
                key={item.id}
                item={item}
                isLast={idx === payments.length - 1}
              />
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── TopBar ────────────────────────────────────────────────────────────────────
function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.topbar}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={22} color={C.primary} />
      </TouchableOpacity>
      <Text style={styles.topbarTitle}>Abonnement</Text>
      <View style={{ width: 32 }} />
    </View>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: C.white },
  scroll:    { flex: 1, backgroundColor: C.white },
  container: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },

  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 20,
    backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn:      { width: 32 },
  topbarTitle:  { fontSize: 25, fontWeight: '800', color: '#0D6B5E' },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: C.text, marginTop: 24, marginBottom: 12 },

  // ── Bannière active ──
  activeBanner: {
    backgroundColor: C.primary, borderRadius: 16, padding: 20, marginBottom: 12,
  },
  activeBannerTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4,
  },
  activeBannerEyebrow: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  activeBannerPlan:    { fontSize: 26, fontWeight: '800', color: C.white, letterSpacing: -0.5 },
  activeBannerPrice:   { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.85)', marginBottom: 16 },
  activeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  activeBadgeText: { fontSize: 11, fontWeight: '800', color: C.white, letterSpacing: 1 },

  // Barre durée restante
  durationWrap:   { marginTop: 4 },
  durationHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  durationLabel:  { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  durationDays:   { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  durationBarBg:  { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' },
  durationBarFill:{ height: 6, borderRadius: 4 },

  // Features
  featuresCard: {
    backgroundColor: C.white, borderRadius: 14, padding: 16,
    marginBottom: 8, borderWidth: 1, borderColor: C.border,
    gap: 8,
  },
  featuresTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 },
  planFeaturesWrap: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  featureRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText:   { fontSize: 13, color: C.text },

  // Bouton annuler
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, marginBottom: 4,
  },
  cancelBtnText: { fontSize: 13, color: C.danger, fontWeight: '600' },

  // ── Bannière expirée ──
  expiredBanner: {
    borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1,
  },
  expiredTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  expiredLabel: { fontSize: 16, fontWeight: '700' },
  expiredDate:  { fontSize: 12, color: C.muted, marginTop: 2 },
  expiredBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  expiredBadgeText: { fontSize: 11, fontWeight: '800' },
  renewBtn: {
    backgroundColor: C.primary, borderRadius: 12, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  renewBtnText: { fontSize: 14, fontWeight: '700', color: C.white },

  // ── Plan selector ──
  planSelectorWrap: {
    backgroundColor: C.white, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    overflow: 'hidden', marginBottom: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  planSelectorTitle: {
    fontSize: 17, fontWeight: '700', color: C.text,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, textAlign: 'center',
  },
  planSelectorRow:  { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 12 },
  planOption: {
    flex: 1, borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: C.border,
    backgroundColor: '#F7F8FA', alignItems: 'center', gap: 4, position: 'relative',
  },
  planOptionSelected:      { borderColor: C.primary, backgroundColor: C.white },
  planOptionLabel:         { fontSize: 14, fontWeight: '700', color: '#888', marginTop: 6 },
  planOptionLabelSelected: { color: C.text },
  planOptionPrice:         { fontSize: 15, fontWeight: '800', color: '#888' },
  planOptionPriceSelected: { color: C.text },
  planOptionSub:  { fontSize: 11, color: '#AAA', marginTop: 2 },
  planSavings:    { fontSize: 11, fontWeight: '700', marginTop: 2 },
  planCheckWrap:  { position: 'absolute', top: 8, right: 8 },
  subscribeBtn: {
    margin: 16, marginTop: 8, backgroundColor: C.primary,
    borderRadius: 12, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  subscribeBtnText: { fontSize: 15, fontWeight: '700', color: C.white },

  // ── Checkout ──
  checkoutRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    justifyContent: 'center', paddingVertical: 12,
  },
  checkoutText: { fontSize: 13, color: C.primary, fontWeight: '500' },

  // ── Promo ──
  promoCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.white, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  promoInput:   { flex: 1, fontSize: 14, color: C.text, fontWeight: '500', paddingVertical: 10 },
  promoBtn:     { backgroundColor: C.text, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  promoBtnText: { fontSize: 13, fontWeight: '700', color: C.white },
  promoResult:  { fontSize: 13, fontWeight: '600', marginTop: 8, paddingLeft: 4 },

  // ── History ──
  histCard: {
    backgroundColor: C.white, borderRadius: 16,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  histRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  histRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  histIconWrap:  { width: 38, height: 38, borderRadius: 19, backgroundColor: C.primary + '18', alignItems: 'center', justifyContent: 'center' },
  histTitle:     { fontSize: 13, fontWeight: '600', color: C.text },
  histPromo:     { fontSize: 11, color: C.gold, marginTop: 1 },
  histDate:      { fontSize: 11, color: C.muted, marginTop: 2 },
  histAmount:    { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 2 },
  histDiscount:  { fontSize: 11, color: C.success, fontWeight: '700', marginBottom: 2 },
  histStatusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  histStatusText:  { fontSize: 11, fontWeight: '700' },

  emptyWrap: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 13, color: '#AAA', fontWeight: '500' },

  // ── Erreur ──
  loadErrorText: { fontSize: 14, color: C.muted, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn:      { backgroundColor: C.primary, borderRadius: 22, paddingHorizontal: 24, paddingVertical: 12 },
  retryBtnText:  { color: C.white, fontSize: 14, fontWeight: '600' },
});