const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const SATSession = sequelize.define('SATSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  mode: {
    type: DataTypes.ENUM('FREE', 'SIMULATED', 'REVIEW', 'MISTAKES'),
    allowNull: false,
  },
  domaine: {
    type: DataTypes.ENUM('MATH', 'READING', 'WRITING', 'ALL'),
    defaultValue: 'ALL',
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  scoreSAT: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  totalQuestions: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  bonnesReponses: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  reponses: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  tempsTotal: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  isCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'sat_sessions',
  timestamps: true,
});

SATSession.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(SATSession, { foreignKey: 'userId' });

module.exports = SATSession;