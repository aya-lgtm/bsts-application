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
  searchUsers,
  sendLinkRequest,
  getMyLinkRequests,
  respondToLinkRequest,
  getProfessorStats,
} = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/search', authenticate, searchUsers);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);
router.get('/professor/stats', authenticate, authorize('PROFESSOR'), getProfessorStats);
router.get('/my-children', authenticate, authorize('PARENT'), getMyChildren);
router.post('/link-child', authenticate, authorize('PARENT'), linkChild);
router.delete('/unlink-child/:childId', authenticate, authorize('PARENT'), unlinkChild);
router.get('/link-requests/my-requests', authenticate, authorize('STUDENT'), getMyLinkRequests);
router.put('/link-requests/:requestId/respond', authenticate, authorize('STUDENT'), respondToLinkRequest);
router.get('/:parentId/children', authenticate, getParentChildrenStats);
router.get('/:parentId/activity', authenticate, getParentChildrenActivity);
router.post('/:parentId/link-request', authenticate, authorize('PARENT'), sendLinkRequest);
router.get('/', authenticate, authorize('ADMIN'), getAllUsers);
router.get('/role/:role', authenticate, authorize('ADMIN'), getUsersByRole);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteUser);
router.post('/create-user', authenticate, authorize('ADMIN'), createUserByAdmin);

module.exports = router;