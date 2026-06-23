const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage pour les vidéos et PDFs des cours
const courseStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPDF = file.mimetype === 'application/pdf';
    return {
      folder: 'bsts/courses',
      resource_type: isPDF ? 'raw' : 'video',
      format: isPDF ? 'pdf' : undefined,
    };
  },
});

// Storage pour les fichiers du chat (images/PDFs/vidéos/audios)
const chatStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPDF = file.mimetype === 'application/pdf';
    const isVideo = file.mimetype.startsWith('video/');
    const isAudio = file.mimetype.startsWith('audio/');

    let resource_type = 'image';
    if (isPDF) resource_type = 'raw';
    else if (isVideo) resource_type = 'video';
    else if (isAudio) resource_type = 'video'; // Cloudinary gère l'audio comme vidéo

    return {
      folder: 'bsts/chat',
      resource_type,
    };
  },
});

const uploadCourse = multer({
  storage: courseStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 Mo
});

const uploadChat = multer({
  storage: chatStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 Mo
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/avi',
      'audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-m4a',
      'application/pdf',
    ];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Type non autorisé'));
  },
});

module.exports = { cloudinary, uploadCourse, uploadChat };