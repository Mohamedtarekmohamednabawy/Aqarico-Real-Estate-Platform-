import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    sparse: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false, // Never return password by default
  },
  role: {
    type: String,
    enum: ['buyer', 'seller', 'agent', 'agency', 'developer', 'admin'],
    default: 'buyer',
  },
  phone: {
    type: String,
  },
  pendingPhone: {
    type: String,
  },
  country: {
    type: String,
  },
  avatar: {
    type: String, // Cloudinary URL
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationStep: {
    type: String,
    enum: ['email', 'phone', 'device', 'device-choose', 'completed'],
    default: 'email',
  },
  twoFactorCode: {
    type: String,
    select: false,
  },
  twoFactorExpires: {
    type: Date,
    select: false,
  },
  lastCodeSent: {
    type: Date,
    select: false,
  },
  twoFactorAttempts: {
    type: Number,
    default: 0,
    select: false,
  },
  resetPasswordCode: {
    type: String,
    select: false,
  },
  resetPasswordExpires: {
    type: Date,
    select: false,
  },
  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'dark',
  },
  language: {
    type: String,
    enum: ['en', 'ar', 'fr', 'de', 'jp'],
    default: 'en',
  },
  currency: {
    type: String,
    enum: ['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'AED', 'JPY', 'CNY', 'KWD', 'QAR', 'TRY', 'CAD'],
    default: 'EGP',
  },
  trustedDevices: [{
    deviceId: { type: String },
    name: String,
    browser: String,
    os: String,
    lastUsed: { type: Date, default: Date.now }
  }],
  passwordAttempts: {
    type: Number,
    default: 0,
    select: false,
  },
  passwordLockoutExpires: {
    type: Date,
    select: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Normalize phone number if it exists
  if (this.phone) {
    let cleaned = this.phone.replace(/\D/g, '');
    cleaned = cleaned.replace(/^0+/, '');
    this.phone = cleaned;

    // Detect currency from phone prefix if not set
    if (!this.currency) {
      const phonePrefixToCurrency = {
        '20': 'EGP', // Egypt
        '971': 'AED', // UAE
        '966': 'SAR', // Saudi Arabia
        '965': 'KWD', // Kuwait
        '974': 'QAR', // Qatar
        '90': 'TRY', // Turkey
        '44': 'GBP', // UK
        '1': 'USD', // USA/Canada
        '49': 'EUR', '33': 'EUR', '34': 'EUR', '39': 'EUR', // EU
      };

      for (const [prefix, curr] of Object.entries(phonePrefixToCurrency)) {
        if (this.phone.startsWith(prefix)) {
          this.currency = curr;
          break;
        }
      }

      // Final fallback
      if (!this.currency) this.currency = 'EGP';
    }
  }
  if (this.pendingPhone) {
    let cleaned = this.pendingPhone.replace(/\D/g, '');
    cleaned = cleaned.replace(/^0+/, '');
    this.pendingPhone = cleaned;
  }

  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  let phone = update.phone || (update.$set && update.$set.phone);

  if (phone) {
    let cleaned = phone.replace(/\D/g, '');
    cleaned = cleaned.replace(/^0+/, '');

    if (update.phone) {
      update.phone = cleaned;
    } else {
      update.$set.phone = cleaned;
    }
  }
  next();
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
