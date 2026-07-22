import { validationResult } from 'express-validator';

/**
 * Middleware to handle validation errors from express-validator
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: errors.array()[0].msg, // Return the first error message
            errors: errors.array(),
        });
    }
    next();
};

export default validate;
