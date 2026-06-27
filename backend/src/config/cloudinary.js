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
    const isVideo = file.mimetype.startsWith('video/');
    return {
      folder: 'bsts/courses',
      resource_type: isVideo ? 'video' : 'raw',
      format: isPDF ? 'pdf' : isWord ? 'docx' : undefined,
    };
  },
});

const uploadCourse = multer({
  storage: courseStorage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, true); // Accepter tous les types
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
    cb(null, true); // Accepter tous les types
  },
});

module.exports = { cloudinary, uploadCourse, uploadChat };