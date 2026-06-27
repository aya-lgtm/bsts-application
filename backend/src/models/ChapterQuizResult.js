const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const ChapterQuiz = require('./ChapterQuiz');

const ChapterQuizResult = sequelize.define('ChapterQuizResult', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  chapterQuizId: { type: DataTypes.UUID, allowNull: false },
  score: { type: DataTypes.INTEGER, allowNull: false },
  totalQuestions: { type: DataTypes.INTEGER, allowNull: false },
  correctAnswers: { type: DataTypes.INTEGER, allowNull: false },
  passed: { type: DataTypes.BOOLEAN, defaultValue: false },
  completedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'chapter_quiz_results', timestamps: true });

ChapterQuizResult.belongsTo(User, { foreignKey: 'userId' });
ChapterQuizResult.belongsTo(ChapterQuiz, { foreignKey: 'chapterQuizId' });
User.hasMany(ChapterQuizResult, { foreignKey: 'userId' });
ChapterQuiz.hasMany(ChapterQuizResult, { foreignKey: 'chapterQuizId' });

module.exports = ChapterQuizResult;