import axios from 'axios';

/**
 * Axios instance configured with base URL and auth interceptor.
 * All service files import this instance to make API calls.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5050/api',
  withCredentials: true,
  timeout: 60000, // Increased to 60 seconds for AI/Search stability
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token to every request (fallback for cross-origin if needed)
api.interceptors.request.use(
  (config) => {
    // Note: When withCredentials is true, cookies are sent automatically.
    // We keep the header as a secondary fallback for now.
    const token = localStorage.getItem('aqarico_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 (expired/invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 1. Handle Critical Session Expiration (401)
    if (error.response && error.response.status === 401) {
      const message = error.response.data?.message?.toLowerCase() || "";
      const currentPath = window.location.pathname;

      const isVerificationPage = currentPath === '/verify-2fa';
      const isPasswordError = message && (message.includes("incorrect password") || message.includes("incorrect old password"));
      const isWrongCode = message && (message.includes("incorrect verification") || message.includes("verification code"));

      if (isVerificationPage || isPasswordError || isWrongCode) {
        return Promise.reject(error);
      }

      localStorage.removeItem('aqarico_token');
      localStorage.removeItem('aqarico_user');

      if (currentPath !== '/login' && currentPath !== '/register') {
        window.dispatchEvent(new Event('userChanged'));
        window.location.href = '/login';
      }
    }

    // 2. Handle Backend Unavailability (5xx, Network Timeout, Connection Refused)
    const isNetworkError = !error.response && error.code !== 'ERR_CANCELED';
    const isServerError = error.response && error.response.status >= 500;
    const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');

    if (isNetworkError || isServerError || isTimeout) {
      const url = error.config?.url || "";
      const method = error.config?.method?.toLowerCase() || "";
      const isChat = url.includes('/chat');
      const isCritical = method === 'get' && !isChat;

      // RETRY LOGIC: If a critical request fails, try one more time after 1.5s 
      // before showing the "Backend Down" screen. This handles "wake-up" blips.
      if (isCritical && !error.config?._retry) {
        error.config._retry = true;
        console.warn(`[API DEBUG] Critical request failed (${error.code}). Retrying in 1.5s... ${url}`);

        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(api(error.config));
          }, 1500);
        });
      }

      if (isCritical) {
        // Dispatch a custom event that BackendStatusProvider will listen to
        window.dispatchEvent(new CustomEvent('aqarico:backend_down', {
          detail: {
            status: error.response?.status,
            code: error.code,
            message: error.message,
            isCritical: true
          }
        }));
      } else {
        console.warn(`[API DEBUG] Suppressed global "Backend Down" screen for non-critical failure: ${method.toUpperCase()} ${url}`);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
