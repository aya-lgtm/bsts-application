// screens/student/StudentMentorsScreen.tsx
// Écran "Anciens étudiants" — liste + profil détaillé + réservation de consultation
//
// Pattern repris de StudentCoursesScreen.tsx : un seul composant avec un état
// interne (list / profile / confirmation) plutôt que plusieurs routes navigateur.
//
// Endpoints utilisés (collegeStudent.routes.js, montés sur /api/v1/college-students) :
//   GET  /college-students                          → liste des profils
//   GET  /college-students/:id                       → détail d'un profil
//   POST /college-students/consultations/book         → réserver une consultation
//
// ⚠️ PHASE DE TEST : le paiement Stripe n'est pas branché. On appelle directement
// PUT .../confirm-payment pour passer la consultation en CONFIRMED et récupérer
// le meetLink Daily.co généré par le backend.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/auth.service';

// ─── Tokens (cohérents avec StudentCoursesScreen) ─────────────────────────────
const PRIMARY       = '#0D6B5E';
const PRIMARY_LIGHT = '#E6F3F1';
const BG            = '#FFFFFF';
const CARD          = '#FFFFFF';
const TEXT          = '#111827';
const TEXT_MUTED    = '#6B7280';
const BORDER        = '#E5E7EB';
const SUCCESS       = '#16A34A';
const SUCCESS_LIGHT = '#DCFCE7';
const GOLD          = '#D4A017';
const GOLD_LIGHT    = '#FFF8E7';

const JOURS_ORDRE = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

// ─── Types ────────────────────────────────────────────────────────────────────
interface Disponibilite {
  jour: string;
  heures: string[];
}

interface MentorFull {
  id: string;
  nom: string;
  prenom: string;
  age?: number | null;
  email?: string | null;
  universite: string;
  domaine: string;
  anneeEtude?: number | null;
  photo?: string | null;
  bio?: string | null;
  prixParHeure?: number | null;
  prixParDemiHeure?: number | null;
  disponibilites: Disponibilite[];
}

interface ConsultationCreated {
  id: string;
  date: string;
  heure: string;
  duree: '30min' | '1h';
  prix: number;
  statut: string;
  meetLink?: string | null; // URL Daily.co retournée par le backend (confirm-payment)
}

interface NavigationProp {
  navigate: (screen: string, params?: any) => void;
  goBack?: () => void;
}

interface RouteProp {
  params?: { initialMentorId?: string };
}

interface Props {
  navigation: NavigationProp;
  route?: RouteProp;
}

function fullName(m: { prenom: string; nom: string }) {
  return `${m.prenom} ${m.nom}`;
}

function initiales(m: { prenom: string; nom: string }) {
  return `${m.prenom?.[0] ?? ''}${m.nom?.[0] ?? ''}`.toUpperCase();
}

function errMsg(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'response' in e) {
    const r = (e as any).response?.data?.message;
    if (r) return r;
  }
  return e instanceof Error ? e.message : 'Une erreur est survenue';
}

// Calcule les N prochaines dates calendaires correspondant à un jour de la semaine
function nextDatesForJour(jour: string, count = 4): { date: string; label: string }[] {
  const targetIndex = JOURS_ORDRE.indexOf(jour);
  if (targetIndex === -1) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cursor = new Date(today);
  while (cursor.getDay() !== targetIndex) {
    cursor.setDate(cursor.getDate() + 1);
  }

  const results: { date: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(cursor);
    d.setDate(cursor.getDate() + i * 7);
    results.push({
      date: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    });
  }
  return results;
}

// ─── API ──────────────────────────────────────────────────────────────────────
function normalizeMentor(m: any): MentorFull {
  return {
    id: m.id,
    nom: m.nom,
    prenom: m.prenom,
    age: m.age ?? null,
    email: m.email ?? null,
    universite: m.universite,
    domaine: m.domaine,
    anneeEtude: m.anneeEtude ?? null,
    photo: m.photo ?? null,
    bio: m.bio ?? null,
    prixParHeure: m.prixParHeure ?? null,
    prixParDemiHeure: m.prixParDemiHeure ?? null,
    disponibilites: Array.isArray(m.disponibilites) ? m.disponibilites : [],
  };
}

async function fetchMentors(): Promise<MentorFull[]> {
  const res = await api.get('/college-students');
  const raw: any[] = res.data?.students ?? res.data ?? [];
  return raw.map(normalizeMentor);
}

