const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, getAllUsers, getUsersByRole, deleteUser } = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Routes protégées par authentification
// GET /api/v1/users/profile
router.get('/profile', authenticate, getProfile);

// PUT /api/v1/users/profile
router.put('/profile', authenticate, updateProfile);

// Routes ADMIN seulement
// GET /api/v1/users
router.get('/', authenticate, authorize('ADMIN'), getAllUsers);

// GET /api/v1/users/role/:role
router.get('/role/:role', authenticate, authorize('ADMIN'), getUsersByRole);

// DELETE /api/v1/users/:id
router.delete('/:id', authenticate, authorize('ADMIN'), deleteUser);

module.exports = router;