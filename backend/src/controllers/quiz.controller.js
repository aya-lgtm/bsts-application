const { Quiz, Question, QuizResult, Chapter } = require('../models');

// GET quiz d'un chapitre
const getQuizByChapter = async (req, res) => {
  try {
    const { chapterId } = req.params;

    const quiz = await Quiz.findOne({
      where: { chapterId, isActive: true },
      include: [{
        model: Question,
        attributes: { exclude: ['bonneReponse'] }, // cacher la bonne réponse
        order: [['ordre', 'ASC']],
      }],
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz non trouvé pour ce chapitre' });
    }

    return res.status(200).json({ quiz });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST soumettre les réponses du quiz
const submitQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { reponses } = req.body; // { questionId: 'A', questionId2: 'B', ... }
    const userId = req.user.id;

    const quiz = await Quiz.findByPk(quizId, {
      include: [{ model: Question }],
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz non trouvé' });
    }

    // Calculer le score
    let bonnesReponses = 0;
    const corrections = {};

    for (const question of quiz.Questions) {
      const reponseEleve = reponses[question.id];
      const estCorrecte = reponseEleve === question.bonneReponse;

      if (estCorrecte) bonnesReponses++;

      corrections[question.id] = {
        reponseEleve,
        bonneReponse: question.bonneReponse,
        estCorrecte,
        explication: question.explication,
      };
    }

    const totalQuestions = quiz.Questions.length;
    const score = Math.round((bonnesReponses / totalQuestions) * 100);
    const isPassed = score >= quiz.scoreMinimum;

    // Sauvegarder le résultat
    await QuizResult.create({
      userId,
      quizId,
      score,
      totalQuestions,
      isPassed,
      reponses: corrections,
    });

    return res.status(200).json({
      message: isPassed ? '🎉 Quiz réussi !' : '❌ Quiz échoué, réessaie !',
      score,
      totalQuestions,
      bonnesReponses,
      isPassed,
      scoreMinimum: quiz.scoreMinimum,
      corrections,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST créer un quiz (ADMIN/PROFESSOR)
const createQuiz = async (req, res) => {
  try {
    const { titre, chapterId, scoreMinimum } = req.body;

    const quiz = await Quiz.create({ titre, chapterId, scoreMinimum });

    return res.status(201).json({ message: 'Quiz créé !', quiz });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST ajouter une question au quiz (ADMIN/PROFESSOR)
const addQuestion = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { enonce, choixA, choixB, choixC, choixD, bonneReponse, explication, ordre } = req.body;

    const question = await Question.create({
      quizId,
      enonce,
      choixA,
      choixB,
      choixC,
      choixD,
      bonneReponse,
      explication,
      ordre,
    });

    return res.status(201).json({ message: 'Question ajoutée !', question });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET mes résultats de quiz
const getMyResults = async (req, res) => {
  try {
    const userId = req.user.id;

    const results = await QuizResult.findAll({
      where: { userId },
      include: [{ model: Quiz, attributes: ['titre'] }],
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({ results });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

module.exports = { getQuizByChapter, submitQuiz, createQuiz, addQuestion, getMyResults };