async function fetchMentorById(id: string): Promise<MentorFull> {
  const res = await api.get(`/college-students/${id}`);
  const raw = res.data?.student ?? res.data;
  return normalizeMentor(raw);
}

async function postBookConsultation(payload: {
  collegeStudentId: string;
  date: string;
  heure: string;
  duree: '30min' | '1h';
  notes?: string;
}): Promise<{ consultation: ConsultationCreated; clientSecret: string }> {
  const res = await api.post('/college-students/consultations/book', payload);
  return res.data;
}

// ─── VUE 1 : LISTE ────────────────────────────────────────────────────────────
function MentorsListView({
  mentors,
  loading,
  refreshing,
  onRefresh,
  onMentorPress,
  onBack,
}: {
  mentors: MentorFull[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onMentorPress: (m: MentorFull) => void;
  onBack: () => void;
}) {
  const [search, setSearch] = useState('');
  const [domaineFilter, setDomaineFilter] = useState<string | null>(null);

  const domaines = Array.from(new Set(mentors.map((m) => m.domaine).filter(Boolean)));

  const filtered = mentors.filter((m) => {
    const matchesSearch =
      search.trim().length === 0 ||
      fullName(m).toLowerCase().includes(search.toLowerCase()) ||
      m.universite.toLowerCase().includes(search.toLowerCase()) ||
      m.domaine.toLowerCase().includes(search.toLowerCase());
    const matchesDomaine = !domaineFilter || m.domaine === domaineFilter;
    return matchesSearch && matchesDomaine;
  });

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={{ marginBottom: 8 }}>
          <Ionicons name="arrow-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={s.headerEyebrow}>RENCONTRES</Text>
        <Text style={s.headerTitle}>Anciens étudiants</Text>
        <Text style={s.headerSub}>
          Échange avec ceux qui sont passés par là — conseils, parcours, motivation 🎓
        </Text>
      </View>

      {/* Recherche */}
      <View style={s.searchBar}>
        <Ionicons name="search" size={18} color={TEXT_MUTED} />
        <TextInput
          style={s.searchInput}
          placeholder="Nom, université, domaine…"
          placeholderTextColor={TEXT_MUTED}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={TEXT_MUTED} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtres domaine */}
      {domaines.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={s.filterRow}
        >
          <TouchableOpacity
            style={[s.filterChip, !domaineFilter && s.filterChipActive]}
            onPress={() => setDomaineFilter(null)}
          >
            <Text style={[s.filterChipText, !domaineFilter && s.filterChipTextActive]}>Tous</Text>
          </TouchableOpacity>
          {domaines.map((d) => (
            <TouchableOpacity
              key={d}
              style={[s.filterChip, domaineFilter === d && s.filterChipActive]}
              onPress={() => setDomaineFilter(domaineFilter === d ? null : d)}
            >
              <Text style={[s.filterChipText, domaineFilter === d && s.filterChipTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32, paddingTop: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        >
          {filtered.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyEmoji}>🔎</Text>
              <Text style={s.emptyTitle}>Aucun profil trouvé</Text>
              <Text style={s.emptyDesc}>Essaie un autre mot-clé ou un autre domaine.</Text>
            </View>
          ) : (
            <View style={s.mentorGrid}>
              {filtered.map((m) => {
                const hasPrix = !!m.prixParHeure;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={s.mentorGridCard}
                    onPress={() => onMentorPress(m)}
                    activeOpacity={0.85}
                  >
                    {m.photo ? (
                      <Image source={{ uri: m.photo }} style={s.mentorGridPhoto} />
                    ) : (
                      <View style={[s.mentorGridPhoto, s.mentorPhotoPlaceholder]}>
                        <Text style={s.mentorInitials}>{initiales(m)}</Text>
                      </View>
                    )}
                    <Text style={s.mentorGridName} numberOfLines={1}>{fullName(m)}</Text>
                    <Text style={s.mentorGridUni} numberOfLines={1}>{m.universite}</Text>
                    <View style={s.mentorGridDomaineBadge}>
                      <Text style={s.mentorGridDomaineText} numberOfLines={1}>{m.domaine}</Text>
                    </View>
                    <Text style={[s.mentorGridPrix, !hasPrix && { color: TEXT_MUTED }]}>
                      {hasPrix ? `Dès ${m.prixParHeure}$/h` : 'Sur demande'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── VUE 2 : PROFIL + RÉSERVATION ─────────────────────────────────────────────
function MentorProfileView({
  mentor,
  onBack,
  onBooked,
}: {
  mentor: MentorFull;
  onBack: () => void;
  onBooked: (c: ConsultationCreated) => void;
}) {
  const [selectedJour, setSelectedJour] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedHeure, setSelectedHeure] = useState<string | null>(null);
  const [selectedDuree, setSelectedDuree] = useState<'1h' | '30min'>(
    mentor.prixParHeure ? '1h' : '30min'
  );
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState(false);

  const dureesDisponibles: Array<'1h' | '30min'> = [
    ...(mentor.prixParHeure ? ['1h' as const] : []),
    ...(mentor.prixParDemiHeure ? ['30min' as const] : []),
  ];

  const prixActuel = selectedDuree === '1h' ? mentor.prixParHeure : mentor.prixParDemiHeure;

  const heuresPourJour = mentor.disponibilites.find((d) => d.jour === selectedJour)?.heures ?? [];
  const datesPourJour = selectedJour ? nextDatesForJour(selectedJour, 4) : [];

  const handleJourPress = (jour: string) => {
    setSelectedJour(jour);
    setSelectedDate(null);
    setSelectedHeure(null);
  };

  // Pour les tests : on autorise la réservation même si prix non défini
  const peutReserver = !!(selectedDate && selectedHeure);

  const handleReserver = async () => {
    if (!peutReserver || !selectedDate || !selectedHeure) return;
    setBooking(true);
    try {
      const { consultation } = await postBookConsultation({
        collegeStudentId: mentor.id,
        date: selectedDate,
        heure: selectedHeure,
        duree: selectedDuree,
        notes: notes.trim() || undefined,
      }).catch(async (err) => {
        // Si bookConsultation échoue à cause du prix null → on ne bloque pas les tests
        const msg = err?.response?.data?.message || '';
        if (msg.includes('Prix non défini')) {
          throw new Error('Ajoute un prix au profil de cet ancien étudiant pour pouvoir réserver.');
        }
        throw err;
      });

      // ⚠️ PHASE DE TEST : on confirme directement sans passer par Stripe.
      // confirm-payment crée la salle Daily.co et retourne le meetLink.
      let confirmRes: any = null;
      try {
        confirmRes = await api.put(`/college-students/consultations/${consultation.id}/confirm-payment`);
      } catch {
        // si ça échoue, on continue — la consultation reste visible en PENDING sans lien
      }

      // Récupérer le meetLink Daily.co retourné par confirm-payment
      const meetLink = confirmRes?.data?.meetLink
        ?? confirmRes?.data?.consultation?.meetLink
        ?? null;

      onBooked({
        ...consultation,
        statut: 'CONFIRMED',
        meetLink,
      });
    } catch (e) {
      Alert.alert('Réservation impossible', errMsg(e));
    } finally {
      setBooking(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={{ marginBottom: 8 }}>
          <Ionicons name="arrow-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={s.headerEyebrow}>PROFIL</Text>
        <Text style={s.headerTitle} numberOfLines={1}>{fullName(mentor)}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Carte profil */}
        <View style={s.profileCard}>
          {mentor.photo ? (
            <Image source={{ uri: mentor.photo }} style={s.profilePhoto} />
          ) : (
            <View style={[s.profilePhoto, s.mentorPhotoPlaceholder]}>
              <Text style={[s.mentorInitials, { fontSize: 26 }]}>{initiales(mentor)}</Text>
            </View>
          )}
          <Text style={s.profileName}>{fullName(mentor)}</Text>
          <Text style={s.profileSub}>
            {mentor.universite}{mentor.anneeEtude ? ` · ${mentor.anneeEtude}ᵉ année` : ''}
          </Text>
          <View style={s.profileDomaineBadge}>
            <Text style={s.profileDomaineText}>{mentor.domaine}</Text>
          </View>
          {mentor.bio ? <Text style={s.profileBio}>{mentor.bio}</Text> : null}

          <View style={s.priceRow}>
            {mentor.prixParHeure ? (
              <View style={s.priceTag}>
                <Text style={s.priceTagValue}>{mentor.prixParHeure}$</Text>
                <Text style={s.priceTagLabel}>/ heure</Text>
              </View>
            ) : null}
            {mentor.prixParDemiHeure ? (
              <View style={s.priceTag}>
                <Text style={s.priceTagValue}>{mentor.prixParDemiHeure}$</Text>
                <Text style={s.priceTagLabel}>/ 30 min</Text>
              </View>
            ) : null}
          </View>
        </View>

        {mentor.disponibilites.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyEmoji}>📅</Text>
            <Text style={s.emptyTitle}>Pas encore de disponibilités</Text>
            <Text style={s.emptyDesc}>Reviens plus tard, ce profil n'a pas encore de créneaux.</Text>
          </View>
        ) : (
          <>
            {/* Choix du jour */}
            <Text style={s.sectionTitle}>Choisis un jour</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chipRow}
            >
              {mentor.disponibilites.map((d) => (
                <TouchableOpacity
                  key={d.jour}
                  style={[s.chip, selectedJour === d.jour && s.chipActive]}
                  onPress={() => handleJourPress(d.jour)}
                >
                  <Text style={[s.chipText, selectedJour === d.jour && s.chipTextActive]}>{d.jour}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Choix de la date */}
            {selectedJour && (
              <>
                <Text style={s.sectionTitle}>Choisis une date</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.chipRow}
                >
                  {datesPourJour.map((d) => (
                    <TouchableOpacity
                      key={d.date}
                      style={[s.chip, selectedDate === d.date && s.chipActive]}
                      onPress={() => setSelectedDate(d.date)}
                    >
                      <Text style={[s.chipText, selectedDate === d.date && s.chipTextActive]}>{d.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Choix de l'heure */}
            {selectedJour && (
              <>
                <Text style={s.sectionTitle}>Choisis une heure</Text>
                <View style={s.chipWrap}>
                  {heuresPourJour.map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[s.chip, selectedHeure === h && s.chipActive]}
                      onPress={() => setSelectedHeure(h)}
                    >
                      <Text style={[s.chipText, selectedHeure === h && s.chipTextActive]}>{h}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Durée */}
            {dureesDisponibles.length > 1 && (
              <>
                <Text style={s.sectionTitle}>Durée</Text>
                <View style={s.chipWrap}>
                  {dureesDisponibles.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[s.chip, selectedDuree === d && s.chipActive]}
                      onPress={() => setSelectedDuree(d)}
                    >
                      <Text style={[s.chipText, selectedDuree === d && s.chipTextActive]}>
                        {d === '1h' ? '1 heure' : '30 minutes'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Notes optionnelles */}
            <Text style={s.sectionTitle}>Message (optionnel)</Text>
            <TextInput
              style={s.notesInput}
              placeholder={`Dis à ${mentor.prenom} ce que tu aimerais aborder…`}
              placeholderTextColor={TEXT_MUTED}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />

            {/* Bouton réserver */}
            <TouchableOpacity
              style={[s.bookBtn, !peutReserver && s.bookBtnDisabled]}
              disabled={!peutReserver || booking}
              onPress={handleReserver}
              activeOpacity={0.85}
            >
              {booking ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={s.bookBtnText}>
                  {!selectedDate || !selectedHeure ? 'Sélectionne un créneau' : prixActuel ? `Réserver pour ${prixActuel}$` : 'Réserver (test)'}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── VUE 3 : CONFIRMATION ─────────────────────────────────────────────────────
function BookingConfirmationView({
  mentor,
  consultation,
  onDone,
  navigation,
}: {
  mentor: MentorFull;
  consultation: ConsultationCreated;
  onDone: () => void;
  navigation: NavigationProp;
}) {
  const dateLabel = new Date(`${consultation.date}T00:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  const handleJoin = () => {
    if (!consultation.meetLink) return;
    // Reste dans l'app : ouvre StudentMeetingScreen (WebView) au lieu du navigateur externe
    navigation.navigate('StudentMeeting', {
      meetLink: consultation.meetLink,
      title: `Réunion avec ${fullName(mentor)}`,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <View style={s.confirmIconWrap}>
        <Ionicons name="checkmark-circle" size={56} color={SUCCESS} />
      </View>
      <Text style={s.confirmTitle}>Rendez-vous confirmé !</Text>
      <Text style={s.confirmDesc}>
        Ta consultation avec {fullName(mentor)} est confirmée.
      </Text>

      <View style={s.confirmCard}>
        <View style={s.confirmRow}>
          <Ionicons name="person-outline" size={16} color={TEXT_MUTED} />
          <Text style={s.confirmRowText}>{fullName(mentor)}</Text>
        </View>
        <View style={s.confirmRow}>
          <Ionicons name="calendar-outline" size={16} color={TEXT_MUTED} />
          <Text style={s.confirmRowText}>{dateLabel} à {consultation.heure}</Text>
        </View>
        <View style={s.confirmRow}>
          <Ionicons name="time-outline" size={16} color={TEXT_MUTED} />
          <Text style={s.confirmRowText}>
            {consultation.duree === '1h' ? '1 heure' : '30 minutes'} · {consultation.prix}$
          </Text>
        </View>
      </View>

      {consultation.meetLink && (
        <TouchableOpacity style={s.joinBtn} onPress={handleJoin} activeOpacity={0.85}>
          <Ionicons name="videocam" size={18} color="#FFF" />
          <Text style={s.joinBtnText}>Rejoindre la réunion</Text>
        </TouchableOpacity>
      )}

      {/* ⚠️ PHASE DE TEST : pas de paiement réel pour l'instant — voir handleReserver() */}
      <View style={s.testBanner}>
        <Ionicons name="flask-outline" size={14} color={GOLD} />
        <Text style={s.testBannerText}>
          Mode test : paiement non requis pour le moment. La réunion est déjà accessible.
        </Text>
      </View>

      <TouchableOpacity style={s.doneBtn} onPress={onDone} activeOpacity={0.85}>
        <Text style={s.doneBtnText}>Retour à l'accueil</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── ÉCRAN PRINCIPAL ──────────────────────────────────────────────────────────
type ScreenView = 'list' | 'profile' | 'confirmation';

export default function StudentMentorsScreen({ navigation, route }: Props) {
  const initialMentorId = route?.params?.initialMentorId as string | undefined;

  const [view, setView] = useState<ScreenView>(initialMentorId ? 'profile' : 'list');
  const [mentors, setMentors] = useState<MentorFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMentor, setLoadingMentor] = useState(!!initialMentorId);

  const [selectedMentor, setSelectedMentor] = useState<MentorFull | null>(null);
  const [confirmedConsultation, setConfirmedConsultation] = useState<ConsultationCreated | null>(null);

  const loadMentors = useCallback(async () => {
    try {
      setMentors(await fetchMentors());
    } catch (e) {
      Alert.alert('Erreur', errMsg(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMentors();
  }, [loadMentors]);

  useEffect(() => {
    if (initialMentorId) {
      fetchMentorById(initialMentorId)
        .then((m) => setSelectedMentor(m))
        .catch((e) => Alert.alert('Erreur', errMsg(e)))
        .finally(() => setLoadingMentor(false));
    }
  }, [initialMentorId]);

  const handleMentorPress = (m: MentorFull) => {
    setSelectedMentor(m);
    setView('profile');
  };

  const handleBackFromProfile = () => {
    setSelectedMentor(null);
    setView('list');
  };

  const handleBooked = (c: ConsultationCreated) => {
    setConfirmedConsultation(c);
    setView('confirmation');
  };

  const handleDone = () => {
    navigation.navigate('accueil');
  };

  if (view === 'profile' && loadingMentor) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG }}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  if (view === 'confirmation' && selectedMentor && confirmedConsultation) {
    return (
      <BookingConfirmationView
        mentor={selectedMentor}
        consultation={confirmedConsultation}
        onDone={handleDone}
        navigation={navigation}
      />
    );
  }

  if (view === 'profile' && selectedMentor) {
    return (
      <MentorProfileView
        mentor={selectedMentor}
        onBack={handleBackFromProfile}
        onBooked={handleBooked}
      />
    );
  }

  return (
    <MentorsListView
      mentors={mentors}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); loadMentors(); }}
      onMentorPress={handleMentorPress}
      onBack={() => navigation.navigate('accueil')}
    />
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header: {
    backgroundColor: CARD,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerEyebrow: { fontSize: 11, fontWeight: '800', color: PRIMARY, letterSpacing: 2, marginBottom: 4 },
  headerTitle:   { fontSize: 26, fontWeight: '900', color: TEXT, letterSpacing: -0.5, marginBottom: 4 },
  headerSub:     { fontSize: 13, color: TEXT_MUTED, fontWeight: '500' },

  // Recherche
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F3F4F6', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    marginHorizontal: 20, marginTop: 4, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: TEXT },

  // Filtres
  filterRow: { paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  filterChip: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: '#F3F4F6', marginRight: 8,
  },
  filterChipActive: { backgroundColor: PRIMARY },
  filterChipText: { fontSize: 12, fontWeight: '700', color: TEXT_MUTED },
  filterChipTextActive: { color: '#FFF' },

  // Grille de profils
  mentorGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 12,
  },
  mentorGridCard: {
    width: '46%', backgroundColor: CARD, borderRadius: 18,
    borderWidth: 1, borderColor: BORDER, padding: 14,
    alignItems: 'center', marginBottom: 4,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  mentorGridPhoto: { width: 56, height: 56, borderRadius: 28, marginBottom: 8 },
  mentorPhotoPlaceholder: { backgroundColor: PRIMARY_LIGHT, alignItems: 'center', justifyContent: 'center' },
  mentorInitials: { fontSize: 18, fontWeight: '700', color: PRIMARY },
  mentorGridName: { fontSize: 13, fontWeight: '800', color: TEXT, textAlign: 'center' },
  mentorGridUni:  { fontSize: 11, color: TEXT_MUTED, textAlign: 'center', marginTop: 2, marginBottom: 6 },
  mentorGridDomaineBadge: {
    backgroundColor: PRIMARY_LIGHT, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8, maxWidth: '100%',
  },
  mentorGridDomaineText: { fontSize: 10, fontWeight: '700', color: PRIMARY },
  mentorGridPrix: { fontSize: 12, fontWeight: '800', color: GOLD },

  // Empty
  emptyBox:  { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 8 },
  emptyEmoji:{ fontSize: 40 },
  emptyTitle:{ fontSize: 15, fontWeight: '800', color: TEXT },
  emptyDesc: { fontSize: 13, color: TEXT_MUTED, textAlign: 'center', lineHeight: 19 },

  // Carte profil
  profileCard: {
    alignItems: 'center', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 8,
  },
  profilePhoto: { width: 84, height: 84, borderRadius: 42, marginBottom: 12 },
  profileName: { fontSize: 19, fontWeight: '900', color: TEXT, marginBottom: 2 },
  profileSub:  { fontSize: 13, color: TEXT_MUTED, fontWeight: '500', marginBottom: 10, textAlign: 'center' },
  profileDomaineBadge: { backgroundColor: PRIMARY_LIGHT, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 12 },
  profileDomaineText: { fontSize: 12, fontWeight: '800', color: PRIMARY },
  profileBio: { fontSize: 13, color: TEXT, lineHeight: 20, textAlign: 'center', marginBottom: 16 },
  priceRow: { flexDirection: 'row', gap: 12 },
  priceTag: {
    backgroundColor: GOLD_LIGHT, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10,
    alignItems: 'center', minWidth: 90,
  },
  priceTagValue: { fontSize: 16, fontWeight: '900', color: GOLD },
  priceTagLabel: { fontSize: 10, color: TEXT_MUTED, fontWeight: '600' },

  // Sections réservation
  sectionTitle: { fontSize: 14, fontWeight: '800', color: TEXT, marginHorizontal: 20, marginTop: 18, marginBottom: 10 },
  chipRow: { paddingHorizontal: 20, gap: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 8 },
  chip: {
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: 'transparent', marginRight: 8, marginBottom: 8,
  },
  chipActive: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  chipText: { fontSize: 13, fontWeight: '700', color: TEXT_MUTED },
  chipTextActive: { color: PRIMARY },

  // Notes
  notesInput: {
    marginHorizontal: 20, backgroundColor: '#F9FAFB', borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, padding: 12, fontSize: 13, color: TEXT,
    minHeight: 70, textAlignVertical: 'top',
  },

  // Bouton réserver
  bookBtn: {
    marginHorizontal: 20, marginTop: 24, backgroundColor: PRIMARY,
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  bookBtnDisabled: { backgroundColor: '#D1D5DB' },
  bookBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },

  // Confirmation
  confirmIconWrap: { marginBottom: 16 },
  confirmTitle: { fontSize: 20, fontWeight: '900', color: TEXT, marginBottom: 6, textAlign: 'center' },
  confirmDesc:  { fontSize: 13, color: TEXT_MUTED, textAlign: 'center', marginBottom: 20, lineHeight: 19 },
  confirmCard: {
    width: '100%', backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER,
    padding: 16, gap: 12, marginBottom: 16,
  },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  confirmRowText: { fontSize: 13, fontWeight: '600', color: TEXT },
  joinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: PRIMARY, borderRadius: 16,
    paddingHorizontal: 24, paddingVertical: 14, width: '100%',
    justifyContent: 'center', marginBottom: 16,
  },
  joinBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  testBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: GOLD_LIGHT, borderRadius: 14, padding: 12, marginBottom: 24, width: '100%',
  },
  testBannerText: { flex: 1, fontSize: 12, color: '#7A5B00', lineHeight: 17 },
  doneBtn: {
    backgroundColor: PRIMARY, borderRadius: 16, paddingHorizontal: 32, paddingVertical: 14, width: '100%', alignItems: 'center',
  },
  doneBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});