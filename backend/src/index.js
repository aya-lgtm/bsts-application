require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const sequelize = require('./config/database');
const { syncDatabase } = require('./models');
const { connectRedis } = require('./config/redis');
const { verifyAccessToken } = require('./utils/jwt.utils');

const PORT = process.env.PORT || 3000;

// Créer le serveur HTTP
const server = http.createServer(app);

// Configurer Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware d'authentification Socket.IO
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Token manquant'));

    const decoded = verifyAccessToken(token);
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error('Token invalide'));
  }
});

// Gestion des connexions Socket.IO
io.on('connection', (socket) => {
  console.log(`✅ User connecté : ${socket.user.id}`);

  // Rejoindre sa room personnelle
  socket.join(`user_${socket.user.id}`);

  // Rejoindre une conversation
  socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`User ${socket.user.id} a rejoint la conversation ${conversationId}`);
  });

  // Envoyer un message temps réel
  socket.on('send_message', (data) => {
    const { conversationId, content } = data;
    io.to(`conversation_${conversationId}`).emit('new_message', {
      senderId: socket.user.id,
      conversationId,
      content,
      createdAt: new Date(),
    });
  });

  // Déconnexion
  socket.on('disconnect', () => {
    console.log(`❌ User déconnecté : ${socket.user.id}`);
  });
});

// Connexion + synchronisation
sequelize.authenticate()
  .then(async () => {
    console.log('✅ Connexion PostgreSQL réussie !');
    await syncDatabase();
    await connectRedis();
    server.listen(PORT, () => {
      console.log(`✅ BSTS Server running on port ${PORT}`);
      console.log(`✅ Socket.IO actif !`);
    });
  })
  .catch((err) => {
    console.error('❌ Erreur de connexion :', err);
  });