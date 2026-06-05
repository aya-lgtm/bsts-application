const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SATQuestion = sequelize.define('SATQuestion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  domaine: {
    type: DataTypes.ENUM('MATH', 'READING', 'WRITING'),
    allowNull: false,
  },
  difficulte: {
    type: DataTypes.ENUM('EASY', 'MEDIUM', 'HARD'),
    allowNull: false,
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
  explicationCorrecte: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  explicationIncorrecte: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'sat_questions',
  timestamps: true,
});

module.exports = SATQuestion;