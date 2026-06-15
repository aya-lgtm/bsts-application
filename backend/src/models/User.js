const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nom: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  prenom: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('STUDENT', 'PROFESSOR', 'PARENT', 'ADMIN'),
    defaultValue: 'STUDENT',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  photo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  matieres: {
  type: DataTypes.ARRAY(DataTypes.STRING),
  allowNull: true,
  defaultValue: [],
},
fcmToken: {
  type: DataTypes.STRING,
  allowNull: true,
},
chatSuspendedUntil: {
  type: DataTypes.DATE,
  allowNull: true,
},
  parentId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  resetPasswordToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  otpCode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  otpExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'users',
  timestamps: true,
});

// Auto-relation parent-enfant
User.hasMany(User, { foreignKey: 'parentId', as: 'children' });
User.belongsTo(User, { foreignKey: 'parentId', as: 'parent' });

module.exports = User;