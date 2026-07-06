const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const SchoolSystem = require('./SchoolSystem');

const SchoolLevel = sequelize.define('SchoolLevel', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  schoolSystemId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  nom: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  ordre: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'school_levels',
  timestamps: true,
});

SchoolLevel.belongsTo(SchoolSystem, { foreignKey: 'schoolSystemId' });
SchoolSystem.hasMany(SchoolLevel, { foreignKey: 'schoolSystemId' });

module.exports = SchoolLevel;