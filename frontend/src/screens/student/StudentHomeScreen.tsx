// screens/student/StudentHomeScreen.tsx
// Style : coloré & dynamique — fond blanc, dégradés verts, icônes colorées

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl, StyleSheet,
  SafeAreaView, StatusBar, Alert, DimensionValue, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/auth.service';

const logo = require('../../assets/logo1.png');

// ─── Palette ──────────────────────────────────────────────────────────────────
const P = {
  green:       '#0D6B5E',
  greenMid:    '#128F7D',
  greenLight:  '#E8F5F3',
  greenLighter:'#F2FAF9',
  gold:        '#D4A017',
  goldLight:   '#FEF6E4',
  white:       '#FFFFFF',
  bg:          '#F8FFFE',
  text:        '#111827',
  textSub:     '#6B7280',
  textMuted:   '#9CA3AF',
  border:      '#E5E7EB',
  danger:      '#EF4444',
  purple:      '#7C3AED',
  purpleLight: '#EDE9FE',
  blue:        '#2563EB',
  blueLight:   '#DBEAFE',
  orange:      '#EA580C',
  orangeLight: '#FFEDD5',
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Utilisateur { id: string; nom: string; prenom: string; photo?: string | null; }
type NiveauKey = 'STARTER'|'EXPLORER'|'SCHOLAR'|'ACHIEVER'|'CHAMPION';
interface GamificationRaw { userId: string; points: number; niveau: NiveauKey; badges: string[]; streak?: number; }

const NIVEAU_SEUILS: Record<NiveauKey,{min:number;next:number|null;suivant:string}> = {
  STARTER:{min:0,next:500,suivant:'Explorer'},EXPLORER:{min:500,next:1500,suivant:'Scholar'},
  SCHOLAR:{min:1500,next:3500,suivant:'Achiever'},ACHIEVER:{min:3500,next:7000,suivant:'Champion'},
  CHAMPION:{min:7000,next:null,suivant:'Max'},
};
const NIVEAU_LABELS:Record<NiveauKey,string> = {STARTER:'Starter',EXPLORER:'Explorer',SCHOLAR:'Scholar',ACHIEVER:'Achiever',CHAMPION:'Champion'};
const NIVEAU_EMOJIS:Record<NiveauKey,string> = {STARTER:'🌱',EXPLORER:'🧭',SCHOLAR:'📚',ACHIEVER:'🏆',CHAMPION:'👑'};
const NIVEAU_ORDRE:NiveauKey[] = ['STARTER','EXPLORER','SCHOLAR','ACHIEVER','CHAMPION'];

interface NiveauGamification { key:NiveauKey;numero:number;label:string;emoji:string;progressionPourcent:number;pointsActuels:number;pointsProchainNiveau:number|null;prochainLabel:string; }
interface Gamification { points:number;streak:number;niveau:NiveauGamification; }

function deriveNiveau(points:number,k:NiveauKey):NiveauGamification {
  const s=NIVEAU_SEUILS[k]; const span=s.next?s.next-s.min:null;
  return {key:k,numero:NIVEAU_ORDRE.indexOf(k)+1,label:NIVEAU_LABELS[k],emoji:NIVEAU_EMOJIS[k],
    progressionPourcent:span?Math.min(100,Math.round(((points-s.min)/span)*100)):100,
    pointsActuels:points,pointsProchainNiveau:s.next,prochainLabel:s.suivant};
}

interface ActiviteItem { id:string;type:'lesson'|'quiz'|string;titre:string;sousTitre:string;date:string; }
interface QuizRecommande { id:string;titre:string;description:string;xpRecompense:number; }
interface MentorItem { id:string;nom:string;prenom:string;universite:string;domaine:string;anneeEtude?:number|null;photo?:string|null;bio?:string|null;prixParHeure?:number|null;prixParDemiHeure?:number|null; }
interface ProchainRdv { id:string;mentorNom:string;mentorPrenom:string;mentorPhoto?:string|null;dateLabel:string;heure:string;meetLink?:string|null; }
interface HomeData { utilisateur:Utilisateur;gamification:Gamification;activiteRecente:ActiviteItem[];quizRecommande:QuizRecommande|null;unreadCount:number;mentors:MentorItem[];prochainRdv:ProchainRdv|null; }
interface NavigationProp { navigate:(screen:string,params?:Record<string,any>)=>void;replace?:(screen:string)=>void;goBack?:()=>void; }

// ─── API ──────────────────────────────────────────────────────────────────────
const fetchHomeData = async ():Promise<HomeData> => {
  const [pR,gR,qR,prR,nR,mR,cR] = await Promise.all([
    api.get('/users/profile'),
    api.get('/gamification/me'),
    api.get('/quiz/my-results').catch(()=>({data:{results:[]}})),
    api.get('/courses/progress/me').catch(()=>({data:{progress:[]}})),
    api.get('/notifications?limit=50').catch(()=>({data:{notifications:[]}})),
    api.get('/college-students').catch(()=>({data:{students:[]}})),
    api.get('/college-students/consultations/my').catch(()=>({data:{consultations:[]}})),
  ]);
  const user = pR.data?.user??pR.data;
  const gRaw:GamificationRaw = gR.data?.gamification??gR.data;
  const gamification:Gamification = {points:gRaw.points,streak:gRaw.streak??0,niveau:deriveNiveau(gRaw.points,gRaw.niveau)};

  const results:any[] = qR.data?.results??qR.data??[];
  const activiteQuiz:ActiviteItem[] = results.slice(0,3).map(r=>({
    id:r.id,type:'quiz',titre:r.quizTitre??'Quiz complété',
    sousTitre:r.score!==undefined?`Score ${r.score}/${r.scoreTotal}`:'Résultat disponible',
    date:fmtDate(r.createdAt),
  }));
  const progressList:any[] = prR.data?.progress??prR.data??[];
  const activiteLecon:ActiviteItem[] = progressList.filter((p:any)=>p.completed||p.statut==='completed').slice(0,2).map((p:any)=>({
    id:p.id??String(Math.random()),type:'lesson',titre:p.lesson?.titre??'Leçon complétée',
    sousTitre:'Complétée à 100%',date:fmtDate(p.updatedAt??p.createdAt??new Date().toISOString()),
  }));
  const activiteRecente = [...activiteQuiz,...activiteLecon].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).slice(0,5);

  let quizRecommande:QuizRecommande|null=null;
  try {
    const sR=await api.get('/courses/subjects');
    const subjects:any[]=sR.data?.subjects??sR.data??[];
    if(subjects.length>0){
      const cR2=await api.get(`/courses/subjects/${subjects[0].id}/chapters`);
      const chapters:any[]=cR2.data?.chapters??cR2.data??[];
      if(chapters.length>0){
        const q2=await api.get(`/quiz/chapter/${chapters[0].id}`);
        const q=q2.data?.quiz??q2.data;
        if(q?.id) quizRecommande={id:q.id,titre:q.titre??'Révision rapide',description:q.description??'10 questions adaptées',xpRecompense:q.xpRecompense??50};
      }
    }
  } catch {}

  const notifs:any[]=nR.data?.notifications??[];
  const unreadCount=notifs.filter(n=>!n.read&&!n.isRead).length;
  const mentorsRaw:any[]=mR.data?.students??mR.data??[];
  const mentors:MentorItem[]=mentorsRaw.slice(0,8).map(m=>({id:m.id,nom:m.nom,prenom:m.prenom,universite:m.universite,domaine:m.domaine,anneeEtude:m.anneeEtude??null,photo:m.photo??null,bio:m.bio??null,prixParHeure:m.prixParHeure??null,prixParDemiHeure:m.prixParDemiHeure??null}));
  const consultationsRaw:any[]=cR.data?.consultations??cR.data??[];
  const todayStr=new Date().toISOString().split('T')[0];
  const upcoming=consultationsRaw.filter((c:any)=>['PENDING','CONFIRMED'].includes(c.statut)&&c.date>=todayStr).sort((a:any,b:any)=>`${a.date} ${a.heure}`.localeCompare(`${b.date} ${b.heure}`));
  let prochainRdv:ProchainRdv|null=null;
  if(upcoming.length>0){const c=upcoming[0];const cs=c.CollegeStudent??c.collegeStudent??{};prochainRdv={id:c.id,mentorNom:cs.nom??'',mentorPrenom:cs.prenom??'',mentorPhoto:cs.photo??null,dateLabel:fmtRdvDate(c.date),heure:c.heure,meetLink:c.meetLink??null};}

  return {utilisateur:{id:user.id,nom:user.nom,prenom:user.prenom,photo:user.photo??null},gamification,activiteRecente,quizRecommande,unreadCount,mentors,prochainRdv};
};

