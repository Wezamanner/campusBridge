import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversationKey: {
      type: String,
      required: [true, 'Conversation key is required for threading'],
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender reference is required'],
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient reference is required'],
      index: true,
    },
    body: {
      type: String,
      required: [true, 'Message body cannot be empty'],
      trim: true,
      minlength: [1, 'Message must contain at least 1 character'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent users sending messages to themselves
messageSchema.pre('validate', function () {
  if (this.senderId && this.recipientId && this.senderId.toString() === this.recipientId.toString()) {
    this.invalidate('recipientId', 'Sender and recipient cannot be the same user');
  }
  // Auto-generate conversationKey if not provided
  if (!this.conversationKey && this.senderId && this.recipientId) {
    const ids = [this.senderId.toString(), this.recipientId.toString()].sort();
    this.conversationKey = `${ids[0]}_${ids[1]}`;
  }
});

messageSchema.index({ conversationKey: 1, createdAt: 1 });
messageSchema.index({ recipientId: 1, readAt: 1 });

export const Message = mongoose.model('Message', messageSchema);
export default Message;
