const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  token: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  isRevoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'refresh_tokens',
  timestamps: true,
});

// Association : un token appartient à un user
RefreshToken.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(RefreshToken, { foreignKey: 'userId' });

module.exports = RefreshToken;