const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const SubjectExam = require('./SubjectExam');

const SubjectExamQuestion = sequelize.define('SubjectExamQuestion', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  subjectExamId: { type: DataTypes.UUID, allowNull: false },
  texte: { type: DataTypes.TEXT, allowNull: false },
  options: { type: DataTypes.JSONB, allowNull: false },
  correctAnswer: { type: DataTypes.STRING, allowNull: false },
  explication: { type: DataTypes.TEXT },
  ordre: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'subject_exam_questions', timestamps: true });

SubjectExamQuestion.belongsTo(SubjectExam, { foreignKey: 'subjectExamId' });
SubjectExam.hasMany(SubjectExamQuestion, { foreignKey: 'subjectExamId' });

module.exports = SubjectExamQuestion;