const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const SATLesson = require('./SATLesson');

const SATLessonQuiz = sequelize.define('SATLessonQuiz', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  lessonId: { type: DataTypes.UUID, allowNull: false },
  enonce: { type: DataTypes.TEXT, allowNull: false },
  choixA: DataTypes.STRING,
  choixB: DataTypes.STRING,
  choixC: DataTypes.STRING,
  choixD: DataTypes.STRING,
  bonneReponse: { type: DataTypes.ENUM('A', 'B', 'C', 'D'), allowNull: false },
  explication: { type: DataTypes.TEXT },
}, { tableName: 'sat_lesson_quizzes', timestamps: true });

SATLessonQuiz.belongsTo(SATLesson, { foreignKey: 'lessonId' });
SATLesson.hasMany(SATLessonQuiz, { foreignKey: 'lessonId' });

module.exports = SATLessonQuiz;