import api from './api';
import { invalidateGetCache } from './requestCache';
import { getDeviceId, getDeviceMetadata } from '../utils/deviceInfo';

/**
 * Authentication service — handles register, login, session restore
 */
const authService = {
  /**
   * Register a new user
   * Stores token and user data in localStorage on success
   */
  register: async ({ firstName, lastName, username, email, password, phone, country }) => {
    const response = await api.post('/auth/register', {
      firstName,
      lastName,
      username,
      email,
      password,
      phone,
      country,
    });

    if (response.data.success) {
      localStorage.setItem('aqarico_token', response.data.token);
      localStorage.setItem('aqarico_user', JSON.stringify(response.data.user));
      invalidateGetCache();
    }

    return response.data;
  },

  /**
   * Login user
   * Stores token and user data in localStorage on success
   */
  login: async (loginIdentifier, password) => {
    const deviceId = getDeviceId();
    const deviceMetadata = getDeviceMetadata();
    const response = await api.post('/auth/login', {
      loginIdentifier,
      password,
      deviceId,
      deviceMetadata
    });

    if (response.data.success && response.data.token) {
      localStorage.setItem('aqarico_token', response.data.token);
      localStorage.setItem('aqarico_user', JSON.stringify(response.data.user));
      invalidateGetCache();
    }

    return response.data;
  },

  /**
   * Verify 2FA code
   * @param {string} userId - The user ID to verify
   * @param {string} code - The verification code
   * @param {boolean} skipStorage - If true, token won't be saved to localStorage (useful for registration flow)
   */
  verify2FA: async (userId, code, skipStorage = false) => {
    const deviceId = getDeviceId();
    const deviceMetadata = getDeviceMetadata();
    const response = await api.post('/auth/verify-2fa', {
      userId,
      code,
      deviceId,
      deviceMetadata
    });

    if (response.data.success && !skipStorage) {
      localStorage.setItem('aqarico_token', response.data.token);
      localStorage.setItem('aqarico_user', JSON.stringify(response.data.user));
      invalidateGetCache();
    }

    return response.data;
  },

  /**
   * Resend 2FA code
   */
  resend2FA: async (userId, method) => {
    const response = await api.post('/auth/resend-2fa', { userId, method });
    return response.data;
  },

  /**
   * Get trusted devices
   */
  getDevices: async () => {
    const response = await api.get('/auth/devices');
    return response.data;
  },

  /**
   * Revoke device trust
   */
  revokeDevice: async (deviceId) => {
    const response = await api.delete(`/auth/devices/${deviceId}`);
    return response.data;
  },

  /**
   * Get current user from token (session restore)
   */
  getMe: async () => {
    const response = await api.get('/auth/me');
    if (response.data.success && response.data.user) {
      authService.updateStoredUser(response.data.user);
      // Optional: don't dispatch if nothing changed, but usually safer to dispatch
      window.dispatchEvent(new Event('userChanged'));
    }
    return response.data;
  },

  /**
   * Logout — clear stored auth data and secure cookie
   */
  logout: async () => {
    try {
      await api.get('/auth/logout');
    } catch (err) {
      console.error('Error during backend logout:', err);
    }
    localStorage.removeItem('aqarico_token');
    localStorage.removeItem('aqarico_user');
    invalidateGetCache();
    window.dispatchEvent(new Event('userChanged'));
    window.location.href = '/login';
  },

  /**
   * Get current user from localStorage (synchronous, for UI reads)
   */
  getCurrentUser: () => {
    try {
      return JSON.parse(localStorage.getItem('aqarico_user'));
    } catch {
      return null;
    }
  },

  /**
   * Check if user is logged in
   */
  isLoggedIn: () => {
    return !!localStorage.getItem('aqarico_user');
  },

  /**
   * Update stored user data in localStorage (after profile edits or settings change)
   */
  updateStoredUser: (userData) => {
    const currentUser = authService.getCurrentUser();
    localStorage.setItem('aqarico_user', JSON.stringify({ ...currentUser, ...userData }));
  },

  /**
   * Update user settings (theme, language) on backend and locally
   */
  updateSettings: async (settings) => {
    const response = await api.put('/users/settings', settings);
    if (response.data.success && response.data.user) {
      authService.updateStoredUser(response.data.user);
    }
    return response.data;
  },

  /**
   * Request password reset
   */
  requestPasswordReset: async (loginIdentifier, method) => {
    const response = await api.post('/auth/forgot-password', { loginIdentifier, method });
    return response.data;
  },

  /**
   * Check if identifier exists and returns user(s)
   */
  checkIdentifier: async (loginIdentifier) => {
    const response = await api.post('/auth/check-identifier', { loginIdentifier });
    return response.data;
  },

  /**
   * Reset password with code
   */
  resetPassword: async (loginIdentifier, code, newPassword) => {
    const response = await api.post('/auth/reset-password', { loginIdentifier, code, newPassword });
    return response.data;
  },
};

export default authService;
