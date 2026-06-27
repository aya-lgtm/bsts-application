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
const SATQuestionHistory = require('./SATQuestionHistory');
const SATUnit = require('./SATUnit');
const SATLesson = require('./SATLesson');
const SATLessonQuiz = require('./SATLessonQuiz');
const SATProgress = require('./SATProgress');
const Gamification = require('./Gamification');
const Conversation = require('./Conversation');
const Message = require('./Message');
const ConversationMember = require('./ConversationMember');
const Payment = require('./Payment');
const PromoCode = require('./PromoCode');
const Notification = require('./Notification');
const LinkRequest = require('./LinkRequest');
const CollegeStudent = require('./CollegeStudent');
const Consultation = require('./Consultation');
const ChapterQuiz = require('./ChapterQuiz');
const ChapterQuizQuestion = require('./ChapterQuizQuestion');
const ChapterQuizResult = require('./ChapterQuizResult');
const SubjectExam = require('./SubjectExam');
const SubjectExamQuestion = require('./SubjectExamQuestion');
const SubjectExamResult = require('./SubjectExamResult');

const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Tables synchronisées avec PostgreSQL !');
  } catch (error) {
    console.error('❌ Erreur synchronisation tables :', error);
  }
};

module.exports = {
  sequelize, syncDatabase,
  User, RefreshToken, Subscription, UserProfile,
  Subject, Chapter, Lesson, Progress,
  Quiz, Question, QuizResult,
  SATQuestion, SATSession, SATQuestionHistory,
  SATUnit, SATLesson, SATLessonQuiz, SATProgress,
  Gamification,
  Conversation, Message, ConversationMember,
  Payment, PromoCode, Notification, LinkRequest,
  CollegeStudent, Consultation,
  ChapterQuiz, ChapterQuizQuestion, ChapterQuizResult,
  SubjectExam, SubjectExamQuestion, SubjectExamResult,
};