const bcrypt = require('bcrypt');
const { User, RefreshToken } = require('../models');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt.utils');

// INSCRIPTION
const register = async (req, res) => {
  try {
    const { nom, prenom, email, password, role } = req.body;

    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    // Créer l'utilisateur
    const user = await User.create({
      nom,
      prenom,
      email,
      password: hashedPassword,
      role: role || 'STUDENT',
    });

    // Générer les tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Sauvegarder le refresh token
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

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Générer les tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Sauvegarder le refresh token
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

    // Vérifier le refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Vérifier si le token existe en base
    const tokenInDb = await RefreshToken.findOne({ where: { token: refreshToken, isRevoked: false } });
    if (!tokenInDb) {
      return res.status(401).json({ message: 'Refresh token invalide' });
    }

    // Générer un nouveau access token
    const user = await User.findByPk(decoded.id);
    const newAccessToken = generateAccessToken(user);

    return res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    return res.status(401).json({ message: 'Refresh token expiré ou invalide' });
  }
};

module.exports = { register, login, logout, refreshToken };