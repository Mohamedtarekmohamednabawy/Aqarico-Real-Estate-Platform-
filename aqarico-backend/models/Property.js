import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema({
  // Listing form fields sent directly from frontend
  title: {
    type: String,
    required: [true, 'Title is required'],
    maxlength: [50, 'Title cannot exceed 50 characters'],
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
  },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number },
  },
  type: {
    type: String,
    enum: ['sale', 'rent'],
    required: [true, 'Property type is required'],
  },
  category: {
    type: String, // "Apartment", "Villa", "Studio", etc.
  },
  area: {
    type: Number,
    required: [true, 'Area is required'],
  },
  bedrooms: {
    type: Number,
    required: [true, 'Number of bedrooms is required'],
  },
  bathrooms: {
    type: Number,
    required: [true, 'Number of bathrooms is required'],
  },
  images: [{
    type: String, // Cloudinary URLs
  }],
  amenities: [{
    type: String, // ["Pool", "Garden", etc.]
  }],

  // Amenities stored as binary fields (parsed from amenities array)
  furnished: {
    type: Number,
    enum: [0, 1],
    default: 0,
  },
  electricityMeter: {
    type: Number,
    enum: [0, 1],
    default: 0,
  },
  naturalGas: {
    type: Number,
    enum: [0, 1],
    default: 0,
  },
  waterMeter: {
    type: Number,
    enum: [0, 1],
    default: 0,
  },
  elevator: {
    type: Number,
    enum: [0, 1],
    default: 0,
  },
  security: {
    type: Number,
    enum: [0, 1],
    default: 0,
  },

  // Additional ML model fields, optional
  district: {
    type: String,
  },
  finish: {
    type: String,
    enum: ['Semi Finished', 'Lux', 'Super Lux', 'Extra Super Lux', 'Without Finish', ''],
  },
  yearBuilt: {
    type: Number,
  },
  floor: {
    type: Number,
    default: 0,
  },

  // Platform fields
  predictedPrice: {
    type: Number, // Set automatically after ML call
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isFairPrice: {
    type: Boolean,
    default: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['available', 'booked', 'sold'],
    default: 'available',
  },
  provenanceTag: {
    type: String,
  },
  views: {
    type: Number,
    default: 0,
  },
  viewedBy: [{
    type: String, // Stores user ID or IP address
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for common queries + the custom sorting logic
propertySchema.index({ isFeatured: -1, isVerified: -1, createdAt: -1 });
propertySchema.index({ type: 1, location: 1, district: 1, price: 1 });
propertySchema.index({ district: 1, location: 1 });
propertySchema.index({ category: 1 });
propertySchema.index({ owner: 1 });
propertySchema.index({ status: 1 });

const Property = mongoose.model('Property', propertySchema);
export default Property;
