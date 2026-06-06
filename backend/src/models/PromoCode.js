const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PromoCode = sequelize.define('PromoCode', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  reductionPourcent: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  maxUtilisations: {
    type: DataTypes.INTEGER,
    defaultValue: 100,
  },
  utilisations: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  dateExpiration: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'promo_codes',
  timestamps: true,
});

module.exports = PromoCode;