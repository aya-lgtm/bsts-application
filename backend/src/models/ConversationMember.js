const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Conversation = require('./Conversation');

const ConversationMember = sequelize.define('ConversationMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  role: {
    type: DataTypes.ENUM('MEMBER', 'ADMIN'),
    defaultValue: 'MEMBER',
  },
  isArchived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'conversation_members',
  timestamps: true,
});

ConversationMember.belongsTo(User, { foreignKey: 'userId' });
ConversationMember.belongsTo(Conversation, { foreignKey: 'conversationId' });
Conversation.hasMany(ConversationMember, { foreignKey: 'conversationId' });
User.hasMany(ConversationMember, { foreignKey: 'userId' });

module.exports = ConversationMember;