const stripe = process.env.STRIPE_SECRET_KEY 
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;
const { Payment, PromoCode, Subscription, User } = require('../models');

// Prix des abonnements
const PRIX = {
  MONTHLY: 9900,  // 99 MAD en centimes
  ANNUAL: 89900,  // 899 MAD en centimes
};

// POST vérifier un code promo
const verifyPromoCode = async (req, res) => {
  try {
    const { code } = req.body;

    const promo = await PromoCode.findOne({
      where: { code, isActive: true },
    });

    if (!promo) {
      return res.status(404).json({ message: 'Code promo invalide' });
    }

    if (promo.dateExpiration && new Date() > promo.dateExpiration) {
      return res.status(400).json({ message: 'Code promo expiré' });
    }

    if (promo.utilisations >= promo.maxUtilisations) {
      return res.status(400).json({ message: 'Code promo épuisé' });
    }

    return res.status(200).json({
      message: 'Code promo valide !',
      reductionPourcent: promo.reductionPourcent,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST créer une session de paiement Stripe
const createCheckoutSession = async (req, res) => {
  try {
    const { plan, codePromo } = req.body;
    const userId = req.user.id;
    const user = await User.findByPk(userId);

    let montant = PRIX[plan];
    let reductionPourcent = 0;
    let promoCodeUsed = null;

    // Appliquer le code promo si fourni
    if (codePromo) {
      const promo = await PromoCode.findOne({
        where: { code: codePromo, isActive: true },
      });

      if (promo && promo.utilisations < promo.maxUtilisations) {
        reductionPourcent = promo.reductionPourcent;
        montant = Math.round(montant * (1 - reductionPourcent / 100));
        promoCodeUsed = codePromo;
      }
    }

    // Créer la session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'mad',
          product_data: {
            name: `BSTS - Abonnement ${plan === 'MONTHLY' ? 'Mensuel' : 'Annuel'}`,
            description: plan === 'MONTHLY' ? '1 mois d\'accès complet' : '1 an d\'accès complet',
          },
          unit_amount: montant,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
      customer_email: user.email,
      metadata: {
        userId,
        plan,
        codePromo: promoCodeUsed || '',
        reductionPourcent: reductionPourcent.toString(),
      },
    });

    // Créer le paiement en base
    await Payment.create({
      userId,
      montant: montant / 100,
      plan,
      statut: 'PENDING',
      stripeSessionId: session.id,
      codePromo: promoCodeUsed,
      reductionPourcent,
    });

    return res.status(200).json({
      message: 'Session de paiement créée !',
      sessionId: session.id,
      url: session.url,
      montant: montant / 100,
      reductionPourcent,
    });
  } catch (error) {
    console.error('❌ Checkout error:', error.message);
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST webhook Stripe (confirmer le paiement)
const stripeWebhook = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).json({ message: `Webhook Error: ${err.message}` });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { userId, plan, codePromo, reductionPourcent } = session.metadata;

      // Mettre à jour le paiement
      await Payment.update(
        { statut: 'COMPLETED', stripePaymentId: session.payment_intent },
        { where: { stripeSessionId: session.id } }
      );

      // Activer l'abonnement
      const endDate = plan === 'MONTHLY'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      await Subscription.upsert({
        userId,
        plan,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate,
        amount: session.amount_total / 100,
      });

      // Incrémenter l'utilisation du code promo
      if (codePromo) {
        await PromoCode.increment('utilisations', { where: { code: codePromo } });
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET historique des paiements
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const payments = await Payment.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({ payments });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET mon abonnement actuel
const getMySubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    const subscription = await Subscription.findOne({
      where: { userId, status: 'ACTIVE' },
    });

    return res.status(200).json({ subscription });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST créer un code promo (ADMIN)
const createPromoCode = async (req, res) => {
  try {
    const { code, reductionPourcent, maxUtilisations, dateExpiration } = req.body;

    const promo = await PromoCode.create({
      code: code.toUpperCase(),
      reductionPourcent,
      maxUtilisations,
      dateExpiration,
    });

    return res.status(201).json({ message: 'Code promo créé !', promo });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
// GET vérifier si l'utilisateur a accès au contenu premium
const checkSubscriptionAccess = async (req, res) => {
  try {
    const userId = req.user.id;

    const subscription = await Subscription.findOne({
      where: { userId, status: 'ACTIVE' },
    });

    const now = new Date();
    const isActive = subscription && 
      subscription.plan !== 'FREE' && 
      subscription.endDate && 
      new Date(subscription.endDate) > now;

    return res.status(200).json({
      hasAccess: isActive,
      plan: subscription?.plan ?? 'FREE',
      endDate: subscription?.endDate ?? null,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
module.exports = {
  verifyPromoCode,
  createCheckoutSession,
  stripeWebhook,
  getPaymentHistory,
  getMySubscription,
  createPromoCode,
  checkSubscriptionAccess,
};