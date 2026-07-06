const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const SATProgress = sequelize.define('SATProgress', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  lessonId: { type: DataTypes.UUID, allowNull: true },
  unitId: { type: DataTypes.UUID, allowNull: true },
  type: { type: DataTypes.ENUM('LESSON', 'QUIZ', 'UNIT_TEST'), allowNull: false },
  isCompleted: { type: DataTypes.BOOLEAN, defaultValue: false },
  score: { type: DataTypes.INTEGER },
  scoreSAT: { type: DataTypes.INTEGER },
  quizPassed: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'sat_progress', timestamps: true });

SATProgress.belongsTo(User, { foreignKey: 'userId', constraints: false });
User.hasMany(SATProgress, { foreignKey: 'userId', constraints: false });

module.exports = SATProgress;