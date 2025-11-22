const express = require('express');
const router = express.Router();
const { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification 
} = require('../controllers/notificationController');
const { authMiddleware } = require('../middleware/authMiddleware');

// All notification routes require authentication
router.get('/notifications', authMiddleware, getNotifications);
router.put('/notifications/:id/read', authMiddleware, markAsRead);
router.put('/notifications/read-all', authMiddleware, markAllAsRead);
router.delete('/notifications/:id', authMiddleware, deleteNotification);

module.exports = router;

