const express = require('express');
const router = express.Router();
const {
  getQuizByChapter, submitQuiz, createQuiz, deleteQuiz,
  addQuestion, getQuizQuestions, updateQuestion, deleteQuestion,
  getMyResults, getMyQuizzes,
} = require('../controllers/quiz.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// GET quiz créés par le professeur connecté
router.get('/my-quizzes', authenticate, authorize('PROFESSOR', 'ADMIN'), getMyQuizzes);

// GET mes résultats
router.get('/my-results', authenticate, getMyResults);

// GET quiz d'un chapitre
router.get('/chapter/:chapterId', authenticate, getQuizByChapter);

// POST créer un quiz
router.post('/', authenticate, authorize('ADMIN', 'PROFESSOR'), createQuiz);

// DELETE supprimer un quiz ✅
router.delete('/:quizId', authenticate, authorize('ADMIN', 'PROFESSOR'), deleteQuiz);

// POST soumettre les réponses
router.post('/:quizId/submit', authenticate, submitQuiz);

// GET questions d'un quiz (prof) ✅
router.get('/:quizId/questions', authenticate, authorize('ADMIN', 'PROFESSOR'), getQuizQuestions);

// POST ajouter une question
router.post('/:quizId/questions', authenticate, authorize('ADMIN', 'PROFESSOR'), addQuestion);

// PUT modifier une question ✅
router.put('/questions/:questionId', authenticate, authorize('ADMIN', 'PROFESSOR'), updateQuestion);

// DELETE supprimer une question ✅
router.delete('/questions/:questionId', authenticate, authorize('ADMIN', 'PROFESSOR'), deleteQuestion);

module.exports = router;