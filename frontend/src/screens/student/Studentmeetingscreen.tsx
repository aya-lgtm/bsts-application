// screens/student/StudentMeetingScreen.tsx
// Réunion Daily.co — WebView plein écran
//
// Permissions : expo-camera uniquement (gère caméra ET micro)
// Aucun import de expo-av ou expo-audio ici.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions, Camera } from 'expo-camera';

const PRIMARY       = '#0D6B5E';
const PRIMARY_LIGHT = '#E6F3F1';
const SUCCESS       = '#16A34A';
const GOLD_LIGHT    = '#FFF8E7';
const TEXT_DARK     = '#111827';
const TEXT_MUTED    = '#6B7280';
const BORDER        = '#E5E7EB';

interface NavigationProp {
  navigate: (screen: string, params?: any) => void;
  goBack?: () => void;
}
interface RouteProp {
  params?: { meetLink?: string; title?: string };
}
interface Props {
  navigation: NavigationProp;
  route?: RouteProp;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0 sec';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} sec`;
  if (s === 0) return `${m} min`;
  return `${m} min ${s} sec`;
}

function formatHeure(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ─── Résumé post-réunion ──────────────────────────────────────────────────────
function MeetingSummaryScreen({
  title, joinedAt, leftAt, durationSeconds, onDone,
}: {
  title: string; joinedAt: Date; leftAt: Date;
  durationSeconds: number; onDone: () => void;
}) {
  return (
    <View style={s.centerScreen}>
      <Ionicons name="checkmark-circle" size={64} color={SUCCESS} />
      <Text style={[s.centerTitle, { marginTop: 16 }]}>Réunion terminée</Text>
      <Text style={s.centerSub}>{title}</Text>

      <View style={[s.card, { width: '100%', marginTop: 24 }]}>
        <View style={s.summaryRow}>
          <View style={s.summaryIcon}>
            <Ionicons name="time-outline" size={18} color={PRIMARY} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.summaryLabel}>Durée</Text>
            <Text style={s.summaryValue}>{formatDuration(durationSeconds)}</Text>
          </View>
        </View>
        <View style={s.divider} />
        <View style={s.summaryRow}>
          <View style={s.summaryIcon}>
            <Ionicons name="log-in-outline" size={18} color={PRIMARY} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.summaryLabel}>Début</Text>
            <Text style={s.summaryValue}>{formatHeure(joinedAt)}</Text>
          </View>
        </View>
        <View style={s.divider} />
        <View style={s.summaryRow}>
          <View style={s.summaryIcon}>
            <Ionicons name="log-out-outline" size={18} color={PRIMARY} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.summaryLabel}>Fin</Text>
            <Text style={s.summaryValue}>{formatHeure(leftAt)}</Text>
          </View>
        </View>
      </View>

      <View style={s.banner}>
        <Ionicons name="information-circle-outline" size={16} color="#D4A017" />
        <Text style={s.bannerText}>
          Enregistré dans le tableau de bord Daily.co de BSTS.
        </Text>
      </View>

      <TouchableOpacity style={s.primaryBtn} onPress={onDone}>
        <Text style={s.primaryBtnText}>Retour à l'accueil</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────
type Screen = 'requesting' | 'denied' | 'meeting' | 'summary';

