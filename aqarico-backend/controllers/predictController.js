import axios from 'axios';

/**
 * @desc    Get ML price prediction for a property
 * @route   POST /api/predict
 * @access  Private
 */
export const predictPrice = async (req, res, next) => {
  try {
    const {
      location, district, finish, area, bedrooms, bathrooms,
      yearBuilt, floor, furnished, electricityMeter,
      naturalGas, waterMeter, elevator, security,
    } = req.body;

    const mlFields = {
      location: location || '',
      district: district || '',
      finish: finish || '',
      area: Number(area) || 100,
      bedrooms: Number(bedrooms) || 2,
      bathrooms: Number(bathrooms) || 1,
      yearBuilt: Number(yearBuilt) || 2015,
      floor: Number(floor) || 0,
      furnished: Number(furnished) || 0,
      electricityMeter: Number(electricityMeter) || 0,
      naturalGas: Number(naturalGas) || 0,
      waterMeter: Number(waterMeter) || 0,
      elevator: Number(elevator) || 0,
      security: Number(security) || 0,
    };

    try {
      const response = await axios.post(`${process.env.ML_SERVICE_URL}/predict`, mlFields);

      res.json({
        success: true,
        predictedPrice: response.data.predictedPrice,
        currency: response.data.currency || 'EGP',
        warning: response.data.warning || null,
      });
    } catch (mlError) {
      // ML service is down — return null prediction instead of crashing
      console.error('ML service unreachable:', mlError.message);
      res.json({
        success: true,
        predictedPrice: null,
        currency: 'EGP',
        warning: 'Price prediction service is currently unavailable.',
      });
    }
  } catch (error) {
    next(error);
  }
};
