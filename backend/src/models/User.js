const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const SchoolSystem = require('./SchoolSystem');
const SchoolLevel = require('./SchoolLevel');
const SchoolFiliere = require('./SchoolFiliere');

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
  type: DataTypes.ENUM('STUDENT', 'PROFESSOR', 'PARENT', 'ADMIN', 'COLLEGE_STUDENT', 'SUPER_ADMIN'),
  defaultValue: 'STUDENT',
},
  studentType: {
    type: DataTypes.ENUM('ON_SITE', 'REMOTE'),
    allowNull: true,
    defaultValue: null,
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
  satLevel: {
    type: DataTypes.ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'),
    allowNull: true,
    defaultValue: null,
  },
  satLevelTestedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isReported: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isReported: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  schoolSystemId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  schoolLevelId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  schoolFiliereId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
}, {
  tableName: 'users',
  timestamps: true,
});

// Auto-relation parent-enfant
User.hasMany(User, { foreignKey: 'parentId', as: 'children' });
User.belongsTo(User, { foreignKey: 'parentId', as: 'parent', constraints: false });

// Profil scolaire
User.belongsTo(SchoolSystem, { foreignKey: 'schoolSystemId' });
User.belongsTo(SchoolLevel, { foreignKey: 'schoolLevelId' });
User.belongsTo(SchoolFiliere, { foreignKey: 'schoolFiliereId' });

module.exports = User;