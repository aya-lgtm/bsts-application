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

// PUT confirmer le paiement d'une consultation
const confirmConsultationPayment = async (req, res) => {
  try {
    const { consultationId } = req.params;

    const consultation = await Consultation.findOne({
      where: { id: consultationId, userId: req.user.id },
    });

    if (!consultation) {
      return res.status(404).json({ message: 'Consultation non trouvée' });
    }

    await consultation.update({ isPaid: true, statut: 'CONFIRMED' });

    return res.status(200).json({ message: 'Paiement confirmé !', consultation });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
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
};