import propertyService from '../services/propertyService';
import { displayFormattedPhone } from './countries';

/**
 * dataManager — bridge between old localStorage patterns and new backend API.
 *
 * Async methods call the real API.
 * Legacy sync methods (getProperties, getPropertyById, etc.) return cached data
 * so existing components that read synchronously still work.
 *
 * Usage in new/migrated components:
 *   const { data } = await dataManager.fetchProperties({ type: 'sale' });
 *
 * Usage in not-yet-migrated components (backward compatible):
 *   const props = dataManager.getProperties(); // returns last-cached data
 */

let cachedProperties = [];

const PROPERTY_QUERY_TTL_MS = 2 * 60 * 1000;
const USER_PROPERTIES_TTL_MS = 60 * 1000;
const STATS_TTL_MS = 5 * 60 * 1000;

const propertyQueryCache = new Map();
const propertyQueryInFlight = new Map();
const myPropertiesCache = { data: null, timestamp: 0 };
const statsCache = new Map();

const normalizeForKey = (value) => {
    if (Array.isArray(value)) return value.map(normalizeForKey);
    if (value && typeof value === 'object') {
        return Object.keys(value)
            .sort()
            .reduce((acc, key) => {
                const item = value[key];
                if (item !== undefined && item !== null && item !== '') {
                    acc[key] = normalizeForKey(item);
                }
                return acc;
            }, {});
    }
    return value;
};

const createQueryKey = (params = {}) => JSON.stringify(normalizeForKey(params));

const isRequestCanceled = (error) => (
    error?.name === 'CanceledError' ||
    error?.code === 'ERR_CANCELED' ||
    error?.message === 'canceled'
);

const invalidatePropertyCaches = () => {
    propertyQueryCache.clear();
    propertyQueryInFlight.clear();
    myPropertiesCache.data = null;
    myPropertiesCache.timestamp = 0;
    statsCache.clear();
};

export const dataManager = {
    // ── Async API methods (preferred) ──────────────────────────

    /**
     * Fetch properties from the backend API with filters
     */
    fetchProperties: async (params = {}, options = {}) => {
        const key = createQueryKey(params);
        const cached = propertyQueryCache.get(key);
        const now = Date.now();

        if (!options.force && cached && now - cached.timestamp < (options.ttl ?? PROPERTY_QUERY_TTL_MS)) {
            cachedProperties = cached.data;
            return { data: cached.data, pagination: cached.pagination };
        }

        if (!options.force && propertyQueryInFlight.has(key)) {
            const existing = propertyQueryInFlight.get(key);
            // If the original request was canceled by someone else, 
            // retry as a fresh request for this subscriber.
            return existing.catch((err) => {
                if (isRequestCanceled(err)) {
                    return dataManager.fetchProperties(params, options);
                }
                throw err;
            });
        }

        const request = (async () => {
            try {
                const result = await propertyService.getAll(params, options);
                if (result.success) {
                    // Normalize backend docs → frontend shape for backward compat
                    const data = result.data.map(normalizeProperty);
                    const pagination = result.pagination || {};
                    cachedProperties = data;
                    propertyQueryCache.set(key, {
                        data,
                        pagination,
                        timestamp: Date.now(),
                    });
                    return { data, pagination };
                }
                return { data: [], pagination: {} };
            } catch (error) {
                if (isRequestCanceled(error)) {
                    throw error;
                }
                console.error('Error fetching properties:', error);
                return { data: cachedProperties, pagination: {} };
            } finally {
                propertyQueryInFlight.delete(key);
            }
        })();

        propertyQueryInFlight.set(key, request);
        return request;
    },

    /**
     * Prime the properties cache without forcing consumers through a component.
     */
    prefetchProperties: async (params = {}, options = {}) => {
        try {
            return await dataManager.fetchProperties(params, options);
        } catch (error) {
            if (!isRequestCanceled(error)) {
                console.error('Error prefetching properties:', error);
            }
            return { data: cachedProperties, pagination: {} };
        }
    },

    /**
     * Fetch a single property by MongoDB _id
     */
    fetchPropertyById: async (id, options = {}) => {
        try {
            const result = await propertyService.getById(id, options);
            if (result.success) {
                return normalizeProperty(result.data);
            }
            return null;
        } catch (error) {
            if (isRequestCanceled(error)) throw error;
            console.error('Error fetching property:', error);
            return null;
        }
    },

    /**
     * Fetch multiple properties in one request for comparison-style workflows.
     */
    fetchPropertiesByIds: async (ids = []) => {
        if (!ids.length) return [];

        try {
            const result = await propertyService.compare(ids);
            if (result.success && Array.isArray(result.data)) {
                return result.data.map(normalizeProperty);
            }
            return [];
        } catch (error) {
            console.error('Error fetching properties by IDs:', error);
            return [];
        }
    },

    /**
     * Fetch current user's listings
     */
    fetchMyProperties: async (options = {}) => {
        const now = Date.now();
        if (!options.force && myPropertiesCache.data && now - myPropertiesCache.timestamp < USER_PROPERTIES_TTL_MS) {
            return myPropertiesCache.data;
        }

        try {
            const result = await propertyService.getMyProperties(options);
            if (result.success) {
                const data = result.data.map(normalizeProperty);
                myPropertiesCache.data = data;
                myPropertiesCache.timestamp = Date.now();
                return data;
            }
            return [];
        } catch (error) {
            if (isRequestCanceled(error)) throw error;
            console.error('Error fetching my properties:', error);
            return [];
        }
    },

    /**
     * Create a property via API
     */
    createProperty: async (propertyData) => {
        try {
            const result = await propertyService.create(propertyData);
            invalidatePropertyCaches();
            return result;
        } catch (error) {
            console.error('Error creating property:', error);
            throw error;
        }
    },

    /**
     * Update a property via API
     */
    updatePropertyAsync: async (id, propertyData) => {
        try {
            const result = await propertyService.update(id, propertyData);
            invalidatePropertyCaches();
            return result;
        } catch (error) {
            console.error('Error updating property:', error);
            throw error;
        }
    },

    /**
     * Delete a property via API
     */
    deletePropertyAsync: async (id) => {
        try {
            const result = await propertyService.delete(id);
            invalidatePropertyCaches();
            return result;
        } catch (error) {
            console.error('Error deleting property:', error);
            throw error;
        }
    },

    /**
     * Batch delete properties via API
     */
    batchDeletePropertiesAsync: async (ids) => {
        try {
            const result = await propertyService.batchDelete(ids);
            invalidatePropertyCaches();
            return result;
        } catch (error) {

            console.error('Error batch deleting properties:', error);
            throw error;
        }
    },

    // ── Legacy sync methods (backward compat) ──────────────────

    getProperties: () => cachedProperties,

    getPropertyById: (id) => {
        return cachedProperties.find(
            (p) => p.id === id || p._id === id || p.id === String(id)
        );
    },

    getPropertiesByType: (type) => {
        return cachedProperties.filter((p) => p.type === type);
    },

    getPropertiesByOwner: (ownerId) => {
        return cachedProperties.filter((p) => p.ownerId === ownerId);
    },

    // Legacy - still writes to API now
    saveProperty: async (property) => {
        if (property._id || property.id) {
            return await dataManager.updatePropertyAsync(property._id || property.id, property);
        }
        return await dataManager.createProperty(property);
    },

    updateProperty: async (property) => {
        return await dataManager.updatePropertyAsync(property._id || property.id, property);
    },

    deleteProperty: async (id) => {
        return await dataManager.deletePropertyAsync(id);
    },

    // Initialize — fetch and cache all properties
    initData: async () => {
        const result = await dataManager.fetchProperties({ limit: 100 });
        return result.data;
    },

    /**
     * Get aggregated market statistics from the backend
     */
    async getMarketStats(params = {}) {
        const key = `market:${createQueryKey(params)}`;
        const cached = statsCache.get(key);
        if (cached && Date.now() - cached.timestamp < STATS_TTL_MS) {
            return cached.data;
        }

        try {
            const response = await propertyService.getMarketStats(params);
            statsCache.set(key, { data: response.data, timestamp: Date.now() });
            return response.data;
        } catch (error) {
            console.error("Error fetching market stats:", error);
            throw error;
        }
    },

    async getLocationStats(name) {
        const key = `location:${name}`;
        const cached = statsCache.get(key);
        if (cached && Date.now() - cached.timestamp < STATS_TTL_MS) {
            return cached.data;
        }

        try {
            const response = await propertyService.getLocationStats(name);
            statsCache.set(key, { data: response.data, timestamp: Date.now() });
            return response.data;
        } catch (error) {
            console.error("Error fetching location stats:", error);
            throw error;
        }
    },
};

