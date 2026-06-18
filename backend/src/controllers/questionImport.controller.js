const xlsx = require('xlsx');
const { Question, Quiz } = require('../models');

// POST importer des questions depuis un fichier Excel
const importQuestionsFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier Excel envoyé' });
    }

    const { quizId } = req.params;

    // Vérifier que le quiz existe et appartient au prof
    const quiz = await Quiz.findOne({
      where: { id: quizId, createdBy: req.user.id },
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz non trouvé ou accès refusé' });
    }

    // Lire le fichier Excel
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Le fichier Excel est vide' });
    }

    // Créer les questions
    const questions = [];
    let ordre = 1;

    for (const row of rows) {
      // Colonnes attendues : enonce, choixA, choixB, choixC, choixD, bonneReponse, explication
      if (!row.enonce || !row.bonneReponse) continue;

      const question = await Question.create({
        quizId,
        enonce: row.enonce,
        choixA: row.choixA || '',
        choixB: row.choixB || '',
        choixC: row.choixC || '',
        choixD: row.choixD || '',
        bonneReponse: row.bonneReponse,
        explication: row.explication || '',
        ordre: ordre++,
      });

      questions.push(question);
    }

    return res.status(201).json({
      message: `${questions.length} question(s) importée(s) avec succès !`,
      total: questions.length,
      questions,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

module.exports = { importQuestionsFromExcel };