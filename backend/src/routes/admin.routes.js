const express = require('express');
const router = express.Router();
const { getDashboard, getStats, broadcastNotification, getAllMeetings, getAdminPayments } = require('../controllers/admin.controller');
const { createReport, getReports, resolveReport } = require('../controllers/report.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const isAdmin = authorize('ADMIN', 'SUPER_ADMIN');

// Dashboard
router.get('/dashboard', authenticate, isAdmin, getDashboard);
router.get('/stats', authenticate, isAdmin, getStats);

// Notifications broadcast
router.post('/notifications/broadcast', authenticate, isAdmin, broadcastNotification);

// Meetings
router.get('/meetings', authenticate, isAdmin, getAllMeetings);

// Signalements
router.post('/reports', authenticate, createReport);
router.get('/reports', authenticate, isAdmin, getReports);
router.put('/reports/:id/resolve', authenticate, isAdmin, resolveReport);
// Payments
router.get('/payments', authenticate, isAdmin, getAdminPayments);
module.exports = router;