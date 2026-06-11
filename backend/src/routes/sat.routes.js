const express = require('express');
const router = express.Router();
const {
  getQuestions,
  startSession,
  submitSession,
  getStats,
  addSATQuestion,
  getSATProgress,
  getSATSections,
} = require('../controllers/sat.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// GET questions SAT avec filtres
router.get('/questions', authenticate, getQuestions);

// POST démarrer une session SAT
router.post('/sessions/start', authenticate, startSession);

// POST soumettre une session SAT
router.post('/sessions/:sessionId/submit', authenticate, submitSession);

// GET statistiques SAT
router.get('/stats', authenticate, getStats);

// GET progression SAT d'un utilisateur
router.get('/progress/:userId', authenticate, getSATProgress);

// GET scores par section SAT d'un utilisateur
router.get('/sections/:userId', authenticate, getSATSections);

// POST ajouter une question SAT (ADMIN seulement)
router.post('/questions', authenticate, authorize('ADMIN'), addSATQuestion);

module.exports = router;