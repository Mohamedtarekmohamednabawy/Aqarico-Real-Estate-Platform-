import User from '../models/User.js';
import Agent from '../models/Agent.js';
import generateToken from '../utils/generateToken.js';
import { sendEmailCode, sendWhatsAppCode } from '../utils/notification.js';
import crypto from 'crypto';
import { escapeRegex } from '../utils/regexUtils.js';

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { firstName, lastName, username, email, password, phone, country } = req.body;

    // Validate username format (simple check)
    if (username && username.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters long.',
      });
    }

    // Check if user already exists (case-insensitive check for email and username)
    const escapedUsername = escapeRegex(username);
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: { $regex: new RegExp(`^${escapedUsername}$`, "i") } }
      ]
    });
    if (existingUser) {
      const isEmailConflict = existingUser.email === email.toLowerCase();
      return res.status(400).json({
        success: false,
        message: isEmailConflict ? 'This email is already registered.' : 'This username is already taken.',
      });
    }

    // Check phone number usage (limit to 2 accounts)
    // Normalize phone for checking (same logic as in User model pre-save)
    let cleanedPhone = phone.replace(/\D/g, '');
    cleanedPhone = cleanedPhone.replace(/^0+/, '');

    const phoneCount = await User.countDocuments({ phone: cleanedPhone });
    if (phoneCount >= 2) {
      return res.status(400).json({
        success: false,
        message: 'This phone number has already been used. Please use a different number.',
      });
    }

    // Create user
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    // Create user with initial verification state
    const user = await User.create({
      firstName,
      lastName,
      username: username.trim(),
      email: email.toLowerCase(),
      password,
      phone,
      country,
      role: 'buyer',
      isVerified: false,
      verificationStep: 'email',
      twoFactorCode: verificationCode,
      twoFactorExpires: expires,
      lastCodeSent: new Date(),
    });

    // Step 1: Send ONLY Email Code (fire-and-forget — don't await, respond fast)
    sendEmailCode(user.email, verificationCode);

    res.status(201).json({
      success: true,
      requiresVerification: true,
      userId: user._id,
      step: 'email',
      message: 'Registration successful. Please verify your email first.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, req, res) => {
  // Create token with optional deviceId for session tracking
  const deviceId = req.body?.deviceId || null;
  const token = generateToken(user, deviceId);
  console.log(`[AUTH DEBUG] Token generated for User: ${user.email} (Device: ${deviceId || 'Standard'})`);

  const options = {
    expires: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
    ),
    httpOnly: true,
    // Use secure cookies in production (requires HTTPS)
    // For localhost, secure must be false unless using HTTPS
    secure: req.protocol === 'https' || process.env.NODE_ENV === 'production',
    sameSite: req.protocol === 'https' || process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token, // Still sending for now to maintain compatibility with existing frontend
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar || null,
        phone: user.phone,
        country: user.country,
        theme: user.theme,
        language: user.language,
        currency: user.currency,
      },
    });
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { loginIdentifier, password } = req.body;
    console.log(`\n[AUTH DEBUG] Login attempt for identifier: ${loginIdentifier}`);

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/username and password',
      });
    }

    // Find user by email or username (case-insensitive search)
    const identifier = loginIdentifier.trim();
    const escapedIdentifier = escapeRegex(identifier);
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: { $regex: new RegExp(`^${escapedIdentifier}$`, "i") } }
      ]
    }).select('+password +passwordAttempts +passwordLockoutExpires');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email/Username or password is incorrect.',
      });
    }

    // Check if locked out
    if (user.passwordLockoutExpires && user.passwordLockoutExpires > Date.now()) {
      const remainingMinutes = Math.ceil((user.passwordLockoutExpires - Date.now()) / (60 * 1000));
      return res.status(429).json({
        success: false,
        message: `Account locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`,
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      user.passwordAttempts = (user.passwordAttempts || 0) + 1;

      if (user.passwordAttempts >= 5) {
        user.passwordLockoutExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lockout
        user.passwordAttempts = 0; // Reset counter after setting lockout
      }

      await user.save();

      return res.status(401).json({
        success: false,
        message: 'Email/Username or password is incorrect.',
      });
    }

    // Reset attempts on success
    if (user.passwordAttempts > 0 || user.passwordLockoutExpires) {
      user.passwordAttempts = 0;
      user.passwordLockoutExpires = undefined;
      await user.save();
    }

    // Check if active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated.',
      });
    }

    // Check if verified
    if (!user.isVerified) {
      return res.json({
        success: true,
        requiresVerification: true,
        userId: user._id,
        step: user.verificationStep,
        message: `Your account is not verified. Verification code is active for ${user.verificationStep}.`,
      });
    }

    // New Device Verification (Step-up Auth)
    const { deviceId, deviceMetadata } = req.body;
    const isDeviceTrusted = user.trustedDevices.some(d => d.deviceId === deviceId);

    if (!isDeviceTrusted) {
      user.verificationStep = 'device-choose';
      await user.save();

      return res.json({
        success: true,
        requiresVerification: true,
        userId: user._id,
        step: 'device-choose',
        message: 'New device detected. Please choose a verification method.',
      });
    }

    sendTokenResponse(user, 200, req, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Log user out / clear cookie
// @route   GET /api/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: req.protocol === 'https' || process.env.NODE_ENV === 'production',
    sameSite: req.protocol === 'https' || process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });

  res.status(200).json({
    success: true,
    data: {},
  });
};

