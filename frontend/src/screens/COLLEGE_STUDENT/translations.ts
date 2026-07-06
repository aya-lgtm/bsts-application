// ─── Traductions FR / EN pour tous les écrans COLLEGE_STUDENT ─────────────────

export type Lang = 'fr' | 'en';

export const translations = {
  // ── Commun ──────────────────────────────────────────────────────────────────
  common: {
    save:        { fr: 'Enregistrer',    en: 'Save'           },
    cancel:      { fr: 'Annuler',        en: 'Cancel'         },
    confirm:     { fr: 'Confirmer',      en: 'Confirm'        },
    back:        { fr: 'Retour',         en: 'Back'           },
    loading:     { fr: 'Chargement...', en: 'Loading...'     },
    error:       { fr: 'Erreur',         en: 'Error'          },
    success:     { fr: 'Succès',         en: 'Success'        },
    seeAll:      { fr: 'Voir tout',      en: 'See all'        },
    reduce:      { fr: 'Réduire',        en: 'Reduce'         },
    noData:      { fr: 'Aucune donnée', en: 'No data'        },
    retry:       { fr: 'Réessayer',      en: 'Retry'          },
    join:        { fr: 'Rejoindre',      en: 'Join'           },
    accept:      { fr: 'Accepter',       en: 'Accept'         },
    refuse:      { fr: 'Refuser',        en: 'Refuse'         },
    logout:      { fr: 'Déconnexion',    en: 'Log out'        },
  },

  // ── Drawer menu ──────────────────────────────────────────────────────────────
  drawer: {
    preferences:  { fr: 'Préférences',        en: 'Preferences'        },
    appearance:   { fr: 'Apparence',           en: 'Appearance'         },
    darkMode:     { fr: 'Mode Sombre',         en: 'Dark Mode'          },
    lightMode:    { fr: 'Mode Clair',          en: 'Light Mode'         },
    darkEnabled:  { fr: 'Thème foncé activé', en: 'Dark theme enabled' },
    lightEnabled: { fr: 'Thème clair activé', en: 'Light theme enabled'},
    language:     { fr: 'Langue',              en: 'Language'           },
  },

  // ── Home ────────────────────────────────────────────────────────────────────
  home: {
    hello:            { fr: 'Bonjour',                                   en: 'Hello'                                    },
    readyToHelp:      { fr: 'Prêt à accompagner les étudiants ?',        en: 'Ready to help students today?'           },
    meetingsDone:     { fr: 'Meetings\nréalisés',                        en: 'Meetings\ndone'                           },
    studentsHelped:   { fr: 'Étudiants\naidés',                          en: 'Students\nhelped'                         },
    avgRating:        { fr: 'Note\nmoyenne',                             en: 'Avg\nrating'                              },
    satisfaction:     { fr: 'Taux de\nsatisfaction',                     en: 'Satisfaction\nrate'                       },
    revenusThisMonth: { fr: 'Revenus ce mois',                           en: 'Revenue this month'                       },
    basedOnPaid:      { fr: 'Basé sur vos consultations payées',         en: 'Based on your paid consultations'         },
    avgRatingCard:    { fr: 'Note moyenne',                              en: 'Average rating'                           },
    reviewsReceived:  { fr: 'avis reçus · Voir tout',                   en: 'reviews received · See all'               },
    nextMeeting:      { fr: 'Prochain meeting',                          en: 'Next meeting'                             },
    noConfirmed:      { fr: 'Aucun meeting confirmé',                    en: 'No confirmed meeting'                     },
    consultation:     { fr: 'Consultation',                              en: 'Consultation'                             },
    seeDemands:       { fr: 'Voir les demandes',                         en: 'See requests'                             },
  },

  // ── Meetings ─────────────────────────────────────────────────────────────────
  meetings: {
    title:          { fr: 'Mes meetings',                en: 'My meetings'              },
    tabDemandes:    { fr: 'Demandes',                    en: 'Requests'                 },
    tabAvenir:      { fr: 'À venir',                     en: 'Upcoming'                 },
    tabTermines:    { fr: 'Terminés',                    en: 'Completed'                },
    tabAnnules:     { fr: 'Annulés',                     en: 'Cancelled'                },
    noDemandes:     { fr: 'Aucune demande en attente',   en: 'No pending requests'      },
    noAvenir:       { fr: 'Aucun meeting à venir',       en: 'No upcoming meetings'     },
    noTermines:     { fr: 'Aucun meeting terminé',       en: 'No completed meetings'    },
    noAnnules:      { fr: 'Aucun meeting annulé',        en: 'No cancelled meetings'    },
    upToDate:       { fr: 'Tu es à jour !',              en: 'You\'re all caught up!'   },
    joinMeet:       { fr: 'Rejoindre · Google Meet',     en: 'Join · Google Meet'       },
    confirmed:      { fr: 'Confirmé',                    en: 'Confirmed'                },
    pending:        { fr: 'En attente',                  en: 'Pending'                  },
    cancelled:      { fr: 'Annulé',                      en: 'Cancelled'                },
    completed:      { fr: 'Terminé',                     en: 'Completed'                },
    paid:           { fr: '✓ Payé',                      en: '✓ Paid'                   },
    notRated:       { fr: 'Non noté',                    en: 'Not rated'                },
    seeAllDemands:  { fr: 'Voir toutes les demandes',    en: 'See all requests'         },
    confirmAccept:  { fr: 'Confirmer la consultation avec', en: 'Confirm consultation with' },
    confirmRefuse:  { fr: 'Refuser la demande de',       en: 'Refuse request from'      },
    myDispo:        { fr: 'Mes disponibilités',           en: 'My availability'          },
    saveDispo:      { fr: 'Enregistrer les disponibilités', en: 'Save availability'      },
  },

  // ── Notifications ────────────────────────────────────────────────────────────
  notifications: {
    title:        { fr: 'Notifications',          en: 'Notifications'          },
    markAllRead:  { fr: 'Marquer tout comme lu',  en: 'Mark all as read'       },
    today:        { fr: "Aujourd'hui",             en: 'Today'                  },
    yesterday:    { fr: 'Hier',                    en: 'Yesterday'              },
    twoDaysAgo:   { fr: 'Avant-hier',              en: 'Two days ago'           },
    noNotifs:     { fr: 'Aucune notification',     en: 'No notifications'       },
    upToDate:     { fr: 'Tu es à jour !',          en: 'You\'re all caught up!' },
  },

  // ── Disponibilités ───────────────────────────────────────────────────────────
  dispos: {
    title:        { fr: 'Mes disponibilités',            en: 'My availability'              },
    tarifs:       { fr: 'Tarifs',                         en: 'Rates'                        },
    banner:       { fr: 'Définissez vos créneaux disponibles', en: 'Set your available time slots' },
    bannerSub:    { fr: 'Les étudiants pourront réserver uniquement sur vos créneaux.', en: 'Students can only book on your available slots.' },
    unavailable:  { fr: 'Indisponible',                  en: 'Unavailable'                  },
    add:          { fr: 'Ajouter',                        en: 'Add'                          },
    save:         { fr: 'Enregistrer mes disponibilités', en: 'Save my availability'         },
    note:         { fr: 'Vous pouvez modifier vos créneaux à tout moment.', en: 'You can update your slots anytime.' },
    startTime:    { fr: 'Heure de début',                en: 'Start time'                   },
    endTime:      { fr: 'Heure de fin',                  en: 'End time'                     },
    savedOk:      { fr: 'Disponibilités mises à jour !', en: 'Availability updated!'        },
  },

  // ── Tarifs ───────────────────────────────────────────────────────────────────
  tarifs: {
    title:        { fr: 'Mes tarifs',                          en: 'My rates'                          },
    officiel:     { fr: 'Tarifs officiels BSTS',               en: 'Official BSTS rates'               },
    officielSub:  { fr: 'Les tarifs sont définis par l\'administrateur.', en: 'Rates are set by the administrator.' },
    byDuration:   { fr: 'Tarifs par durée',                    en: 'Rates by duration'                 },
    popular:      { fr: 'Populaire',                           en: 'Popular'                           },
    adminNote:    { fr: 'Les tarifs sont définis par l\'administration BSTS.', en: 'Rates are set by BSTS administration.' },
    infoText:     { fr: 'Ces tarifs s\'appliquent à tous vos meetings.', en: 'These rates apply to all your meetings.' },
    infoText2:    { fr: 'L\'étudiant choisira la durée lors de sa réservation.', en: 'The student will choose the duration when booking.' },
    seeDispo:     { fr: 'Voir mes disponibilités',             en: 'See my availability'               },
    adminDefined: { fr: 'Tarifs définis par l\'administrateur BSTS', en: 'Rates defined by BSTS administrator' },
    potential:    { fr: 'Revenu potentiel / jour',             en: 'Potential revenue / day'           },
    basedOn:      { fr: 'Basé sur 4 à 6 sessions d\'1h par jour', en: 'Based on 4 to 6 one-hour sessions per day' },
  },

  // ── Avis ─────────────────────────────────────────────────────────────────────
  avis: {
    title:        { fr: 'Avis des étudiants',     en: 'Student reviews'       },
    avgRating:    { fr: 'Note moyenne',            en: 'Average rating'        },
    basedOn:      { fr: 'Basée sur',               en: 'Based on'              },
    reviews:      { fr: 'avis',                    en: 'reviews'               },
    recent:       { fr: 'Commentaires récents',    en: 'Recent comments'       },
    noReviews:    { fr: 'Aucun avis pour l\'instant', en: 'No reviews yet'    },
    noReviewsSub: { fr: 'Les avis apparaîtront après vos consultations.', en: 'Reviews will appear after your consultations.' },
    badges:       { fr: 'Badges reçus',            en: 'Received badges'       },
    distribution: { fr: 'Distribution des notes',  en: 'Rating distribution'   },
  },

  // ── Profil ───────────────────────────────────────────────────────────────────
  profil: {
    title:          { fr: 'Mon Profil',                   en: 'My Profile'                  },
    activity:       { fr: 'Activité',                     en: 'Activity'                    },
    stats:          { fr: 'Mes statistiques',              en: 'My statistics'               },
    myDispo:        { fr: 'Mes disponibilités',            en: 'My availability'             },
    account:        { fr: 'Compte',                       en: 'Account'                     },
    accountInfo:    { fr: 'Informations du compte',       en: 'Account information'         },
    fingerprint:    { fr: 'Connexion par empreinte',      en: 'Fingerprint login'           },
    changePassword: { fr: 'Changer le mot de passe',      en: 'Change password'             },
    support:        { fr: 'Aide & Support',               en: 'Help & Support'              },
    logout:         { fr: 'Déconnexion',                  en: 'Log out'                     },
    consultations:  { fr: 'Consultations',                en: 'Consultations'               },
    confirmed:      { fr: 'Confirmées',                   en: 'Confirmed'                   },
    revenue:        { fr: 'Revenus',                      en: 'Revenue'                     },
    pricePerHour:   { fr: 'Prix / heure',                 en: 'Price / hour'                },
    price30:        { fr: 'Prix 30 min',                  en: 'Price 30 min'                },
    aboutMe:        { fr: 'À propos',                     en: 'About me'                    },
    active:         { fr: 'Active',                       en: 'Active'                      },
    inactive:       { fr: 'Inactive',                     en: 'Inactive'                    },
    firstName:      { fr: 'Prénom',                       en: 'First name'                  },
    lastName:       { fr: 'Nom',                          en: 'Last name'                   },
    email:          { fr: 'Email',                        en: 'Email'                       },
    university:     { fr: 'Université',                   en: 'University'                  },
    domain:         { fr: 'Domaine',                      en: 'Domain'                      },
    studyYear:      { fr: 'Année d\'étude',               en: 'Study year'                  },
    close:          { fr: 'Fermer',                       en: 'Close'                       },
    update:         { fr: 'Mettre à jour',                en: 'Update'                      },
    whatsapp:       { fr: 'Contacter le support via WhatsApp', en: 'Contact support via WhatsApp' },
    currentPwd:     { fr: 'Mot de passe actuel',          en: 'Current password'            },
    newPwd:         { fr: 'Nouveau mot de passe',         en: 'New password'                },
    confirmPwd:     { fr: 'Confirmer le nouveau mot de passe', en: 'Confirm new password'  },
    enableBio:      { fr: 'Activer la connexion par empreinte', en: 'Enable fingerprint login' },
    enterPwd:       { fr: 'Entrez votre mot de passe pour confirmer.', en: 'Enter your password to confirm.' },
    logoutConfirm:  { fr: 'Êtes-vous sûr de vouloir vous déconnecter ?', en: 'Are you sure you want to log out?' },
  },
} as const;

// ─── Hook utilitaire ──────────────────────────────────────────────────────────
export const t = (
  key: keyof typeof translations,
  subKey: string,
  lang: Lang
): string => {
  const section = translations[key] as Record<string, { fr: string; en: string }>;
  return section[subKey]?.[lang] ?? subKey;
};