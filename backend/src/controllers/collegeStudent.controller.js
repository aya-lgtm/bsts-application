const { CollegeStudent, Consultation, User } = require('../models');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// GET tous les étudiants universitaires (accessible par tous)
const getAllCollegeStudents = async (req, res) => {
  try {
    const students = await CollegeStudent.findAll({
      where: { isActive: true },
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json({ students });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET un étudiant universitaire par ID
const getCollegeStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await CollegeStudent.findByPk(id);
    if (!student) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }
    return res.status(200).json({ student });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST créer un étudiant universitaire (ADMIN seulement)
const createCollegeStudent = async (req, res) => {
  try {
    const {
      nom, prenom, age, email, universite, domaine,
      anneeEtude, photo, bio, prixParHeure, prixParDemiHeure, disponibilites,
    } = req.body;

    const student = await CollegeStudent.create({
      nom, prenom, age, email, universite, domaine,
      anneeEtude, photo, bio, prixParHeure, prixParDemiHeure,
      disponibilites: disponibilites || [],
    });

    return res.status(201).json({
      message: 'Étudiant universitaire créé avec succès !',
      student,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// PUT modifier un étudiant universitaire (ADMIN seulement)
const updateCollegeStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await CollegeStudent.findByPk(id);
    if (!student) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }
    await student.update(req.body);
    return res.status(200).json({ message: 'Étudiant mis à jour !', student });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// DELETE supprimer un étudiant universitaire (ADMIN seulement)
const deleteCollegeStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await CollegeStudent.findByPk(id);
    if (!student) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }
    await student.update({ isActive: false });
    return res.status(200).json({ message: 'Étudiant désactivé !' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST réserver une consultation
const bookConsultation = async (req, res) => {
  try {
    const { collegeStudentId, date, heure, duree, notes } = req.body;
    const userId = req.user.id;

    const collegeStudent = await CollegeStudent.findByPk(collegeStudentId);
    if (!collegeStudent) {
      return res.status(404).json({ message: 'Étudiant universitaire non trouvé' });
    }

    // Calculer le prix
    const prix = duree === '30min'
      ? collegeStudent.prixParDemiHeure
      : collegeStudent.prixParHeure;

    if (!prix) {
      return res.status(400).json({ message: 'Prix non défini pour cette durée' });
    }

    // Vérifier qu'il n'y a pas déjà une réservation à ce créneau
    const existing = await Consultation.findOne({
      where: { collegeStudentId, date, heure, statut: ['PENDING', 'CONFIRMED'] },
    });
    if (existing) {
      return res.status(400).json({ message: 'Ce créneau est déjà réservé' });
    }

    // Créer le PaymentIntent Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(prix * 100), // en centimes
      currency: 'usd',
      metadata: { userId, collegeStudentId, date, heure, duree },
    });

    // Créer la consultation
    const consultation = await Consultation.create({
      userId,
      collegeStudentId,
      date,
      heure,
      duree,
      prix,
      statut: 'PENDING',
      paymentIntentId: paymentIntent.id,
      notes,
    });

    return res.status(201).json({
      message: 'Consultation réservée !',
      consultation,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET mes consultations (utilisateur connecté)
const getMyConsultations = async (req, res) => {
  try {
    const consultations = await Consultation.findAll({
      where: { userId: req.user.id },
      include: [{ model: CollegeStudent }],
      order: [['date', 'DESC']],
    });
    return res.status(200).json({ consultations });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET consultations d'un parent (ses enfants)
const getParentConsultations = async (req, res) => {
  try {
    const { User: UserModel } = require('../models');
    const children = await UserModel.findAll({
      where: { parentId: req.user.id },
      attributes: ['id'],
    });
    const childrenIds = children.map(c => c.id);

    const consultations = await Consultation.findAll({
      where: { userId: childrenIds },
      include: [
        { model: CollegeStudent },
        { model: User, attributes: ['id', 'nom', 'prenom'] },
      ],
      order: [['date', 'DESC']],
    });

    return res.status(200).json({ consultations });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const confirmConsultationPayment = async (req, res) => {
  try {
    const { consultationId } = req.params;

    const consultation = await Consultation.findOne({
      where: { id: consultationId, userId: req.user.id },
    });

    if (!consultation) {
      return res.status(404).json({ message: 'Consultation non trouvée' });
    }

    // Générer un lien Daily.co automatiquement
    const roomName = `bsts-consultation-${consultationId}`;
    const dailyResponse = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: roomName,
        privacy: 'public',
        properties: {
          enable_chat: true,
          enable_screenshare: false,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // Expire dans 24h
        },
      }),
    });

    const roomData = await dailyResponse.json();
    const meetLink = roomData.url || `https://${process.env.DAILY_DOMAIN}.daily.co/${roomName}`;

    await consultation.update({ isPaid: true, statut: 'CONFIRMED', meetLink });

    return res.status(200).json({
      message: 'Paiement confirmé !',
      consultation,
      meetLink,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET mon profil (COLLEGE_STUDENT)
const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    // Le college student est lié via email à un User
    const user = await User.findByPk(userId, { attributes: ['email'] });
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const student = await CollegeStudent.findOne({ where: { email: user.email } });
    if (!student) return res.status(404).json({ message: 'Profil non trouvé' });

    return res.status(200).json({ student });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// PUT modifier mon profil (COLLEGE_STUDENT)
const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId, { attributes: ['email'] });
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const student = await CollegeStudent.findOne({ where: { email: user.email } });
    if (!student) return res.status(404).json({ message: 'Profil non trouvé' });

    const allowed = ['bio', 'photo', 'prixParHeure', 'prixParDemiHeure', 'disponibilites'];
    const updates = {};
    allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });

    await student.update(updates);
    return res.status(200).json({ message: 'Profil mis à jour !', student });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
// POST webhook Daily.co
const handleDailyWebhook = async (req, res) => {
  // Répondre 200 immédiatement
  res.status(200).json({ received: true });

  try {
    const { event_type, payload } = req.body;
    if (!event_type || !payload) return;

    const roomName = payload.room || payload.room_name || '';
    const consultationId = roomName.replace('bsts-consultation-', '');
    if (!consultationId || consultationId === roomName) return;

    const consultation = await Consultation.findByPk(consultationId);
    if (!consultation) return;

    const now = new Date();

    if (event_type === 'meeting-started') {
      await consultation.update({
        meetingStatus: 'IN_PROGRESS',
        firstJoinedAt: consultation.firstJoinedAt || now,
      });
    }

    if (event_type === 'meeting-joined') {
      const sessions = [...(consultation.sessions || [])];
      sessions.push({ joinedAt: now.toISOString(), leftAt: null, durationSeconds: 0 });
      const update = { sessions };
      if (!consultation.firstJoinedAt) {
        update.firstJoinedAt = now;
        update.meetingStatus = 'IN_PROGRESS';
      }
      await consultation.update(update);
    }

    if (event_type === 'meeting-left') {
      const sessions = [...(consultation.sessions || [])];
      const openIdx = sessions.map(s => s.leftAt).lastIndexOf(null);
      if (openIdx !== -1) {
        const durationSeconds = Math.round(
          (now - new Date(sessions[openIdx].joinedAt)) / 1000
        );
        sessions[openIdx] = { ...sessions[openIdx], leftAt: now.toISOString(), durationSeconds };
        await consultation.update({
          sessions,
          totalDurationSeconds: (consultation.totalDurationSeconds || 0) + durationSeconds,
          lastLeftAt: now,
        });
      }
    }

    if (event_type === 'meeting-ended') {
      const sessions = [...(consultation.sessions || [])];
      let totalAdd = 0;
      sessions.forEach((s, i) => {
        if (!s.leftAt) {
          const durationSeconds = Math.round((now - new Date(s.joinedAt)) / 1000);
          sessions[i] = { ...s, leftAt: now.toISOString(), durationSeconds };
          totalAdd += durationSeconds;
        }
      });
      await consultation.update({
        meetingStatus: 'COMPLETED',
        statut: 'COMPLETED',
        lastLeftAt: now,
        sessions,
        totalDurationSeconds: (consultation.totalDurationSeconds || 0) + totalAdd,
      });
    }
  } catch (err) {
    console.error('[Daily Webhook] Erreur :', err.message);
  }
};

module.exports = {
  getAllCollegeStudents,
  getCollegeStudentById,
  createCollegeStudent,
  updateCollegeStudent,
  deleteCollegeStudent,
  bookConsultation,
  getMyConsultations,
  getParentConsultations,
  confirmConsultationPayment,
  getMyProfile,
  handleDailyWebhook,
  updateMyProfile,
};