/**
 * @desc    Verify 2FA code
 * @route   POST /api/auth/verify-2fa
 * @access  Public
 */
export const verify2FA = async (req, res, next) => {
  try {
    const { identifier, userId, code } = req.body;
    console.log(`\n[AUTH DEBUG] 2FA Verify attempt — UserID: ${userId}, Identifier: ${identifier}, Code: ${code}`);
    let query = {};

    if (userId) {
      query._id = userId;
    } else if (identifier) {
      if (identifier.includes('@')) {
        query.email = identifier.toLowerCase();
      } else {
        let cleaned = identifier.replace(/\D/g, '');
        cleaned = cleaned.replace(/^0+/, '');
        query.phone = cleaned;
      }
    } else {
      return res.status(400).json({ success: false, message: 'Please provide user identity.' });
    }

    const user = await User.findOne(query).select('+twoFactorCode +twoFactorExpires +twoFactorAttempts');

    if (!user || !user.twoFactorCode) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    }

    // Check if code is expired
    if (Date.now() > user.twoFactorExpires) {
      user.twoFactorCode = undefined;
      user.twoFactorExpires = undefined;
      user.twoFactorAttempts = 0;
      await user.save();
      return res.status(400).json({ success: false, message: 'Code has expired' });
    }

    // Check attempt limit (max 5)
    if (user.twoFactorAttempts >= 5) {
      return res.status(429).json({ success: false, message: 'Too many failed attempts. Please request a new code.' });
    }

    // Verify code
    if (user.twoFactorCode !== code) {
      user.twoFactorAttempts += 1;
      await user.save();
      return res.status(400).json({ success: false, message: 'Invalid code' });
    }

    // Add device to trusted devices if completing the final verification step (phone or device)
    // SKIP if this is just a phone change verification (detected by existence of pendingPhone)
    if (['device', 'device-choose', 'phone'].includes(user.verificationStep) && !user.pendingPhone) {
      const { deviceId, deviceMetadata } = req.body;
      if (deviceId) {
        const newDevice = {
          deviceId,
          name: deviceMetadata?.name || 'Unknown Device',
          browser: deviceMetadata?.browser || 'Unknown',
          os: deviceMetadata?.os || 'Unknown',
          lastUsed: new Date()
        };
        user.trustedDevices.push(newDevice);
      }
    }

    // If email step just completed → advance to phone (WhatsApp) step
    if (user.verificationStep === 'email') {
      const whatsappCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 10 * 60 * 1000);

      user.twoFactorCode = whatsappCode;
      user.twoFactorExpires = expires;
      user.twoFactorAttempts = 0;
      user.lastCodeSent = new Date();
      user.verificationStep = 'phone';
      await user.save();

      // Send WhatsApp code automatically
      sendWhatsAppCode(user.phone, whatsappCode);

      return res.json({
        success: true,
        nextStep: 'phone',
        message: 'Email verified. Please verify your WhatsApp now.',
      });
    }

    // All steps done — complete verification
    if (user.pendingPhone) {
      user.phone = user.pendingPhone;
      user.pendingPhone = undefined;
    }
    user.twoFactorCode = undefined;
    user.twoFactorExpires = undefined;
    user.twoFactorAttempts = 0;
    user.verificationStep = 'completed';
    user.isVerified = true;
    await user.save();

    sendTokenResponse(user, 200, req, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend 2FA code
 * @route   POST /api/auth/resend-2fa
 * @access  Public
 */
export const resend2FA = async (req, res, next) => {
  try {
    const { userId, method } = req.body;

    const user = await User.findById(userId).select('+lastCodeSent +twoFactorCode +twoFactorExpires');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const now = new Date();
    const lastSent = user.lastCodeSent || new Date(0);
    const diff = (now - lastSent) / 1000;

    // Skip cooldown check if we are just choosing the method for the first time
    if (user.verificationStep !== 'device-choose' && diff < 60) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${Math.ceil(60 - diff)} seconds before requesting another code.`,
      });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    user.twoFactorCode = verificationCode;
    user.twoFactorExpires = expires;
    user.lastCodeSent = now;

    // Handle device choice
    if (user.verificationStep === 'device-choose') {
      user.verificationStep = 'device';
      // Store the choice in a temp manner if needed, 
      // but for now let's just use the 'method' param to decide where to send.
    }

    await user.save();

    const targetMethod = method || (user.verificationStep === 'email' ? 'email' : 'whatsapp');

    if (targetMethod === 'email') {
      sendEmailCode(user.email, verificationCode);
    } else {
      sendWhatsAppCode(user.pendingPhone || user.phone, verificationCode);
    }

    res.json({
      success: true,
      step: user.verificationStep,
      message: `A verification code has been sent to your ${targetMethod === 'email' ? 'Email' : 'WhatsApp'}.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged-in user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar || null,
        phone: user.phone,
        country: user.country,
        theme: user.theme,
        language: user.language,
        currency: user.currency,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all trusted devices for current user
 * @route   GET /api/auth/devices
 * @access  Private
 */
export const getDevices = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('trustedDevices');
    res.json({
      success: true,
      devices: user.trustedDevices
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Revoke trust for a device
 * @route   DELETE /api/auth/devices/:deviceId
 * @access  Private
 */
export const revokeDevice = async (req, res, next) => {
  try {
    const { deviceId } = req.params;

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { trustedDevices: { deviceId } }
    });

    res.json({
      success: true,
      message: 'Device revoked successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @access  Public
 */
export const checkIdentifier = async (req, res, next) => {
  try {
    const { loginIdentifier } = req.body;
    if (!loginIdentifier) {
      return res.status(400).json({ success: false, message: 'Please provide identifier.' });
    }

    const identifier = loginIdentifier.trim();

    let phoneVariants = [identifier];
    let digitsOnly = identifier.replace(/\D/g, '');
    if (digitsOnly.length > 0) {
      let noZeros = digitsOnly.replace(/^0+/, '');
      phoneVariants.push(noZeros);
      if (noZeros.length === 10 && noZeros.startsWith('1')) phoneVariants.push('20' + noZeros);
      else if (noZeros.length === 12 && noZeros.startsWith('20')) phoneVariants.push(noZeros.substring(2));
    }

    const users = await User.find({
      $or: [
        { email: identifier.toLowerCase() },
        { username: { $regex: new RegExp(`^${escapeRegex(identifier)}$`, "i") } },
        { phone: { $in: phoneVariants } }
      ]
    }).select('username email phone');

    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'No account found with this identifier.' });
    }

    // Mask for security
    const maskedUsers = users.map(u => ({
      _id: u._id,
      username: u.username,
      email: u.email ? u.email.replace(/(.{2})(.*)(?=@)/, (_, p1, p2) => p1 + '*'.repeat(p2.length)) : null,
      phone: u.phone ? u.phone.replace(/.(?=.{4})/g, '*') : null
    }));

    res.json({ success: true, users: maskedUsers });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Request password reset code
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { loginIdentifier, method } = req.body;
    if (!loginIdentifier) {
      return res.status(400).json({ success: false, message: 'Please provide email, username, or phone number.' });
    }

    const identifier = loginIdentifier.trim();

    // Normalize phone number to match DB formats
    let phoneVariants = [identifier];
    let digitsOnly = identifier.replace(/\D/g, '');
    if (digitsOnly.length > 0) {
      let noZeros = digitsOnly.replace(/^0+/, '');
      phoneVariants.push(noZeros);
      if (noZeros.length === 10 && noZeros.startsWith('1')) phoneVariants.push('20' + noZeros);
      else if (noZeros.length === 12 && noZeros.startsWith('20')) phoneVariants.push(noZeros.substring(2));
    }

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: { $regex: new RegExp(`^${escapeRegex(identifier)}$`, "i") } },
        { phone: { $in: phoneVariants } }
      ]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Generate code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    user.resetPasswordCode = resetCode;
    user.resetPasswordExpires = expires;
    await user.save();

    const targetMethod = method || 'email'; // Default to email

    if (targetMethod === 'whatsapp' && user.phone) {
      sendWhatsAppCode(user.phone, resetCode);
    } else {
      sendEmailCode(user.email, resetCode);
    }

    res.json({
      success: true,
      message: `A password reset code has been sent to your ${targetMethod === 'whatsapp' && user.phone ? 'WhatsApp' : 'Email'}.`,
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password with code
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { loginIdentifier, code, newPassword } = req.body;

    if (!loginIdentifier || !code || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide all fields.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    const identifier = loginIdentifier.trim();

    // Normalize phone number to match DB formats
    let phoneVariants = [identifier];
    let digitsOnly = identifier.replace(/\D/g, '');
    if (digitsOnly.length > 0) {
      let noZeros = digitsOnly.replace(/^0+/, '');
      phoneVariants.push(noZeros);
      if (noZeros.length === 10 && noZeros.startsWith('1')) phoneVariants.push('20' + noZeros);
      else if (noZeros.length === 12 && noZeros.startsWith('20')) phoneVariants.push(noZeros.substring(2));
    }

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: { $regex: new RegExp(`^${escapeRegex(identifier)}$`, "i") } },
        { phone: { $in: phoneVariants } }
      ]
    }).select('+password +resetPasswordCode +resetPasswordExpires');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (!user.resetPasswordCode || user.resetPasswordCode !== code) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset code.' });
    }

    if (new Date() > user.resetPasswordExpires) {
      return res.status(400).json({ success: false, message: 'Reset code has expired.' });
    }

    const isMatch = await user.matchPassword(newPassword);
    if (isMatch) {
      return res.status(400).json({ success: false, message: 'New password cannot be the same as your old password.' });
    }

    // Set new password
    user.password = newPassword;
    user.resetPasswordCode = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in.',
    });
  } catch (error) {
    next(error);
  }
};