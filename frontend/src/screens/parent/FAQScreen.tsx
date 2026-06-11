import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const FAQ_DATA = [
  {
    question: "Comment fonctionne l'application BSTS ?",
    answer: "BSTS est une application de préparation au test SAT. Elle propose des cours vidéo, des quiz, des tests pratiques chronométrés et un système de gamification pour motiver les élèves."
  },
  {
    question: "Comment suivre la progression de mon enfant ?",
    answer: "Depuis votre profil parent, vous pouvez consulter les scores, le niveau de progression et les badges obtenus par votre enfant dans la section Multi-child Management."
  },
  {
    question: "Comment mon enfant accède-t-il aux cours ?",
    answer: "Après connexion avec son compte élève, il accède directement aux modules de cours disponibles selon son abonnement."
  },
  {
    question: "Que faire si mon enfant a oublié son mot de passe ?",
    answer: "Sur l\'écran de connexion, il suffit de cliquer sur \'Mot de passe oublié\' et de suivre les instructions envoyées par email."
  },
  {
    question: "Quels sont les abonnements disponibles ?",
    answer: "Nous proposons des abonnements mensuel et annuel. L\'abonnement annuel offre une réduction significative. Contactez le support pour plus de détails."
  },
  {
    question: "Comment activer la connexion par empreinte digitale ?",
    answer: "Dans votre profil, allez dans \'Fingerprint Login\' et activez-le. Vous devrez confirmer votre mot de passe et scanner votre empreinte."
  },
  {
    question: "L\'application fonctionne-t-elle hors ligne ?",
    answer: "Une connexion internet est requise pour accéder aux vidéos et aux quiz. Certaines fonctionnalités de révision peuvent être disponibles hors ligne prochainement."
  },
  {
    question: "Comment contacter le support ?",
    answer: "Vous pouvez nous contacter directement via WhatsApp depuis la section Help & Support de votre profil. Nous répondons dans les 24h."
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity
      style={styles.faqItem}
      onPress={() => setOpen(!open)}
      activeOpacity={0.8}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{question}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#0D6B5E"
        />
      </View>
      {open && (
        <Text style={styles.faqAnswer}>{answer}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function FAQScreen({ onBack }: { onBack: () => void }) {
  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0D6B5E" />
        </TouchableOpacity>
        <Text style={styles.topbarTitle}>FAQ</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Questions fréquentes</Text>

        <View style={styles.card}>
          {FAQ_DATA.map((item, index) => (
            <View key={index}>
              <FAQItem question={item.question} answer={item.answer} />
              {index < FAQ_DATA.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#F0F0F0',
    alignItems: 'center', justifyContent: 'center',
  },
  topbarTitle: { fontSize: 18, fontWeight: '800', color: '#0D6B5E' },
  container: { paddingHorizontal: 20, paddingTop: 24 },
  subtitle: {
    fontSize: 13, fontWeight: '600', color: '#888',
    marginBottom: 12, marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  faqItem: { paddingVertical: 16 },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    lineHeight: 20,
  },
  faqAnswer: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    marginTop: 10,
  },
  divider: { height: 1, backgroundColor: '#F0F0F0' },
});