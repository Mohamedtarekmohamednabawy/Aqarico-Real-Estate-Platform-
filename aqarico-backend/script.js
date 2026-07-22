import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Property from './models/Property.js';

dotenv.config();

const isStandardAmenity = (amenity) => (
  typeof amenity === 'string' && amenity.trim().toLowerCase() === 'standard'
);

const removeStandardAmenities = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const properties = await Property.find({
    amenities: { $elemMatch: { $regex: '^\\s*standard\\s*$', $options: 'i' } },
  }).select('_id title amenities');

  let modifiedCount = 0;
  let removedCount = 0;

  for (const property of properties) {
    const originalCount = property.amenities.length;
    property.amenities = property.amenities.filter((amenity) => !isStandardAmenity(amenity));
    const removedForProperty = originalCount - property.amenities.length;

    if (removedForProperty > 0) {
      await property.save();
      modifiedCount += 1;
      removedCount += removedForProperty;
      console.log(`Updated ${property._id}: removed ${removedForProperty} Standard amenity value(s)`);
    }
  }

  console.log(`Done. Updated ${modifiedCount} propert${modifiedCount === 1 ? 'y' : 'ies'} and removed ${removedCount} Standard value(s).`);
};

removeStandardAmenities()
  .catch((error) => {
    console.error('Failed to remove Standard amenities:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
