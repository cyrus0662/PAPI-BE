const express = require('express');
const { authMiddleware, authorize } = require("../middleware/authMiddleware");
const { placeOrder, getMyOrders, getOrdersForSeller, updateOrderStatus } = require('../controllers/orderController');
const orderRoute = express.Router()

orderRoute.post("/orders", authMiddleware, authorize("buyer"), placeOrder);
orderRoute.get("/orders/my", authMiddleware, authorize("buyer"), getMyOrders);
orderRoute.get("/orders/seller", authMiddleware, authorize("seller"), getOrdersForSeller);
orderRoute.put("/orders/:id/status", authMiddleware, authorize("seller","admin"), updateOrderStatus);

module.exports = orderRoute