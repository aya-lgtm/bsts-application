const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const SubjectExam = require('./SubjectExam');

const SubjectExamResult = sequelize.define('SubjectExamResult', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  subjectExamId: { type: DataTypes.UUID, allowNull: false },
  score: { type: DataTypes.INTEGER, allowNull: false },
  totalQuestions: { type: DataTypes.INTEGER, allowNull: false },
  correctAnswers: { type: DataTypes.INTEGER, allowNull: false },
  passed: { type: DataTypes.BOOLEAN, defaultValue: false },
  completedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'subject_exam_results', timestamps: true });

SubjectExamResult.belongsTo(User, { foreignKey: 'userId', constraints: false });
SubjectExamResult.belongsTo(SubjectExam, { foreignKey: 'subjectExamId' });
User.hasMany(SubjectExamResult, { foreignKey: 'userId' });
SubjectExam.hasMany(SubjectExamResult, { foreignKey: 'subjectExamId' });

module.exports = SubjectExamResult;