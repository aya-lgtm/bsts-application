const { SATUnit, SATLesson, SATLessonQuiz, SATProgress, User } = require('../models');
const { attribuerPoints } = require('./sat.controller');

// GET /sat/units — unités selon niveau étudiant
const getUnits = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId, { attributes: ['satLevel'] });
    const level = user?.satLevel || 'BEGINNER';
    const { domaine } = req.query;

    const where = { isActive: true, niveau: level };
    if (domaine && domaine !== 'ALL') where.domaine = domaine;

    const units = await SATUnit.findAll({ where, order: [['ordre', 'ASC']] });

    const unitsWithProgress = await Promise.all(units.map(async (unit) => {
      const lessonsTotal = await SATLesson.count({
        where: { unitId: unit.id, isActive: true },
      });

      const lessonsCompleted = await SATProgress.count({
        where: {
          userId,
          unitId: unit.id,
          type: 'LESSON', // IMPORTANT : seulement LESSON, pas QUIZ
          isCompleted: true,
        },
      });

      // Sécurité : ne jamais dépasser le total
      const safeLessonsCompleted = Math.min(lessonsCompleted, lessonsTotal);

      return {
        ...unit.toJSON(),
        lessonsTotal,
        lessonsCompleted: safeLessonsCompleted,
      };
    }));

    return res.json({ units: unitsWithProgress });
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

    const progress = await SATProgress.findAll({
      where: { userId, unitId: id },
    });

    const progressMap = {};
    progress.forEach(p => {
      if (!p.lessonId) return;
      if (!progressMap[p.lessonId]) {
        progressMap[p.lessonId] = { lessonDone: false, quizPassed: false };
      }
      if (p.type === 'LESSON' && p.isCompleted) progressMap[p.lessonId].lessonDone = true;
      if (p.type === 'QUIZ' && p.quizPassed) progressMap[p.lessonId].quizPassed = true;
    });

    const lessonsWithStatus = lessons.map((lesson, index) => {
      const prog = progressMap[lesson.id] || { lessonDone: false, quizPassed: false };

      let isUnlocked = false;
      if (index === 0) {
        isUnlocked = true;
      } else {
        const prevLesson = lessons[index - 1];
        const prevProg = progressMap[prevLesson.id] || { lessonDone: false, quizPassed: false };
        isUnlocked = prevProg.lessonDone && prevProg.quizPassed;
      }

      return {
        ...lesson.toJSON(),
        isCompleted: prog.lessonDone,
        quizPassed: prog.quizPassed,
        isUnlocked,
      };
    });

    return res.json({ lessons: lessonsWithStatus });
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

    const existing = await SATProgress.findOne({
      where: { userId, lessonId: id, type: 'LESSON' },
    });

    if (!existing) {
      await SATProgress.create({
        userId, lessonId: id, unitId: lesson.unitId,
        type: 'LESSON', isCompleted: true,
      });
    } else {
      await existing.update({ isCompleted: true });
    }

    await attribuerPoints(userId, 10);

    const quizProgress = await SATProgress.findOne({
      where: { userId, lessonId: id, type: 'QUIZ' },
    });

    return res.json({
      message: 'Leçon complétée ! +10 XP',
      quizAlreadyDone: quizProgress?.quizPassed || false,
    });
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
    return res.json({ questions });
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
    const passingScore = lesson.passingScore || 60; // Score défini par le prof
    const passed = score >= passingScore;

    const existing = await SATProgress.findOne({
      where: { userId, lessonId: lesson.id, type: 'QUIZ' },
    });

    if (!existing) {
      await SATProgress.create({
        userId, lessonId: lesson.id, unitId: lesson.unitId,
        type: 'QUIZ', isCompleted: passed, score, quizPassed: passed,
      });
    } else {
      const bestScore = Math.max(existing.score || 0, score);
      const bestPassed = existing.quizPassed || passed;
      await existing.update({ score: bestScore, isCompleted: bestPassed, quizPassed: bestPassed });
    }

    await attribuerPoints(userId, passed ? 30 : 10);

    return res.json({
      score, correct,
      total: questions.length,
      corrections, passed,
      scoreRequis: passingScore,
      nextLessonUnlocked: passed,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET /sat/units/:id/test — SAT Blanc
const getUnitTest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const unit = await SATUnit.findByPk(id);
    if (!unit) return res.status(404).json({ message: 'Unité non trouvée' });

    const totalLessons = await SATLesson.count({ where: { unitId: id, isActive: true } });
    const completedLessons = await SATProgress.count({
      where: { userId, unitId: id, type: 'LESSON', isCompleted: true },
    });

    if (completedLessons < totalLessons) {
      return res.status(403).json({
        message: 'Terminez toutes les leçons avant de passer le SAT Blanc',
        completed: completedLessons,
        total: totalLessons,
      });
    }

    const lessons = await SATLesson.findAll({ where: { unitId: id, isActive: true } });
    const lessonIds = lessons.map(l => l.id);

    const questions = await SATLessonQuiz.findAll({
      where: { lessonId: lessonIds },
      attributes: { exclude: ['bonneReponse', 'explication'] },
    });

    return res.json({ unit, questions, dureeMinutes: 25, totalQuestions: questions.length });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST /sat/units/:id/test/submit — soumettre le SAT Blanc
const submitUnitTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reponses } = req.body;
    const userId = req.user.id;

    const unit = await SATUnit.findByPk(id);
    if (!unit) return res.status(404).json({ message: 'Unité non trouvée' });

    const lessons = await SATLesson.findAll({ where: { unitId: id, isActive: true } });
    const lessonIds = lessons.map(l => l.id);
    const questions = await SATLessonQuiz.findAll({ where: { lessonId: lessonIds } });

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
    const scoreSAT = Math.round(400 + (score / 100) * 1200);

    await SATProgress.upsert({
      userId, unitId: id,
      type: 'UNIT_TEST', isCompleted: score >= 60, score, scoreSAT,
    });

    await attribuerPoints(userId, score >= 60 ? 100 : 30);

    return res.json({ score, scoreSAT, correct, total: questions.length, isPassed: score >= 60, corrections });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST /sat/admin/units
const createUnit = async (req, res) => {
  try {
    const { titre, description, domaine, niveau, ordre } = req.body;
    const unit = await SATUnit.create({ titre, description, domaine, niveau, ordre: ordre || 0 });
    return res.status(201).json({ message: 'Unité créée !', unit });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST /sat/admin/lessons
const createSATLesson = async (req, res) => {
  try {
    const { unitId, titre, ordre, type, contenu, videoUrl, pdfUrl, dureeMinutes, passingScore } = req.body;
    const lesson = await SATLesson.create({
      unitId, titre, ordre: ordre || 0, type,
      contenu, videoUrl, pdfUrl, dureeMinutes,
      passingScore: passingScore || 60,
    });
    return res.status(201).json({ message: 'Leçon créée !', lesson });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST /sat/admin/lessons/:id/quiz
const addLessonQuiz = async (req, res) => {
  try {
    const { questions } = req.body;
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Aucune question fournie' });
    }

    const created = [];
    for (const q of questions) {
      const question = await SATLessonQuiz.create({
        lessonId: req.params.id,
        enonce: q.enonce, choixA: q.choixA, choixB: q.choixB,
        choixC: q.choixC, choixD: q.choixD,
        bonneReponse: q.bonneReponse, explication: q.explication,
      });
      created.push(question);
    }

    return res.status(201).json({ message: `${created.length} question(s) ajoutée(s) !`, questions: created });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

module.exports = {
  getUnits, getLessons, completeLesson,
  getLessonQuiz, submitLessonQuiz,
  createUnit, createSATLesson, addLessonQuiz,
  getUnitTest, submitUnitTest,
};