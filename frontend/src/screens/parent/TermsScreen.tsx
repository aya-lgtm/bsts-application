import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const SECTIONS = [
  {
    title: "1. Acceptation des conditions",
    content: "En utilisant l\'application BSTS, vous acceptez d\'être lié par les présentes conditions d\'utilisation. Si vous n\'acceptez pas ces conditions, veuillez ne pas utiliser l\'application."
  },
  {
    title: "2. Description du service",
    content: "BSTS est une plateforme de préparation au test SAT proposant des cours vidéo, des quiz interactifs, des tests pratiques et un système de suivi de progression. Le service est destiné aux élèves et à leurs parents."
  },
  {
    title: "3. Comptes utilisateurs",
    content: "Vous êtes responsable de la confidentialité de vos identifiants de connexion. Vous vous engagez à notifier immédiatement BSTS de toute utilisation non autorisée de votre compte."
  },
  {
    title: "4. Propriété intellectuelle",
    content: "Tout le contenu disponible sur BSTS (vidéos, cours, quiz, textes, images) est protégé par les lois sur la propriété intellectuelle. Toute reproduction ou distribution non autorisée est strictement interdite."
  },
  {
    title: "5. Abonnements et paiements",
    content: "L\'accès aux contenus premium nécessite un abonnement payant. Les paiements sont traités de manière sécurisée. Aucun remboursement ne sera accordé après accès au contenu."
  },
  {
    title: "6. Comportement des utilisateurs",
    content: "Vous vous engagez à utiliser l\'application de manière éthique et respectueuse. Tout comportement abusif, notamment dans le chat, pourra entraîner la suspension du compte."
  },
  {
    title: "7. Confidentialité des données",
    content: "BSTS collecte et traite vos données personnelles conformément à sa politique de confidentialité. Vos données ne sont jamais vendues à des tiers."
  },
  {
    title: "8. Limitation de responsabilité",
    content: "BSTS ne peut être tenu responsable des résultats obtenus au test SAT. L\'application est un outil d\'aide à la préparation et ne garantit pas un score particulier."
  },
  {
    title: "9. Modifications",
    content: "BSTS se réserve le droit de modifier ces conditions à tout moment. Les utilisateurs seront notifiés des changements importants par email ou via l\'application."
  },
  {
    title: "10. Contact",
    content: "Pour toute question relative aux présentes conditions, contactez-nous via WhatsApp au +212708060466 ou par email à support@bsts.ma."
  },
];

export default function TermsScreen({ onBack }: { onBack: () => void }) {
  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0D6B5E" />
        </TouchableOpacity>
        <Text style={styles.topbarTitle}>Conditions d\'utilisation</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdate}>Dernière mise à jour : Juin 2025</Text>

        <View style={styles.card}>
          {SECTIONS.map((section, index) => (
            <View key={index}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionContent}>{section.content}</Text>
              </View>
              {index < SECTIONS.length - 1 && <View style={styles.divider} />}
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
  lastUpdate: {
    fontSize: 12, color: '#AAA', marginBottom: 16, marginLeft: 4,
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
  section: { paddingVertical: 16 },
  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: '#0D6B5E', marginBottom: 8,
  },
  sectionContent: {
    fontSize: 13, color: '#555', lineHeight: 20,
  },
  divider: { height: 1, backgroundColor: '#F0F0F0' },
});