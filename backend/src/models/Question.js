const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Quiz = require('./Quiz');

const Question = sequelize.define('Question', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  enonce: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  choixA: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  choixB: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  choixC: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  choixD: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bonneReponse: {
    type: DataTypes.ENUM('A', 'B', 'C', 'D'),
    allowNull: false,
  },
  explication: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  ordre: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'questions',
  timestamps: true,
});

Question.belongsTo(Quiz, { foreignKey: 'quizId' });
Quiz.hasMany(Question, { foreignKey: 'quizId' });

module.exports = Question;