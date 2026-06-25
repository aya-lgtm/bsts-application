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
  getParentSATProgress,
  getMistakes,
  startLevelTest,
  submitLevelTest,
  getUserLevel,
} = require('../controllers/sat.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// GET questions SAT avec filtres
router.get('/questions', authenticate, getQuestions);

// GET questions ratées (mode erreurs)
router.get('/mistakes', authenticate, getMistakes);

// GET niveau actuel
router.get('/level', authenticate, getUserLevel);

// POST démarrer le test de niveau
router.post('/level/start', authenticate, startLevelTest);

// POST soumettre le test de niveau
router.post('/level/submit', authenticate, submitLevelTest);

// POST démarrer une session SAT
router.post('/sessions/start', authenticate, startSession);

// POST soumettre une session SAT
router.post('/sessions/:sessionId/submit', authenticate, submitSession);

// GET statistiques SAT
router.get('/stats', authenticate, getStats);

// GET progression SAT de tous les enfants d'un parent
router.get('/parent/:parentId/progress', authenticate, getParentSATProgress);

// GET progression SAT d'un utilisateur
router.get('/progress/:userId', authenticate, getSATProgress);

// GET scores par section SAT d'un utilisateur
router.get('/sections/:userId', authenticate, getSATSections);

// POST ajouter une question SAT (ADMIN seulement)
router.post('/questions', authenticate, authorize('ADMIN'), addSATQuestion);

module.exports = router;