import express from 'express';
import {
  createPaymentIntent,
  confirmBooking,
  getMyBookings,
  getAllBookings,
  cancelBooking,
} from '../controllers/bookingController.js';
import protect from '../middleware/auth.js';
import roles from '../middleware/roles.js';
import validate from '../middleware/validate.js';
import { bookingSchema } from '../utils/validators.js';

const router = express.Router();

router.post('/create-payment-intent', protect, createPaymentIntent);
router.post('/confirm', protect, bookingSchema, validate, confirmBooking);
router.get('/my', protect, getMyBookings);
router.get('/', protect, roles('admin'), getAllBookings);
router.put('/:id/cancel', protect, cancelBooking);

export default router;
