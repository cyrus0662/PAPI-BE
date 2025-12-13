const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Admin = require("../models/Admin");
const User = require('../models/User');
const Product = require("../models/Product");
const Order = require("../models/Order");

const genToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "30d" });


const register = async (req, res) => {
  try {

    const { role, email, password, ...rest } = req.body;


    if (!role || !["buyer", "seller"].includes(role))
      return res.status(400).json({ message: "Invalid role" });

    const existsBuyer = await User.findOne({ email });

    let ownerName = ""
    if (role == "seller") {
      ownerName == rest?.name
    }


    if (existsBuyer)
      return res.status(400).json({ message: "Email already used" });

    const hashed = await bcrypt.hash(password, 10);

    // Extract selectedProducts if provided (for sellers)
    const { selectedProducts, ...userData } = rest;
    
    let user;
    const createData = { email, password: hashed, ...userData, role, ownerName };
    
    // Add selectedProducts if seller and products are provided
    if (role === "seller" && selectedProducts && Array.isArray(selectedProducts)) {
      createData.selectedProducts = selectedProducts;
    }
    
    user = await User.create(createData);



    const token = genToken(user._id, role);

    res.status(201).json({
      token,
      role,
      user: { id: user._id, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // Password check
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    if (user.isSuspended) {
      return res.status(403).json({ message: "Your account is suspended" });
    }

    // Check if seller is approved
    if (user.role === "seller" && !user.isApproved) {
      return res.status(403).json({ message: "Your seller account is pending approval. Please wait for admin approval." });
    }

    // ROLE comes from user document
    const token = genToken(user._id, user.role);

    res.json({
      message: `${user.role} login successful`,
      token,
      role: user.role,
      user: {
        id: user._id,
        email: user.email,
        name: user.name || "",
      },
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



const createAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      return res.status(400).json({ message: "Only one admin allowed. Admin already exists." });
    }

    const hashed = await bcrypt.hash(password, 10);

    const admin = await Admin.create({
      name,
      email,
      password: hashed,

    });

    res.status(201).json({
      message: "Admin created successfully",
      admin: { id: admin._id, email: admin.email },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const forgotPassword = async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!role || !["buyer", "seller", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const Model = role === "admin" ? Admin : User;
    const query = role === "admin" ? { email } : { email, role };

    const user = await Model.findOne(query);
    if (!user) return res.status(400).json({ message: "User not found" });

    // Generate 6-digit OTP (100000-999999)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetPasswordToken = otp;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    res.json({ 
      message: "OTP generated successfully", 
      otp: otp,
      resetToken: otp // Keep for backward compatibility
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const verifyOTP = async (req, res) => {
  try {
    const { email, role, otp } = req.body;

    if (!role || !["buyer", "seller", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (!otp || otp.length !== 6) {
      return res.status(400).json({ message: "OTP must be 6 digits" });
    }

    const Model = role === "admin" ? Admin : User;
    const query = role === "admin" ? { email } : { email, role };

    const user = await Model.findOne(query);
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.resetPasswordToken !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.resetPasswordExpire < Date.now()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    // Return a verification token that can be used for password reset
    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = verificationToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // Extend for 10 more minutes

    await user.save();

    res.json({ 
      message: "OTP verified successfully", 
      token: verificationToken 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword, role } = req.body;

    if (!role || !["buyer", "seller", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const Model = role === "admin" ? Admin : User;
    const user = await Model.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
      ...(role === "admin" ? {} : { role }),
    });

    if (!user) return res.status(400).json({ message: "Invalid/Expired token" });

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const getAdminStats = async (req, res) => {
  try {
    const [buyerCount, sellerCount, productCount, activeOrders, completedOrders, productPerformance] = await Promise.all([
      User.countDocuments({ role: "buyer" }),
      User.countDocuments({ role: "seller" }),
      Product.countDocuments(),
      Order.countDocuments({ status: { $in: ["Pending", "Accepted", "Packed", "Out for Delivery"] } }),
      Order.countDocuments({ status: "Delivered" }),
      Order.aggregate([
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            totalQuantity: { $sum: "$items.qty" },
            totalRevenue: { $sum: { $multiply: ["$items.qty", "$items.price"] } },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const populatedPerformance = await Product.populate(productPerformance, {
      path: "_id",
      select: "name",
    });

    res.json({
      buyers: buyerCount,
      sellers: sellerCount,
      products: productCount,
      activeOrders,
      completedOrders,
      topProducts: populatedPerformance.map((entry) => ({
        productId: entry._id?._id,
        name: entry._id?.name,
        totalQuantity: entry.totalQuantity,
        totalRevenue: entry.totalRevenue,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getProfile = async (req, res) => {
  try {
    if (!req.userDoc) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(req.userDoc);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};


const updateProfile = async (req, res) => {
  try {
    if (!req.userDoc) {
      return res.status(404).json({ message: "User not found" });
    }

    const allowedFields =
      req.user.role === "seller"
        ? ["businessName", "ownerName", "address", "pincode", "phone", "organicCertificate", "logo", "additionalInfo", "sellerImages", "priceSheetPdf", "website", "documentDate"]
        : ["name", "phone", "address", "pincode"];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined && field !== "logo" && field !== "sellerImages" && field !== "priceSheetPdf") {
        req.userDoc[field] = req.body[field];
      }
    });

    // Handle sellerImages array
    if (req.body.sellerImages !== undefined && req.user.role === "seller") {
      req.userDoc.sellerImages = Array.isArray(req.body.sellerImages) ? req.body.sellerImages : [];
    }

    // Handle priceSheetPdf
    if (req.body.priceSheetPdf !== undefined && req.user.role === "seller") {
      req.userDoc.priceSheetPdf = req.body.priceSheetPdf;
    }

    // Handle documentDate
    if (req.body.documentDate !== undefined && req.user.role === "seller") {
      req.userDoc.documentDate = new Date(req.body.documentDate);
    }

    if (req.file && req.user.role === "seller") {
      req.userDoc.logo = "/uploads/" + req.file.filename;
    } else if (req.body.logo !== undefined && req.user.role === "seller") {
      req.userDoc.logo = req.body.logo;
    }

    await req.userDoc.save();

    res.json({ success: true, user: req.userDoc });
  } catch (error) {
    res.status(500).json({ message: error.message || "Server Error" });
  }
};



module.exports = {
  verifyOTP,
  register,
  login,
  createAdmin,
  forgotPassword,
  resetPassword,
  getAdminStats,
  getProfile,
  updateProfile
};
