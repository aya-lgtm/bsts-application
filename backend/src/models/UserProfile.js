const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const UserProfile = sequelize.define('UserProfile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  photo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  niveauScolaire: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  matieres: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: [],
  },
  progression: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
  },
  parentId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'user_profiles',
  timestamps: true,
});

// Association
UserProfile.belongsTo(User, { foreignKey: 'userId' });
User.hasOne(UserProfile, { foreignKey: 'userId', as: 'profile' });

module.exports = UserProfile;