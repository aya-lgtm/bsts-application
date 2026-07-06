const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Report = sequelize.define('Report', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  reporterId: { type: DataTypes.UUID, allowNull: false },
  targetType: {
    type: DataTypes.ENUM('USER', 'SAT_QUESTION', 'COURSE', 'MEETING'),
    allowNull: false,
  },
  targetId: { type: DataTypes.UUID, allowNull: false },
  raison: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  statut: {
    type: DataTypes.ENUM('PENDING', 'TRAITE', 'REJETE'),
    defaultValue: 'PENDING',
  },
}, { tableName: 'reports', timestamps: true });

Report.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter', constraints: false });

module.exports = Report;