const express = require('express');
const { authMiddleware, authorize } = require('../middleware/authMiddleware');
const { getAllUsers, updateUserStatus, getAllOrders,adminLogin, } = require('../controllers/adminController');
const { getAllProducts } = require('../controllers/productController');
const { getAdminStats } = require('../controllers/authController');
const adminroute = express.Router()

adminroute.get("/admin/users", authMiddleware, authorize("admin"), getAllUsers);
adminroute.put("/admin/users/:id", authMiddleware, authorize("admin"), updateUserStatus);
adminroute.get("/admin/products", authMiddleware, authorize("admin"), getAllProducts);
adminroute.get("/admin/orders", authMiddleware, authorize("admin"), getAllOrders);
adminroute.get("/admin/stats", authMiddleware, authorize("admin"), getAdminStats);
adminroute.post("/admin/login", adminLogin)


module.exports = adminroute