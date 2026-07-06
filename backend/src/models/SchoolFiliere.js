const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const SchoolSystem = require('./SchoolSystem');
const SchoolLevel = require('./SchoolLevel');

const SchoolFiliere = sequelize.define('SchoolFiliere', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  schoolSystemId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  schoolLevelId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  nom: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'school_filieres',
  timestamps: true,
});

SchoolFiliere.belongsTo(SchoolSystem, { foreignKey: 'schoolSystemId' });
SchoolFiliere.belongsTo(SchoolLevel, { foreignKey: 'schoolLevelId' });
SchoolSystem.hasMany(SchoolFiliere, { foreignKey: 'schoolSystemId' });
SchoolLevel.hasMany(SchoolFiliere, { foreignKey: 'schoolLevelId' });

module.exports = SchoolFiliere;