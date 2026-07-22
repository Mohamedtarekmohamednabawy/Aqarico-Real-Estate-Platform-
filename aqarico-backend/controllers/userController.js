import mongoose from 'mongoose';
import User from '../models/User.js';
import Property from '../models/Property.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

/**
 * @desc    Get all users (admin)
 * @route   GET /api/users
 * @access  Admin
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();

    const Agent = mongoose.model('Agent');
    const usersWithData = await Promise.all(users.map(async (u) => {
      let agentProfile = null;
      let countQuery = { owner: u._id };

      if (u.role === 'agent') {
        agentProfile = await Agent.findOne({ user: u._id }).select('_id phone').lean();
        if (agentProfile) {
          countQuery = { $or: [{ owner: u._id }, { agent: agentProfile._id }] };

          // Use agent phone as fallback if user phone is missing or empty string
          if (!u.phone && agentProfile.phone) {
            u.phone = agentProfile.phone;
          }
        }
      }

      const count = await Property.countDocuments(countQuery);
      return { ...u, listingCount: count, agentProfile };
    }));

    res.json({ success: true, data: usersWithData });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single user (admin)
 * @route   GET /api/users/:id
 * @access  Admin
 */
export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update any user (admin)
 * @route   PUT /api/users/:id
 * @access  Admin
 */
export const updateUserAdmin = async (req, res, next) => {
  try {
    const { firstName, lastName, username, email, role, phone, country, isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, username: username?.toLowerCase().trim(), email, role, phone, country, isActive },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete any user (admin)
 * @route   DELETE /api/users/:id
 * @access  Admin
 */
export const deleteUserAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admins cannot be deleted through this interface',
      });
    }

    await User.findByIdAndDelete(req.params.id);
    await Property.deleteMany({ owner: req.params.id });

    res.json({ success: true, message: 'User and their properties deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete multiple users (admin)
 * @route   POST /api/users/batch-delete
 * @access  Admin
 */
export const batchDeleteUsersAdmin = async (req, res, next) => {
  try {
    const { ids } = req.body;
    console.log(`[BATCH DELETE USERS ADMIN] Admin: ${req.user._id}, IDs count: ${ids?.length}`);


    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a non-empty array of user IDs",
      });
    }

    // Protection: Filter out admins from the deletion list
    const nonAdminUsers = await User.find({ _id: { $in: ids }, role: { $ne: 'admin' } }).select('_id');
    const validIds = nonAdminUsers.map(u => u._id);
    const skippedCount = ids.length - validIds.length;

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No eligible (non-admin) users found in current selection',
      });
    }

    // Delete properties of these users
    await Property.deleteMany({ owner: { $in: validIds } });

    // Delete the users
    const result = await User.deleteMany({ _id: { $in: validIds } });

    res.json({
      success: true,
      message: skippedCount > 0
        ? `${result.deletedCount} users deleted. ${skippedCount} admins were protected and skipped.`
        : `${result.deletedCount} users and their properties deleted successfully`,
      deletedCount: result.deletedCount,
      skippedCount
    });
  } catch (error) {
    next(error);
  }
};


/**
 * @desc    Promote user to admin
 * @route   PUT /api/users/:id/promote
 * @access  Admin
 */
