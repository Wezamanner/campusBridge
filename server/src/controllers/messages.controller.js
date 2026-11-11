/**
 * Messages Controller
 *
 * Phase 11 — CampusBridge SRS v2.0 Compliance
 *
 * SRS Traceability:
 *   FR-33 (Send messages) · FR-34 (View conversation history)
 *   ASM-05 (Students may only message instructors and coordinators)
 *
 * Authorization:
 *   - All authenticated users may use messaging.
 *   - Students are restricted to messaging instructors and coordinators (ASM-05).
 *   - Users may only read conversations in which they are a participant.
 */

import { Message } from '../models/Message.js';
import { User } from '../models/User.js';

/** Build conversationKey from two user IDs (sorted, deterministic) */
const makeConversationKey = (a, b) => [a.toString(), b.toString()].sort().join('_');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/messages/conversations
// List all conversations for the authenticated user (FR-34)
// Returns the most recent message per conversation thread.
// ─────────────────────────────────────────────────────────────────────────────
export const listConversations = async (req, res, next) => {
  try {
    // Find all messages where user is sender or recipient, group by conversationKey
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: req.user._id },
            { recipientId: req.user._id },
          ],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$conversationKey',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$recipientId', req.user._id] }, { $eq: ['$readAt', null] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
    ]);

    // Populate partner user info
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const msg = conv.lastMessage;
        const partnerId =
          msg.senderId.toString() === req.user._id.toString() ? msg.recipientId : msg.senderId;
        const partner = await User.findById(partnerId).select('firstName lastName role').lean();
        return {
          conversationKey: conv._id,
          partner,
          lastMessage: {
            body: msg.body,
            senderId: msg.senderId,
            createdAt: msg.createdAt,
            readAt: msg.readAt,
          },
          unreadCount: conv.unreadCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Conversations retrieved successfully.',
      data: enriched,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/messages/with/:userId
// View full message thread with another user (FR-34)
// ─────────────────────────────────────────────────────────────────────────────
export const getThread = async (req, res, next) => {
  try {
    const partnerId = req.params.userId;
    const partner = await User.findById(partnerId).select('firstName lastName role').lean();

    if (!partner) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const conversationKey = makeConversationKey(req.user._id, partnerId);

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      Message.find({ conversationKey })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments({ conversationKey }),
    ]);

    // Mark received messages as read
    await Message.updateMany(
      { conversationKey, recipientId: req.user._id, readAt: null },
      { $set: { readAt: new Date() } }
    );

    return res.status(200).json({
      success: true,
      message: 'Message thread retrieved successfully.',
      data: { partner, messages: messages.reverse() },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/messages
// Send a message to another user (FR-33, ASM-05)
// ─────────────────────────────────────────────────────────────────────────────
export const sendMessage = async (req, res, next) => {
  try {
    const { recipientId, body } = req.body;

    if (!recipientId || !body) {
      return res
        .status(400)
        .json({ success: false, message: 'recipientId and body are required.' });
    }

    if (recipientId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot message yourself.' });
    }

    const recipient = await User.findById(recipientId).select('firstName lastName role active').lean();

    if (!recipient || !recipient.active) {
      return res.status(404).json({ success: false, message: 'Recipient not found.' });
    }

    // ASM-05: Students may only message instructors and coordinators
    if (req.user.role === 'student') {
      if (!['instructor', 'coordinator'].includes(recipient.role)) {
        return res.status(403).json({
          success: false,
          message:
            'Students may only send messages to instructors or coordinators (ASM-05).',
        });
      }
    }

    const message = await Message.create({
      senderId: req.user._id,
      recipientId,
      body: body.trim(),
    });

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully.',
      data: message,
    });
  } catch (err) {
    next(err);
  }
};
