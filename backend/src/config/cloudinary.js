const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage pour les vidéos, PDFs et Word des cours
const courseStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPDF = file.mimetype === 'application/pdf';
    const isWord = file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                   file.mimetype === 'application/msword';
    return {
      folder: 'bsts/courses',
      resource_type: 'raw',
      format: isPDF ? 'pdf' : isWord ? 'docx' : undefined,
    };
  },
});

const uploadCourse = multer({
  storage: courseStorage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4', 'video/mkv', 'video/quicktime',
    ];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Type non autorisé'));
  },
});

// Storage pour les fichiers du chat
const chatStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPDF = file.mimetype === 'application/pdf';
    const isVideo = file.mimetype.startsWith('video/');
    const isAudio = file.mimetype.startsWith('audio/');

    let resource_type = 'image';
    if (isPDF) resource_type = 'raw';
    else if (isVideo) resource_type = 'video';
    else if (isAudio) resource_type = 'video';

    return {
      folder: 'bsts/chat',
      resource_type,
    };
  },
});

const uploadChat = multer({
  storage: chatStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
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