export default function StudentMeetingScreen({ navigation, route }: Props) {
  const meetLink = route?.params?.meetLink;
  const title    = route?.params?.title ?? 'Réunion';

  // expo-camera gère caméra ET micro en une seule API
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const [screen, setScreen]                   = useState<Screen>('requesting');
  const [webViewLoading, setWebViewLoading]   = useState(true);
  const [hasError, setHasError]               = useState(false);

  const joinedAtRef                           = useRef<Date | null>(null);
  const [joinedAt, setJoinedAt]               = useState<Date | null>(null);
  const [leftAt, setLeftAt]                   = useState<Date | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // ── Demande les 2 permissions via expo-camera ─────────────────────────────
  const askPermissions = useCallback(async () => {
    setScreen('requesting');

    // Popup Android native "Autoriser / Refuser" pour la caméra
    const camResult = cameraPermission?.granted
      ? { granted: true }
      : await requestCameraPermission();

    // Popup Android native "Autoriser / Refuser" pour le micro
    const micResult = await Camera.requestMicrophonePermissionsAsync();

    if (camResult.granted && micResult.granted) {
      setScreen('meeting');
    } else {
      setScreen('denied');
    }
  }, [cameraPermission, requestCameraPermission]);

  useEffect(() => {
    if (cameraPermission !== null) {
      askPermissions();
    }
  }, [cameraPermission !== null]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, []);

  const handleWebViewLoad = useCallback(() => {
    setWebViewLoading(false);
    if (!joinedAtRef.current) {
      const now = new Date();
      joinedAtRef.current = now;
      setJoinedAt(now);
    }
  }, []);

  const handleLeave = useCallback(() => {
    const now   = new Date();
    const start = joinedAtRef.current ?? now;
    setLeftAt(now);
    setDurationSeconds(Math.max(0, Math.round((now.getTime() - start.getTime()) / 1000)));
    setScreen('summary');
  }, []);

  const handleClose = () => {
    if (screen === 'summary') { navigation.navigate('accueil'); return; }
    if (joinedAtRef.current) {
      Alert.alert('Quitter la réunion ?', 'La réunion est encore en cours.', [
        { text: 'Rester', style: 'cancel' },
        { text: 'Quitter', style: 'destructive', onPress: handleLeave },
      ]);
    } else {
      navigation.navigate('accueil');
    }
  };

  // ── Pas de lien ───────────────────────────────────────────────────────────
  if (!meetLink) {
    return (
      <View style={s.centerScreen}>
        <Ionicons name="alert-circle-outline" size={48} color={TEXT_MUTED} />
        <Text style={s.centerTitle}>Lien indisponible</Text>
        <Text style={s.centerSub}>Sera généré après confirmation du rendez-vous.</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={() => navigation.navigate('accueil')}>
          <Text style={s.primaryBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Demande en cours ──────────────────────────────────────────────────────
  if (screen === 'requesting') {
    return (
      <View style={s.centerScreen}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={[s.centerSub, { marginTop: 16 }]}>
          Demande d'accès caméra et microphone…
        </Text>
      </View>
    );
  }

  // ── Permissions refusées ──────────────────────────────────────────────────
  if (screen === 'denied') {
    return (
      <View style={s.centerScreen}>
        <Ionicons name="videocam-off-outline" size={56} color={TEXT_MUTED} />
        <Text style={s.centerTitle}>Permissions nécessaires</Text>
        <Text style={s.centerSub}>
          Paramètres {'>'} Applications {'>'} BSTS{'\n'}
          Active Caméra et Microphone puis réessaie.
        </Text>
        <TouchableOpacity style={s.primaryBtn} onPress={askPermissions}>
          <Text style={s.primaryBtnText}>Réessayer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.secondaryBtn}
          onPress={() => navigation.navigate('accueil')}
        >
          <Text style={s.secondaryBtnText}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Résumé ────────────────────────────────────────────────────────────────
  if (screen === 'summary' && joinedAt && leftAt) {
    return (
      <MeetingSummaryScreen
        title={title}
        joinedAt={joinedAt}
        leftAt={leftAt}
        durationSeconds={durationSeconds}
        onDone={() => navigation.navigate('accueil')}
      />
    );
  }

  // ── WebView Daily.co ──────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={handleClose} style={s.topBtn}>
          <Ionicons name="close" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.topBarTitle} numberOfLines={1}>{title}</Text>
        <TouchableOpacity
          onPress={handleLeave}
          style={[s.topBtn, { backgroundColor: '#DC2626' }]}
        >
          <Ionicons name="call" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>

      {webViewLoading && (
        <View style={s.loaderOverlay}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={s.loaderText}>Connexion à la réunion…</Text>
        </View>
      )}

      {hasError ? (
        <View style={s.centerScreen}>
          <Ionicons name="cloud-offline-outline" size={48} color={TEXT_MUTED} />
          <Text style={s.centerSub}>
            Impossible de charger.{'\n'}Vérifiez votre connexion.
          </Text>
          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => { setHasError(false); setWebViewLoading(true); }}
          >
            <Text style={s.primaryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          source={{ uri: meetLink }}
          style={{ flex: 1 }}
          onLoadEnd={handleWebViewLoad}
          onError={() => { setHasError(true); setWebViewLoading(false); }}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grant"
          onPermissionRequest={(request: any) => request.grant(request.resources)}
          setSupportMultipleWindows={false}
          allowsFullscreenVideo
          mixedContentMode="always"
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 52 : 18,
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#111111',
  },
  topBarTitle: {
    flex: 1, color: '#FFF', textAlign: 'center',
    fontWeight: '700', fontSize: 14, marginHorizontal: 8,
  },
  topBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#2D2D2D', alignItems: 'center', justifyContent: 'center',
  },
  loaderOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#000',
  },
  loaderText: { color: '#E5E7EB', marginTop: 12, fontSize: 13 },
  centerScreen: {
    flex: 1, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  centerTitle: {
    fontSize: 18, fontWeight: '800', color: TEXT_DARK, textAlign: 'center',
  },
  centerSub: {
    fontSize: 13, color: TEXT_MUTED, textAlign: 'center', marginTop: 8, lineHeight: 20,
  },
  primaryBtn: {
    width: '100%', backgroundColor: PRIMARY, borderRadius: 16,
    paddingVertical: 14, alignItems: 'center', marginTop: 24,
  },
  primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  secondaryBtn: {
    width: '100%', backgroundColor: '#F3F4F6', borderRadius: 16,
    paddingVertical: 14, alignItems: 'center', marginTop: 12,
  },
  secondaryBtnText: { color: TEXT_MUTED, fontSize: 15, fontWeight: '700' },
  card: {
    backgroundColor: '#FFF', borderRadius: 18, borderWidth: 1, borderColor: BORDER,
    padding: 4, shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  summaryIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  summaryLabel: { fontSize: 12, color: TEXT_MUTED, marginBottom: 2 },
  summaryValue: { fontSize: 15, fontWeight: '700', color: TEXT_DARK },
  divider: { height: 1, backgroundColor: BORDER, marginHorizontal: 16 },
  banner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: GOLD_LIGHT, borderRadius: 14,
    padding: 12, marginTop: 16, width: '100%',
  },
  bannerText: { flex: 1, fontSize: 12, color: '#7A5B00', lineHeight: 17 },
});