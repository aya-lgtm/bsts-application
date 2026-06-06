const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  montant: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  devise: {
    type: DataTypes.STRING,
    defaultValue: 'MAD',
  },
  statut: {
    type: DataTypes.ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'),
    defaultValue: 'PENDING',
  },
  plan: {
    type: DataTypes.ENUM('MONTHLY', 'ANNUAL'),
    allowNull: false,
  },
  stripePaymentId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  stripeSessionId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  codePromo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  reductionPourcent: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'payments',
  timestamps: true,
});

Payment.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Payment, { foreignKey: 'userId' });

module.exports = Payment;