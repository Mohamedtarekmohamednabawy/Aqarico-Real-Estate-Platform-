import express from 'express';
import { sendMessage, getChatHistory, resetChat, saveHistory } from '../controllers/chatController.js';
import protect from '../middleware/auth.js';
import { chatLimiter } from '../config/rateLimit.js';

const router = express.Router();

router.use(chatLimiter); // Apply to all chat routes

router.get('/', protect, getChatHistory);
router.post('/', protect, sendMessage);
router.post('/history', protect, saveHistory);
router.delete('/reset', protect, resetChat);

export default router;
