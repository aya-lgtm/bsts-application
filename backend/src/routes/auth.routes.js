const express = require('express');
const router = express.Router();
const { register, login, logout, refreshToken, forgotPassword, resetPassword, verifyOTP, resendOTP, verifyResetOTP, getMe } = require('../controllers/auth.controller');
const { loginLimiter, registerLimiter, forgotPasswordLimiter } = require('../middlewares/rateLimit.middleware');


/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Inscription d'un nouvel utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nom
 *               - prenom
 *               - email
 *               - password
 *             properties:
 *               nom:
 *                 type: string
 *               prenom:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [STUDENT, PARENT]
 *     responses:
 *       201:
 *         description: Inscription réussie - OTP envoyé
 *       429:
 *         description: Trop de tentatives
 */
router.post('/register', registerLimiter, register);

/**
 * @swagger
 * /api/v1/auth/verify-otp:
 *   post:
 *     summary: Vérifier le code OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               otpCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Compte vérifié
 *       400:
 *         description: Code OTP invalide ou expiré
 */
router.post('/verify-otp', verifyOTP);

/**
 * @swagger
 * /api/v1/auth/resend-otp:
 *   post:
 *     summary: Renvoyer le code OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Nouveau OTP envoyé
 */
router.post('/resend-otp', resendOTP);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Connexion d'un utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Connexion réussie
 *       401:
 *         description: Email ou mot de passe incorrect
 *       429:
 *         description: Trop de tentatives - bloqué 15 min
 */
router.post('/login', loginLimiter, login);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Déconnexion
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 */
router.post('/logout', logout);

/**
 * @swagger
 * /api/v1/auth/refresh-token:
 *   post:
 *     summary: Renouveler le token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Nouveau token généré
 */
router.post('/refresh-token', refreshToken);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Mot de passe oublié
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email envoyé
 */
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Réinitialiser le mot de passe
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mot de passe réinitialisé
 */
router.post('/reset-password', resetPassword);
router.post('/verify-reset-otp', verifyResetOTP);
// GET utilisateur connecté
const { authenticate } = require('../middlewares/auth.middleware');
router.get('/me', authenticate, getMe);
module.exports = router;