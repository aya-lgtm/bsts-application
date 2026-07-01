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
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// GET tous les étudiants universitaires (tous les rôles)
router.get('/', authenticate, getAllCollegeStudents);

// GET un étudiant universitaire par ID
router.get('/:id', authenticate, getCollegeStudentById);

// POST créer un étudiant universitaire (ADMIN seulement)
router.post('/', authenticate, authorize('ADMIN'), createCollegeStudent);

// PUT modifier un étudiant universitaire (ADMIN seulement)
router.put('/:id', authenticate, authorize('ADMIN'), updateCollegeStudent);

// DELETE désactiver un étudiant universitaire (ADMIN seulement)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteCollegeStudent);

// POST réserver une consultation
router.post('/consultations/book', authenticate, bookConsultation);

// GET mes consultations
router.get('/consultations/my', authenticate, getMyConsultations);

// GET consultations de mes enfants (PARENT)
router.get('/consultations/parent', authenticate, authorize('PARENT'), getParentConsultations);

// PUT confirmer paiement
router.put('/consultations/:consultationId/confirm-payment', authenticate, confirmConsultationPayment);
// GET mon profil (COLLEGE_STUDENT)
router.get('/me', authenticate, authorize('COLLEGE_STUDENT'), getMyProfile);

// PUT mettre à jour mon profil (COLLEGE_STUDENT)
router.put('/me', authenticate, authorize('COLLEGE_STUDENT'), updateMyProfile);
module.exports = router;