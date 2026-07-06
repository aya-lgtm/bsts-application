const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Subject = require('./Subject');
const SchoolSystem = require('./SchoolSystem');
const SchoolLevel = require('./SchoolLevel');
const SchoolFiliere = require('./SchoolFiliere');

const SubjectTarget = sequelize.define('SubjectTarget', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  subjectId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  schoolSystemId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  schoolLevelId: {
    type: DataTypes.UUID,
    allowNull: true, // optionnel : peut cibler tout un système sans niveau précis
  },
  schoolFiliereId: {
    type: DataTypes.UUID,
    allowNull: true, // optionnel : peut cibler un niveau sans filière précise
  },
}, {
  tableName: 'subject_targets',
  timestamps: true,
});

SubjectTarget.belongsTo(Subject, { foreignKey: 'subjectId' });
SubjectTarget.belongsTo(SchoolSystem, { foreignKey: 'schoolSystemId' });
SubjectTarget.belongsTo(SchoolLevel, { foreignKey: 'schoolLevelId' });
SubjectTarget.belongsTo(SchoolFiliere, { foreignKey: 'schoolFiliereId' });

Subject.hasMany(SubjectTarget, { foreignKey: 'subjectId' });
SchoolSystem.hasMany(SubjectTarget, { foreignKey: 'schoolSystemId' });
SchoolLevel.hasMany(SubjectTarget, { foreignKey: 'schoolLevelId' });
SchoolFiliere.hasMany(SubjectTarget, { foreignKey: 'schoolFiliereId' });

module.exports = SubjectTarget;