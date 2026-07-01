const { Report, User } = require('../models');
const { Op } = require('sequelize');

// POST /reports — créer un signalement
const createReport = async (req, res) => {
  try {
    const { targetType, targetId, raison, description } = req.body;
    const reporterId = req.user.id;

    const report = await Report.create({
      reporterId, targetType, targetId, raison, description,
    });

    return res.status(201).json({ message: 'Signalement créé !', report });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET /reports — lister les signalements
const getReports = async (req, res) => {
  try {
    const { statut } = req.query;
    const where = statut ? { statut } : {};

    const reports = await Report.findAll({
      where,
      include: [{ model: User, as: 'reporter', attributes: ['id', 'nom', 'prenom', 'email', 'role'] }],
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({ reports });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// PUT /reports/:id/resolve — résoudre un signalement
const resolveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body; // TRAITE ou REJETE

    if (!['TRAITE', 'REJETE'].includes(statut)) {
      return res.status(400).json({ message: 'Statut invalide. Utilisez TRAITE ou REJETE.' });
    }

    const report = await Report.findByPk(id);
    if (!report) return res.status(404).json({ message: 'Signalement non trouvé' });

    await report.update({ statut });

    return res.status(200).json({ message: `Signalement ${statut} !`, report });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

module.exports = { createReport, getReports, resolveReport };