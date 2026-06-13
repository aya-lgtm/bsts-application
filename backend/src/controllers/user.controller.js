const bcrypt = require('bcrypt');
const { createNotification } = require('./notification.controller');
 const { User, UserProfile, Gamification, SATSession } = require('../models');

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
      attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires', 'otpCode', 'otpExpires'] },
      include: [
        {
          model: UserProfile,
          as: 'profile',          // assure-toi que l'association est définie : User.hasOne(UserProfile, { foreignKey: 'userId', as: 'profile' })
          attributes: ['niveauScolaire', 'photo', 'progression'],
          required: false,
        },
        {
          model: Gamification,
          as: 'gamification',     // assure-toi : User.hasOne(Gamification, { foreignKey: 'userId', as: 'gamification' })
          attributes: ['points', 'niveau', 'streak', 'badges'],
          required: false,
        },
      ],
    });
 
    // Calculer le meilleur score SAT pour chaque enfant
    const { SATSession } = require('../models');
    const childrenWithSAT = await Promise.all(
      children.map(async (child) => {
        const bestSession = await SATSession.findOne({
          where: { userId: child.id },
          order: [['totalScore', 'DESC']],
          attributes: ['totalScore', 'mathScore', 'readingScore'],
        });
 
        return {
          ...child.toJSON(),
          satBestScore: bestSession
            ? {
                total: bestSession.totalScore,
                math: bestSession.mathScore,
                reading: bestSession.readingScore,
              }
            : null,
        };
      })
    );
 
    return res.status(200).json({ children: childrenWithSAT });
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
// GET enfants d'un parent avec leurs stats (pour ParentHomeScreen)
const getParentChildrenStats = async (req, res) => {
  try {
    const { parentId } = req.params;
    const { Progress, SATSession, Lesson, Gamification } = require('../models');

    const children = await User.findAll({
      where: { parentId, role: 'STUDENT' },
      attributes: ['id', 'nom', 'prenom', 'photo'],
    });

    const parent = await User.findByPk(parentId, { attributes: ['nom', 'prenom'] });

    const result = [];

    for (const child of children) {
      const lastSession = await SATSession.findOne({
        where: { userId: child.id, isCompleted: true },
        order: [['createdAt', 'DESC']],
      });

      const totalLessons = await Lesson.count({ where: { isActive: true } });
      const completedLessons = await Progress.count({
        where: { userId: child.id, isCompleted: true },
      });

      const progressPercent = totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0;

      const gamification = await Gamification.findOne({ where: { userId: child.id } });

      const allProgress = await Progress.findAll({
        where: { userId: child.id, isCompleted: true },
        order: [['updatedAt', 'ASC']],
      });

      const progressHistory = [];
      const numPoints = 5;
      if (allProgress.length > 0 && totalLessons > 0) {
        for (let i = 1; i <= numPoints; i++) {
          const countAtPoint = Math.round((allProgress.length * i) / numPoints);
          const pct = Math.round((countAtPoint / totalLessons) * 100);
          progressHistory.push(Math.min(pct, 100));
        }
      } else {
        progressHistory.push(0, 0, 0, 0, 0);
      }

      result.push({
        id: child.id,
        name: `${child.prenom} ${child.nom}`,
        classe: 'Terminale',
        satScore: lastSession ? lastSession.scoreSAT : 0,
        avatar: child.photo || null,
        progressPercent,
        progressHistory,
        coursesCompleted: completedLessons,
        coursesTotal: totalLessons,
        streak: gamification ? gamification.streak : 0,
      });
    }

    return res.status(200).json({
      parentName: parent ? parent.prenom : '',
      children: result,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
// GET activité récente des enfants d'un parent
const getParentChildrenActivity = async (req, res) => {
  try {
    const { parentId } = req.params;
    const limit = parseInt(req.query.limit) || 5;
    const { Progress, QuizResult, SATSession, Lesson, Quiz } = require('../models');

    const children = await User.findAll({
      where: { parentId, role: 'STUDENT' },
      attributes: ['id', 'nom', 'prenom'],
    });

    const childrenIds = children.map(c => c.id);
    const childrenMap = {};
    children.forEach(c => { childrenMap[c.id] = c.prenom; });

    const activities = [];

    const formatDate = (date) => {
      const now = new Date();
      const d = new Date(date);
      const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return "Aujourd'hui";
      if (diffDays === 1) return 'Hier';
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };

    const progresses = await Progress.findAll({
      where: { userId: childrenIds, isCompleted: true },
      include: [{ model: Lesson, attributes: ['titre'] }],
      order: [['updatedAt', 'DESC']],
      limit,
    });

    progresses.forEach(p => {
      activities.push({
        id: `progress_${p.id}`,
        childName: childrenMap[p.userId] || '',
        type: 'lesson',
        title: 'a terminé une leçon',
        subtitle: p.Lesson ? p.Lesson.titre : '',
        date: formatDate(p.updatedAt),
        icon: 'book-outline',
        iconColor: '#0D6B5E',
        _rawDate: p.updatedAt,
      });
    });

    const quizResults = await QuizResult.findAll({
      where: { userId: childrenIds },
      include: [{ model: Quiz, attributes: ['titre'] }],
      order: [['createdAt', 'DESC']],
      limit,
    });

    quizResults.forEach(q => {
      activities.push({
        id: `quiz_${q.id}`,
        childName: childrenMap[q.userId] || '',
        type: 'quiz',
        title: q.isPassed ? 'a complété un quiz' : 'a échoué un quiz',
        subtitle: `${q.Quiz ? q.Quiz.titre : ''} - Score: ${q.score}%`,
        date: formatDate(q.createdAt),
        icon: q.isPassed ? 'checkmark-circle-outline' : 'close-circle-outline',
        iconColor: q.isPassed ? '#4CAF50' : '#E24A4A',
        _rawDate: q.createdAt,
      });
    });

    const satSessions = await SATSession.findAll({
      where: { userId: childrenIds, isCompleted: true },
      order: [['createdAt', 'DESC']],
      limit,
    });

    satSessions.forEach(s => {
      activities.push({
        id: `sat_${s.id}`,
        childName: childrenMap[s.userId] || '',
        type: 'score',
        title: 'a terminé une session SAT',
        subtitle: `Score: ${s.scoreSAT}/1600`,
        date: formatDate(s.createdAt),
        icon: 'trending-up-outline',
        iconColor: '#D4A017',
        _rawDate: s.createdAt,
      });
    });

    activities.sort((a, b) => new Date(b._rawDate) - new Date(a._rawDate));

    const final = activities.slice(0, limit).map(a => {
      const { _rawDate, ...rest } = a;
      return rest;
    });

    return res.status(200).json({ activity: final });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
// GET recherche d'utilisateurs (pour lier un enfant)
const searchUsers = async (req, res) => {
  try {
    const { q, role } = req.query;
    const { Op } = require('sequelize');

    if (!q || !role) {
      return res.status(400).json({ message: 'Paramètres manquants' });
    }

    const users = await User.findAll({
      where: {
        role: role.toUpperCase(),
        [Op.or]: [
          { email: { [Op.iLike]: `%${q}%` } },
          { prenom: { [Op.iLike]: `%${q}%` } },
          { nom: { [Op.iLike]: `%${q}%` } },
          { username: { [Op.iLike]: `%${q}%` } },
        ],
      },
      attributes: ['id', 'prenom', 'nom', 'email'],
      limit: 10,
    });

    const formatted = users.map(u => ({
      id: u.id,
      name: `${u.prenom} ${u.nom}`,
      email: u.email,
      classe: 'Terminale',
    }));

    return res.status(200).json({ users: formatted });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST envoyer une demande de liaison parent-enfant
const sendLinkRequest = async (req, res) => {
  try {
    const { parentId } = req.params;
    const { studentId, childId } = req.body;
    const targetId = studentId || childId;
    const { LinkRequest } = require('../models');

    if (req.user.id !== parentId || req.user.role !== 'PARENT') {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    if (!targetId) {
      return res.status(400).json({ message: 'studentId manquant' });
    }

    const child = await User.findOne({ where: { id: targetId, role: 'STUDENT' } });
    if (!child) {
      return res.status(404).json({ message: 'Étudiant non trouvé' });
    }

    if (child.parentId) {
      return res.status(400).json({ message: 'Cet étudiant est déjà lié à un parent' });
    }

    // Vérifier qu'il n'y a pas déjà une demande en attente
    const existing = await LinkRequest.findOne({
      where: { parentId, studentId: targetId, status: 'PENDING' },
    });
    if (existing) {
      return res.status(400).json({ message: 'Une demande est déjà en attente pour cet étudiant' });
    }

    const linkRequest = await LinkRequest.create({
      parentId,
      studentId: targetId,
      status: 'PENDING',
    });

    const parent = await User.findByPk(parentId, { attributes: ['nom', 'prenom'] });

    await createNotification(
      child.id,
      'streak',
      'Demande de liaison parent',
      `${parent.prenom} ${parent.nom} souhaite être lié à votre compte`
    );

    return res.status(200).json({ message: 'Demande envoyée', requestId: linkRequest.id });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
// GET demandes de liaison en attente pour l'étudiant connecté
const getMyLinkRequests = async (req, res) => {
  try {
    const { LinkRequest } = require('../models');

    const requests = await LinkRequest.findAll({
      where: { studentId: req.user.id, status: 'PENDING' },
      include: [{ model: User, as: 'parent', attributes: ['id', 'nom', 'prenom', 'email'] }],
      order: [['createdAt', 'DESC']],
    });

    const formatted = requests.map(r => ({
      id: r.id,
      parentName: r.parent ? `${r.parent.prenom} ${r.parent.nom}` : '',
      parentEmail: r.parent ? r.parent.email : '',
      status: r.status,
      createdAt: r.createdAt,
    }));

    return res.status(200).json({ requests: formatted });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// PUT répondre à une demande de liaison (accepter/refuser)
const respondToLinkRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'ACCEPT' ou 'REJECT'
    const { LinkRequest } = require('../models');

    if (!['ACCEPT', 'REJECT'].includes(action)) {
      return res.status(400).json({ message: 'Action invalide (ACCEPT ou REJECT)' });
    }

    const linkRequest = await LinkRequest.findOne({
      where: { id: requestId, studentId: req.user.id, status: 'PENDING' },
    });

    if (!linkRequest) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }

    if (action === 'ACCEPT') {
      const student = await User.findByPk(req.user.id);

      if (student.parentId) {
        return res.status(400).json({ message: 'Vous êtes déjà lié à un parent' });
      }

      await student.update({ parentId: linkRequest.parentId });
      await linkRequest.update({ status: 'ACCEPTED' });

      await createNotification(
        linkRequest.parentId,
        'streak',
        'Demande acceptée',
        `${student.prenom} ${student.nom} a accepté votre demande de liaison`
      );

      return res.status(200).json({ message: 'Demande acceptée, compte lié avec succès !' });
    } else {
      await linkRequest.update({ status: 'REJECTED' });

      const student = await User.findByPk(req.user.id);

      await createNotification(
        linkRequest.parentId,
        'streak',
        'Demande refusée',
        `${student.prenom} ${student.nom} a refusé votre demande de liaison`
      );

      return res.status(200).json({ message: 'Demande refusée' });
    }
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
  getParentChildrenStats,
  getParentChildrenActivity,
  searchUsers,
  sendLinkRequest,
  getMyLinkRequests,
  respondToLinkRequest,
};