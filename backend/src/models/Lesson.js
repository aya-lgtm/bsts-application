const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Chapter = require('./Chapter');

const Lesson = sequelize.define('Lesson', {
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
  type: {
    type: DataTypes.ENUM('VIDEO', 'PDF', 'BOTH'),
    defaultValue: 'VIDEO',
  },
  videoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  pdfUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  duree: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  ordre: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isFree: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'lessons',
  timestamps: true,
});

// Association : une leçon appartient à un chapitre
Lesson.belongsTo(Chapter, { foreignKey: 'chapterId' });
Chapter.hasMany(Lesson, { foreignKey: 'chapterId' });

module.exports = Lesson;