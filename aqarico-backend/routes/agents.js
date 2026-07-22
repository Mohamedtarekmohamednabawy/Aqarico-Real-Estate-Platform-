import express from 'express';
import { getAgents, getAgent, verifyAgent, updateAgent, searchAgentByPhone } from '../controllers/agentController.js';
import protect from '../middleware/auth.js';
import roles from '../middleware/roles.js';
import { sensitiveLimiter } from '../config/rateLimit.js';

const router = express.Router();

router.get('/', getAgents);
router.get('/verify-search/phone', sensitiveLimiter, searchAgentByPhone);
router.get('/:id', getAgent);
router.put('/:id/verify', protect, roles('admin'), verifyAgent);
router.put('/:id', protect, updateAgent);

export default router;
