require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const sequelize = require('./config/database');
const { syncDatabase } = require('./models');
const { connectRedis } = require('./config/redis');
const { verifyAccessToken } = require('./utils/jwt.utils');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

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
  console.log(`✅ User connecté : ${socket.user.id}`);
  socket.join(`user_${socket.user.id}`);

  socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
  });

  socket.on('send_message', (data) => {
    const { conversationId, content } = data;
    io.to(`conversation_${conversationId}`).emit('new_message', {
      senderId: socket.user.id,
      conversationId,
      content,
      createdAt: new Date(),
    });
  });

  socket.on('disconnect', () => {
    console.log(`❌ User déconnecté : ${socket.user.id}`);
  });
});

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