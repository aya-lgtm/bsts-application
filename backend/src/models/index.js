const sequelize = require('../config/database');
const User = require('./User');
const RefreshToken = require('./RefreshToken');
const Subscription = require('./Subscription');
const UserProfile = require('./UserProfile');
const Subject = require('./Subject');
const Chapter = require('./Chapter');
const Lesson = require('./Lesson');
const Progress = require('./Progress');
const Quiz = require('./Quiz');
const Question = require('./Question');
const QuizResult = require('./QuizResult');
const SATQuestion = require('./SATQuestion');
const SATSession = require('./SATSession');
const Gamification = require('./Gamification');
const Conversation = require('./Conversation');
const Message = require('./Message');
const ConversationMember = require('./ConversationMember');

const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Tables synchronisées avec PostgreSQL !');
  } catch (error) {
    console.error('❌ Erreur synchronisation tables :', error);
  }
};

module.exports = {
  sequelize,
  syncDatabase,
  User,
  RefreshToken,
  Subscription,
  UserProfile,
  Subject,
  Chapter,
  Lesson,
  Progress,
  Quiz,
  Question,
  QuizResult,
  SATQuestion,
  SATSession,
  Gamification,
  Conversation,
  Message,
  ConversationMember,
};