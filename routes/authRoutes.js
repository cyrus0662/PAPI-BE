const express = require('express');
const { register, login, forgotPassword, verifyOTP, resetPassword, createAdmin, getProfile, updateProfile } = require('../controllers/authController');
const authroute = express.Router()
const { authMiddleware, authorize } = require('../middleware/authMiddleware');
const { uploadLogo } = require('../middleware/uploadMiddleware');

authroute.post("/auth/register", register);
authroute.post("/auth/login", login);
authroute.post("/auth/admin/create", createAdmin);
authroute.post("/auth/forgot", forgotPassword);
authroute.post("/auth/forgot-password", forgotPassword); // Keep for backward compatibility
authroute.post("/auth/verify-otp", verifyOTP);
authroute.put("/auth/reset-password/:token", resetPassword);
authroute.get("/users/profile", authMiddleware, getProfile);
authroute.put("/users/profile", authMiddleware, uploadLogo, updateProfile);

module.exports = authroute