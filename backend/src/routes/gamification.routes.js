const express = require('express');
const router = express.Router();
const {
  getMyGamification,
  awardPoints,
  getLeaderboard,
} = require('../controllers/gamification.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// GET mon profil gamification
router.get('/me', authenticate, getMyGamification);

// POST attribuer des points (ADMIN seulement)
router.post('/award', authenticate, authorize('ADMIN'), awardPoints);

// GET leaderboard
router.get('/leaderboard', authenticate, getLeaderboard);

module.exports = router;