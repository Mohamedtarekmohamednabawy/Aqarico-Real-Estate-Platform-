import api from './api';
import { cachedGet, invalidateGetCache } from './requestCache';

/**
 * Favorite service — handles adding/removing/getting favorites
 */
const favoriteService = {
  /**
   * Get current user's favorites (populated property objects)
   */
  getFavorites: async () => {
    return cachedGet('/favorites', {
      ttl: 60 * 1000,
      scope: 'user',
    });
  },

  /**
   * Add a property to favorites
   */
  add: async (propertyId) => {
    const response = await api.post(`/favorites/${propertyId}`);
    invalidateGetCache('/favorites');
    return response.data;
  },

  /**
   * Remove a property from favorites
   */
  remove: async (propertyId) => {
    const response = await api.delete(`/favorites/${propertyId}`);
    invalidateGetCache('/favorites');
    return response.data;
  },
};

export default favoriteService;
