const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  getAllUsers,
  getUsersByRole,
  deleteUser,
  createUserByAdmin,
  getMyChildren,
  linkChild,
  unlinkChild,
  changePassword,
  getParentChildrenStats,
  getParentChildrenActivity,
} = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);
router.get('/my-children', authenticate, authorize('PARENT'), getMyChildren);
router.post('/link-child', authenticate, authorize('PARENT'), linkChild);
router.delete('/unlink-child/:childId', authenticate, authorize('PARENT'), unlinkChild);
router.get('/:parentId/children', authenticate, getParentChildrenStats);
router.get('/:parentId/activity', authenticate, getParentChildrenActivity);
router.get('/', authenticate, authorize('ADMIN'), getAllUsers);
router.get('/role/:role', authenticate, authorize('ADMIN'), getUsersByRole);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteUser);
router.post('/create-user', authenticate, authorize('ADMIN'), createUserByAdmin);

module.exports = router;