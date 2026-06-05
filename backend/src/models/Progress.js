const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Lesson = require('./Lesson');

const Progress = sequelize.define('Progress', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  isCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  watchedSeconds: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'progress',
  timestamps: true,
});

// Associations
Progress.belongsTo(User, { foreignKey: 'userId' });
Progress.belongsTo(Lesson, { foreignKey: 'lessonId' });
User.hasMany(Progress, { foreignKey: 'userId' });
Lesson.hasMany(Progress, { foreignKey: 'lessonId' });

module.exports = Progress;