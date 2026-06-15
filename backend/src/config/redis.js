const Redis = require('ioredis');

const redisClient = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, { tls: {} })
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
    });

redisClient.on('error', (err) => {
  console.error('❌ Erreur Redis :', err);
});

redisClient.on('connect', () => {
  console.log('✅ Connexion Redis réussie !');
});

module.exports = { redisClient };