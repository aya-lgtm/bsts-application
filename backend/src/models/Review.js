const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const CollegeStudent = require('./CollegeStudent');

const Review = sequelize.define('Review', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  collegeStudentId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.UUID, allowNull: false },
  note: { type: DataTypes.FLOAT, allowNull: false, validate: { min: 1, max: 5 } },
  commentaire: { type: DataTypes.TEXT, allowNull: true },
  badges: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
}, { tableName: 'reviews', timestamps: true });

Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Review.belongsTo(CollegeStudent, { foreignKey: 'collegeStudentId' });
CollegeStudent.hasMany(Review, { foreignKey: 'collegeStudentId' });

module.exports = Review;