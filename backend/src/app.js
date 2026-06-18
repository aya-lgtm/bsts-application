const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { Sentry, initSentry } = require('./config/sentry');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const courseRoutes = require('./routes/course.routes');
const uploadRoutes = require('./routes/upload.routes');
const quizRoutes = require('./routes/quiz.routes');
const satRoutes = require('./routes/sat.routes');
const gamificationRoutes = require('./routes/gamification.routes');
const chatRoutes = require('./routes/chat.routes');
const paymentRoutes = require('./routes/payment.routes');
const notificationRoutes = require('./routes/notification.routes');
const collegeStudentRoutes = require('./routes/collegeStudent.routes');
// Initialiser Sentry
initSentry();

const app = express();

// Sentry request handler
app.use(Sentry.expressErrorHandler());

// Webhook Stripe doit être avant express.json()
app.use('/api/v1/payment/webhook', express.raw({ type: 'application/json' }));

// Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers uploadés statiquement
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Servir le back-office
app.use('/backoffice', express.static(path.join(__dirname, 'public/backoffice')));

// Documentation Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/quiz', quizRoutes);
app.use('/api/v1/sat', satRoutes);
app.use('/api/v1/gamification', gamificationRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/payment', paymentRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/college-students', collegeStudentRoutes);
// Route de test
app.get('/', (req, res) => {
  res.json({ message: 'BSTS API is running 🚀' });
});

// Sentry error handler
app.use(Sentry.expressErrorHandler());

module.exports = app;