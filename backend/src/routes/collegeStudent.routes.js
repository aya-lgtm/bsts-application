const express = require('express');
const router = express.Router();
const {
  getAllCollegeStudents,
  getCollegeStudentById,
  createCollegeStudent,
  updateCollegeStudent,
  deleteCollegeStudent,
  bookConsultation,
  getMyConsultations,
  getParentConsultations,
  getMentorConsultations,
  confirmConsultationPayment,
  getMyProfile,
  updateMyProfile,
  handleDailyWebhook,
} = require('../controllers/collegeStudent.controller');
const { getMyReviews, createReview } = require('../controllers/review.controller');
router.post('/webhook/daily', handleDailyWebhook);
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// GET/PUT mon profil (COLLEGE_STUDENT)
router.get('/me', authenticate, authorize('COLLEGE_STUDENT'), getMyProfile);
router.put('/me', authenticate, authorize('COLLEGE_STUDENT'), updateMyProfile);

// GET mes avis (COLLEGE_STUDENT)
router.get('/me/reviews', authenticate, authorize('COLLEGE_STUDENT'), getMyReviews);

// GET mes consultations
router.get('/consultations/my', authenticate, getMyConsultations);

// GET consultations de mes enfants (PARENT)
router.get('/consultations/parent', authenticate, authorize('PARENT'), getParentConsultations);
router.get('/mentor/consultations', authenticate, authorize('COLLEGE_STUDENT'), getMentorConsultations);
// POST réserver une consultation
router.post('/consultations/book', authenticate, bookConsultation);

// PUT confirmer paiement
router.put('/consultations/:consultationId/confirm-payment', authenticate, confirmConsultationPayment);

// GET tous les étudiants universitaires
router.get('/', authenticate, getAllCollegeStudents);

// POST créer un étudiant universitaire (ADMIN/SUPER_ADMIN)
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), createCollegeStudent);

// GET un étudiant universitaire par ID
router.get('/:id', authenticate, getCollegeStudentById);

// POST laisser un avis
router.post('/:id/reviews', authenticate, createReview);

// PUT modifier un étudiant universitaire (ADMIN/SUPER_ADMIN)
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), updateCollegeStudent);

// DELETE désactiver un étudiant universitaire (ADMIN/SUPER_ADMIN)
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), deleteCollegeStudent);

module.exports = router;