function fmtDate(iso:string):string {
  try {const d=new Date(iso),n=new Date();const diff=Math.floor((n.setHours(0,0,0,0)-d.setHours(0,0,0,0))/86400000);if(diff===0)return"Aujourd'hui";if(diff===1)return'Hier';return new Date(iso).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'});}catch{return '';}
}
function fmtRdvDate(d:string):string {
  try{const t=new Date(`${d}T00:00:00`),n=new Date();n.setHours(0,0,0,0);const diff=Math.round((t.getTime()-n.getTime())/86400000);if(diff===0)return"Aujourd'hui";if(diff===1)return'Demain';return t.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'});}catch{return d;}
}
function getErr(e:unknown):string {
  if(typeof e==='object'&&e!==null&&'response' in e){const a=e as any;if(a.response?.status===401)return 'Session expirée';if(a.response?.data?.message)return a.response.data.message;}
  return e instanceof Error?e.message:'Une erreur est survenue';
}

// ─── COMPOSANTS ───────────────────────────────────────────────────────────────

const Header = ({unreadCount,onNotif}:{unreadCount:number;onNotif:()=>void}) => (
  <View style={s.header}>
    <Image source={logo} style={s.headerLogo} resizeMode="contain"/>
    <TouchableOpacity onPress={onNotif} style={s.notifBtn}>
      <Ionicons name="notifications-outline" size={26} color={P.text}/>
      {unreadCount>0&&<View style={s.notifBadge}><Text style={s.notifBadgeText}>{unreadCount>9?'9+':unreadCount}</Text></View>}
    </TouchableOpacity>
  </View>
);

// ── Greeting + stats horizontaux ──────────────────────────────────────────────
const GreetingSection = ({utilisateur,gamification}:{utilisateur:Utilisateur;gamification:Gamification}) => {
  const h=new Date().getHours();
  const salut=h<12?'Bonjour':h<18?'Bon après-midi':'Bonsoir';
  const {points,streak,niveau}=gamification;
  const pw:DimensionValue=`${niveau.progressionPourcent}%` as DimensionValue;

  return (
    <View style={s.greetingSection}>
      {/* Ligne bonjour */}
      <View style={s.greetingRow}>
        <View style={{flex:1}}>
          <Text style={s.greetingSalut}>{salut} 👋</Text>
          <Text style={s.greetingName}>{utilisateur.prenom} {utilisateur.nom}</Text>
        </View>
        {utilisateur.photo
          ? <Image source={{uri:utilisateur.photo}} style={s.greetingAvatar}/>
          : <LinearGradient colors={[P.green,P.greenMid]} style={s.greetingAvatarFallback}>
              <Text style={s.greetingAvatarInitial}>{utilisateur.prenom?.[0]?.toUpperCase()??'?'}</Text>
            </LinearGradient>
        }
      </View>

      {/* 3 stat pills */}
      <View style={s.statsRow}>
        {/* Streak */}
        <LinearGradient colors={['#FFF8E4','#FEF0C0']} style={s.statPill}>
          <Text style={s.statPillEmoji}>🔥</Text>
          <Text style={s.statPillValue}>{streak}</Text>
          <Text style={s.statPillLabel}>Streak</Text>
        </LinearGradient>

        {/* XP */}
        <LinearGradient colors={[P.greenLighter,P.greenLight]} style={s.statPill}>
          <Text style={s.statPillEmoji}>⚡</Text>
          <Text style={[s.statPillValue,{color:P.green}]}>{points>=1000?`${(points/1000).toFixed(1)}k`:points}</Text>
          <Text style={[s.statPillLabel,{color:P.green}]}>XP</Text>
        </LinearGradient>

        {/* Niveau */}
        <LinearGradient colors={[P.purpleLight,'#F5F3FF']} style={s.statPill}>
          <Text style={s.statPillEmoji}>{niveau.emoji}</Text>
          <Text style={[s.statPillValue,{color:P.purple}]}>{niveau.label}</Text>
          <Text style={[s.statPillLabel,{color:P.purple}]}>Niveau {niveau.numero}</Text>
        </LinearGradient>
      </View>

      {/* Barre de progression */}
      <View style={s.progressCard}>
        <View style={s.progressCardHeader}>
          <Text style={s.progressCardLabel}>Progression → {niveau.prochainLabel}</Text>
          <Text style={s.progressCardPct}>{niveau.progressionPourcent}%</Text>
        </View>
        <View style={s.progressBg}>
          <LinearGradient colors={[P.green,P.greenMid]} style={[s.progressFill,{width:pw}]} start={{x:0,y:0}} end={{x:1,y:0}}/>
        </View>
      </View>
    </View>
  );
};

// ── Section "Aujourd'hui" ─────────────────────────────────────────────────────
const AujourdhuiSection = ({prochainRdv,quizRecommande,navigation,onQuizPress}:{
  prochainRdv:ProchainRdv|null;quizRecommande:QuizRecommande|null;navigation:NavigationProp;onQuizPress:(id:string)=>void;
}) => {
  if(!prochainRdv&&!quizRecommande) return null;
  const isToday = prochainRdv?.dateLabel==="Aujourd'hui";
  const initiales = prochainRdv?`${prochainRdv.mentorPrenom?.[0]??''}${prochainRdv.mentorNom?.[0]??''}`.toUpperCase():'';

  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>📌 Aujourd'hui</Text>

      {/* RDV Card */}
      {prochainRdv&&(
        <TouchableOpacity
          style={s.rdvCard}
          activeOpacity={0.88}
          onPress={()=>{
            if(prochainRdv.meetLink) navigation.navigate('StudentMeeting',{meetLink:prochainRdv.meetLink,title:`Réunion avec ${prochainRdv.mentorPrenom} ${prochainRdv.mentorNom}`});
            else Alert.alert('Rendez-vous',`${prochainRdv.mentorPrenom} ${prochainRdv.mentorNom}\n${prochainRdv.dateLabel} à ${prochainRdv.heure}`);
          }}
        >
          <LinearGradient colors={[P.green,P.greenMid]} style={s.rdvGradient} start={{x:0,y:0}} end={{x:1,y:1}}>
            {isToday&&<View style={s.rdvUrgentBadge}><Text style={s.rdvUrgentText}>● EN COURS</Text></View>}
            <View style={s.rdvContent}>
              <View style={s.rdvLeft}>
                {prochainRdv.mentorPhoto
                  ? <Image source={{uri:prochainRdv.mentorPhoto}} style={s.rdvPhoto}/>
                  : <View style={s.rdvPhotoFallback}><Text style={s.rdvInitiales}>{initiales}</Text></View>
                }
              </View>
              <View style={{flex:1}}>
                <Text style={s.rdvType}>📅 Consultation planifiée</Text>
                <Text style={s.rdvName}>{prochainRdv.mentorPrenom} {prochainRdv.mentorNom}</Text>
                <Text style={s.rdvTime}>{prochainRdv.dateLabel} · {prochainRdv.heure}</Text>
              </View>
              <View style={s.rdvActionBtn}>
                <Ionicons name={prochainRdv.meetLink?'videocam':'time-outline'} size={18} color={P.green}/>
                <Text style={s.rdvActionText}>{prochainRdv.meetLink?'Rejoindre':'Bientôt'}</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Quiz Card */}
      {quizRecommande&&(
        <TouchableOpacity style={s.quizCard} activeOpacity={0.88} onPress={()=>onQuizPress(quizRecommande.id)}>
          <View style={s.quizIconWrap}>
            <LinearGradient colors={[P.gold,'#F0B429']} style={s.quizIcon}>
              <Ionicons name="flash" size={22} color={P.white}/>
            </LinearGradient>
          </View>
          <View style={{flex:1}}>
            <Text style={s.quizType}>🎯 Quiz du jour</Text>
            <Text style={s.quizTitle} numberOfLines={1}>{quizRecommande.titre}</Text>
            <Text style={s.quizSub}>{quizRecommande.description}</Text>
          </View>
          <View style={s.quizXpBadge}>
            <Text style={s.quizXpText}>+{quizRecommande.xpRecompense}</Text>
            <Text style={s.quizXpLabel}>XP</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ── Carte mentor ──────────────────────────────────────────────────────────────
const DOMAIN_COLORS = [
  {bg:P.greenLight,text:P.green},{bg:P.blueLight,text:P.blue},
  {bg:P.purpleLight,text:P.purple},{bg:P.orangeLight,text:P.orange},
  {bg:P.goldLight,text:P.gold},
];

const MentorCard = ({mentor,onPress,index}:{mentor:MentorItem;onPress:()=>void;index:number}) => {
  const col = DOMAIN_COLORS[index%5];
  const initiales = `${mentor.prenom?.[0]??''}${mentor.nom?.[0]??''}`.toUpperCase();
  return (
    <TouchableOpacity style={s.mentorCard} onPress={onPress} activeOpacity={0.85}>
      {mentor.photo
        ? <Image source={{uri:mentor.photo}} style={s.mentorPhoto}/>
        : <LinearGradient colors={[P.green,P.greenMid]} style={s.mentorPhotoFallback}>
            <Text style={s.mentorInitiales}>{initiales}</Text>
          </LinearGradient>
      }
      <View style={{padding:10,flex:1}}>
        <Text style={s.mentorName} numberOfLines={1}>{mentor.prenom} {mentor.nom}</Text>
        <View style={[s.mentorDomainBadge,{backgroundColor:col.bg}]}>
          <Text style={[s.mentorDomainText,{color:col.text}]} numberOfLines={1}>{mentor.domaine}</Text>
        </View>
        <Text style={s.mentorUni} numberOfLines={1}>{mentor.universite}</Text>
        <View style={s.mentorFooter}>
          <Text style={s.mentorPrix}>{mentor.prixParHeure?`${mentor.prixParHeure}$/h`:'Sur demande'}</Text>
          <View style={s.mentorBtn}><Text style={s.mentorBtnText}>Voir</Text></View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ── Section mentors ───────────────────────────────────────────────────────────
const MentorsSection = ({mentors,onMentorPress,onSeeAll}:{mentors:MentorItem[];onMentorPress:(m:MentorItem)=>void;onSeeAll:()=>void;}) => (
  <View style={s.section}>
    <View style={s.sectionHeader}>
      <Text style={s.sectionLabel}>🎓 Anciens étudiants</Text>
      <TouchableOpacity onPress={onSeeAll}><Text style={s.seeAll}>Voir tout →</Text></TouchableOpacity>
    </View>
    {mentors.length===0
      ? <View style={s.emptyCard}><Ionicons name="people-outline" size={28} color={P.textMuted}/><Text style={s.emptyText}>Aucun profil disponible</Text></View>
      : <FlatList horizontal data={mentors} keyExtractor={m=>m.id} showsHorizontalScrollIndicator={false}
          contentContainerStyle={{gap:12,paddingRight:4}}
          renderItem={({item,index})=><MentorCard mentor={item} onPress={()=>onMentorPress(item)} index={index}/>}
        />
    }
  </View>
);

// ── Section activité ──────────────────────────────────────────────────────────
const ACTIVITE_CONFIGS = {
  lesson: {icon:'book-outline' as const, grad:[P.greenLight,'#D1FAE5'] as [string,string], color:P.green},
  quiz:   {icon:'trophy-outline' as const, grad:[P.goldLight,'#FDE68A'] as [string,string], color:P.gold},
};

const ActiviteSection = ({activites}:{activites:ActiviteItem[]}) => {
  if(activites.length===0) return null;
  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>🕐 Activité récente</Text>
      <View style={s.activiteCard}>
        {activites.map((item,i)=>{
          const cfg = item.type==='lesson'?ACTIVITE_CONFIGS.lesson:ACTIVITE_CONFIGS.quiz;
          return (
            <View key={item.id}>
              <View style={s.activiteRow}>
                <LinearGradient colors={cfg.grad} style={s.activiteIcon}>
                  <Ionicons name={cfg.icon} size={16} color={cfg.color}/>
                </LinearGradient>
                <View style={{flex:1}}>
                  <Text style={s.activiteTitre} numberOfLines={1}>{item.titre}</Text>
                  <Text style={s.activiteSub}>{item.sousTitre}</Text>
                </View>
                <Text style={s.activiteDate}>{item.date}</Text>
              </View>
              {i<activites.length-1&&<View style={s.activiteSep}/>}
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ─── ÉCRAN PRINCIPAL ──────────────────────────────────────────────────────────
export default function StudentHomeScreen({navigation}:{navigation:NavigationProp}) {
  const [data,setData]           = useState<HomeData|null>(null);
  const [loading,setLoading]     = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [error,setError]         = useState<string|null>(null);

  const loadData = useCallback(async(isRefresh=false)=>{
    try {
      if(isRefresh) setRefreshing(true); else setLoading(true);
      setError(null);
      setData(await fetchHomeData());
    } catch(err:unknown) {
      const msg=getErr(err); setError(msg);
      if(msg==='Session expirée') Alert.alert('Session expirée','Veuillez vous reconnecter.',[{text:'OK',onPress:()=>navigation.replace?navigation.replace('Login'):navigation.navigate('Login')}]);
    } finally {setLoading(false);setRefreshing(false);}
  },[navigation]);

  useEffect(()=>{loadData();},[loadData]);

  if(loading) return <SafeAreaView style={s.centered}><ActivityIndicator size="large" color={P.green}/></SafeAreaView>;
  if(error&&!data) return (
    <SafeAreaView style={s.centered}>
      <Ionicons name="cloud-offline-outline" size={48} color={P.textMuted}/>
      <Text style={s.errText}>{error}</Text>
      <TouchableOpacity style={s.retryBtn} onPress={()=>loadData()}>
        <Text style={s.retryBtnText}>Réessayer</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
  if(!data) return null;

  const {utilisateur,gamification,activiteRecente,quizRecommande,unreadCount,mentors,prochainRdv}=data;

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={P.white}/>
      <Header unreadCount={unreadCount} onNotif={()=>navigation.navigate('Notifications')}/>
      <ScrollView
        style={{flex:1,backgroundColor:P.bg}}
        contentContainerStyle={{paddingBottom:32}}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>loadData(true)} colors={[P.green]} tintColor={P.green}/>}
      >
        <GreetingSection utilisateur={utilisateur} gamification={gamification}/>
        <AujourdhuiSection
          prochainRdv={prochainRdv} quizRecommande={quizRecommande}
          navigation={navigation} onQuizPress={(id)=>navigation.navigate('Quiz',{quizId:id})}
        />
        <MentorsSection
          mentors={mentors}
          onMentorPress={(m)=>navigation.navigate('StudentMentors',{initialMentorId:m.id})}
          onSeeAll={()=>navigation.navigate('StudentMentors')}
        />
        <ActiviteSection activites={activiteRecente}/>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:{flex:1,backgroundColor:P.white},
  centered:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:P.white,gap:12},

  // Header
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:20,paddingVertical:8,backgroundColor:P.white,borderBottomWidth:1,borderBottomColor:P.border},
  headerLogo:{width:60,height:60},
  notifBtn:{width:42,height:42,alignItems:'center',justifyContent:'center'},
  notifBadge:{position:'absolute',top:4,right:4,backgroundColor:P.danger,borderRadius:8,minWidth:16,height:16,alignItems:'center',justifyContent:'center',paddingHorizontal:3},
  notifBadgeText:{color:P.white,fontSize:9,fontWeight:'700'},

  // Greeting section
  greetingSection:{backgroundColor:P.white,paddingHorizontal:20,paddingTop:20,paddingBottom:16},
  greetingRow:{flexDirection:'row',alignItems:'center',marginBottom:20},
  greetingSalut:{fontSize:14,color:P.textSub,fontWeight:'500'},
  greetingName:{fontSize:24,color:P.text,fontWeight:'900',letterSpacing:-0.5},
  greetingAvatar:{width:54,height:54,borderRadius:27,borderWidth:3,borderColor:P.greenLight},
  greetingAvatarFallback:{width:54,height:54,borderRadius:27,alignItems:'center',justifyContent:'center'},
  greetingAvatarInitial:{fontSize:22,color:P.white,fontWeight:'800'},

  // Stat pills
  statsRow:{flexDirection:'row',gap:10,marginBottom:16},
  statPill:{flex:1,borderRadius:16,paddingVertical:12,alignItems:'center',gap:2},
  statPillEmoji:{fontSize:20},
  statPillValue:{fontSize:15,fontWeight:'900',color:P.text},
  statPillLabel:{fontSize:10,color:P.textSub,fontWeight:'600'},

  // Progress
  progressCard:{backgroundColor:P.greenLighter,borderRadius:16,padding:14,borderWidth:1,borderColor:P.greenLight},
  progressCardHeader:{flexDirection:'row',justifyContent:'space-between',marginBottom:8},
  progressCardLabel:{fontSize:12,fontWeight:'600',color:P.green},
  progressCardPct:{fontSize:12,fontWeight:'800',color:P.green},
  progressBg:{height:8,backgroundColor:'rgba(13,107,94,0.12)',borderRadius:6,overflow:'hidden'},
  progressFill:{height:8,borderRadius:6},

  // Sections
  section:{paddingHorizontal:16,marginTop:20},
  sectionHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:12},
  sectionLabel:{fontSize:16,fontWeight:'800',color:P.text,marginBottom:12},
  seeAll:{fontSize:13,color:P.green,fontWeight:'700'},

  // RDV card
  rdvCard:{borderRadius:20,overflow:'hidden',marginBottom:12,shadowColor:P.green,shadowOpacity:0.25,shadowRadius:12,shadowOffset:{width:0,height:4},elevation:6},
  rdvGradient:{padding:16},
  rdvUrgentBadge:{alignSelf:'flex-start',backgroundColor:'rgba(255,255,255,0.25)',borderRadius:20,paddingHorizontal:10,paddingVertical:4,marginBottom:10},
  rdvUrgentText:{color:P.white,fontSize:10,fontWeight:'800',letterSpacing:1},
  rdvContent:{flexDirection:'row',alignItems:'center',gap:12},
  rdvLeft:{},
  rdvPhoto:{width:48,height:48,borderRadius:24,borderWidth:2,borderColor:'rgba(255,255,255,0.4)'},
  rdvPhotoFallback:{width:48,height:48,borderRadius:24,backgroundColor:'rgba(255,255,255,0.2)',alignItems:'center',justifyContent:'center'},
  rdvInitiales:{fontSize:18,color:P.white,fontWeight:'800'},
  rdvType:{fontSize:11,color:'rgba(255,255,255,0.75)',marginBottom:3},
  rdvName:{fontSize:16,color:P.white,fontWeight:'800'},
  rdvTime:{fontSize:12,color:'rgba(255,255,255,0.8)',marginTop:2},
  rdvActionBtn:{backgroundColor:P.white,borderRadius:14,paddingHorizontal:12,paddingVertical:8,alignItems:'center',gap:2},
  rdvActionText:{fontSize:11,color:P.green,fontWeight:'800'},

  // Quiz card
  quizCard:{flexDirection:'row',alignItems:'center',backgroundColor:P.white,borderRadius:20,padding:14,gap:14,borderWidth:1,borderColor:P.border,marginBottom:0,shadowColor:'#000',shadowOpacity:0.05,shadowRadius:8,shadowOffset:{width:0,height:2},elevation:2},
  quizIconWrap:{flexShrink:0},
  quizIcon:{width:50,height:50,borderRadius:16,alignItems:'center',justifyContent:'center'},
  quizType:{fontSize:11,color:P.textMuted,marginBottom:2},
  quizTitle:{fontSize:14,fontWeight:'800',color:P.text,marginBottom:2},
  quizSub:{fontSize:12,color:P.textSub},
  quizXpBadge:{backgroundColor:P.goldLight,borderRadius:12,paddingHorizontal:10,paddingVertical:8,alignItems:'center',flexShrink:0},
  quizXpText:{fontSize:16,fontWeight:'900',color:P.gold},
  quizXpLabel:{fontSize:10,color:P.gold,fontWeight:'700'},

  // Mentor cards
  mentorCard:{width:170,backgroundColor:P.white,borderRadius:20,borderWidth:1,borderColor:P.border,overflow:'hidden',shadowColor:'#000',shadowOpacity:0.05,shadowRadius:8,shadowOffset:{width:0,height:2},elevation:2},
  mentorPhoto:{width:'100%',height:110},
  mentorPhotoFallback:{width:'100%',height:110,alignItems:'center',justifyContent:'center'},
  mentorInitiales:{fontSize:36,color:P.white,fontWeight:'900'},
  mentorName:{fontSize:13,fontWeight:'800',color:P.text,marginBottom:5},
  mentorDomainBadge:{borderRadius:8,paddingHorizontal:7,paddingVertical:3,alignSelf:'flex-start',marginBottom:4},
  mentorDomainText:{fontSize:10,fontWeight:'700'},
  mentorUni:{fontSize:11,color:P.textMuted,marginBottom:8},
  mentorFooter:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  mentorPrix:{fontSize:12,fontWeight:'700',color:P.gold},
  mentorBtn:{backgroundColor:P.green,borderRadius:10,paddingHorizontal:10,paddingVertical:5},
  mentorBtnText:{fontSize:11,color:P.white,fontWeight:'700'},

  // Empty
  emptyCard:{backgroundColor:P.white,borderRadius:16,borderWidth:1,borderColor:P.border,alignItems:'center',justifyContent:'center',padding:28,gap:8},
  emptyText:{fontSize:13,color:P.textMuted,textAlign:'center'},

  // Activité
  activiteCard:{backgroundColor:P.white,borderRadius:20,borderWidth:1,borderColor:P.border,overflow:'hidden',shadowColor:'#000',shadowOpacity:0.04,shadowRadius:8,shadowOffset:{width:0,height:2},elevation:1},
  activiteRow:{flexDirection:'row',alignItems:'center',padding:14,gap:12},
  activiteIcon:{width:36,height:36,borderRadius:12,alignItems:'center',justifyContent:'center',flexShrink:0},
  activiteTitre:{fontSize:13,fontWeight:'700',color:P.text},
  activiteSub:{fontSize:11,color:P.textMuted,marginTop:1},
  activiteDate:{fontSize:11,color:P.textMuted,flexShrink:0},
  activiteSep:{height:1,backgroundColor:P.border,marginHorizontal:14},

  // Errors
  errText:{fontSize:14,color:P.textSub,textAlign:'center',paddingHorizontal:32},
  retryBtn:{backgroundColor:P.green,borderRadius:22,paddingHorizontal:24,paddingVertical:12,marginTop:8},
  retryBtnText:{color:P.white,fontSize:14,fontWeight:'600'},
});