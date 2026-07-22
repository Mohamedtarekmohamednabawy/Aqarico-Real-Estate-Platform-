import { body } from 'express-validator';

export const registerSchema = [
    body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('firstName').notEmpty().withMessage('First name is required').trim().escape(),
    body('lastName').notEmpty().withMessage('Last name is required').trim().escape(),
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters long').trim().escape(),
    body('phone').notEmpty().withMessage('Phone number is required'),
];

export const loginSchema = [
    body('loginIdentifier').notEmpty().withMessage('Email or username is required').trim(),
    body('password').notEmpty().withMessage('Password is required'),
];

export const propertySchema = [
    body('title').notEmpty().withMessage('Title is required').isLength({ max: 50 }).withMessage('Title cannot exceed 50 characters').trim().escape(),
    body('price').isNumeric().withMessage('Price must be a number'),
    body('type').isIn(['sale', 'rent']).withMessage('Type must be sale or rent'),
    body('area').isNumeric().withMessage('Area must be a number'),
    body('bedrooms').isInt({ min: 0 }).withMessage('Bedrooms must be a positive integer'),
    body('bathrooms').isInt({ min: 0 }).withMessage('Bathrooms must be a positive integer'),
    body('location').notEmpty().withMessage('Location is required').trim().escape(),
];

export const bookingSchema = [
    body('propertyId').isMongoId().withMessage('Invalid property ID'),
    body('stripePaymentIntentId').notEmpty().withMessage('Payment intent ID is required'),
];
