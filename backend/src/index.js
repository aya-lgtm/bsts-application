require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/database');
const { syncDatabase } = require('./models');

const PORT = process.env.PORT || 3000;

// Connexion + synchronisation base de données
sequelize.authenticate()
  .then(async () => {
    console.log('✅ Connexion PostgreSQL réussie !');
    await syncDatabase();
    app.listen(PORT, () => {
      console.log(`✅ BSTS Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Erreur connexion PostgreSQL :', err);
  });