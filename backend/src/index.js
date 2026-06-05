require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/database');
const { syncDatabase } = require('./models');
const { connectRedis } = require('./config/redis');

const PORT = process.env.PORT || 3000;

sequelize.authenticate()
  .then(async () => {
    console.log('✅ Connexion PostgreSQL réussie !');
    await syncDatabase();
    await connectRedis();
    app.listen(PORT, () => {
      console.log(`✅ BSTS Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Erreur de connexion :', err);
  });