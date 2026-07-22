import api from './api';
import { cachedGet, invalidateGetCache } from './requestCache';

const adminService = {
    /**
     * Get all users (Admin only)
     */
    getAllUsers: async (options = {}) => {
        return cachedGet('/users', {
            ttl: options.ttl ?? 2 * 60 * 1000,
            scope: 'user',
            force: options.force,
            signal: options.signal,
        });
    },

    /**
     * Delete a user (Admin only)
     */
    deleteUser: async (userId) => {
        const response = await api.delete(`/users/${userId}`);
        invalidateGetCache('/users');
        invalidateGetCache('/properties');
        return response.data;
    },

    /**
     * Batch delete users (Admin only)
     */
    batchDeleteUsers: async (ids) => {
        console.log(`[ADMIN SERVICE] Sending batch-delete request for ${ids?.length} users`);
        const response = await api.post('/users/batch-delete', { ids });
        invalidateGetCache('/users');
        invalidateGetCache('/properties');
        return response.data;
    },


    /**
     * Get all properties
     */
    getAllProperties: async (page = 1, limit = 50, filters = {}, options = {}) => {
        return cachedGet('/properties', {
            params: {
                page,
                limit,
                sortBy: 'newest',
                ...filters,
            },
            ttl: options.ttl ?? 60 * 1000,
            scope: 'user',
            force: options.force,
            signal: options.signal,
        });
    },

    /**
     * Batch delete properties (Admin only)
     */
    batchDeleteProperties: async (ids) => {
        console.log(`[ADMIN SERVICE] Sending batch-delete request for ${ids?.length} properties`);
        const response = await api.post('/properties/batch-delete', { ids });
        invalidateGetCache('/properties');
        return response.data;
    },


    /**
     * Delete any property
     */
    deleteProperty: async (propertyId) => {
        const response = await api.delete(`/properties/${propertyId}`);
        invalidateGetCache('/properties');
        return response.data;
    },

    /**
     * Verify property (Admin only)
     */
    verifyProperty: async (propertyId) => {
        const response = await api.put(`/properties/${propertyId}/verify`);
        invalidateGetCache('/properties');
        return response.data;
    },

    /**
     * Toggle featured status (Admin only)
     */
    toggleFeatured: async (propertyId) => {
        const response = await api.put(`/properties/${propertyId}/feature`);
        invalidateGetCache('/properties');
        return response.data;
    },

    /**
     * Promote user to admin (Admin only)
     */
    promoteToAdmin: async (userId) => {
        const response = await api.put(`/users/${userId}/promote`);
        invalidateGetCache('/users');
        return response.data;
    }
};

export default adminService;
