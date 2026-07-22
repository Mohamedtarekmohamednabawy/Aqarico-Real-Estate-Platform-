import jwt from 'jsonwebtoken';

/**
 * Generate a JWT token
 * @param {Object} user - User document from MongoDB
 * @returns {string} JWT token
 */
const generateToken = (user, deviceId = null) => {
  const payload = { id: user._id, role: user.role };
  if (deviceId) payload.deviceId = deviceId;

  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

export default generateToken;
