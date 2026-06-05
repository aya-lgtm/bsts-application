const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Conversation = require('./Conversation');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fileType: {
    type: DataTypes.ENUM('TEXT', 'IMAGE', 'PDF'),
    defaultValue: 'TEXT',
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isReported: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'messages',
  timestamps: true,
});

Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });
Conversation.hasMany(Message, { foreignKey: 'conversationId' });

module.exports = Message;