const { Review, User, CollegeStudent, Consultation } = require('../models');

// GET mes avis (COLLEGE_STUDENT connecté)
const getMyReviews = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: ['email'] });
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const student = await CollegeStudent.findOne({ where: { email: user.email } });
    if (!student) return res.status(404).json({ message: 'Profil non trouvé' });

    const reviews = await Review.findAll({
      where: { collegeStudentId: student.id },
      include: [{ model: User, as: 'user', attributes: ['id', 'nom', 'prenom', 'photo'] }],
      order: [['createdAt', 'DESC']],
    });

    const totalReviews = reviews.length;
    const noteMoyenne = totalReviews > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.note, 0) / totalReviews) * 10) / 10
      : 0;

    return res.status(200).json({ reviews, noteMoyenne, totalReviews });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST laisser un avis sur un college student
const createReview = async (req, res) => {
  try {
    const { id } = req.params; // collegeStudentId
    const userId = req.user.id;
    const { note, commentaire, badges } = req.body;

    // Vérifier que le college student existe
    const student = await CollegeStudent.findByPk(id);
    if (!student) return res.status(404).json({ message: 'Étudiant universitaire non trouvé' });

    // Vérifier que l'utilisateur a eu une consultation avec ce college student
    const consultation = await Consultation.findOne({
      where: { userId, collegeStudentId: id, statut: 'CONFIRMED', isPaid: true },
    });
    if (!consultation) {
      return res.status(403).json({ message: 'Vous devez avoir eu une consultation confirmée pour laisser un avis' });
    }

    // Vérifier qu'il n'a pas déjà laissé un avis
    const existing = await Review.findOne({ where: { userId, collegeStudentId: id } });
    if (existing) {
      return res.status(400).json({ message: 'Vous avez déjà laissé un avis pour cet étudiant' });
    }

    const review = await Review.create({
      userId,
      collegeStudentId: id,
      note,
      commentaire,
      badges: badges || [],
    });

    const fullReview = await Review.findByPk(review.id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'nom', 'prenom', 'photo'] }],
    });

    return res.status(201).json({ message: 'Avis ajouté !', review: fullReview });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

module.exports = { getMyReviews, createReview };