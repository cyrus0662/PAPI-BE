const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'seller_approved',
        'seller_suspended',
        'product_approved',
        'product_unapproved',
        'order_placed',
        'order_cancelled'
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null, // For product ID, order ID, etc.
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Index for efficient queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;

