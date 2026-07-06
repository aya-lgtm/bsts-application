BSTS — Boston Science & Tech School Mobile App
About
BSTS is a full-stack educational mobile application built for Boston Science & Tech School in Casablanca, designed to help students prepare for the SAT while giving parents and professors tools to track progress and manage learning.
Tech Stack
Backend: Node.js, Express, PostgreSQL (Neon cloud), Sequelize, Redis (ioredis), Socket.IO
Authentication: JWT, bcrypt, OTP email verification (Gmail SMTP via Nodemailer)
Payments: Stripe (subscriptions, promo codes)
Notifications: Firebase Cloud Messaging (push notifications)
Monitoring & Testing: Sentry, Jest, Supertest
Documentation: Swagger / OpenAPI
Mobile: React Native
Features
Authentication & Security

Registration with OTP email verification
Login with email or username
Forgot password via OTP code
Brute-force protection (rate limiting)
Role-based access control (STUDENT, PARENT, PROFESSOR, ADMIN)
Refresh token system

Courses

Subjects, chapters, and lessons (CRUD)
Video/PDF upload and progress tracking
Lesson bookmarking
Chapter quizzes with scoring

le fichier .env 
PORT=3000
NODE_ENV=development

DB_HOST=
DB_PORT=5432
DB_NAME=
DB_USER=
DB_PASSWORD=
DB_SSL=true

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=
JWT_REFRESH_SECRET=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
FRONTEND_URL=http://localhost:3000

SENTRY_DSN=

FIREBASE_PRIVATE_KEY=

REDIS_URL=

CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_CLOUD_NAME=

DAILY_API_KEY=
DAILY_DOMAIN=

GMAIL_USER=
GMAIL_APP_PASSWORD=
SAT Preparation

Question bank with domains and difficulty levels
Multiple practice modes (Free, Simulated, Review, Mistakes)
Score tracking out of 1600
Section-by-section performance breakdown
Mistakes review mode

Gamification

Points, levels (Starter → Champion), and badges
Redis-powered leaderboard

Chat

Real-time messaging via Socket.IO
Direct and group conversations
Message reporting

Parent Dashboard

Link parent and student accounts (request/accept system)
View children's progress, SAT scores, and recent activity
Search for student accounts

Professor Dashboard

Subject specializations
Quiz creation stats and student performance overview

Payments

Stripe-powered subscriptions (monthly/annual)
Promo codes and payment history

Notifications

In-app notifications (lessons, quizzes, scores, payments, streaks)
Push notifications via Firebase Cloud Messaging

Project Structure
bsts-application/
├── backend/          # Node.js/Express API
│   └── src/
│       ├── config/       # DB, Redis, Sentry, Firebase, mailer, Swagger
│       ├── controllers/   # Business logic
│       ├── models/        # Sequelize models
│       ├── routes/         # API routes
│       ├── middlewares/    # Auth, rate limiting
│       └── tests/           # Jest test suites
└── mobile/            # React Native app
API Documentation
Available via Swagger UI at /api-docs when the server is running.
