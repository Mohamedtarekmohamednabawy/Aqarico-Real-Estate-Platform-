import axios from 'axios';
import Chat from '../models/Chat.js';

const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || 'http://localhost:8001';

/**
 * @desc    Get chat history for current user
 * @route   GET /api/chat
 * @access  Private
 */
export const getChatHistory = async (req, res) => {
  try {
    const chat = await Chat.findOne({ user: req.user._id });
    res.json({
      success: true,
      messages: chat ? chat.messages : []
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Send chat message — stores in DB and proxies to Python AI
 * @route   POST /api/chat
 * @access  Private
 */
export const sendMessage = async (req, res, next) => {
  try {
    const { message, language } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    let chat = await Chat.findOne({ user: req.user._id });
    if (!chat) {
      chat = await Chat.create({ user: req.user._id, messages: [] });
    }

    const history = chat.messages.map(m => ({
      role: m.role,
      text: m.text
    })).slice(-30);

    let reply;
    let actions = [];
    const startTime = Date.now();
    try {
      const aiResponse = await axios.post(`${CHAT_SERVICE_URL}/chat`, {
        message: message.trim(),
        history,
        user_name: req.user.firstName || req.user.username || 'User',
        user_role: req.user.role || 'buyer',
        language: language || 'ar'
      }, { timeout: 60000 });

      const duration = (Date.now() - startTime) / 1000;
      console.log(`[CHAT DEBUG] AI responded in ${duration}s`);

      reply = aiResponse.data.reply;
      actions = aiResponse.data.actions || [];
    } catch (aiError) {
      const duration = (Date.now() - startTime) / 1000;
      console.error(`[CHAT DEBUG] AI Service Error after ${duration}s:`, aiError.message);
      reply = 'الشات بوت مش متاح دلوقتي، جرب تاني بعد شوية.';
    }

    // Atomic update using $push to avoid version conflicts
    await Chat.findOneAndUpdate(
      { user: req.user._id },
      {
        $push: {
          messages: {
            $each: [
              { role: 'user', text: message.trim(), time: new Date() },
              { role: 'bot', text: reply, time: new Date() }
            ]
          }
        }
      },
      { upsert: true }
    );

    res.json({ success: true, reply, actions });
  } catch (error) {
    console.error('Chat controller error:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * @desc    Reset chat history for current user
 * @route   DELETE /api/chat/reset
 * @access  Private
 */
export const resetChat = async (req, res) => {
  try {
    await Chat.findOneAndDelete({ user: req.user._id });
    res.json({ success: true, message: 'Chat history reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Save manual messages to DB
 * @route   POST /api/chat/history
 * @access  Private
 */
export const saveHistory = async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: 'Messages array is required' });
    }

    // Atomic update using $push to avoid version conflicts
    await Chat.findOneAndUpdate(
      { user: req.user._id },
      {
        $push: {
          messages: {
            $each: messages.map(m => ({
              role: m.role,
              text: m.text,
              time: m.time || new Date()
            }))
          }
        }
      },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};