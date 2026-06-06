const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { User, RefreshToken } = require('../models');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt.utils');
const { sendResetPasswordEmail } = require('../config/mailer');

// INSCRIPTION
const register = async (req, res) => {
  try {
    const { nom, prenom, email, password, role } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      nom,
      prenom,
      email,
      password: hashedPassword,
      role: role || 'STUDENT',
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await RefreshToken.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return res.status(201).json({
      message: 'Inscription réussie !',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// CONNEXION
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await RefreshToken.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return res.status(200).json({
      message: 'Connexion réussie !',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// DÉCONNEXION
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    await RefreshToken.destroy({ where: { token: refreshToken } });
    return res.status(200).json({ message: 'Déconnexion réussie !' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// RENOUVELER LE TOKEN
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const decoded = verifyRefreshToken(refreshToken);
    const tokenInDb = await RefreshToken.findOne({ where: { token: refreshToken, isRevoked: false } });
    if (!tokenInDb) {
      return res.status(401).json({ message: 'Refresh token invalide' });
    }
    const user = await User.findByPk(decoded.id);
    const newAccessToken = generateAccessToken(user);
    return res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    return res.status(401).json({ message: 'Refresh token expiré ou invalide' });
  }
};

// MOT DE PASSE OUBLIÉ
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'Email non trouvé' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    await user.update({
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetExpires,
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await sendResetPasswordEmail(email, resetUrl);

    return res.status(200).json({ message: 'Email de réinitialisation envoyé !' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// RÉINITIALISER LE MOT DE PASSE
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({ where: { resetPasswordToken: token } });
    if (!user) {
      return res.status(400).json({ message: 'Token invalide' });
    }

    if (new Date() > user.resetPasswordExpires) {
      return res.status(400).json({ message: 'Token expiré' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await user.update({
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    return res.status(200).json({ message: 'Mot de passe réinitialisé avec succès !' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

module.exports = { register, login, logout, refreshToken, forgotPassword, resetPassword };