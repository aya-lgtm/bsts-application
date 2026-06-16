const { Quiz, Question, QuizResult, Chapter } = require('../models');

// GET quiz d'un chapitre
const getQuizByChapter = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const quiz = await Quiz.findOne({
      where: { chapterId, isActive: true },
      include: [{
        model: Question,
        attributes: { exclude: ['bonneReponse'] },
        order: [['ordre', 'ASC']],
      }],
    });
    if (!quiz) return res.status(404).json({ message: 'Quiz non trouvé pour ce chapitre' });
    return res.status(200).json({ quiz });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST soumettre les réponses du quiz
const submitQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { reponses } = req.body;
    const userId = req.user.id;
    const quiz = await Quiz.findByPk(quizId, { include: [{ model: Question }] });
    if (!quiz) return res.status(404).json({ message: 'Quiz non trouvé' });

    let bonnesReponses = 0;
    const corrections = {};
    for (const question of quiz.Questions) {
      const reponseEleve = reponses[question.id];
      const estCorrecte = reponseEleve === question.bonneReponse;
      if (estCorrecte) bonnesReponses++;
      corrections[question.id] = {
        reponseEleve, bonneReponse: question.bonneReponse,
        estCorrecte, explication: question.explication,
      };
    }
    const totalQuestions = quiz.Questions.length;
    const score = Math.round((bonnesReponses / totalQuestions) * 100);
    const isPassed = score >= quiz.scoreMinimum;
    await QuizResult.create({ userId, quizId, score, totalQuestions, isPassed, reponses: corrections });
    return res.status(200).json({
      message: isPassed ? '🎉 Quiz réussi !' : '❌ Quiz échoué, réessaie !',
      score, totalQuestions, bonnesReponses, isPassed,
      scoreMinimum: quiz.scoreMinimum, corrections,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST créer un quiz (ADMIN/PROFESSOR)
const createQuiz = async (req, res) => {
  try {
    const { titre, chapterId, domaine, difficulte, scoreMinimum } = req.body;
    const quiz = await Quiz.create({
      titre, chapterId,
      domaine:      domaine    ?? 'MATH',
      difficulte:   difficulte ?? 'MEDIUM',
      scoreMinimum: scoreMinimum ?? 70,
      createdBy:    req.user.id,
    });
    return res.status(201).json({ message: 'Quiz créé !', quiz });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ✅ DELETE supprimer un quiz (PROFESSOR — seulement ses propres quiz)
const deleteQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const quiz = await Quiz.findByPk(quizId);
    if (!quiz) return res.status(404).json({ message: 'Quiz non trouvé' });
    if (quiz.createdBy !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    // Supprimer les questions liées puis le quiz
    await Question.destroy({ where: { quizId } });
    await quiz.destroy();
    return res.status(200).json({ message: 'Quiz supprimé !' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST ajouter une question au quiz
const addQuestion = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { enonce, choixA, choixB, choixC, choixD, bonneReponse, explication, explicationIncorrecte, difficulte, ordre } = req.body;
    const question = await Question.create({
      quizId, enonce, choixA, choixB, choixC, choixD,
      bonneReponse, explication, explicationIncorrecte,
      difficulte: difficulte ?? 'MEDIUM',
      ordre,
    });
    return res.status(201).json({ message: 'Question ajoutée !', question });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ✅ GET questions d'un quiz (avec bonneReponse pour le prof)
const getQuizQuestions = async (req, res) => {
  try {
    const { quizId } = req.params;
    const quiz = await Quiz.findByPk(quizId);
    if (!quiz) return res.status(404).json({ message: 'Quiz non trouvé' });
    if (quiz.createdBy !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    const questions = await Question.findAll({
      where: { quizId },
      order: [['ordre', 'ASC']],
    });
    return res.status(200).json({ questions });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ✅ PUT modifier une question
const updateQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { enonce, choixA, choixB, choixC, choixD, bonneReponse, explication, explicationIncorrecte, difficulte, ordre } = req.body;
    const question = await Question.findByPk(questionId);
    if (!question) return res.status(404).json({ message: 'Question non trouvée' });
    await question.update({
      enonce, choixA, choixB, choixC, choixD,
      bonneReponse, explication, explicationIncorrecte,
      difficulte, ordre,
    });
    return res.status(200).json({ message: 'Question mise à jour !', question });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ✅ DELETE supprimer une question
const deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const question = await Question.findByPk(questionId);
    if (!question) return res.status(404).json({ message: 'Question non trouvée' });
    await question.destroy();
    return res.status(200).json({ message: 'Question supprimée !' });
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

// GET tous les quiz créés par le professeur connecté
const getMyQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.findAll({
      where: { createdBy: req.user.id, isActive: true },
      include: [{ model: Question, attributes: ['id'] }],
      order: [['createdAt', 'DESC']],
    });
    const result = quizzes.map(q => ({
      id:             q.id,
      titre:          q.titre,
      domaine:        q.domaine    ?? 'MATH',
      difficulte:     q.difficulte ?? 'MEDIUM',
      scoreMinimum:   q.scoreMinimum,
      totalQuestions: q.Questions?.length ?? 0,
      createdAt:      q.createdAt,
    }));
    return res.status(200).json({ quizzes: result });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

module.exports = {
  getQuizByChapter, submitQuiz, createQuiz, deleteQuiz,
  addQuestion, getQuizQuestions, updateQuestion, deleteQuestion,
  getMyResults, getMyQuizzes,
};