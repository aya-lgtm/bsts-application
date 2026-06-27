const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Subject = require('./Subject');

const SubjectExam = sequelize.define('SubjectExam', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  subjectId: { type: DataTypes.UUID, allowNull: false },
  titre: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  dureeMinutes: { type: DataTypes.INTEGER, defaultValue: 60 },
  passingScore: { type: DataTypes.INTEGER, defaultValue: 60 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'subject_exams', timestamps: true });

SubjectExam.belongsTo(Subject, { foreignKey: 'subjectId' });
Subject.hasOne(SubjectExam, { foreignKey: 'subjectId' });

module.exports = SubjectExam;