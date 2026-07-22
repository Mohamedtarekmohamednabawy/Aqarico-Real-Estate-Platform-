import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Protect routes — verifies JWT and attaches user to req.user
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized — no token provided',
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach full user (minus password) to request
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — user no longer exists',
      });
    }

    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated',
      });
    }

    // Check if the device is still trusted (if deviceId is in token)
    if (decoded.deviceId) {
      const isTrusted = req.user.trustedDevices.some(d => d.deviceId === decoded.deviceId);
      if (!isTrusted) {
        console.log(`[AUTH DEBUG] Blocked request — Device ${decoded.deviceId} is no longer trusted for User ${req.user.email}`);
        return res.status(401).json({
          success: false,
          message: 'This device is no longer trusted. Please log in again.',
        });
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized — invalid token',
    });
  }
};

/**
 * Optional identification — attaches user to req.user if token exists,
 * but allows guest access if no token or invalid.
 */
export const optionalProtect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    next();
  } catch (error) {
    // If token invalid, just proceed as guest
    next();
  }
};

export default protect;
