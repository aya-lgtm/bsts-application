const express = require('express');
const router = express.Router();
const {
  getQuizByChapter,
  submitQuiz,
  createQuiz,
  addQuestion,
  getMyResults,
  getMyQuizzes,
} = require('../controllers/quiz.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// GET quiz créés par le professeur connecté
router.get('/my-quizzes', authenticate, authorize('PROFESSOR', 'ADMIN'), getMyQuizzes);

// GET quiz d'un chapitre
router.get('/chapter/:chapterId', authenticate, getQuizByChapter);

// POST soumettre les réponses
router.post('/:quizId/submit', authenticate, submitQuiz);

// POST créer un quiz (ADMIN/PROFESSOR)
router.post('/', authenticate, authorize('ADMIN', 'PROFESSOR'), createQuiz);

// POST ajouter une question (ADMIN/PROFESSOR)
router.post('/:quizId/questions', authenticate, authorize('ADMIN', 'PROFESSOR'), addQuestion);

// GET mes résultats
router.get('/my-results', authenticate, getMyResults);

module.exports = router;