const { Gamification, User } = require('../models');
const { redisClient } = require('../config/redis');

// GET mon profil de gamification
const getMyGamification = async (req, res) => {
  try {
    const userId = req.user.id;

    let gamification = await Gamification.findOne({ where: { userId } });

    if (!gamification) {
      gamification = await Gamification.create({ userId });
    }

    return res.status(200).json({ gamification });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST attribuer des points
const awardPoints = async (req, res) => {
  try {
    const { userId, points, raison } = req.body;

    let gamification = await Gamification.findOne({ where: { userId } });

    if (!gamification) {
      gamification = await Gamification.create({ userId, points });
    } else {
      const newPoints = gamification.points + points;
      const niveau = calculerNiveau(newPoints);
      const badges = calculerBadges(newPoints, gamification.badges);
      await gamification.update({ points: newPoints, niveau, badges });
    }

    // Mettre à jour le leaderboard dans Redis
    await redisClient.zadd('leaderboard', gamification.points, userId);

    return res.status(200).json({
      message: `✅ ${points} points attribués pour : ${raison}`,
      gamification,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET leaderboard
const getLeaderboard = async (req, res) => {
  try {
    // Récupérer top 20 depuis Redis
    const leaderboard = await redisClient.zrevrange('leaderboard', 0, 19, 'WITHSCORES');

    const result = [];
    for (let i = 0; i < leaderboard.length; i += 2) {
      const userId = leaderboard[i];
      const points = parseInt(leaderboard[i + 1]);

      const user = await User.findByPk(userId, {
        attributes: ['id', 'nom', 'prenom'],
      });

      const gamification = await Gamification.findOne({ where: { userId } });

      result.push({
        rang: Math.floor(i / 2) + 1,
        userId,
        nom: user ? `${user.prenom} ${user.nom[0]}.` : 'Anonyme',
        points,
        niveau: gamification ? gamification.niveau : 'STARTER',
      });
    }

    return res.status(200).json({ leaderboard: result });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Calculer le niveau
const calculerNiveau = (points) => {
  if (points >= 7000) return 'CHAMPION';
  if (points >= 3500) return 'ACHIEVER';
  if (points >= 1500) return 'SCHOLAR';
  if (points >= 500) return 'EXPLORER';
  return 'STARTER';
};

// Calculer les badges
const calculerBadges = (points, badgesActuels) => {
  const badges = [...badgesActuels];

  if (points >= 500 && !badges.includes('EXPLORER')) badges.push('EXPLORER');
  if (points >= 1500 && !badges.includes('SCHOLAR')) badges.push('SCHOLAR');
  if (points >= 3500 && !badges.includes('ACHIEVER')) badges.push('ACHIEVER');
  if (points >= 7000 && !badges.includes('CHAMPION')) badges.push('CHAMPION');

  return badges;
};

module.exports = { getMyGamification, awardPoints, getLeaderboard };