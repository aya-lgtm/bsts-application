const { User, UserProfile } = require('../models');

const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const profile = await UserProfile.findOne({ where: { userId: req.user.id } });

    return res.status(200).json({ user, profile });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { nom, prenom, photo, niveauScolaire, matieres } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    await user.update({ nom, prenom, photo });

    await UserProfile.upsert({
      userId: req.user.id,
      photo,
      niveauScolaire,
      matieres,
    });

    return res.status(200).json({ message: 'Profil mis à jour avec succès !' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
    });

    return res.status(200).json({ users });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;

    const users = await User.findAll({
      where: { role },
      attributes: { exclude: ['password'] },
    });

    return res.status(200).json({ users });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    await user.destroy();

    return res.status(200).json({ message: 'Utilisateur supprimé avec succès !' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const bcrypt = require('bcrypt');

// POST créer un utilisateur par l'admin
const createUserByAdmin = async (req, res) => {
  try {
    const { nom, prenom, email, password, role } = req.body;

    const allowedRoles = ['STUDENT', 'PROFESSOR', 'PARENT', 'ADMIN'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide' });
    }

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
      role,
    });

    return res.status(201).json({
      message: 'Utilisateur créé avec succès !',
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
module.exports = { getProfile, updateProfile, getAllUsers, getUsersByRole, deleteUser };