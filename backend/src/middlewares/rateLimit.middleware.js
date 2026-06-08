const rateLimit = require('express-rate-limit');

// Limiter les tentatives de login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 tentatives
  message: {
    message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter les tentatives de register
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10, // max 10 inscriptions par heure
  message: {
    message: 'Trop de tentatives d\'inscription. Réessayez dans 1 heure.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter les tentatives de forgot password
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 3, // max 3 tentatives par heure
  message: {
    message: 'Trop de tentatives. Réessayez dans 1 heure.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter, registerLimiter, forgotPasswordLimiter };