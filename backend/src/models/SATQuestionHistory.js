const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const SATQuestion = require('./SATQuestion');

const SATQuestionHistory = sequelize.define('SATQuestionHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  questionId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  lastSeenAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  timesCorrect: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  timesWrong: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'sat_question_histories',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['studentId', 'questionId'] }
  ],
});
SATQuestionHistory.belongsTo(User, { foreignKey: 'studentId', constraints: false });
User.hasMany(SATQuestionHistory, { foreignKey: 'studentId', constraints: false });
SATQuestionHistory.belongsTo(SATQuestion, { foreignKey: 'questionId', constraints: false });


module.exports = SATQuestionHistory;