import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true,
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  stripePaymentIntentId: {
    type: String,
    unique: true,
    sparse: true,
  },
  stripeStatus: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for common queries
bookingSchema.index({ property: 1, status: 1 });
bookingSchema.index({ buyer: 1 });

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
