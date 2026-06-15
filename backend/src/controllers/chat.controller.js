const { Conversation, Message, ConversationMember, User } = require('../models');

// POST créer une conversation directe (élève → professeur)
const createDirectConversation = async (req, res) => {
  try {
    const { professorId } = req.body;
    const studentId = req.user.id;

    // Vérifier que le professeur existe et a le bon rôle
    const professor = await User.findByPk(professorId);
    if (!professor || professor.role !== 'PROFESSOR') {
      return res.status(400).json({ message: 'Professeur non trouvé' });
    }

    // Vérifier que l'élève ne crée pas une conv avec un autre élève
    if (req.user.role === 'STUDENT' && professor.role === 'STUDENT') {
      return res.status(403).json({ message: 'Les élèves ne peuvent pas chatter entre eux' });
    }

    // Vérifier si une conversation existe déjà
    const existingConv = await ConversationMember.findOne({
      where: { userId: studentId },
      include: [{
        model: Conversation,
        where: { type: 'DIRECT' },
        include: [{
          model: ConversationMember,
          where: { userId: professorId },
        }],
      }],
    });

    if (existingConv) {
      return res.status(200).json({ conversation: existingConv.Conversation });
    }

    // Créer la conversation
    const conversation = await Conversation.create({ type: 'DIRECT' });

    // Ajouter les membres
    await ConversationMember.create({ userId: studentId, conversationId: conversation.id });
    await ConversationMember.create({ userId: professorId, conversationId: conversation.id });

    return res.status(201).json({ message: 'Conversation créée !', conversation });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST créer un groupe (professeur seulement)
const createGroupConversation = async (req, res) => {
  try {
    const { nom, memberIds } = req.body;
    const professorId = req.user.id;

    const conversation = await Conversation.create({
      type: 'GROUP',
      nom,
    });

    // Ajouter le professeur comme admin
    await ConversationMember.create({
      userId: professorId,
      conversationId: conversation.id,
      role: 'ADMIN',
    });

    // Ajouter les membres
    for (const memberId of memberIds) {
      await ConversationMember.create({
        userId: memberId,
        conversationId: conversation.id,
      });
    }

    return res.status(201).json({ message: 'Groupe créé !', conversation });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET mes conversations
const getMyConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const members = await ConversationMember.findAll({
      where: { userId },
      include: [{
        model: Conversation,
        where: { isActive: true },
        include: [{
          model: Message,
          limit: 1,
          order: [['createdAt', 'DESC']],
        }],
      }],
    });

    const conversations = members.map(m => m.Conversation);

    return res.status(200).json({ conversations });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET messages d'une conversation
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Vérifier que l'utilisateur est membre
    const member = await ConversationMember.findOne({
      where: { userId, conversationId },
    });

    if (!member) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const messages = await Message.findAll({
      where: { conversationId },
      include: [{ model: User, as: 'sender', attributes: ['id', 'nom', 'prenom', 'role'] }],
      order: [['createdAt', 'ASC']],
    });

    return res.status(200).json({ messages });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST envoyer un message
// POST envoyer un message
const sendMessage = async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    const senderId = req.user.id;

    // Vérifier si l'utilisateur est suspendu
    const sender = await User.findByPk(senderId);
    if (sender.chatSuspendedUntil && new Date(sender.chatSuspendedUntil) > new Date()) {
      return res.status(403).json({
        message: 'Vous êtes suspendu du chat',
        suspendedUntil: sender.chatSuspendedUntil,
      });
    }

    // Vérifier que l'utilisateur est membre
    const member = await ConversationMember.findOne({
      where: { userId: senderId, conversationId },
    });

    if (!member) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const message = await Message.create({
      conversationId,
      senderId,
      content,
      fileType: 'TEXT',
    });

    return res.status(201).json({ message: 'Message envoyé !', data: message });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// PATCH marquer message comme lu
const markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;

    await Message.update({ isRead: true }, { where: { id: messageId } });

    return res.status(200).json({ message: 'Message marqué comme lu !' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST signaler un message
const reportMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    await Message.update({ isReported: true }, { where: { id: messageId } });

    return res.status(200).json({ message: 'Message signalé !' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
// POST envoyer un message avec fichier (image ou PDF)
const sendFileMessage = async (req, res) => {
  try {
    const { conversationId } = req.body;
    const senderId = req.user.id;
    const file = req.file;

    const sender = await User.findByPk(senderId);
    if (sender.chatSuspendedUntil && new Date(sender.chatSuspendedUntil) > new Date()) {
      return res.status(403).json({
        message: 'Vous êtes suspendu du chat',
        suspendedUntil: sender.chatSuspendedUntil,
      });
    }

    if (!file) return res.status(400).json({ message: 'Aucun fichier envoyé' });

    const member = await ConversationMember.findOne({
      where: { conversationId, userId: senderId },
    });
    if (!member) {
      return res.status(403).json({ message: 'Accès refusé à cette conversation' });
    }

    const isImage = file.mimetype.startsWith('image/');
    const fileUrl = `/uploads/chat/${isImage ? 'images' : 'pdfs'}/${file.filename}`;

    const message = await Message.create({
      conversationId,
      senderId,
      content: file.originalname,
      fileUrl,
      fileType: isImage ? 'IMAGE' : 'PDF',
    });

    const fullMessage = await Message.findByPk(message.id, {
      include: [{ model: User, as: 'sender', attributes: ['id', 'nom', 'prenom', 'photo'] }],
    });

    return res.status(201).json({ message: fullMessage });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
// POST suspendre un utilisateur du chat (ADMIN/PROFESSOR)
const suspendUserFromChat = async (req, res) => {
  try {
    const { userId } = req.params;
    const { durationHours } = req.body; // ex: 24 pour 24h, null pour permanent

    const targetUser = await User.findByPk(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    let suspendedUntil;
    if (durationHours) {
      suspendedUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000);
    } else {
      // Suspension permanente (date très lointaine)
      suspendedUntil = new Date('2099-12-31');
    }

    await targetUser.update({ chatSuspendedUntil: suspendedUntil });

    return res.status(200).json({
      message: 'Utilisateur suspendu du chat avec succès !',
      suspendedUntil,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST lever la suspension d'un utilisateur
const unsuspendUserFromChat = async (req, res) => {
  try {
    const { userId } = req.params;

    const targetUser = await User.findByPk(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    await targetUser.update({ chatSuspendedUntil: null });

    return res.status(200).json({ message: 'Suspension levée avec succès !' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
module.exports = {
  createDirectConversation,
  createGroupConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  sendFileMessage,  
  markAsRead,
  reportMessage,
  suspendUserFromChat,
  unsuspendUserFromChat,
};