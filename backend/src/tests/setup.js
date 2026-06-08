const { sequelize } = require('../models');
const { redisClient } = require('../config/redis');

// Avant tous les tests
beforeAll(async () => {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
});

// Après tous les tests
afterAll(async () => {
  await sequelize.close();
  await redisClient.quit();
});