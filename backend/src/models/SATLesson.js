const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const SATUnit = require('./SATUnit');

const SATLesson = sequelize.define('SATLesson', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  unitId: { type: DataTypes.UUID, allowNull: false },
  titre: { type: DataTypes.STRING, allowNull: false },
  ordre: { type: DataTypes.INTEGER, defaultValue: 0 },
  type: { type: DataTypes.ENUM('VIDEO', 'PDF', 'TEXT'), allowNull: false },
  contenu: { type: DataTypes.TEXT },
  videoUrl: { type: DataTypes.STRING },
  pdfUrl: { type: DataTypes.STRING },
  dureeMinutes: { type: DataTypes.INTEGER },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'sat_lessons', timestamps: true });

SATLesson.belongsTo(SATUnit, { foreignKey: 'unitId' });
SATUnit.hasMany(SATLesson, { foreignKey: 'unitId' });

module.exports = SATLesson;