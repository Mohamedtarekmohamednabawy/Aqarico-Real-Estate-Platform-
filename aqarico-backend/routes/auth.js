import express from 'express';
import { register, login, getMe, verify2FA, resend2FA, getDevices, revokeDevice, forgotPassword, resetPassword, checkIdentifier } from '../controllers/authController.js';
import protect from '../middleware/auth.js';
import { authLimiter, sensitiveLimiter } from '../config/rateLimit.js';
import validate from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../utils/validators.js';

const router = express.Router();

router.post('/register', authLimiter, registerSchema, validate, register);
router.post('/login', authLimiter, loginSchema, validate, login);
router.post('/verify-2fa', authLimiter, verify2FA);
router.post('/resend-2fa', sensitiveLimiter, resend2FA);

router.post('/check-identifier', sensitiveLimiter, checkIdentifier);
router.post('/forgot-password', sensitiveLimiter, forgotPassword);
router.post('/reset-password', sensitiveLimiter, resetPassword);

router.get('/me', protect, getMe);
router.get('/devices', protect, getDevices);
router.delete('/devices/:deviceId', protect, revokeDevice);

export default router;
