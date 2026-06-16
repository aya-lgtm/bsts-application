const { Subject, Chapter, Lesson, Progress } = require('../models');

// ── MATIÈRES ──

const getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.findAll({ where: { isActive: true } });
    return res.status(200).json({ subjects });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const createSubject = async (req, res) => {
  try {
    const { nom, description, icon, couleur } = req.body;
    const subject = await Subject.create({ nom, description, icon, couleur });
    return res.status(201).json({ message: 'Matière créée !', subject });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await Subject.findByPk(id);
    if (!subject) return res.status(404).json({ message: 'Matière non trouvée' });
    await subject.update(req.body);
    return res.status(200).json({ message: 'Matière mise à jour !', subject });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await Subject.findByPk(id);
    if (!subject) return res.status(404).json({ message: 'Matière non trouvée' });
    await subject.update({ isActive: false });
    return res.status(200).json({ message: 'Matière supprimée !' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ── CHAPITRES ──

const getChaptersBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const chapters = await Chapter.findAll({
      where: { subjectId, isActive: true },
      order: [['ordre', 'ASC']],
    });
    return res.status(200).json({ chapters });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const createChapter = async (req, res) => {
  try {
    const { titre, description, ordre, subjectId } = req.body;
    const chapter = await Chapter.create({ titre, description, ordre, subjectId });
    return res.status(201).json({ message: 'Chapitre créé !', chapter });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const updateChapter = async (req, res) => {
  try {
    const { id } = req.params;
    const chapter = await Chapter.findByPk(id);
    if (!chapter) return res.status(404).json({ message: 'Chapitre non trouvé' });
    await chapter.update(req.body);
    return res.status(200).json({ message: 'Chapitre mis à jour !', chapter });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const deleteChapter = async (req, res) => {
  try {
    const { id } = req.params;
    const chapter = await Chapter.findByPk(id);
    if (!chapter) return res.status(404).json({ message: 'Chapitre non trouvé' });
    await chapter.update({ isActive: false });
    return res.status(200).json({ message: 'Chapitre supprimé !' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ── LEÇONS ──

const getLessonsByChapter = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const lessons = await Lesson.findAll({
      where: { chapterId, isActive: true },
      order: [['ordre', 'ASC']],
    });
    return res.status(200).json({ lessons });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const getLessonById = async (req, res) => {
  try {
    const { id } = req.params;
    const lesson = await Lesson.findByPk(id);
    if (!lesson) return res.status(404).json({ message: 'Leçon non trouvée' });
    return res.status(200).json({ lesson });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const createLesson = async (req, res) => {
  try {
    const { titre, description, type, videoUrl, pdfUrl, duree, ordre, isFree, chapterId } = req.body;
    const lesson = await Lesson.create({ titre, description, type, videoUrl, pdfUrl, duree, ordre, isFree, chapterId });
    return res.status(201).json({ message: 'Leçon créée !', lesson });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const updateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const lesson = await Lesson.findByPk(id);
    if (!lesson) return res.status(404).json({ message: 'Leçon non trouvée' });
    await lesson.update(req.body);
    return res.status(200).json({ message: 'Leçon mise à jour !', lesson });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const lesson = await Lesson.findByPk(id);
    if (!lesson) return res.status(404).json({ message: 'Leçon non trouvée' });
    await lesson.update({ isActive: false });
    return res.status(200).json({ message: 'Leçon supprimée !' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ── PROGRESSION ──

const updateProgress = async (req, res) => {
  try {
    const { lessonId, watchedSeconds, isCompleted } = req.body;
    const userId = req.user.id;

    const [progress] = await Progress.upsert({
      userId,
      lessonId,
      watchedSeconds,
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
    });

    return res.status(200).json({ message: 'Progression mise à jour !', progress });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const getMyProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const progress = await Progress.findAll({
      where: { userId },
      include: [{ model: Lesson, attributes: ['titre', 'type'] }],
    });
    return res.status(200).json({ progress });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
// PATCH /lessons/:id/bookmark — ajouter/retirer un bookmark
const bookmarkLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const lesson = await Lesson.findByPk(id);
    if (!lesson) {
      return res.status(404).json({ message: 'Leçon non trouvée' });
    }

    // Trouver ou créer la progression
    const [progress] = await Progress.upsert({
      userId,
      lessonId: id,
      isBookmarked: true,
    }, {
      returning: true,
    });

    // Toggler le bookmark
    const currentBookmark = await Progress.findOne({ where: { userId, lessonId: id } });
    const newBookmarkState = !currentBookmark.isBookmarked;
    await currentBookmark.update({ isBookmarked: newBookmarkState });

    return res.status(200).json({
      message: newBookmarkState ? 'Leçon ajoutée aux favoris !' : 'Leçon retirée des favoris !',
      isBookmarked: newBookmarkState,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET /lessons/bookmarks — récupérer toutes les leçons bookmarkées
const getBookmarkedLessons = async (req, res) => {
  try {
    const userId = req.user.id;

    const bookmarks = await Progress.findAll({
      where: { userId, isBookmarked: true },
      include: [{ model: Lesson, include: [{ model: Chapter, include: [{ model: Subject }] }] }],
      order: [['updatedAt', 'DESC']],
    });

    const lessons = bookmarks.map(b => b.Lesson).filter(Boolean);

    return res.status(200).json({ lessons });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
// PATCH activer/désactiver une matière
const toggleSubjectActive = async (req, res) => {
  try {
    const { id } = req.params;

    const subject = await Subject.findByPk(id);
    if (!subject) {
      return res.status(404).json({ message: 'Matière non trouvée' });
    }

    await subject.update({ isActive: !subject.isActive });

    return res.status(200).json({
      message: subject.isActive ? 'Matière activée !' : 'Matière désactivée !',
      isActive: subject.isActive,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
module.exports = {
  getAllSubjects, createSubject, updateSubject, deleteSubject,
  getChaptersBySubject, createChapter, updateChapter, deleteChapter,
  getLessonsByChapter, getLessonById, createLesson, updateLesson, deleteLesson,
  updateProgress, getMyProgress, bookmarkLesson, getBookmarkedLessons,
  toggleSubjectActive,
};