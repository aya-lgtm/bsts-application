const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Chapter = require('./Chapter');

const Quiz = sequelize.define('Quiz', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  titre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  domaine: {
    type: DataTypes.ENUM('MATH', 'READING', 'WRITING'),
    allowNull: true,
    defaultValue: 'MATH',
  },
  difficulte: {
    type: DataTypes.ENUM('EASY', 'MEDIUM', 'HARD'),
    allowNull: true,
    defaultValue: 'MEDIUM',
  },
  scoreMinimum: {
    type: DataTypes.INTEGER,
    defaultValue: 70,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'quizzes',
  timestamps: true,
});

Quiz.belongsTo(Chapter, { foreignKey: 'chapterId' });
Chapter.hasOne(Quiz, { foreignKey: 'chapterId' });

module.exports = Quiz;