/**
 * Normalize a backend property document to the frontend shape.
 * Ensures backward compatibility with components expecting old field names.
 */
function normalizeProperty(doc) {
    if (!doc) return null;

    // Build amenities array from boolean fields
    const amenities = [];
    if (doc.furnished) amenities.push('Furnished');
    if (doc.electricityMeter) amenities.push('Electricity Meter');
    if (doc.naturalGas) amenities.push('Natural Gas');
    if (doc.waterMeter) amenities.push('Water Meter');
    if (doc.elevator) amenities.push('Elevator');
    if (doc.security) amenities.push('Security');
    // Add any amenities that came from the backend directly
    if (doc.amenities && Array.isArray(doc.amenities)) {
        doc.amenities.forEach((a) => {
            if (!amenities.includes(a)) amenities.push(a);
        });
    }

    return {
        // Keep all original backend fields
        ...doc,
        // Map _id to id for backward compat
        id: doc._id || doc.id,
        _id: doc._id || doc.id,
        // Image backward compat
        imageUrl:
            doc.images && doc.images.length > 0
                ? doc.images[0]
                : 'https://placehold.co/400x300?text=No+Image',
        images:
            doc.images && doc.images.length > 0
                ? doc.images
                : ['https://placehold.co/400x300?text=No+Image'],
        // Ensure amenities is always an array without inventing placeholder values
        amenities,
        // Map owner info
        ownerId: doc.owner?._id || doc.owner || '',
        author: doc.owner
            ? `${doc.owner.firstName || ''} ${doc.owner.lastName || ''}`.trim()
            : 'Aqarico System',
        // Phone fallback: Owner > Agent > Placeholder
        phone: (doc.owner?.phone && doc.owner.phone !== '+20 100 000 0000')
            ? displayFormattedPhone(doc.owner.phone, doc.owner.country || "EG")
            : (doc.agent?.phone ? displayFormattedPhone(doc.agent.phone, doc.owner?.country || "EG") : '+201000000000'),
        // View count backward compat
        viewCount: doc.views || 0,
        contactedCount: doc.contactedCount || 0,
        featured: doc.isFeatured || doc.featured || false,
        isFeatured: doc.isFeatured || doc.featured || false,
        // Location coordinates
        coordinates: doc.coordinates || null,
    };
}
