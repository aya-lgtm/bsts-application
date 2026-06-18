const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CollegeStudent = sequelize.define('CollegeStudent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nom: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  prenom: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  universite: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  domaine: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  anneeEtude: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  photo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  prixParHeure: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  prixParDemiHeure: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  disponibilites: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    // Format: [{ jour: 'Lundi', heures: ['09:00', '10:00', '14:00'] }]
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'college_students',
  timestamps: true,
});

module.exports = CollegeStudent;