import express from 'express';
import {
  getAllUsers,
  getUser,
  updateUserAdmin,
  deleteUserAdmin,
  batchDeleteUsersAdmin,
  updateProfile,
  updateAvatar,
  updatePassword,
  deleteAccount,
  promoteToAdmin,
  updateSettings,
} from '../controllers/userController.js';
import protect from '../middleware/auth.js';
import roles from '../middleware/roles.js';
import { sensitiveLimiter } from '../config/rateLimit.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// Self-service routes (must be before /:id to avoid conflicts)
router.put('/profile', protect, sensitiveLimiter, updateProfile);
router.put('/profile/avatar', protect, upload.single('avatar'), updateAvatar);
router.put('/password', protect, updatePassword);
router.delete('/account', protect, deleteAccount);
router.put('/settings', protect, updateSettings);


// Admin routes
router.get('/', protect, roles('admin'), getAllUsers);
router.post('/batch-delete', protect, roles('admin'), batchDeleteUsersAdmin);
router.get('/:id', protect, roles('admin'), getUser);

router.put('/:id', protect, roles('admin'), updateUserAdmin);
router.delete('/:id', protect, roles('admin'), deleteUserAdmin);
router.put('/:id/promote', protect, roles('admin'), promoteToAdmin);

export default router;