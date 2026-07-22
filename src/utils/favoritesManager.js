/**
 * Centralized favorites management utilities.
 *
 * Uses an in-memory cache for instant UI updates, dedupes the initial API read,
 * and keeps populated favorite properties available for the favourites page.
 */
import favoriteService from '../services/favoriteService';
import authService from '../services/authService';

let favoritesCache = new Set();
let favoritePropertiesCache = [];
let cacheLoaded = false;
let loadPromise = null;
let cacheUserId = null;

const getCurrentUserId = () => {
    const user = authService.getCurrentUser();
    return user?._id || user?.id || null;
};

export const loadFavorites = async ({ force = false } = {}) => {
    const currentUserId = getCurrentUserId();

    if (!authService.isLoggedIn()) {
        favoritesCache = new Set();
        favoritePropertiesCache = [];
        cacheLoaded = true;
        cacheUserId = null;
        return;
    }

    if (cacheLoaded && cacheUserId === currentUserId && !force) return;
    if (loadPromise && !force) return loadPromise;

    loadPromise = (async () => {
        try {
            const result = await favoriteService.getFavorites();
            if (result.success && Array.isArray(result.data)) {
                favoritePropertiesCache = result.data;
                favoritesCache = new Set(result.data.map((p) => String(p._id || p.id)));
            }
        } catch {
            // Silently fail — user might not be logged in
        } finally {
            cacheLoaded = true;
            cacheUserId = currentUserId;
            loadPromise = null;
        }
    })();

    return loadPromise;
};

export const refreshFavorites = async () => {
    invalidateFavoritesCache();
    return loadFavorites({ force: true });
};

export const invalidateFavoritesCache = () => {
    favoritesCache = new Set();
    favoritePropertiesCache = [];
    cacheLoaded = false;
    loadPromise = null;
    cacheUserId = null;
};

export const getFavoriteProperties = () => favoritePropertiesCache;

export const getFavorites = () => Array.from(favoritesCache);

export const isFavorited = (propertyId) => {
    return favoritesCache.has(String(propertyId));
};

export const addFavorite = (propertyId) => {
    const id = String(propertyId);
    favoritesCache.add(id);
    cacheLoaded = false;
    loadPromise = null;

    favoriteService.add(id).catch((err) => {
        console.error('Failed to add favorite:', err);
        favoritesCache.delete(id);
    });

    return true;
};

export const removeFavorite = (propertyId) => {
    const id = String(propertyId);
    favoritesCache.delete(id);
    favoritePropertiesCache = favoritePropertiesCache.filter(
        (property) => String(property._id || property.id) !== id
    );

    favoriteService.remove(id).catch((err) => {
        console.error('Failed to remove favorite:', err);
        favoritesCache.add(id);
    });

    window.dispatchEvent(
        new CustomEvent('favoriteRemoved', {
            detail: { propertyId: id },
        })
    );

    return true;
};

export const toggleFavorite = (propertyId) => {
    const id = String(propertyId);
    if (isFavorited(id)) {
        removeFavorite(id);
        return false;
    }

    addFavorite(id);
    return true;
};
