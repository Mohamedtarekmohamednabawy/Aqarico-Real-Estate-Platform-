import { ADMIN_BYPASS_KEY, BYPASS_STORAGE_KEY } from "../config";

/**
 * Checks if the current user has admin bypass privileges.
 * Privileges can be granted via a secret query parameter and are persisted in localStorage.
 * 
 * Supports:
 * - ?admin_bypass=SECRET_KEY
 * - ?SECRET_KEY (key existence)
 * - ?ADMIN_BYPASS_KEY=SECRET_KEY
 */
export const checkAdminBypass = () => {
    // 1. Check localStorage for existing session
    if (localStorage.getItem(BYPASS_STORAGE_KEY) === ADMIN_BYPASS_KEY) {
        return true;
    }

    // Only run if we are in a browser environment
    if (typeof window === 'undefined' || !window.location) {
        return false;
    }

    const params = new URLSearchParams(window.location.search);

    // Check various ways the bypass might be provided
    const urlValueBypass = params.get('admin_bypass');
    const hasSecretAsKey = params.has(ADMIN_BYPASS_KEY);
    const urlLiteralBypass = params.get('ADMIN_BYPASS_KEY');

    if (urlValueBypass === ADMIN_BYPASS_KEY || hasSecretAsKey || urlLiteralBypass === ADMIN_BYPASS_KEY) {
        localStorage.setItem(BYPASS_STORAGE_KEY, ADMIN_BYPASS_KEY);
        return true;
    }

    return false;
};
