import Booking from '../models/Booking.js';
import Property from '../models/Property.js';
import stripe from '../utils/stripe.js';

/**
 * @desc    Create Stripe PaymentIntent
 * @route   POST /api/bookings/create-payment-intent
 * @access  Private
 */
export const createPaymentIntent = async (req, res, next) => {
  try {
    const { propertyId } = req.body;

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
      });
    }

    if (property.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'This property is no longer available',
      });
    }

    // Amount in piastres (EGP × 100)
    const amountInPiastres = Math.round(property.price * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPiastres,
      currency: 'egp',
      metadata: {
        propertyId: property._id.toString(),
        buyerId: req.user._id.toString(),
      },
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Confirm booking after successful payment
 * @route   POST /api/bookings/confirm
 * @access  Private
 */
export const confirmBooking = async (req, res, next) => {
  const session = await Booking.startSession();
  session.startTransaction();

  try {
    const { propertyId, stripePaymentIntentId } = req.body;

    // 1. Idempotency Check: Prevent duplicate bookings for the same payment
    const existingBooking = await Booking.findOne({ stripePaymentIntentId }).session(session);
    if (existingBooking) {
      await session.abortTransaction();
      return res.status(200).json({
        success: true,
        data: existingBooking,
        message: 'Booking already confirmed',
      });
    }

    const property = await Property.findById(propertyId).session(session);
    if (!property) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // 2. Double-check availability inside transaction
    if (property.status !== 'available') {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Property is no longer available' });
    }

    // Verify payment intent with Stripe
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
    } catch (stripeError) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Invalid payment intent' });
    }

    // 3. Create booking record inside session
    const booking = await Booking.create([{
      property: propertyId,
      buyer: req.user._id,
      amount: property.price,
      stripePaymentIntentId,
      stripeStatus: paymentIntent.status,
      status: paymentIntent.status === 'succeeded' ? 'confirmed' : 'pending',
    }], { session });

    // 4. Update property status atomically
    if (paymentIntent.status === 'succeeded') {
      property.status = 'booked';
      await property.save({ session });
    }

    await session.commitTransaction();
    res.status(201).json({
      success: true,
      data: booking[0],
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Get current user's bookings
 * @route   GET /api/bookings/my
 * @access  Private
 */
export const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ buyer: req.user._id })
      .populate('property')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all bookings (admin)
 * @route   GET /api/bookings
 * @access  Admin
 */
export const getAllBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate('property')
      .populate('buyer', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel a booking
 * @route   PUT /api/bookings/:id/cancel
 * @access  Booking owner or Admin
 */
export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check if user owns the booking or is admin
    if (booking.buyer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking',
      });
    }

    booking.status = 'cancelled';
    await booking.save();

    // Reset property status to available
    await Property.findByIdAndUpdate(booking.property, { status: 'available' });

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};