export const promoteToAdmin = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: 'admin' },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update own profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, username, phone, country, role, currentPassword } = req.body;
    console.log(`\n[USER DEBUG] Profile update attempt for user: ${req.user?._id}`);

    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is required to update profile',
      });
    }

    const user = await User.findById(req.user._id).select('+password +passwordAttempts +passwordLockoutExpires');

    if (user.passwordLockoutExpires && user.passwordLockoutExpires > Date.now()) {
      const remainingMinutes = Math.ceil((user.passwordLockoutExpires - Date.now()) / (60 * 1000));
      return res.status(429).json({
        success: false,
        message: `Account locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`,
      });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      user.passwordAttempts = (user.passwordAttempts || 0) + 1;
      if (user.passwordAttempts >= 5) {
        user.passwordLockoutExpires = new Date(Date.now() + 15 * 60 * 1000);
        user.passwordAttempts = 0;
      }
      await user.save();
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    // Reset attempts on success
    if (user.passwordAttempts > 0 || user.passwordLockoutExpires) {
      user.passwordAttempts = 0;
      user.passwordLockoutExpires = undefined;
      await user.save();
    }

    const roleMap = {
      'Individual Seller': 'seller',
      'Real Estate Agent': 'agent',
      'Property Agency': 'agency',
      'Developer': 'developer',
    };

    if (username) {
      const trimmedUsername = username.trim();
      if (trimmedUsername.length < 3) {
        return res.status(400).json({ success: false, message: 'Username must be at least 3 characters long.' });
      }
      const existing = await User.findOne({
        username: { $regex: new RegExp(`^${trimmedUsername}$`, "i") },
        _id: { $ne: user._id }
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Username is already taken.' });
      }
      user.username = trimmedUsername;
    }
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone !== undefined && phone !== (user.phone || "")) {
      // Cooldown check: 60 seconds
      const now = new Date();
      const lastSent = user.lastCodeSent || new Date(0);
      const diff = (now - lastSent) / 1000;

      if (diff < 60) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${Math.ceil(60 - diff)} seconds before requesting another code.`
        });
      }

      // Trigger 2FA for phone change
      const { sendWhatsAppCode } = await import('../utils/notification.js');
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 10 * 60 * 1000);

      // Attempt to send code first
      const sent = await sendWhatsAppCode(phone, verificationCode);
      if (!sent) {
        return res.status(500).json({
          success: false,
          message: 'Failed to send verification code to the new phone number. Please check the number and try again.'
        });
      }

      user.twoFactorCode = verificationCode;
      user.twoFactorExpires = expires;
      user.verificationStep = 'phone';
      user.lastCodeSent = new Date();

      // Store the new phone in pending field, keep the old one for now
      user.pendingPhone = phone;
      await user.save();

      return res.json({
        success: false, // Set to false so frontend shows modal and doesn't say "Saved"
        requiresVerification: true,
        userId: user._id,
        step: 'phone',
        message: 'Phone number update requires verification. A code has been sent to your new number via WhatsApp.'
      });
    }
    if (country) user.country = country;
    if (role !== undefined) user.role = roleMap[role] || role;

    await user.save();

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
 * @desc    Upload/update avatar
 * @route   PUT /api/users/profile/avatar
 * @access  Private
 */
export const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file' });
    }

    const result = await uploadToCloudinary(req.file.buffer, 'aqarico/avatars');

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: result.secure_url },
      { new: true }
    );

    res.json({
      success: true,
      avatar: result.secure_url,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
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
 * @desc    Update password
 * @route   PUT /api/users/password
 * @access  Private
 */
export const updatePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All password fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirmation do not match' });
    }

    if (newPassword === oldPassword) {
      return res.status(400).json({ success: false, message: 'New password must be different from the old password' });
    }

    const user = await User.findById(req.user._id).select('+password +passwordAttempts +passwordLockoutExpires');

    if (user.passwordLockoutExpires && user.passwordLockoutExpires > Date.now()) {
      const remainingMinutes = Math.ceil((user.passwordLockoutExpires - Date.now()) / (60 * 1000));
      return res.status(429).json({
        success: false,
        message: `Account locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`,
      });
    }

    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      user.passwordAttempts = (user.passwordAttempts || 0) + 1;
      if (user.passwordAttempts >= 5) {
        user.passwordLockoutExpires = new Date(Date.now() + 15 * 60 * 1000);
        user.passwordAttempts = 0;
      }
      await user.save();
      return res.status(401).json({ success: false, message: 'Incorrect old password' });
    }

    // Reset attempts on success
    if (user.passwordAttempts > 0 || user.passwordLockoutExpires) {
      user.passwordAttempts = 0;
      user.passwordLockoutExpires = undefined;
      // We will save later below
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete own account
 * @route   DELETE /api/users/account
 * @access  Private
 */
export const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required to delete your account' });
    }

    const user = await User.findById(req.user._id).select('+password +passwordAttempts +passwordLockoutExpires');

    if (user.passwordLockoutExpires && user.passwordLockoutExpires > Date.now()) {
      const remainingMinutes = Math.ceil((user.passwordLockoutExpires - Date.now()) / (60 * 1000));
      return res.status(429).json({
        success: false,
        message: `Account locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`,
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      user.passwordAttempts = (user.passwordAttempts || 0) + 1;
      if (user.passwordAttempts >= 5) {
        user.passwordLockoutExpires = new Date(Date.now() + 15 * 60 * 1000);
        user.passwordAttempts = 0;
      }
      await user.save();
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    await Property.deleteMany({ owner: req.user._id });
    await User.findByIdAndDelete(req.user._id);

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user settings (theme, language)
 * @route   PUT /api/users/settings
 * @access  Private
 */
export const updateSettings = async (req, res, next) => {
  try {
    const { theme, language, currency } = req.body;
    const updateData = {};
    if (theme) updateData.theme = theme;
    if (language) updateData.language = language;
    if (currency) updateData.currency = currency;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        theme: user.theme,
        language: user.language,
        currency: user.currency,
      },
    });
  } catch (error) {
    next(error);
  }
};
