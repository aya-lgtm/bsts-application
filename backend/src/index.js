require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const sequelize = require('./config/database');
const { syncDatabase } = require('./models');
const { redisClient } = require('./config/redis');
const { verifyAccessToken } = require('./utils/jwt.utils');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  },
});

// Rendre io accessible dans les controllers
app.set('io', io);

const onlineUsers = new Set();

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

io.on('connection', (socket) => {
  const userId = socket.user.id;
  console.log(`✅ User connecté : ${userId}`);

  // Ajouter à la liste des users en ligne
  onlineUsers.add(userId);
  io.emit('user_online', userId);
  socket.emit('online_users', [...onlineUsers]);

  socket.join(`user_${userId}`);

  // Rejoindre une conversation
  socket.on('join_conversation', ({ conversationId }) => {
    socket.join(`conv:${conversationId}`);
  });

  // Quitter une conversation
  socket.on('leave_conversation', ({ conversationId }) => {
    socket.leave(`conv:${conversationId}`);
  });

  // Typing indicator
  socket.on('typing', ({ conversationId }) => {
    socket.to(`conv:${conversationId}`).emit('typing', { userId, conversationId });
  });

  // Déconnexion
  socket.on('disconnect', () => {
    console.log(`❌ User déconnecté : ${userId}`);
    onlineUsers.delete(userId);
    io.emit('user_offline', userId);
  });
});

sequelize.authenticate()
  .then(async () => {
    console.log('✅ Connexion PostgreSQL réussie !');
    await syncDatabase();
    console.log('✅ Redis initialisé !');
    server.listen(PORT, () => {
      console.log(`✅ BSTS Server running on port ${PORT}`);
      console.log(`✅ Socket.IO actif !`);
    });
  })
  .catch((err) => {
    console.error('❌ Erreur de connexion :', err);
  });