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
  scoreMinimum: {
    type: DataTypes.INTEGER,
    defaultValue: 70,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'quizzes',
  timestamps: true,
});

Quiz.belongsTo(Chapter, { foreignKey: 'chapterId' });
Chapter.hasOne(Quiz, { foreignKey: 'chapterId' });

module.exports = Quiz;