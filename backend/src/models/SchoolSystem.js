const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SchoolSystem = sequelize.define('SchoolSystem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nom: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'school_systems',
  timestamps: true,
});

module.exports = SchoolSystem;