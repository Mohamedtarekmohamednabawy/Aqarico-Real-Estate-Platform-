import api from './api';
import { invalidateGetCache } from './requestCache';

/**
 * User service — handles profile updates, password changes, account deletion
 */
const userService = {
  /**
   * Update own profile
   */
  updateProfile: async (profileData) => {
    const response = await api.put('/users/profile', profileData);
    invalidateGetCache('/users');
    invalidateGetCache('/properties');
    return response.data;
  },

  /**
   * Upload/update avatar
   */
  updateAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.put('/users/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    invalidateGetCache('/users');
    invalidateGetCache('/properties');
    return response.data;
  },

  /**
   * Update password
   */
  updatePassword: async ({ oldPassword, newPassword, confirmPassword }) => {
    const response = await api.put('/users/password', {
      oldPassword,
      newPassword,
      confirmPassword,
    });
    return response.data;
  },

  /**
   * Delete own account
   */
  deleteAccount: async (password) => {
    const response = await api.delete('/users/account', {
      data: { password },
    });
    invalidateGetCache();
    return response.data;
  },
};

export default userService;
