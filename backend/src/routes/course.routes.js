const express = require('express');
const router = express.Router();
const {
  getAllSubjects, createSubject, updateSubject, deleteSubject,
  getChaptersBySubject, createChapter, updateChapter, deleteChapter,
  getLessonsByChapter, getLessonById, createLesson, updateLesson, deleteLesson,
  updateProgress, getMyProgress, bookmarkLesson, getBookmarkedLessons,
  toggleSubjectActive,
} = require('../controllers/course.controller');
const {
  getChapterQuiz, createChapterQuiz, submitChapterQuiz, getMyChapterQuizResult,
  getSubjectExam, createSubjectExam, submitSubjectExam, getMySubjectExamResult,
  getSubjectProgress,
} = require('../controllers/chapterQuiz.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { uploadCourse } = require('../config/cloudinary');

// ── MATIÈRES ──
router.get('/subjects', authenticate, getAllSubjects);
router.post('/subjects', authenticate, authorize('ADMIN', 'PROFESSOR'), createSubject);
router.put('/subjects/:id', authenticate, authorize('ADMIN', 'PROFESSOR'), updateSubject);
router.delete('/subjects/:id', authenticate, authorize('ADMIN', 'PROFESSOR'), deleteSubject);
router.patch('/subjects/:id/toggle', authenticate, authorize('ADMIN', 'PROFESSOR'), toggleSubjectActive);

// ── EXAMENS DE MATIÈRE ──
router.get('/subjects/:subjectId/exam', authenticate, getSubjectExam);
router.post('/subjects/:subjectId/exam', authenticate, authorize('ADMIN', 'PROFESSOR'), createSubjectExam);
router.post('/subjects/:subjectId/exam/submit', authenticate, submitSubjectExam);
router.get('/subjects/:subjectId/exam/result/me', authenticate, getMySubjectExamResult);
router.get('/subjects/:subjectId/progress/me', authenticate, getSubjectProgress);

// ── CHAPITRES ──
router.get('/subjects/:subjectId/chapters', authenticate, getChaptersBySubject);
router.post('/chapters', authenticate, authorize('ADMIN', 'PROFESSOR'), createChapter);
router.put('/chapters/:id', authenticate, authorize('ADMIN', 'PROFESSOR'), updateChapter);
router.delete('/chapters/:id', authenticate, authorize('ADMIN', 'PROFESSOR'), deleteChapter);

// ── QUIZ DE CHAPITRE ──
router.get('/chapters/:chapterId/quiz', authenticate, getChapterQuiz);
router.post('/chapters/:chapterId/quiz', authenticate, authorize('ADMIN', 'PROFESSOR'), createChapterQuiz);
router.post('/chapters/:chapterId/quiz/submit', authenticate, submitChapterQuiz);
router.get('/chapters/:chapterId/quiz/result/me', authenticate, getMyChapterQuizResult);

// ── UPLOAD (vidéo ou PDF pour les leçons) ──
router.post('/upload', authenticate, authorize('ADMIN', 'PROFESSOR'), uploadCourse.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier envoyé' });
    const fileUrl = req.file.path;
    return res.status(200).json({ message: 'Fichier uploadé !', url: fileUrl, filename: req.file.filename });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// ── LEÇONS ──
router.get('/chapters/:chapterId/lessons', authenticate, getLessonsByChapter);
router.get('/lessons/bookmarks', authenticate, getBookmarkedLessons);
router.get('/lessons/:id', authenticate, getLessonById);
router.post('/lessons', authenticate, authorize('ADMIN', 'PROFESSOR'), createLesson);
router.put('/lessons/:id', authenticate, authorize('ADMIN', 'PROFESSOR'), updateLesson);
router.delete('/lessons/:id', authenticate, authorize('ADMIN', 'PROFESSOR'), deleteLesson);
router.patch('/lessons/:id/bookmark', authenticate, bookmarkLesson);

// ── PROGRESSION ──
router.post('/progress', authenticate, updateProgress);
router.get('/progress/me', authenticate, getMyProgress);

module.exports = router;