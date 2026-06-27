const express = require('express');
const router = express.Router();
const {
  getQuestions,
  startSession,
  submitSession,
  getStats,
  addSATQuestion,
  getSATProgress,
  getSATSections,
  getParentSATProgress,
  getMistakes,
  startLevelTest,
  submitLevelTest,
  getUserLevel,
} = require('../controllers/sat.controller');
const {
  getUnits,
  getLessons,
  completeLesson,
  getLessonQuiz,
  submitLessonQuiz,
  createUnit,
  createSATLesson,
  addLessonQuiz,
  getUnitTest,
  submitUnitTest,
} = require('../controllers/satCourse.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { uploadCourse } = require('../config/cloudinary');

// GET questions SAT avec filtres
router.get('/questions', authenticate, getQuestions);

// GET questions ratées (mode erreurs)
router.get('/mistakes', authenticate, getMistakes);

// GET niveau actuel
router.get('/level', authenticate, getUserLevel);

// POST démarrer le test de niveau
router.post('/level/start', authenticate, startLevelTest);

// POST soumettre le test de niveau
router.post('/level/submit', authenticate, submitLevelTest);

// GET unités selon niveau étudiant
router.get('/units', authenticate, getUnits);

// GET leçons d'une unité
router.get('/units/:id/lessons', authenticate, getLessons);

// GET SAT Blanc d'une unité
router.get('/units/:id/test', authenticate, getUnitTest);

// POST soumettre le SAT Blanc
router.post('/units/:id/test/submit', authenticate, submitUnitTest);

// POST marquer une leçon comme terminée
router.post('/lessons/:id/complete', authenticate, completeLesson);

// GET quiz d'une leçon
router.get('/lessons/:id/quiz', authenticate, getLessonQuiz);

// POST soumettre le quiz d'une leçon
router.post('/lessons/:id/quiz/submit', authenticate, submitLessonQuiz);

// POST démarrer une session SAT
router.post('/sessions/start', authenticate, startSession);

// POST soumettre une session SAT
router.post('/sessions/:sessionId/submit', authenticate, submitSession);

// GET statistiques SAT
router.get('/stats', authenticate, getStats);

// GET progression SAT de tous les enfants d'un parent
router.get('/parent/:parentId/progress', authenticate, getParentSATProgress);

// GET progression SAT d'un utilisateur
router.get('/progress/:userId', authenticate, getSATProgress);

// GET scores par section SAT d'un utilisateur
router.get('/sections/:userId', authenticate, getSATSections);

// POST ajouter une question SAT (ADMIN seulement)
router.post('/questions', authenticate, authorize('ADMIN'), addSATQuestion);

// Routes ADMIN — unités et leçons SAT
router.post('/admin/units', authenticate, authorize('ADMIN'), createUnit);
router.post('/admin/lessons', authenticate, authorize('ADMIN'), createSATLesson);
router.post('/admin/lessons/:id/quiz', authenticate, authorize('ADMIN'), addLessonQuiz);

// POST upload PDF/Word/Vidéo pour une leçon SAT
router.post('/admin/lessons/:id/upload', authenticate, authorize('ADMIN', 'PROFESSOR'), uploadCourse.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier envoyé' });

    const { id } = req.params;
    const fileUrl = req.file.path;
    const mimetype = req.file.mimetype;

    const { SATLesson } = require('../models');
    const lesson = await SATLesson.findByPk(id);
    if (!lesson) return res.status(404).json({ message: 'Leçon non trouvée' });

    if (mimetype === 'application/pdf' || mimetype.includes('word')) {
      await lesson.update({ pdfUrl: fileUrl, type: 'PDF' });
    } else if (mimetype.startsWith('video/')) {
      await lesson.update({ videoUrl: fileUrl, type: 'VIDEO' });
    }

    return res.status(200).json({
      message: 'Fichier uploadé et leçon mise à jour !',
      url: fileUrl,
      type: lesson.type,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

module.exports = router;