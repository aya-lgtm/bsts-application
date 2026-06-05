const express = require('express');
const router = express.Router();
const { uploadVideo, uploadPdf } = require('../controllers/upload.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const upload = require('../config/upload');

// POST /api/v1/upload/video
router.post(
  '/video',
  authenticate,
  authorize('ADMIN', 'PROFESSOR'),
  upload.single('video'),
  uploadVideo
);

// POST /api/v1/upload/pdf
router.post(
  '/pdf',
  authenticate,
  authorize('ADMIN', 'PROFESSOR'),
  upload.single('pdf'),
  uploadPdf
);

module.exports = router;