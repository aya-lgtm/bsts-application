const express = require('express');
const router = express.Router();
const {
  verifyPromoCode,
  createCheckoutSession,
  stripeWebhook,
  getPaymentHistory,
  getMySubscription,
  createPromoCode,
  checkSubscriptionAccess,
} = require('../controllers/payment.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// POST vérifier un code promo
router.post('/promo/verify', authenticate, verifyPromoCode);

// POST créer une session de paiement
router.post('/checkout', authenticate, createCheckoutSession);

// POST webhook Stripe (sans authentification)
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// GET historique des paiements
router.get('/history', authenticate, getPaymentHistory);

// GET mon abonnement
router.get('/subscription', authenticate, getMySubscription);

// GET vérifier l'accès premium
router.get('/subscription/access', authenticate, checkSubscriptionAccess);

// POST créer un code promo (ADMIN)
router.post('/promo', authenticate, authorize('ADMIN'), createPromoCode);

module.exports = router;