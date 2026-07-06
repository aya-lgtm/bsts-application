const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Gamification = sequelize.define('Gamification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  niveau: {
    type: DataTypes.ENUM('STARTER', 'EXPLORER', 'SCHOLAR', 'ACHIEVER', 'CHAMPION'),
    defaultValue: 'STARTER',
  },
  badges: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
  streak: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  dernierLogin: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'gamification',
  timestamps: true,
});

// ✅ Doit ressembler à ça
Gamification.belongsTo(User, { foreignKey: 'userId', constraints: false });
User.hasOne(Gamification, { foreignKey: 'userId', as: 'gamification' });

module.exports = Gamification;