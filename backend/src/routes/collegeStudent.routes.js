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
  confirmConsultationPayment,
  getMyProfile,
  updateMyProfile,
} = require('../controllers/collegeStudent.controller');
const { getMyReviews, createReview } = require('../controllers/review.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// GET tous les étudiants universitaires (tous les rôles)
router.get('/', authenticate, getAllCollegeStudents);

// GET/PUT mon profil (COLLEGE_STUDENT)
router.get('/me', authenticate, authorize('COLLEGE_STUDENT'), getMyProfile);
router.put('/me', authenticate, authorize('COLLEGE_STUDENT'), updateMyProfile);

// GET mes avis (COLLEGE_STUDENT)
router.get('/me/reviews', authenticate, authorize('COLLEGE_STUDENT'), getMyReviews);

// GET mes consultations
router.get('/consultations/my', authenticate, getMyConsultations);

// GET consultations de mes enfants (PARENT)
router.get('/consultations/parent', authenticate, authorize('PARENT'), getParentConsultations);

// POST réserver une consultation
router.post('/consultations/book', authenticate, bookConsultation);

// PUT confirmer paiement
router.put('/consultations/:consultationId/confirm-payment', authenticate, confirmConsultationPayment);

// GET un étudiant universitaire par ID
router.get('/:id', authenticate, getCollegeStudentById);

// POST laisser un avis
router.post('/:id/reviews', authenticate, createReview);

// POST créer un étudiant universitaire (ADMIN)
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), createCollegeStudent);

// PUT modifier un étudiant universitaire (ADMIN)
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), updateCollegeStudent);

// DELETE désactiver un étudiant universitaire (ADMIN)
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), deleteCollegeStudent);

module.exports = router;