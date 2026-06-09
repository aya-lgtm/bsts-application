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
        message: "This role cannot be created via public registration",
      });
    }

    // Vérifier si email déjà utilisé par un compte VÉRIFIÉ
    const existingUser = await User.findOne({ 
      where: { email, isVerified: true } 
    });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email address already exists' });
    }

    // Supprimer les anciens comptes non vérifiés avec ce même email
    await User.destroy({ where: { email, isVerified: false } });

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
      message: 'Verification code sent! Please check your email.',
      userId: user.id,
      email: user.email,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { userId, otpCode } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.otpCode !== otpCode) {
      return res.status(400).json({ message: 'Incorrect One-Time Password' });
    }

    if (new Date() > user.otpExpires) {
      return res.status(400).json({ message: 'Expired One-Time Password' });
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
      message: 'Account verified successfully!',
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
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

const resendOTP = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Account already verified' });
    }

    const otpCode = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await user.update({ otpCode, otpExpires });
    await sendOTPEmail(user.email, otpCode);

    return res.status(200).json({ message: 'New verification code sent.' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Incorrect email or password' });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: 'Account not verified. Please check your email.',
        userId: user.id,
      });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Incorrect email or password' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await RefreshToken.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return res.status(200).json({
      message: 'Login successful!',
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
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    await RefreshToken.destroy({ where: { token: refreshToken } });
    return res.status(200).json({ message: 'Logout successful!' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const decoded = verifyRefreshToken(refreshToken);
    const tokenInDb = await RefreshToken.findOne({ where: { token: refreshToken, isRevoked: false } });
    if (!tokenInDb) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    const user = await User.findByPk(decoded.id);
    const newAccessToken = generateAccessToken(user);
    return res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    return res.status(401).json({ message: 'Session refresh token expired or invalid' });
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
      return res.status(404).json({ message: 'User not found' });
    }

    const otpCode = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await user.update({
      resetPasswordToken: otpCode,
      resetPasswordExpires: otpExpires,
    });

    await sendOTPEmail(user.email, otpCode);

    return res.status(200).json({
      message: 'Reset code sent via email!',
      userId: user.id,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { userId, otpCode, newPassword } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.resetPasswordToken !== otpCode) {
      return res.status(400).json({ message: 'Incorrect One-Time Password' });
    }

    if (new Date() > user.resetPasswordExpires) {
      return res.status(400).json({ message: 'Expired One-Time Password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await user.update({
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    return res.status(200).json({ message: 'Password reset successfully!' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server erroR', error: error.message });
  }
};

const verifyResetOTP = async (req, res) => {
  try {
    const { userId, otpCode } = req.body
    const user = await User.findByPk(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })
    if (user.resetPasswordToken !== otpCode)
      return res.status(400).json({ message: 'Incorrect One-Time Password' })
    if (new Date() > user.resetPasswordExpires)
      return res.status(400).json({ message: 'Expired One-Time Password' })
    return res.status(200).json({ message: 'Code validated successfully', userId })
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error', error: error.message })
  }
}

module.exports = { register, login, logout, refreshToken, forgotPassword, resetPassword, verifyOTP, resendOTP, verifyResetOTP };