const Redis = require('ioredis');

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

redisClient.on('error', (err) => {
  console.error('❌ Erreur Redis :', err);
});

redisClient.on('connect', () => {
  console.log('✅ Connexion Redis réussie !');
});

const connectRedis = async () => {
  console.log('✅ Redis initialisé !');
};

module.exports = { redisClient, connectRedis };