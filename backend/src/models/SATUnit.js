const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SATUnit = sequelize.define('SATUnit', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  titre: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  domaine: { type: DataTypes.ENUM('MATH', 'READING', 'WRITING'), allowNull: false },
  niveau: { type: DataTypes.ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'), allowNull: false },
  ordre: { type: DataTypes.INTEGER, defaultValue: 0 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'sat_units', timestamps: true });

module.exports = SATUnit;