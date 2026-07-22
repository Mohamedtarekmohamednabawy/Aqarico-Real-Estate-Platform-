import Property from '../models/Property.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';

/**
 * @desc    Get market analytics (public)
 * @route   GET /api/analytics/market
 * @access  Public
 */
export const getMarketAnalytics = async (req, res, next) => {
  try {
    // Average price by location
    const avgPriceByLocation = await Property.aggregate([
      { $group: {
        _id: '$location',
        avgPrice: { $avg: '$price' },
        count: { $sum: 1 },
      }},
      { $sort: { count: -1 } },
    ]);

    // Count by district
    const countByDistrict = await Property.aggregate([
      { $match: { district: { $exists: true, $ne: '' } } },
      { $group: {
        _id: '$district',
        count: { $sum: 1 },
      }},
      { $sort: { count: -1 } },
    ]);

    // Count by type (sale vs rent)
    const countByType = await Property.aggregate([
      { $group: {
        _id: '$type',
        count: { $sum: 1 },
      }},
    ]);

    // Price distribution (ranges)
    const priceDistribution = await Property.aggregate([
      { $bucket: {
        groupBy: '$price',
        boundaries: [0, 500000, 1000000, 2000000, 3000000, 5000000, 10000000, 100000000],
        default: '10M+',
        output: { count: { $sum: 1 } },
      }},
    ]);

    res.json({
      success: true,
      data: {
        avgPriceByLocation,
        countByDistrict,
        countByType,
        priceDistribution,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get admin dashboard stats
 * @route   GET /api/analytics/dashboard
 * @access  Admin
 */
export const getDashboard = async (req, res, next) => {
  try {
    const [totalUsers, totalListings, totalBookings, recentUsers, recentListings] = await Promise.all([
      User.countDocuments(),
      Property.countDocuments(),
      Booking.countDocuments(),
      User.find().sort({ createdAt: -1 }).limit(5).select('firstName lastName email createdAt'),
      Property.find().sort({ createdAt: -1 }).limit(5).select('title price location type createdAt'),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalListings,
        totalBookings,
        recentUsers,
        recentListings,
      },
    });
  } catch (error) {
    next(error);
  }
};
