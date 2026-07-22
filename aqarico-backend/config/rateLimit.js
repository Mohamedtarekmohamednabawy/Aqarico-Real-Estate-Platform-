import rateLimit from 'express-rate-limit';

/**
 * Standard Rate Limiter configuration
 */

// Global limiter: 800 requests per 15 minutes
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 800,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Authentication limiter (Login, Register, Password Reset): 30 requests per 15 minutes
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again after 15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Sensitive actions (Verification codes, Request resets): 15 requests per 5 minutes
export const sensitiveLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 15,
    message: {
        success: false,
        message: 'Too many attempts for this action, please try again after 5 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Chat limiter: 60 messages per 15 minutes
export const chatLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    message: {
        success: false,
        message: 'Chat limit reached, please take a break!',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
