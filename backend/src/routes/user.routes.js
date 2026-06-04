const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, getAllUsers, getUsersByRole, deleteUser } = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     summary: Voir son profil
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil récupéré
 *       401:
 *         description: Non authentifié
 */
router.get('/profile', authenticate, getProfile);

/**
 * @swagger
 * /api/v1/users/profile:
 *   put:
 *     summary: Modifier son profil
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom:
 *                 type: string
 *               prenom:
 *                 type: string
 *               photo:
 *                 type: string
 *               niveauScolaire:
 *                 type: string
 *               matieres:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Profil mis à jour
 */
router.put('/profile', authenticate, updateProfile);

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Tous les utilisateurs (ADMIN)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des utilisateurs
 *       403:
 *         description: Accès refusé
 */
router.get('/', authenticate, authorize('ADMIN'), getAllUsers);

/**
 * @swagger
 * /api/v1/users/role/{role}:
 *   get:
 *     summary: Utilisateurs par rôle (ADMIN)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Liste des utilisateurs par rôle
 */
router.get('/role/:role', authenticate, authorize('ADMIN'), getUsersByRole);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Supprimer un utilisateur (ADMIN)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Utilisateur supprimé
 */
router.delete('/:id', authenticate, authorize('ADMIN'), deleteUser);

module.exports = router;