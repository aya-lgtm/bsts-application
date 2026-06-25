const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const SATLesson = require('./SATLesson');
const SATUnit = require('./SATUnit');

const SATProgress = sequelize.define('SATProgress', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  lessonId: { type: DataTypes.UUID, allowNull: true },
  unitId: { type: DataTypes.UUID, allowNull: true },
  type: { type: DataTypes.ENUM('LESSON', 'QUIZ', 'UNIT_TEST'), allowNull: false },
  isCompleted: { type: DataTypes.BOOLEAN, defaultValue: false },
  score: { type: DataTypes.INTEGER },
  scoreSAT: { type: DataTypes.INTEGER },
}, { tableName: 'sat_progress', timestamps: true });

SATProgress.belongsTo(User, { foreignKey: 'userId' });
SATProgress.belongsTo(SATLesson, { foreignKey: 'lessonId' });
SATProgress.belongsTo(SATUnit, { foreignKey: 'unitId' });

module.exports = SATProgress;