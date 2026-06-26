const Redis = require('ioredis');

const redisClient = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      tls: {},
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null; // Arrêter après 3 tentatives
        return Math.min(times * 1000, 5000); // Attendre max 5 secondes
      },
      reconnectOnError: () => false,
    })
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
    });

redisClient.on('error', (err) => {
  // Log seulement une fois par type d'erreur
  if (err.code === 'ENOTFOUND') {
    console.error('❌ Erreur Redis : impossible de joindre Upstash (réseau ?)');
  }
});

redisClient.on('connect', () => {
  console.log('✅ Connexion Redis réussie !');
});

module.exports = { redisClient };