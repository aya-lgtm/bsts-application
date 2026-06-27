const { ChapterQuiz, ChapterQuizQuestion, ChapterQuizResult, Lesson, Progress, Subject, Chapter, SubjectExam, SubjectExamQuestion, SubjectExamResult } = require('../models');

// GET quiz d'un chapitre
const getChapterQuiz = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const userId = req.user.id;

    const quiz = await ChapterQuiz.findOne({
      where: { chapterId, isActive: true },
      include: [{ model: ChapterQuizQuestion, attributes: { exclude: ['correctAnswer', 'explication'] }, order: [['ordre', 'ASC']] }],
    });

    if (!quiz) return res.status(404).json({ message: 'Aucun quiz pour ce chapitre' });

    // Vérifier si toutes les leçons sont complétées
    const totalLessons = await Lesson.count({ where: { chapterId, isActive: true } });
    const completedLessons = await Progress.count({ where: { userId, lessonId: { [require('sequelize').Op.ne]: null } } });
    const quizUnlocked = completedLessons >= totalLessons;

    return res.status(200).json({ quiz, quizUnlocked });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST créer un quiz de chapitre (ADMIN/PROFESSOR)
const createChapterQuiz = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { titre, description, dureeMinutes, passingScore, questions } = req.body;

    const quiz = await ChapterQuiz.create({ chapterId, titre, description, dureeMinutes, passingScore });

    if (questions && questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        await ChapterQuizQuestion.create({ ...questions[i], chapterQuizId: quiz.id, ordre: i + 1 });
      }
    }

    return res.status(201).json({ message: 'Quiz créé !', quiz });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST soumettre le quiz de chapitre
const submitChapterQuiz = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { reponses } = req.body;
    const userId = req.user.id;

    const quiz = await ChapterQuiz.findOne({
      where: { chapterId, isActive: true },
      include: [{ model: ChapterQuizQuestion }],
    });

    if (!quiz) return res.status(404).json({ message: 'Quiz non trouvé' });

    let correct = 0;
    const corrections = {};

    for (const q of quiz.ChapterQuizQuestions) {
      const isOk = reponses[q.id] === q.correctAnswer;
      if (isOk) correct++;
      corrections[q.id] = { reponseEleve: reponses[q.id], correctAnswer: q.correctAnswer, estCorrecte: isOk, explication: q.explication };
    }

    const total = quiz.ChapterQuizQuestions.length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = score >= quiz.passingScore;

    await ChapterQuizResult.create({ userId, chapterQuizId: quiz.id, score, totalQuestions: total, correctAnswers: correct, passed });

    return res.status(200).json({ score, correct, total, passed, passingScore: quiz.passingScore, corrections });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET mon résultat de quiz de chapitre
const getMyChapterQuizResult = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const userId = req.user.id;

    const quiz = await ChapterQuiz.findOne({ where: { chapterId, isActive: true } });
    if (!quiz) return res.status(404).json({ message: 'Quiz non trouvé' });

    const result = await ChapterQuizResult.findOne({
      where: { userId, chapterQuizId: quiz.id },
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({ result });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET examen d'une matière
const getSubjectExam = async (req, res) => {
  try {
    const { subjectId } = req.params;

    const exam = await SubjectExam.findOne({
      where: { subjectId, isActive: true },
      include: [{ model: SubjectExamQuestion, attributes: { exclude: ['correctAnswer', 'explication'] }, order: [['ordre', 'ASC']] }],
    });

    if (!exam) return res.status(404).json({ message: 'Aucun examen pour cette matière' });

    return res.status(200).json({ exam });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST créer un examen de matière (ADMIN/PROFESSOR)
const createSubjectExam = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { titre, description, dureeMinutes, passingScore, questions } = req.body;

    const exam = await SubjectExam.create({ subjectId, titre, description, dureeMinutes, passingScore });

    if (questions && questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        await SubjectExamQuestion.create({ ...questions[i], subjectExamId: exam.id, ordre: i + 1 });
      }
    }

    return res.status(201).json({ message: 'Examen créé !', exam });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST soumettre l'examen de matière
const submitSubjectExam = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { reponses } = req.body;
    const userId = req.user.id;

    const exam = await SubjectExam.findOne({
      where: { subjectId, isActive: true },
      include: [{ model: SubjectExamQuestion }],
    });

    if (!exam) return res.status(404).json({ message: 'Examen non trouvé' });

    let correct = 0;
    const corrections = {};

    for (const q of exam.SubjectExamQuestions) {
      const isOk = reponses[q.id] === q.correctAnswer;
      if (isOk) correct++;
      corrections[q.id] = { reponseEleve: reponses[q.id], correctAnswer: q.correctAnswer, estCorrecte: isOk, explication: q.explication };
    }

    const total = exam.SubjectExamQuestions.length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = score >= exam.passingScore;

    await SubjectExamResult.create({ userId, subjectExamId: exam.id, score, totalQuestions: total, correctAnswers: correct, passed });

    return res.status(200).json({ score, correct, total, passed, passingScore: exam.passingScore, corrections });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET mon résultat d'examen de matière
const getMySubjectExamResult = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const userId = req.user.id;

    const exam = await SubjectExam.findOne({ where: { subjectId, isActive: true } });
    if (!exam) return res.status(404).json({ message: 'Examen non trouvé' });

    const result = await SubjectExamResult.findOne({
      where: { userId, subjectExamId: exam.id },
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({ result });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET progression complète d'un étudiant pour une matière
const getSubjectProgress = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const userId = req.user.id;

    const chapters = await Chapter.findAll({ where: { subjectId, isActive: true } });

    const chaptersProgress = await Promise.all(chapters.map(async (ch) => {
      const totalLessons = await Lesson.count({ where: { chapterId: ch.id, isActive: true } });
      const completedLessons = await Progress.count({ where: { userId, isCompleted: true } });

      const quiz = await ChapterQuiz.findOne({ where: { chapterId: ch.id, isActive: true } });
      let quizPassed = false, quizScore = null;
      if (quiz) {
        const result = await ChapterQuizResult.findOne({ where: { userId, chapterQuizId: quiz.id, passed: true } });
        if (result) { quizPassed = true; quizScore = result.score; }
      }

      return { chapterId: ch.id, titre: ch.titre, totalLessons, completedLessons, hasQuiz: !!quiz, quizPassed, quizScore };
    }));

    const totalLessons = chaptersProgress.reduce((s, c) => s + c.totalLessons, 0);
    const completedLessons = chaptersProgress.reduce((s, c) => s + c.completedLessons, 0);
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    const exam = await SubjectExam.findOne({ where: { subjectId, isActive: true } });
    let examPassed = false, examScore = null;
    if (exam) {
      const result = await SubjectExamResult.findOne({ where: { userId, subjectExamId: exam.id, passed: true } });
      if (result) { examPassed = true; examScore = result.score; }
    }

    return res.status(200).json({ subjectId, totalLessons, completedLessons, progressPercent, chapters: chaptersProgress, hasExam: !!exam, examPassed, examScore });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

module.exports = {
  getChapterQuiz, createChapterQuiz, submitChapterQuiz, getMyChapterQuizResult,
  getSubjectExam, createSubjectExam, submitSubjectExam, getMySubjectExamResult,
  getSubjectProgress,
};