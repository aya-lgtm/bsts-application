const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getQuizByChapter,
  submitQuiz,
  createQuiz,
  addQuestion,
  getMyResults,
  getMyQuizzes,
} = require('../controllers/quiz.controller');
const { importQuestionsFromExcel } = require('../controllers/questionImport.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Multer en mémoire pour Excel
const uploadExcel = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers Excel (.xlsx, .xls) sont acceptés'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
});

// GET quiz créés par le professeur connecté
router.get('/my-quizzes', authenticate, authorize('PROFESSOR', 'ADMIN'), getMyQuizzes);

// GET quiz d'un chapitre
router.get('/chapter/:chapterId', authenticate, getQuizByChapter);

// POST soumettre les réponses
router.post('/:quizId/submit', authenticate, submitQuiz);

// POST créer un quiz (ADMIN/PROFESSOR)
router.post('/', authenticate, authorize('ADMIN', 'PROFESSOR'), createQuiz);

// POST ajouter une question (ADMIN/PROFESSOR)
router.post('/:quizId/questions', authenticate, authorize('ADMIN', 'PROFESSOR'), addQuestion);

// POST importer questions depuis Excel (ADMIN/PROFESSOR)
router.post('/:quizId/import-excel', authenticate, authorize('ADMIN', 'PROFESSOR'), uploadExcel.single('file'), importQuestionsFromExcel);

// GET mes résultats
router.get('/my-results', authenticate, getMyResults);

module.exports = router;