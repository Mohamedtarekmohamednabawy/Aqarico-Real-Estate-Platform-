import User from '../models/User.js';

/**
 * @desc    Get current user's favorites (populated Property objects)
 * @route   GET /api/favorites
 * @access  Private
 */
export const getFavorites = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('favorites');

    res.json({
      success: true,
      data: user.favorites,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add a property to favorites
 * @route   POST /api/favorites/:propertyId
 * @access  Private
 */
export const addFavorite = async (req, res, next) => {
  try {
    const propertyId = req.params.propertyId;
    const userId = req.user._id;

    // Atomically add to favorites if not already present
    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { favorites: propertyId } },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Added to favorites',
      data: user.favorites,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove a property from favorites
 * @route   DELETE /api/favorites/:propertyId
 * @access  Private
 */
export const removeFavorite = async (req, res, next) => {
  try {
    const propertyId = req.params.propertyId;
    const userId = req.user._id;

    // Atomically remove from favorites
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { favorites: propertyId } },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Removed from favorites',
      data: user.favorites,
    });
  } catch (error) {
    next(error);
  }
};
