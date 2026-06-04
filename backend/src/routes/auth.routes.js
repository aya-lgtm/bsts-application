const express = require('express');
const router = express.Router();
const { register, login, logout, refreshToken } = require('../controllers/auth.controller');

// POST /api/v1/auth/register
router.post('/register', register);

// POST /api/v1/auth/login
router.post('/login', login);

// POST /api/v1/auth/logout
router.post('/logout', logout);

// POST /api/v1/auth/refresh-token
router.post('/refresh-token', refreshToken);

module.exports = router;