import mongoose from 'mongoose';

const agentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  name: {
    type: String,
  },
  avatar: {
    type: String,
  },
  bio: {
    type: String,
  },
  phone: {
    type: String,
  },
  isVerifiedByAdmin: {
    type: Boolean,
    default: false,
  },
  assignedListings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
  }],
  location: {
    type: String,
  },
  district: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

agentSchema.pre('save', function (next) {
  if (this.phone) {
    let cleaned = this.phone.replace(/\D/g, '');
    cleaned = cleaned.replace(/^0+/, '');
    this.phone = cleaned;
  }
  next();
});

agentSchema.pre('findOneAndUpdate', function (next) {
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

const Agent = mongoose.model('Agent', agentSchema);
export default Agent;