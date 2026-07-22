import Agent from '../models/Agent.js';
import mongoose from 'mongoose';
import { escapeRegex } from '../utils/regexUtils.js';

/**
 * @desc    Get all agents with user info populated
 * @route   GET /api/agents
 * @access  Public
 */
export const getAgents = async (req, res, next) => {
  try {
    const agents = await Agent.find()
      .populate('user', 'firstName lastName email avatar phone')
      .populate({
        path: 'assignedListings',
        select: 'title price area images _id'
      });

    // Ensure agents have names (if not set in Agent model, use User model names)
    const processedAgents = await Promise.all(agents.map(async (agent) => {
      let updated = false;
      if (!agent.name && agent.user) {
        agent.name = `${agent.user.firstName} ${agent.user.lastName}`;
        updated = true;
      }
      if (updated) {
        await agent.save();
      }
      return agent;
    }));

    res.json({
      success: true,
      data: processedAgents,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single agent with their listings
 * @route   GET /api/agents/:id
 * @access  Public
 */
export const getAgent = async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.params.id)
      .populate('user', 'firstName lastName email avatar phone')
      .populate('assignedListings');

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found',
      });
    }

    // Ensure name is present
    if (!agent.name && agent.user) {
      agent.name = `${agent.user.firstName} ${agent.user.lastName}`;
      await agent.save();
    }

    res.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle agent verification (admin only)
 * @route   PUT /api/agents/:id/verify
 * @access  Admin
 */
export const verifyAgent = async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found',
      });
    }

    agent.isVerifiedByAdmin = !agent.isVerifiedByAdmin;
    await agent.save();

    res.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update agent profile (name, bio, phone)
 * @route   PUT /api/agents/:id
 * @access  Agent owner or Admin
 */
export const updateAgent = async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found',
      });
    }

    // Check if the user owns this agent profile or is admin
    if (agent.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this agent profile',
      });
    }

    const { name, bio, phone, location, district } = req.body;
    if (name !== undefined) agent.name = name;
    if (bio !== undefined) agent.bio = bio;
    if (phone !== undefined) agent.phone = phone;
    if (location !== undefined) agent.location = location;
    if (district !== undefined) agent.district = district;

    await agent.save();

    res.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Search for an agent by phone number to verify existence
 * @route   GET /api/agents/verify-search/phone
 * @access  Public
 */
export const searchAgentByPhone = async (req, res, next) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    // Normalize query to match DB storage (strip non-digits and leading zeros)
    let cleaned = phone.replace(/\D/g, '');
    cleaned = cleaned.replace(/^0+/, '');
    const escapedCleaned = escapeRegex(cleaned);

    // For Egypt and similar, the local number is typically the last 10 digits.
    // If we have a long string (like 20122...), we also try to match just the suffix.
    const localPart = cleaned.length > 10 ? cleaned.slice(-10) : cleaned;
    const escapedLocal = escapeRegex(localPart);

    // Search in Agent model using suffix matching to handle dial codes/leading zeros
    let agent = await Agent.findOne({
      $or: [
        { phone: cleaned },
        { phone: new RegExp(escapedCleaned + '$') },
        { phone: new RegExp(escapedLocal + '$') }
      ]
    }).populate('user', 'firstName lastName email avatar');

    if (!agent) {
      // Fallback: search user by phone if they are an agent
      const User = mongoose.model('User');
      const user = await User.findOne({
        $or: [
          { phone: cleaned },
          { phone: new RegExp(cleaned + '$') },
          { phone: new RegExp(localPart + '$') }
        ],
        role: 'agent'
      });
      if (user) {
        agent = await Agent.findOne({ user: user._id }).populate('user', 'firstName lastName email avatar');
      }
    }

    if (agent && agent.isVerifiedByAdmin) {
      // Ensure name is present in agent if it was missing
      if (!agent.name && agent.user) {
        agent.name = `${agent.user.firstName} ${agent.user.lastName}`;
        await agent.save();
      }

      return res.json({
        success: true,
        verified: true,
        data: {
          name: agent.name,
          email: agent.user ? agent.user.email : null,
          avatar: agent.user ? agent.user.avatar : null,
          phone: agent.phone,
          bio: agent.bio
        }
      });
    }

    res.json({
      success: true,
      verified: false,
      message: 'Agent is not in our verified records.'
    });
  } catch (error) {
    next(error);
  }
};
