const sequelize = require('../config/database');
const User = require('./User');
const RefreshToken = require('./RefreshToken');
const Subscription = require('./Subscription');

// Synchroniser tous les modèles avec la base de données
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Tables synchronisées avec PostgreSQL !');
  } catch (error) {
    console.error('❌ Erreur synchronisation tables :', error);
  }
};

module.exports = {
  sequelize,
  syncDatabase,
  User,
  RefreshToken,
  Subscription,
};