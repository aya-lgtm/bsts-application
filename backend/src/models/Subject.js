const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Subject = sequelize.define('Subject', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nom: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  couleur: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  niveau: {
    type: DataTypes.ENUM('Standard', 'Honors', 'AP'),
    allowNull: true,
    defaultValue: 'Standard',
  },
  categorie: {
    type: DataTypes.ENUM('Maths', 'Sciences', 'Anglais', 'Histoire/Géo', 'Sciences Sociales', 'Autre'),
    allowNull: true,
    defaultValue: 'Autre',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'subjects',
  timestamps: true,
});

module.exports = Subject;