import express from 'express';
import {
  getProperties,
  getMyProperties,
  getMapPins,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  batchDeleteProperties,
  verifyProperty,
  toggleFeatureProperty,
  compareProperties,
  getMarketStats,
  getLocationStats,
} from '../controllers/propertyController.js';
import protect, { optionalProtect } from '../middleware/auth.js';
import roles from '../middleware/roles.js';
import { sensitiveLimiter } from '../config/rateLimit.js';
import validate from '../middleware/validate.js';
import { propertySchema } from '../utils/validators.js';
import path from 'path';
import multer from 'multer';

// Multer memory storage for Cloudinary uploads (buffer required)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const router = express.Router();

// Public routes
router.get('/', getProperties);
router.get('/map/pins', getMapPins);
router.get('/stats/market', getMarketStats);
router.get('/stats/location/:name', getLocationStats);
router.post('/compare', compareProperties);

// Auth required
router.get('/my', protect, getMyProperties);
router.post('/batch-delete', protect, batchDeleteProperties);
router.post('/', protect, sensitiveLimiter, upload.array('images', 10), propertySchema, validate, createProperty);

// Single property (public, but identifies user if logged in)
router.get('/:id', optionalProtect, getProperty);

// Owner or Admin
router.put('/:id', protect, sensitiveLimiter, upload.array('images', 10), propertySchema, validate, updateProperty);
router.delete('/:id', protect, deleteProperty);

// Admin only
router.put('/:id/verify', protect, roles('admin'), verifyProperty);
router.put('/:id/feature', protect, roles('admin'), toggleFeatureProperty);

export default router;
