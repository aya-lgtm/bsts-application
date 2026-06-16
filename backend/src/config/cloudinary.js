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

// Storage pour les images/PDFs du chat
const chatStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPDF = file.mimetype === 'application/pdf';
    return {
      folder: 'bsts/chat',
      resource_type: isPDF ? 'raw' : 'image',
    };
  },
});

const uploadCourse = multer({
  storage: courseStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 Mo
});

const uploadChat = multer({
  storage: chatStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo
});

module.exports = { cloudinary, uploadCourse, uploadChat };