const bcrypt = require('bcrypt');
const { User, UserProfile } = require('../models');
const { createNotification } = require('./notification.controller');

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
      isActive: true,
      isVerified: true,
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

// GET mes enfants (PARENT seulement)
const getMyChildren = async (req, res) => {
  try {
    const children = await User.findAll({
      where: { parentId: req.user.id },
      attributes: { exclude: ['password'] },
    });

    return res.status(200).json({ children });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST lier un enfant au parent
const linkChild = async (req, res) => {
  try {
    const { childEmail } = req.body;
    const parentId = req.user.id;

    if (req.user.role !== 'PARENT') {
      return res.status(403).json({ message: 'Seul un parent peut lier un enfant' });
    }

    const child = await User.findOne({ where: { email: childEmail, role: 'STUDENT' } });
    if (!child) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }

    if (child.parentId) {
      return res.status(400).json({ message: 'Cet étudiant est déjà lié à un parent' });
    }

    await child.update({ parentId });

    // Notifier l'enfant
    await createNotification(
      child.id,
      'streak',
      'Compte lié à un parent',
      'Votre compte a été lié à un compte parent'
    );

    return res.status(200).json({ message: 'Enfant lié avec succès !', child: {
      id: child.id,
      nom: child.nom,
      prenom: child.prenom,
      email: child.email,
    }});
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// DELETE dissocier un enfant
const unlinkChild = async (req, res) => {
  try {
    const { childId } = req.params;

    const child = await User.findOne({ where: { id: childId, parentId: req.user.id } });
    if (!child) {
      return res.status(404).json({ message: 'Enfant non trouvé' });
    }

    await child.update({ parentId: null });

    return res.status(200).json({ message: 'Enfant dissocié avec succès !' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// PUT changer mot de passe
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Veuillez fournir le mot de passe actuel et le nouveau' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 8 caractères' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ message: 'Mot de passe actuel incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await user.update({ password: hashedPassword });

    return res.status(200).json({ message: 'Mot de passe mis à jour avec succès !' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getAllUsers,
  getUsersByRole,
  deleteUser,
  createUserByAdmin,
  getMyChildren,
  linkChild,
  unlinkChild,
  changePassword,
};