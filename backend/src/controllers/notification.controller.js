const { Notification, User } = require('../models');
const { sendPushNotification } = require('../config/firebase');

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json({ notifications });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!notif) return res.status(404).json({ message: 'Notification non trouvée' });
    await notif.update({ read: true });
    return res.status(200).json({ message: 'Notification marquée comme lue' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      { read: true },
      { where: { userId: req.user.id, read: false } }
    );
    return res.status(200).json({ message: 'Toutes les notifications marquées comme lues' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const notif = await Notification.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!notif) return res.status(404).json({ message: 'Notification non trouvée' });
    await notif.destroy();
    return res.status(200).json({ message: 'Notification supprimée' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const createNotification = async (userId, type, title, subtitle = '') => {
  try {
    // Sauvegarder en base de données
    await Notification.create({ userId, type, title, subtitle });

    // Envoyer notification push si l'utilisateur a un FCM token
    const user = await User.findByPk(userId, { attributes: ['fcmToken'] });
    if (user && user.fcmToken) {
      await sendPushNotification(user.fcmToken, title, subtitle, { type });
    }
  } catch (error) {
    console.error('Erreur création notification:', error.message);
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead, deleteNotification, createNotification };