const express = require('express');
const router = express.Router();
const {
  getAllSubjects, createSubject, updateSubject, deleteSubject,
  getChaptersBySubject, createChapter, updateChapter, deleteChapter,
  getLessonsByChapter, getLessonById, createLesson, updateLesson, deleteLesson,
  updateProgress, getMyProgress, bookmarkLesson, getBookmarkedLessons,
} = require('../controllers/course.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// ── MATIÈRES ──
router.get('/subjects', authenticate, getAllSubjects);
router.post('/subjects', authenticate, authorize('ADMIN', 'PROFESSOR'), createSubject);
router.put('/subjects/:id', authenticate, authorize('ADMIN', 'PROFESSOR'), updateSubject);
router.delete('/subjects/:id', authenticate, authorize('ADMIN'), deleteSubject);

// ── CHAPITRES ──
router.get('/subjects/:subjectId/chapters', authenticate, getChaptersBySubject);
router.post('/chapters', authenticate, authorize('ADMIN', 'PROFESSOR'), createChapter);
router.put('/chapters/:id', authenticate, authorize('ADMIN', 'PROFESSOR'), updateChapter);
router.delete('/chapters/:id', authenticate, authorize('ADMIN'), deleteChapter);

// ── LEÇONS ──
router.get('/chapters/:chapterId/lessons', authenticate, getLessonsByChapter);
router.get('/lessons/bookmarks', authenticate, getBookmarkedLessons);
router.get('/lessons/:id', authenticate, getLessonById);
router.post('/lessons', authenticate, authorize('ADMIN', 'PROFESSOR'), createLesson);
router.put('/lessons/:id', authenticate, authorize('ADMIN', 'PROFESSOR'), updateLesson);
router.delete('/lessons/:id', authenticate, authorize('ADMIN'), deleteLesson);
router.patch('/lessons/:id/bookmark', authenticate, bookmarkLesson);

// ── PROGRESSION ──
router.post('/progress', authenticate, updateProgress);
router.get('/progress/me', authenticate, getMyProgress);

module.exports = router;