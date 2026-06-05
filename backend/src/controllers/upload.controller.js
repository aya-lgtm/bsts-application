const path = require('path');

// Upload vidéo
const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier vidéo fourni' });
    }

    const videoUrl = `${req.protocol}://${req.get('host')}/uploads/videos/${req.file.filename}`;

    return res.status(200).json({
      message: 'Vidéo uploadée avec succès !',
      videoUrl,
      filename: req.file.filename,
      size: req.file.size,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Upload PDF
const uploadPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier PDF fourni' });
    }

    const pdfUrl = `${req.protocol}://${req.get('host')}/uploads/pdfs/${req.file.filename}`;

    return res.status(200).json({
      message: 'PDF uploadé avec succès !',
      pdfUrl,
      filename: req.file.filename,
      size: req.file.size,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

module.exports = { uploadVideo, uploadPdf };