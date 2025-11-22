const Notification = require('../models/Notification');
const { authMiddleware } = require('../middleware/authMiddleware');

/**
 * Get all notifications for the authenticated user
 */
const getNotifications = async (req, res) => {
  try {
    // Use req.userDoc._id if available (from authMiddleware), otherwise use req.user.id
    const userId = req.userDoc?._id || req.user?.id || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    console.log('Fetching notifications for user:', userId.toString());
    
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to 50 most recent
    
    const unreadCount = await Notification.countDocuments({ 
      userId, 
      isRead: false 
    });
    
    console.log('Found notifications:', notifications.length, 'unread:', unreadCount);
    
    res.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch notifications' });
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userDoc?._id || req.user?.id || req.user?._id;
    
    const notification = await Notification.findOne({ _id: id, userId });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    notification.isRead = true;
    await notification.save();
    
    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update notification' });
  }
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.userDoc?._id || req.user?.id || req.user?._id;
    
    await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } }
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update notifications' });
  }
};

/**
 * Delete a notification
 */
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userDoc?._id || req.user?.id || req.user?._id;
    
    const notification = await Notification.findOneAndDelete({ _id: id, userId });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to delete notification' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};

