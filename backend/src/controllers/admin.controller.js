const { User, Lesson, Quiz, SATQuestion, SATSession, Consultation, Payment, Progress, QuizResult, ChapterQuizResult, Notification, CollegeStudent } = require('../models');
const { Op } = require('sequelize');
const { createNotification } = require('./notification.controller');

// GET /admin/dashboard
const getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalEtudiants, totalProfesseurs, totalCollegeStudents, totalAdmins,
      totalCours, totalQuiz, totalQuestionsSAT, totalMeetings,
      newThisMonth, newLastMonth,
    ] = await Promise.all([
      User.count({ where: { role: 'STUDENT' } }),
      User.count({ where: { role: 'PROFESSOR' } }),
      User.count({ where: { role: 'COLLEGE_STUDENT' } }),
      User.count({ where: { role: 'ADMIN' } }),
      Lesson.count({ where: { isActive: true } }),
      Quiz.count({ where: { isActive: true } }),
      SATQuestion.count({ where: { isActive: true } }),
      Consultation.count(),
      User.count({ where: { createdAt: { [Op.gte]: startOfMonth } } }),
      User.count({ where: { createdAt: { [Op.between]: [startOfLastMonth, startOfMonth] } } }),
    ]);

    // Revenus du mois
    const revenueResult = await Payment.sum('montant', {
      where: { statut: 'COMPLETED', createdAt: { [Op.gte]: startOfMonth } },
    });
    const revenusMois = revenueResult || 0;

    // Evolution utilisateurs (7 derniers jours)
    const jours = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const evolutionUtilisateurs = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const start = new Date(date.setHours(0, 0, 0, 0));
      const end = new Date(date.setHours(23, 59, 59, 999));
      const count = await User.count({ where: { createdAt: { [Op.between]: [start, end] } } });
      evolutionUtilisateurs.push({ jour: jours[start.getDay()], count });
    }

    // Activités récentes
    const recentUsers = await User.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'nom', 'prenom', 'role', 'createdAt'],
    });

    const activitesRecentes = recentUsers.map(u => ({
      type: 'user_created',
      titre: `Nouvel utilisateur inscrit (${u.role})`,
      sousTitre: `${u.prenom} ${u.nom}`,
      date: u.createdAt,
    }));

    const deltaEtudiants = newLastMonth > 0
      ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100)
      : 100;

    return res.status(200).json({
      totalEtudiants,
      totalProfesseurs,
      totalAnciensEtudiants: totalCollegeStudents,
      totalAdmins,
      totalCours,
      totalQuiz,
      totalQuestionsSAT,
      totalMeetings,
      revenusMois,
      deltaEtudiants,
      evolutionUtilisateurs,
      activitesRecentes,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET /admin/stats
const getStats = async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    const now = new Date();
    const startDate = new Date();
    if (period === 'week') startDate.setDate(now.getDate() - 7);
    else startDate.setMonth(now.getMonth() - 1);

    const startPrev = new Date(startDate);
    if (period === 'week') startPrev.setDate(startPrev.getDate() - 7);
    else startPrev.setMonth(startPrev.getMonth() - 1);

    const [
      newUsers, prevUsers,
      coursConsultes, prevCours,
      quizRealises, prevQuiz,
    ] = await Promise.all([
      User.count({ where: { createdAt: { [Op.gte]: startDate } } }),
      User.count({ where: { createdAt: { [Op.between]: [startPrev, startDate] } } }),
      Progress.count({ where: { createdAt: { [Op.gte]: startDate } } }),
      Progress.count({ where: { createdAt: { [Op.between]: [startPrev, startDate] } } }),
      QuizResult.count({ where: { createdAt: { [Op.gte]: startDate } } }),
      QuizResult.count({ where: { createdAt: { [Op.between]: [startPrev, startDate] } } }),
    ]);

    const satScoreResult = await SATSession.findOne({
      where: { isCompleted: true, createdAt: { [Op.gte]: startDate } },
      attributes: [[require('sequelize').fn('AVG', require('sequelize').col('scoreSAT')), 'avg']],
      raw: true,
    });
    const scoreSATMoyen = Math.round(satScoreResult?.avg || 0);

    const delta = (curr, prev) => prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 100;

    // Evolution par jour
    const jours = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const utilisationParJour = [];
    const days = period === 'week' ? 7 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const start = new Date(date.setHours(0, 0, 0, 0));
      const end = new Date(date.setHours(23, 59, 59, 999));
      const count = await User.count({ where: { createdAt: { [Op.between]: [start, end] } } });
      utilisationParJour.push({ jour: jours[start.getDay()], count });
    }

    return res.status(200).json({
      nouveauxUtilisateurs: { value: newUsers, deltaPourcent: delta(newUsers, prevUsers) },
      coursConsultes: { value: coursConsultes, deltaPourcent: delta(coursConsultes, prevCours) },
      quizRealises: { value: quizRealises, deltaPourcent: delta(quizRealises, prevQuiz) },
      scoreSATMoyen: { value: scoreSATMoyen, max: 1600, deltaPourcent: 0 },
      utilisationParJour,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST /admin/notifications/broadcast
const broadcastNotification = async (req, res) => {
  try {
    const { target, title, message } = req.body;

    const where = target === 'ALL' ? {} : { role: target };
    const users = await User.findAll({ where, attributes: ['id'] });

    let sent = 0;
    for (const user of users) {
      await createNotification(user.id, 'admin_broadcast', title, message);
      sent++;
    }

    return res.status(200).json({ message: `Notification envoyée à ${sent} utilisateurs !`, sent });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET /admin/meetings
const getAllMeetings = async (req, res) => {
  try {
    const { statut } = req.query;
    const where = statut ? { statut } : {};

    const meetings = await Consultation.findAll({
      where,
      include: [
        { model: CollegeStudent },
        { model: User, attributes: ['id', 'nom', 'prenom', 'email'] },
      ],
      order: [['date', 'DESC']],
    });

    return res.status(200).json({ meetings });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
// GET /admin/payments
const getAdminPayments = async (req, res) => {
  try {
    const payments = await Payment.findAll({
      include: [{ model: User, attributes: ['id', 'nom', 'prenom'] }],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    const montantAbonnements = payments
      .filter(p => p.statut === 'COMPLETED')
      .reduce((sum, p) => sum + parseFloat(p.montant), 0);

    // Revenus des meetings (stockés sur Consultation, pas Payment)
    const consultationsPayees = await Consultation.findAll({
      where: { isPaid: true },
      attributes: ['prix'],
    });
    const montantMeetings = consultationsPayees.reduce(
      (sum, c) => sum + parseFloat(c.prix || 0), 0
    );

    const revenusTotaux = montantAbonnements + montantMeetings;

    return res.status(200).json({
      revenusTotaux: Math.round(revenusTotaux),
      deltaPourcent: 0,
      repartition: [
        { label: 'Abonnements étudiants', montant: Math.round(montantAbonnements) },
        { label: 'Meetings', montant: Math.round(montantMeetings) },
      ],
      transactions: payments,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

module.exports = { getDashboard, getStats, broadcastNotification, getAllMeetings, getAdminPayments };