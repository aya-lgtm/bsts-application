const { SATQuestion, SATSession, SATQuestionHistory, Gamification, User, Quiz, QuizResult } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
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
     order: SATQuestion.sequelize.literal('random()'),
      attributes: { exclude: ['bonneReponse', 'explicationCorrecte', 'explicationIncorrecte'] },
    });

    return res.status(200).json({ questions });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
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

    let questions;

    if (mode === 'MISTAKES') {
      const pastSessions = await SATSession.findAll({
        where: { userId, isCompleted: true },
        order: [['createdAt', 'DESC']],
      });

      const mistakeIds = new Set();

      for (const pastSession of pastSessions) {
        if (!pastSession.reponses) continue;
        const reponses = typeof pastSession.reponses === 'string'
          ? JSON.parse(pastSession.reponses)
          : pastSession.reponses;

        for (const [questionId, correction] of Object.entries(reponses)) {
          if (!correction.estCorrecte) mistakeIds.add(questionId);
        }
      }

      if (mistakeIds.size === 0) {
        return res.status(200).json({
          session,
          questions: [],
          message: 'Aucune erreur précédente trouvée. Faites quelques quiz d\'abord !',
        });
      }

      questions = await SATQuestion.findAll({
        where: { id: { [Op.in]: Array.from(mistakeIds) }, isActive: true },
        limit: totalQuestions || 10,
        attributes: { exclude: ['bonneReponse', 'explicationCorrecte', 'explicationIncorrecte'] },
      });

    } else {
      const user = await User.findByPk(userId, { attributes: ['satLevel'] });
      const level = user?.satLevel || 'INTERMEDIATE';

      const difficultyPool = {
        BEGINNER:     [{ diff: 'EASY', pct: 1.0 }],
        INTERMEDIATE: [{ diff: 'EASY', pct: 0.6 }, { diff: 'MEDIUM', pct: 0.4 }],
        ADVANCED:     [{ diff: 'MEDIUM', pct: 0.4 }, { diff: 'HARD', pct: 0.6 }],
        EXPERT:       [{ diff: 'MEDIUM', pct: 0.2 }, { diff: 'HARD', pct: 0.8 }],
      };

      const pool = difficultyPool[level] || difficultyPool['INTERMEDIATE'];
      const total = parseInt(totalQuestions) || 10;

      const history = await SATQuestionHistory.findAll({
        where: { studentId: userId },
        attributes: ['questionId', 'lastSeenAt', 'timesWrong'],
        order: [['lastSeenAt', 'ASC']],
      });
      const seenIds = history.map(h => h.questionId);
      const wrongIds = history.filter(h => h.timesWrong > 0).map(h => h.questionId);

      questions = [];

      for (const { diff, pct } of pool) {
        const needed = Math.round(total * pct);
        const baseWhere = {
          isActive: true,
          difficulte: diff,
          ...(domaine && domaine !== 'ALL' ? { domaine } : {}),
        };

        const unseen = await SATQuestion.findAll({
          where: { ...baseWhere, id: { [Op.notIn]: seenIds.length ? seenIds : ['none'] } },
          limit: needed,
          order: SATQuestion.sequelize.literal('random()'),
          attributes: { exclude: ['bonneReponse', 'explicationCorrecte', 'explicationIncorrecte'] },
        });
        questions.push(...unseen);

        if (questions.length < needed) {
          const remaining = needed - questions.length;
          const alreadyIds = questions.map(q => q.id);
          const wrong = await SATQuestion.findAll({
            where: { ...baseWhere, id: { [Op.in]: wrongIds.filter(id => !alreadyIds.includes(id)) } },
            limit: remaining,
            order: SATQuestion.sequelize.literal('random()'),
            attributes: { exclude: ['bonneReponse', 'explicationCorrecte', 'explicationIncorrecte'] },
          });
          questions.push(...wrong);
        }

        if (questions.length < needed) {
          const remaining = needed - questions.length;
          const alreadyIds = questions.map(q => q.id);
          const oldest = await SATQuestion.findAll({
            where: { ...baseWhere, id: { [Op.notIn]: alreadyIds.length ? alreadyIds : ['none'] } },
            limit: remaining,
            order: SATQuestion.sequelize.literal('random()'),
            attributes: { exclude: ['bonneReponse', 'explicationCorrecte', 'explicationIncorrecte'] },
          });
          questions.push(...oldest);
        }
      }
    }

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
// Mettre à jour l'historique des questions vues
    for (const question of questions) {
      const reponseEleve = reponses[question.id];
      const estCorrecte = reponseEleve === question.bonneReponse;

      await SATQuestionHistory.upsert({
        studentId: userId,
        questionId: question.id,
        lastSeenAt: new Date(),
        timesCorrect: estCorrecte ? sequelize.literal('"timesCorrect" + 1') : sequelize.literal('"timesCorrect"'),
        timesWrong: !estCorrecte ? sequelize.literal('"timesWrong" + 1') : sequelize.literal('"timesWrong"'),
      });
    }

    // Recalculer le niveau automatiquement après chaque session
    if (session.mode !== 'LEVEL_TEST') {
      const user = await User.findByPk(userId, { attributes: ['satLevel'] });
      if (user?.satLevel) {
        const levels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
        let newLevel = user.satLevel;
        const idx = levels.indexOf(user.satLevel);
        if (score >= 80 && idx < levels.length - 1) newLevel = levels[idx + 1];
        else if (score <= 40 && idx > 0) newLevel = levels[idx - 1];
        if (newLevel !== user.satLevel) {
          await User.update({ satLevel: newLevel }, { where: { id: userId } });
        }
      }
    }
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
    console.error('❌ submitLevelTest error:', error);
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
// GET progression SAT d'un utilisateur
const getSATProgress = async (req, res) => {
  try {
    const { userId } = req.params;

    const sessions = await SATSession.findAll({
      where: { userId, isCompleted: true },
      order: [['createdAt', 'ASC']],
    });

    if (sessions.length === 0) {
      return res.status(200).json({
        currentScore: 0,
        targetScore: 1500,
        globalProgress: 0,
        monthlyProgress: 0,
        satHistory: [],
      });
    }

    const lastSession = sessions[sessions.length - 1];
    const currentScore = lastSession.scoreSAT || 0;
    const globalProgress = Math.round((currentScore / 1600) * 100);

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthSessions = sessions.filter(s => new Date(s.createdAt) >= lastMonth);
    const firstMonthScore = lastMonthSessions.length > 0 ? (lastMonthSessions[0].scoreSAT || 0) : currentScore;
    const monthlyProgress = Math.round(((currentScore - firstMonthScore) / 1600) * 100);

    const satHistory = sessions.slice(-20).map(s => ({
      date: new Date(s.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      score: s.scoreSAT || 0,
    }));

    return res.status(200).json({
      currentScore,
      targetScore: 1500,
      globalProgress,
      monthlyProgress,
      satHistory,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET scores par section SAT d'un utilisateur
const getSATSections = async (req, res) => {
  try {
    const { userId } = req.params;

    const emptySections = [
      { name: 'Math', score: 0, maxScore: 800, color: '#3B82F6' },
      { name: 'Reading & Writing', score: 0, maxScore: 800, color: '#7C3AED' },
      { name: 'Evidence-Based Reading', score: 0, maxScore: 400, color: '#F97316' },
      { name: 'Math Advanced', score: 0, maxScore: 400, color: '#0D9488' },
    ];

    const sessions = await SATSession.findAll({
      where: { userId, isCompleted: true },
      order: [['createdAt', 'DESC']],
      limit: 10,
    });

    if (sessions.length === 0) {
      return res.status(200).json({ sections: emptySections });
    }

    const avg = (arr) => {
      const valid = arr.filter(s => s.scoreSAT != null && s.scoreSAT > 0);
      if (valid.length === 0) return 0;
      return Math.round(valid.reduce((sum, s) => sum + s.scoreSAT, 0) / valid.length);
    };

    const mathScore = (() => {
      const dedicated = sessions.filter(s => s.domaine === 'MATH');
      if (dedicated.length > 0) return Math.min(avg(dedicated), 800);
      const allSess = sessions.filter(s => s.domaine === 'ALL');
      return allSess.length > 0 ? Math.min(Math.round(avg(allSess) / 2), 800) : 0;
    })();

    const rwScore = (() => {
      const dedicated = sessions.filter(s => ['READING', 'WRITING'].includes(s.domaine));
      if (dedicated.length > 0) return Math.min(avg(dedicated), 800);
      const allSess = sessions.filter(s => s.domaine === 'ALL');
      return allSess.length > 0 ? Math.min(Math.round(avg(allSess) / 2), 800) : 0;
    })();

    const ebrScore = Math.min(Math.round(rwScore * 0.5), 400);
    const mathAdvScore = Math.min(Math.round(mathScore * 0.5), 400);

    return res.status(200).json({
      sections: [
        { name: 'Math', score: mathScore, maxScore: 800, color: '#3B82F6' },
        { name: 'Reading & Writing', score: rwScore, maxScore: 800, color: '#7C3AED' },
        { name: 'Evidence-Based Reading', score: ebrScore, maxScore: 400, color: '#F97316' },
        { name: 'Math Advanced', score: mathAdvScore, maxScore: 400, color: '#0D9488' },
      ],
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
// GET progression SAT de tous les enfants d'un parent
const getParentSATProgress = async (req, res) => {
  try {
    const { parentId } = req.params;

    const children = await User.findAll({
      where: { parentId, role: 'STUDENT' },
      attributes: ['id', 'nom', 'prenom'],
    });

    const result = [];

    for (const child of children) {
      const sessions = await SATSession.findAll({
        where: { userId: child.id, isCompleted: true },
        order: [['createdAt', 'ASC']],
      });

      const lastSession = sessions[sessions.length - 1];
      const currentScore = lastSession ? (lastSession.scoreSAT || 0) : 0;
      const targetScore = 1500;
      const globalProgress = Math.round((currentScore / 1600) * 100);

      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthSessions = sessions.filter(s => new Date(s.createdAt) >= lastMonth);
      const monthlyProgress = lastMonthSessions.length > 0
        ? Math.round(((currentScore - (lastMonthSessions[0].scoreSAT || 0)) / 1600) * 100)
        : 0;

      const satHistory = sessions.map(s => ({
        date: new Date(s.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        score: s.scoreSAT || 0,
      }));

      const recentSessions = sessions.slice(-5);
      const mathSessions = recentSessions.filter(s => s.domaine === 'MATH' || s.domaine === 'ALL');
      const readingSessions = recentSessions.filter(s => s.domaine === 'READING' || s.domaine === 'ALL');

      const avgScore = (arr) => {
        if (arr.length === 0) return 0;
        return Math.round(arr.reduce((sum, s) => sum + (s.scoreSAT || 0), 0) / arr.length / 2);
      };

      const sections = [
        { name: 'Math', score: avgScore(mathSessions), maxScore: 800, color: '#0D6B5E', icon: 'calculator' },
        { name: 'Reading & Writing', score: avgScore(readingSessions), maxScore: 800, color: '#D4A017', icon: 'book' },
        { name: 'Evidence-Based Reading', score: avgScore(readingSessions), maxScore: 400, color: '#4A90E2', icon: 'file-text' },
        { name: 'Math Advanced', score: avgScore(mathSessions), maxScore: 400, color: '#E24A4A', icon: 'trending-up' },
      ];

      result.push({
        userId: child.id,
        name: `${child.prenom} ${child.nom}`,
        classe: 'N/A',
        avatarInitial: child.prenom ? child.prenom[0].toUpperCase() : '?',
        currentScore,
        targetScore,
        globalProgress,
        monthlyProgress,
        satHistory,
        sections,
      });
    }

    return res.status(200).json({ children: result });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
// GET questions ratées par l'utilisateur (Mode Erreurs)
const getMistakes = async (req, res) => {
  try {
    const userId = req.user.id;

    const sessions = await SATSession.findAll({
      where: { userId, isCompleted: true },
      order: [['createdAt', 'DESC']],
    });

    if (sessions.length === 0) {
      return res.status(200).json({ mistakes: [], total: 0 });
    }

    const mistakes = [];

    for (const session of sessions) {
      if (!session.reponses) continue;

      const reponses = typeof session.reponses === 'string'
        ? JSON.parse(session.reponses)
        : session.reponses;

      // reponses est un objet { questionId: { reponseEleve, bonneReponse, estCorrecte, explication } }
      for (const [questionId, correction] of Object.entries(reponses)) {
        if (!correction.estCorrecte) {
          const question = await SATQuestion.findByPk(questionId);
          if (question) {
            const alreadyAdded = mistakes.find(m => m.id === question.id);
            if (!alreadyAdded) {
              mistakes.push({
                id: question.id,
                enonce: question.enonce,
                choixA: question.choixA,
                choixB: question.choixB,
                choixC: question.choixC,
                choixD: question.choixD,
                bonneReponse: question.bonneReponse,
                explicationCorrecte: question.explicationCorrecte,
                explicationIncorrecte: question.explicationIncorrecte,
                domaine: question.domaine,
                difficulte: question.difficulte,
                userAnswer: correction.reponseEleve,
                sessionDate: session.createdAt,
              });
            }
          }
        }
      }
    }

    return res.status(200).json({
      mistakes,
      total: mistakes.length,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
// POST démarrer le test de niveau
const startLevelTest = async (req, res) => {
  try {
    const userId = req.user.id;

    const easyQs = await SATQuestion.findAll({
      where: { isActive: true, difficulte: 'EASY' },
      limit: 5,
      order: SATQuestion.sequelize.literal('random()'),
    });
    const mediumQs = await SATQuestion.findAll({
      where: { isActive: true, difficulte: 'MEDIUM' },
      limit: 8,
      order: SATQuestion.sequelize.literal('random()'),
    });
    const hardQs = await SATQuestion.findAll({
      where: { isActive: true, difficulte: 'HARD' },
      limit: 7,
      order: SATQuestion.sequelize.literal('random()'),
    });

    const questions = [...easyQs, ...mediumQs, ...hardQs];

    const session = await SATSession.create({
      userId,
      mode: 'LEVEL_TEST',
      domaine: 'ALL',
      totalQuestions: questions.length,
    });

    const safeQuestions = questions.map(q => ({
      id: q.id,
      enonce: q.enonce,
      choixA: q.choixA,
      choixB: q.choixB,
      choixC: q.choixC,
      choixD: q.choixD,
      domaine: q.domaine,
      difficulte: q.difficulte,
    }));

    return res.status(201).json({ session, questions: safeQuestions });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST soumettre le test de niveau
const submitLevelTest = async (req, res) => {
  try {
    const { sessionId, reponses } = req.body;
    const userId = req.user.id;

    const session = await SATSession.findByPk(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({ message: 'Session non trouvée' });
    }

    const questionIds = Object.keys(reponses);
    const questions = await SATQuestion.findAll({
      where: { id: { [Op.in]: questionIds } },
    });

    let easyTotal = 0, easyCorrect = 0;
    let mediumTotal = 0, mediumCorrect = 0;
    let hardTotal = 0, hardCorrect = 0;
    let totalCorrect = 0;

    for (const question of questions) {
      const isCorrect = reponses[question.id] === question.bonneReponse;
      if (isCorrect) totalCorrect++;

      if (question.difficulte === 'EASY') {
        easyTotal++; if (isCorrect) easyCorrect++;
      } else if (question.difficulte === 'MEDIUM') {
        mediumTotal++; if (isCorrect) mediumCorrect++;
      } else if (question.difficulte === 'HARD') {
        hardTotal++; if (isCorrect) hardCorrect++;
      }
    }

    const easyRate   = easyTotal   > 0 ? easyCorrect   / easyTotal   : 0;
    const mediumRate = mediumTotal  > 0 ? mediumCorrect / mediumTotal  : 0;
    const hardRate   = hardTotal    > 0 ? hardCorrect   / hardTotal    : 0;

    let satLevel;
    if (easyRate >= 0.8 && mediumRate >= 0.6 && hardRate >= 0.4) {
      satLevel = 'EXPERT';
    } else if (easyRate >= 0.8 && mediumRate >= 0.5) {
      satLevel = 'ADVANCED';
    } else if (easyRate >= 0.6) {
      satLevel = 'INTERMEDIATE';
    } else {
      satLevel = 'BEGINNER';
    }

    const score = Math.round((totalCorrect / questions.length) * 100);
    const scoreSAT = Math.round(400 + (score / 100) * 1200);

    await User.update(
      { satLevel, satLevelTestedAt: new Date() },
      { where: { id: userId } }
    );

    await session.update({
      score,
      scoreSAT,
      bonnesReponses: totalCorrect,
      isCompleted: true,
    });

    return res.status(200).json({
      satLevel,
      score,
      scoreSAT,
      totalCorrect,
      totalQuestions: questions.length,
      breakdown: {
        easy:   { correct: easyCorrect,   total: easyTotal,   rate: Math.round(easyRate * 100) },
        medium: { correct: mediumCorrect, total: mediumTotal, rate: Math.round(mediumRate * 100) },
        hard:   { correct: hardCorrect,   total: hardTotal,   rate: Math.round(hardRate * 100) },
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET récupérer le niveau actuel de l'utilisateur
const getUserLevel = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId, {
      attributes: ['satLevel', 'satLevelTestedAt'],
    });
    return res.status(200).json({
      satLevel: user.satLevel,
      satLevelTestedAt: user.satLevelTestedAt,
      hasTakenTest: !!user.satLevel,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
module.exports = {
  getQuestions, startSession, submitSession,
  getStats, addSATQuestion, attribuerPoints,
  getSATProgress, getSATSections,
  getParentSATProgress, getMistakes,
  startLevelTest, submitLevelTest, getUserLevel,
};