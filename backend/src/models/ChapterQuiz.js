const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Chapter = require('./Chapter');

const ChapterQuiz = sequelize.define('ChapterQuiz', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  chapterId: { type: DataTypes.UUID, allowNull: false },
  titre: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  dureeMinutes: { type: DataTypes.INTEGER, defaultValue: 15 },
  passingScore: { type: DataTypes.INTEGER, defaultValue: 60 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'chapter_quizzes', timestamps: true });

ChapterQuiz.belongsTo(Chapter, { foreignKey: 'chapterId' });
Chapter.hasOne(ChapterQuiz, { foreignKey: 'chapterId' });

module.exports = ChapterQuiz;