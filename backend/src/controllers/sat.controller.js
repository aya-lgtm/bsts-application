const { SATQuestion, SATSession, Gamification } = require('../models');
const { Op } = require('sequelize');

// GET questions SAT avec filtres
const getQuestions = async (req, res) => {
  try {
    const { domaine, difficulte, limit = 10 } = req.query;

    const where = { isActive: true };
    if (domaine) where.domaine = domaine;
    if (difficulte) where.difficulte = difficulte;

    const questions = await SATQuestion.findAll({
      where,
      limit: parseInt(limit),
      order: sequelize.literal('random()'),
      attributes: { exclude: ['bonneReponse', 'explicationCorrecte', 'explicationIncorrecte'] },
    });

    return res.status(200).json({ questions });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST démarrer une session SAT
const startSession = async (req, res) => {
  try {
    const { mode, domaine, totalQuestions } = req.body;
    const userId = req.user.id;

    const session = await SATSession.create({
      userId,
      mode,
      domaine: domaine || 'ALL',
      totalQuestions: totalQuestions || 10,
    });

    // Récupérer les questions selon le mode
    const where = { isActive: true };
    if (domaine && domaine !== 'ALL') where.domaine = domaine;

    const questions = await SATQuestion.findAll({
      where,
      limit: totalQuestions || 10,
      order: SATQuestion.sequelize.literal('random()'),
      attributes: { exclude: ['bonneReponse', 'explicationCorrecte', 'explicationIncorrecte'] },
    });

    return res.status(201).json({ session, questions });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST soumettre une session SAT
const submitSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { reponses, tempsTotal } = req.body;
    const userId = req.user.id;

    const session = await SATSession.findByPk(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({ message: 'Session non trouvée' });
    }

    // Récupérer les questions avec les bonnes réponses
    const questionIds = Object.keys(reponses);
    const questions = await SATQuestion.findAll({
      where: { id: { [Op.in]: questionIds } },
    });

    // Calculer le score
    let bonnesReponses = 0;
    const corrections = {};

    for (const question of questions) {
      const reponseEleve = reponses[question.id];
      const estCorrecte = reponseEleve === question.bonneReponse;

      if (estCorrecte) bonnesReponses++;

      corrections[question.id] = {
        reponseEleve,
        bonneReponse: question.bonneReponse,
        estCorrecte,
        explication: estCorrecte ? question.explicationCorrecte : question.explicationIncorrecte,
      };
    }

    const score = Math.round((bonnesReponses / questions.length) * 100);
    const scoreSAT = Math.round(400 + (score / 100) * 1200);

    // Mettre à jour la session
    await session.update({
      bonnesReponses,
      score,
      scoreSAT,
      reponses: corrections,
      tempsTotal,
      isCompleted: true,
    });

    // Attribuer des points de gamification
    const pointsGagnes = session.mode === 'SIMULATED' ? 200 : 50;
    await attribuerPoints(userId, pointsGagnes);

    return res.status(200).json({
      message: 'Session terminée !',
      score,
      scoreSAT,
      bonnesReponses,
      totalQuestions: questions.length,
      corrections,
      pointsGagnes,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Fonction utilitaire pour attribuer des points
const attribuerPoints = async (userId, points) => {
  let gamification = await Gamification.findOne({ where: { userId } });

  if (!gamification) {
    gamification = await Gamification.create({ userId, points });
  } else {
    const newPoints = gamification.points + points;
    const niveau = calculerNiveau(newPoints);
    await gamification.update({ points: newPoints, niveau });
  }

  return gamification;
};

// Calculer le niveau selon les points
const calculerNiveau = (points) => {
  if (points >= 7000) return 'CHAMPION';
  if (points >= 3500) return 'ACHIEVER';
  if (points >= 1500) return 'SCHOLAR';
  if (points >= 500) return 'EXPLORER';
  return 'STARTER';
};

// GET statistiques SAT de l'élève
const getStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const sessions = await SATSession.findAll({
      where: { userId, isCompleted: true },
      order: [['createdAt', 'DESC']],
      limit: 10,
    });

    const gamification = await Gamification.findOne({ where: { userId } });

    return res.status(200).json({ sessions, gamification });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST ajouter une question SAT (ADMIN)
const addSATQuestion = async (req, res) => {
  try {
    const { domaine, difficulte, enonce, choixA, choixB, choixC, choixD, bonneReponse, explicationCorrecte, explicationIncorrecte } = req.body;

    const question = await SATQuestion.create({
      domaine,
      difficulte,
      enonce,
      choixA,
      choixB,
      choixC,
      choixD,
      bonneReponse,
      explicationCorrecte,
      explicationIncorrecte,
    });

    return res.status(201).json({ message: 'Question SAT ajoutée !', question });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

module.exports = { getQuestions, startSession, submitSession, getStats, addSATQuestion, attribuerPoints };