import mongoose from 'mongoose';

const comparisonSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  properties: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Comparison = mongoose.model('Comparison', comparisonSchema);
export default Comparison;
