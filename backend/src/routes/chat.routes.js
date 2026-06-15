const express = require('express');
const router = express.Router();
const {
  createDirectConversation,
  createGroupConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  markAsRead,
  reportMessage,
  sendFileMessage,
} = require('../controllers/chat.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const uploadChat = require('../config/uploadChat');

// POST créer une conversation directe
router.post('/direct', authenticate, createDirectConversation);

// POST créer un groupe (PROFESSOR seulement)
router.post('/group', authenticate, authorize('PROFESSOR', 'ADMIN'), createGroupConversation);

// GET mes conversations
router.get('/', authenticate, getMyConversations);

// GET messages d'une conversation
router.get('/:conversationId/messages', authenticate, getMessages);

// POST envoyer un message
router.post('/messages', authenticate, sendMessage);

// POST envoyer un fichier (image/PDF)
router.post('/messages/upload', authenticate, uploadChat.single('file'), sendFileMessage);

// PATCH marquer comme lu
router.patch('/messages/:messageId/read', authenticate, markAsRead);

// POST signaler un message
router.post('/messages/:messageId/report', authenticate, reportMessage);

module.exports = router;