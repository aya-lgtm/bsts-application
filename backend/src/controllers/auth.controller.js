const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, RefreshToken } = require('../models');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt.utils');
const { sendResetPasswordEmail, sendOTPEmail } = require('../config/mailer');

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const register = async (req, res) => {
  try {
    const { nom, prenom, username, email, password, role } = req.body;

    if (role === 'PROFESSOR' || role === 'ADMIN') {
      return res.status(403).json({
        message: 'Ce rôle ne peut pas être créé via l\'inscription publique.',
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const otpCode = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const user = await User.create({
      nom, prenom, username, email,
      password: hashedPassword,
      role: role || 'STUDENT',
      isActive: false,
      isVerified: false,
      otpCode,
      otpExpires,
    });

    await sendOTPEmail(email, otpCode);

    return res.status(201).json({
      message: 'Inscription réussie ! Vérifiez votre email pour activer votre compte.',
      userId: user.id,
      email: user.email,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { userId, otpCode } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (user.otpCode !== otpCode) {
      return res.status(400).json({ message: 'Code OTP invalide' });
    }

    if (new Date() > user.otpExpires) {
      return res.status(400).json({ message: 'Code OTP expiré' });
    }

    await user.update({
      isActive: true,
      isVerified: true,
      otpCode: null,
      otpExpires: null,
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await RefreshToken.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return res.status(200).json({
      message: 'Compte vérifié avec succès !',
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

const resendOTP = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Compte déjà vérifié' });
    }

    const otpCode = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await user.update({ otpCode, otpExpires });
    await sendOTPEmail(user.email, otpCode);

    return res.status(200).json({ message: 'Nouveau code OTP envoyé !' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: 'Compte non vérifié. Vérifiez votre email.',
        userId: user.id,
      });
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

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    await RefreshToken.destroy({ where: { token: refreshToken } });
    return res.status(200).json({ message: 'Déconnexion réussie !' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

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

const forgotPassword = async (req, res) => {
  try {
    const { emailOrUsername } = req.body;

    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: emailOrUsername },
          { username: emailOrUsername },
        ],
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const otpCode = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await user.update({
      resetPasswordToken: otpCode,
      resetPasswordExpires: otpExpires,
    });

    await sendOTPEmail(user.email, otpCode);

    return res.status(200).json({
      message: 'Code de réinitialisation envoyé par email !',
      userId: user.id,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { userId, otpCode, newPassword } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (user.resetPasswordToken !== otpCode) {
      return res.status(400).json({ message: 'Code OTP invalide' });
    }

    if (new Date() > user.resetPasswordExpires) {
      return res.status(400).json({ message: 'Code OTP expiré' });
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

module.exports = { register, login, logout, refreshToken, forgotPassword, resetPassword, verifyOTP, resendOTP };