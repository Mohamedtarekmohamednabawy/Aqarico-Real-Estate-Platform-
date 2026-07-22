import express from 'express';
import { predictPrice } from '../controllers/predictController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, predictPrice);

export default router;
