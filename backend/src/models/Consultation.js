const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const CollegeStudent = require('./CollegeStudent');

const Consultation = sequelize.define('Consultation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  collegeStudentId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  heure: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  duree: {
    type: DataTypes.ENUM('30min', '1h'),
    allowNull: false,
    defaultValue: '1h',
  },
  prix: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  statut: {
    type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'),
    defaultValue: 'PENDING',
  },
  paymentIntentId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isPaid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  meetLink: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  meetingStatus: {
  type: DataTypes.ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'),
  defaultValue: 'NOT_STARTED',
},
firstJoinedAt: {
  type: DataTypes.DATE,
  allowNull: true,
},
lastLeftAt: {
  type: DataTypes.DATE,
  allowNull: true,
},
totalDurationSeconds: {
  type: DataTypes.INTEGER,
  defaultValue: 0,
},
sessions: {
  type: DataTypes.JSONB,
  allowNull: false,
  defaultValue: [],
},
}, {
  tableName: 'consultations',
  timestamps: true,
});

Consultation.belongsTo(User, { foreignKey: 'userId' });
Consultation.belongsTo(User, { foreignKey: 'userId', constraints: false });
User.hasMany(Consultation, { foreignKey: 'userId' });
CollegeStudent.hasMany(Consultation, { foreignKey: 'collegeStudentId' });

module.exports = Consultation;