const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  plan: {
    type: DataTypes.ENUM('FREE', 'MONTHLY', 'ANNUAL'),
    defaultValue: 'FREE',
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'CANCELLED', 'EXPIRED'),
    defaultValue: 'ACTIVE',
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
}, {
  tableName: 'subscriptions',
  timestamps: true,
});

// Association : un abonnement appartient à un user
Subscription.belongsTo(User, { foreignKey: 'userId' });
User.hasOne(Subscription, { foreignKey: 'userId' });

module.exports = Subscription;