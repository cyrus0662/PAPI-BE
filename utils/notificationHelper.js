const Notification = require('../models/Notification');

/**
 * Create a notification for a user
 * @param {Object} options - Notification options
 * @param {String} options.userId - User ID to notify
 * @param {String} options.type - Notification type
 * @param {String} options.title - Notification title
 * @param {String} options.message - Notification message
 * @param {String} options.relatedId - Related entity ID (product, order, etc.)
 * @param {Object} options.metadata - Additional metadata
 */
const createNotification = async ({ userId, type, title, message, relatedId = null, metadata = {} }) => {
  try {
    // Ensure userId is a valid ObjectId or string
    if (!userId) {
      console.error('Notification creation failed: userId is required');
      return null;
    }

    // Convert to string if it's an ObjectId
    const userIdStr = userId.toString ? userId.toString() : userId;
    
    console.log('Creating notification:', {
      userId: userIdStr,
      type,
      title,
      message
    });

    const notification = await Notification.create({
      userId: userIdStr,
      type,
      title,
      message,
      relatedId: relatedId ? (relatedId.toString ? relatedId.toString() : relatedId) : null,
      metadata,
    });
    
    console.log('Notification created successfully:', notification._id);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error.message, error.stack);
    return null;
  }
};

/**
 * Create notification for seller approval
 */
const notifySellerApproved = async (sellerId) => {
  return createNotification({
    userId: sellerId,
    type: 'seller_approved',
    title: 'Account Approved',
    message: 'Your seller account has been approved! You can now start selling products.',
  });
};

/**
 * Create notification for seller suspension
 */
const notifySellerSuspended = async (sellerId, isSuspended) => {
  if (isSuspended) {
    return createNotification({
      userId: sellerId,
      type: 'seller_suspended',
      title: 'Account Suspended',
      message: 'Your seller account has been suspended. Please contact support for more information.',
    });
  } else {
    return createNotification({
      userId: sellerId,
      type: 'seller_approved',
      title: 'Account Unsuspended',
      message: 'Your seller account has been reactivated. You can now continue selling.',
    });
  }
};

/**
 * Create notification for product approval
 */
const notifyProductApproved = async (sellerId, productId, productName, isApproved) => {
  if (isApproved) {
    return createNotification({
      userId: sellerId,
      type: 'product_approved',
      title: 'Product Approved',
      message: `Your product "${productName}" has been approved and is now visible to buyers.`,
      relatedId: productId,
      metadata: { productName },
    });
  } else {
    return createNotification({
      userId: sellerId,
      type: 'product_unapproved',
      title: 'Product Unapproved',
      message: `Your product "${productName}" has been unapproved and is no longer visible to buyers.`,
      relatedId: productId,
      metadata: { productName },
    });
  }
};

module.exports = {
  createNotification,
  notifySellerApproved,
  notifySellerSuspended,
  notifyProductApproved,
};

