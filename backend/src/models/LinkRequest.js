const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const LinkRequest = sequelize.define('LinkRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  parentId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'ACCEPTED', 'REJECTED'),
    defaultValue: 'PENDING',
  },
}, {
  tableName: 'link_requests',
  timestamps: true,
});

LinkRequest.belongsTo(User, { foreignKey: 'parentId', as: 'parent' });
LinkRequest.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

module.exports = LinkRequest;