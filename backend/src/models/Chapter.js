const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Subject = require('./Subject');

const Chapter = sequelize.define('Chapter', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  titre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  ordre: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'chapters',
  timestamps: true,
});

// Association : un chapitre appartient à une matière
Chapter.belongsTo(Subject, { foreignKey: 'subjectId' });
Subject.hasMany(Chapter, { foreignKey: 'subjectId' });

module.exports = Chapter;