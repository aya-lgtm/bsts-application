const { SATUnit, SATLesson, SATLessonQuiz, SATProgress, User, Gamification } = require('../models');
const { attribuerPoints } = require('./sat.controller');

// GET /sat/units — unités selon niveau étudiant
const getUnits = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId, { attributes: ['satLevel'] });
    const level = user?.satLevel || 'BEGINNER';
    const { domaine } = req.query;

    const where = { isActive: true, niveau: level };
    if (domaine) where.domaine = domaine;

    const units = await SATUnit.findAll({ where, order: [['ordre', 'ASC']] });

    const unitsWithProgress = await Promise.all(units.map(async (unit) => {
      const lessonsTotal = await SATLesson.count({ where: { unitId: unit.id, isActive: true } });
      const lessonsCompleted = await SATProgress.count({
        where: { userId, unitId: unit.id, type: 'LESSON', isCompleted: true },
      });
      return { ...unit.toJSON(), lessonsTotal, lessonsCompleted };
    }));

    return res.status(200).json({ units: unitsWithProgress });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET /sat/units/:id/lessons
const getLessons = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const lessons = await SATLesson.findAll({
      where: { unitId: id, isActive: true },
      order: [['ordre', 'ASC']],
    });

    const progress = await SATProgress.findAll({ where: { userId, unitId: id } });
    const progressMap = {};
    progress.forEach(p => { if (p.lessonId) progressMap[p.lessonId] = p; });

    return res.status(200).json({
      lessons: lessons.map(l => ({
        ...l.toJSON(),
        isCompleted: !!progressMap[l.id]?.isCompleted,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST /sat/lessons/:id/complete
const completeLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const lesson = await SATLesson.findByPk(id);
    if (!lesson) return res.status(404).json({ message: 'Leçon non trouvée' });

    await SATProgress.upsert({
      userId, lessonId: id, unitId: lesson.unitId,
      type: 'LESSON', isCompleted: true,
    });

    await attribuerPoints(userId, 10);
    return res.status(200).json({ message: 'Leçon complétée !' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET /sat/lessons/:id/quiz
const getLessonQuiz = async (req, res) => {
  try {
    const questions = await SATLessonQuiz.findAll({
      where: { lessonId: req.params.id },
      attributes: { exclude: ['bonneReponse', 'explication'] },
    });
    return res.status(200).json({ questions });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST /sat/lessons/:id/quiz/submit
const submitLessonQuiz = async (req, res) => {
  try {
    const { reponses } = req.body;
    const userId = req.user.id;

    const lesson = await SATLesson.findByPk(req.params.id);
    if (!lesson) return res.status(404).json({ message: 'Leçon non trouvée' });

    const questions = await SATLessonQuiz.findAll({ where: { lessonId: req.params.id } });

    let correct = 0;
    const corrections = {};
    questions.forEach(q => {
      const isOk = reponses[q.id] === q.bonneReponse;
      if (isOk) correct++;
      corrections[q.id] = {
        reponseEleve: reponses[q.id],
        bonneReponse: q.bonneReponse,
        estCorrecte: isOk,
        explication: q.explication,
      };
    });

    const score = Math.round((correct / questions.length) * 100);

    await SATProgress.upsert({
      userId, lessonId: lesson.id, unitId: lesson.unitId,
      type: 'QUIZ', isCompleted: score >= 60, score,
    });

    await attribuerPoints(userId, score >= 60 ? 30 : 10);

    return res.status(200).json({ score, correct, total: questions.length, corrections });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST /sat/admin/units — créer une unité (ADMIN)
const createUnit = async (req, res) => {
  try {
    const { titre, description, domaine, niveau, ordre } = req.body;
    const unit = await SATUnit.create({ titre, description, domaine, niveau, ordre });
    return res.status(201).json({ message: 'Unité créée !', unit });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST /sat/admin/lessons — créer une leçon (ADMIN)
const createSATLesson = async (req, res) => {
  try {
    const { unitId, titre, ordre, type, contenu, videoUrl, pdfUrl, dureeMinutes } = req.body;
    const lesson = await SATLesson.create({ unitId, titre, ordre, type, contenu, videoUrl, pdfUrl, dureeMinutes });
    return res.status(201).json({ message: 'Leçon créée !', lesson });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST /sat/admin/lessons/:id/quiz — ajouter une question (ADMIN)
const addLessonQuiz = async (req, res) => {
  try {
    const { enonce, choixA, choixB, choixC, choixD, bonneReponse, explication } = req.body;
    const question = await SATLessonQuiz.create({
      lessonId: req.params.id,
      enonce, choixA, choixB, choixC, choixD, bonneReponse, explication,
    });
    return res.status(201).json({ message: 'Question ajoutée !', question });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

module.exports = {
  getUnits, getLessons, completeLesson,
  getLessonQuiz, submitLessonQuiz,
  createUnit, createSATLesson, addLessonQuiz,
};