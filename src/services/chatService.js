import api from './api';
import { cachedGet, invalidateGetCache } from './requestCache';

/**
 * Chat service — handles chat messages
 */
const chatService = {
  /**
   * Get chat history for the current user
   */
  fetchHistory: async () => {
    return cachedGet('/chat', {
      ttl: 30 * 1000,
      scope: 'user',
    });
  },

  /**
   * Send a message to the AI chat assistant
   */
  sendMessage: async (message, theme, currency) => {
    const language = localStorage.getItem("app_lang") || "ar";
    const response = await api.post('/chat', { message, theme, currency, language });
    invalidateGetCache('/chat');
    return response.data;
  },

  /**
   * Manual save for specific triggers
   */
  saveManualMessages: async (messages) => {
    const response = await api.post('/chat/history', { messages });
    invalidateGetCache('/chat');
    return response.data;
  },

  /**
   * Reset the current user's chat history
   */
  resetChat: async () => {
    const response = await api.delete('/chat/reset');
    invalidateGetCache('/chat');
    return response.data;
  },
};

export default chatService;
