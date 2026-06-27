const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const ChapterQuiz = require('./ChapterQuiz');

const ChapterQuizQuestion = sequelize.define('ChapterQuizQuestion', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  chapterQuizId: { type: DataTypes.UUID, allowNull: false },
  texte: { type: DataTypes.TEXT, allowNull: false },
  options: { type: DataTypes.JSONB, allowNull: false },
  correctAnswer: { type: DataTypes.STRING, allowNull: false },
  explication: { type: DataTypes.TEXT },
  ordre: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'chapter_quiz_questions', timestamps: true });

ChapterQuizQuestion.belongsTo(ChapterQuiz, { foreignKey: 'chapterQuizId' });
ChapterQuiz.hasMany(ChapterQuizQuestion, { foreignKey: 'chapterQuizId' });

module.exports = ChapterQuizQuestion;