import express from 'express';
import { getMarketAnalytics, getDashboard } from '../controllers/analyticsController.js';
import protect from '../middleware/auth.js';
import roles from '../middleware/roles.js';

const router = express.Router();

router.get('/market', getMarketAnalytics);
router.get('/dashboard', protect, roles('admin'), getDashboard);

export default router;
