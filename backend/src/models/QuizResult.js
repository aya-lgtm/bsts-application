const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Quiz = require('./Quiz');

const QuizResult = sequelize.define('QuizResult', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  totalQuestions: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  isPassed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  reponses: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  tableName: 'quiz_results',
  timestamps: true,
});

QuizResult.belongsTo(User, { foreignKey: 'userId' });
QuizResult.belongsTo(Quiz, { foreignKey: 'quizId' });
User.hasMany(QuizResult, { foreignKey: 'userId' });
Quiz.hasMany(QuizResult, { foreignKey: 'quizId' });

module.exports = QuizResult;