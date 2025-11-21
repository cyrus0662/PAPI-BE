const express = require('express');
const { authMiddleware, authorize } = require('../middleware/authMiddleware');
const {
  getAllUsers,
  updateUser,
  getAllOrdersAdmin,
  adminLogin,
  resetUserPassword,
  getAllProductsAdmin,
  updateProductApproval,
  overrideOrderStatus
} = require('../controllers/adminController');
const { getAdminStats } = require('../controllers/authController');
const adminroute = express.Router()

adminroute.get("/admin/users", authMiddleware, authorize("admin"), getAllUsers);
adminroute.put("/admin/users/:id", authMiddleware, authorize("admin"), updateUser);
adminroute.put("/admin/users/:id/reset-password", authMiddleware, authorize("admin"), resetUserPassword);
adminroute.get("/admin/products", authMiddleware, authorize("admin"), getAllProductsAdmin);
adminroute.put("/admin/products/:id/approval", authMiddleware, authorize("admin"), updateProductApproval);
adminroute.get("/admin/orders", authMiddleware, authorize("admin"), getAllOrdersAdmin);
adminroute.put("/admin/orders/:id/status", authMiddleware, authorize("admin"), overrideOrderStatus);
adminroute.get("/admin/stats", authMiddleware, authorize("admin"), getAdminStats);
adminroute.post("/admin/login", adminLogin)


module.exports = adminroute