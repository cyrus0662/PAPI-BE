const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Buyer = require("../models/Buyer");
const Seller = require("../models/Seller");
const Admin = require("../models/Admin");
const User = require('../models/User');
const Product = require("../models/Product");
const Order = require("../models/Order");

const genToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "30d" });


const register = async (req, res) => {
  try {

    const { role, email, password, ...rest } = req.body;
    console.log(req?.body, { email, ...rest });


    if (!role || !["buyer", "seller"].includes(role))
      return res.status(400).json({ message: "Invalid role" });

    const existsBuyer = await User.findOne({ email });

    let ownerName = ""
    if (role == "seller") {
      ownerName == rest?.name
    }
    console.log("ownerName", ownerName, rest?.name, role == "seller");


    if (existsBuyer)
      return res.status(400).json({ message: "Email already used" });

    const hashed = await bcrypt.hash(password, 10);

    let user;
    user = await User.create({ email, password: hashed, ...rest, role, ownerName });



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
    console.log(req.body);

    // Find user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // Password check
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

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
    console.log(err);

    res.status(500).json({ message: err.message });
  }
};



const createAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log(req.body);

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

    let Model =
      role === "buyer"
        ? Buyer
        : role === "seller"
          ? Seller
          : role === "admin"
            ? Admin
            : null;

    if (!Model) return res.status(400).json({ message: "Invalid role" });

    const user = await Model.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not found" });

    const token = crypto.randomBytes(20).toString("hex");

    user.resetPasswordToken = token;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save();

    res.json({ message: "Reset token generated", resetToken: token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, role } = req.body;

    let Model =
      role === "buyer"
        ? Buyer
        : role === "seller"
          ? Seller
          : role === "admin"
            ? Admin
            : null;

    if (!Model) return res.status(400).json({ message: "Invalid role" });

    const user = await Model.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
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
    const users = (await User.countDocuments()) + (await Seller.countDocuments());
    const products = await Product.countDocuments();
    const orders = await Order.countDocuments();

    res.json({
      users,
      products,
      orders,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// users profiel

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


// user update profile
const updateProfile = async (req, res) => {
  try {
    const { name, phone, address, pincode } = req.body;

    if (!req.userDoc) {
      return res.status(404).json({ message: "User not found" });
    }

    req.userDoc.name = name || req.userDoc.name;
    req.userDoc.phone = phone || req.userDoc.phone;
    req.userDoc.address = address || req.userDoc.address;
    req.userDoc.pincode = pincode || req.userDoc.pincode;

    await req.userDoc.save();

    res.json({ success: true, user: req.userDoc });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};



module.exports = {
  register,
  login,
  createAdmin,
  forgotPassword,
  resetPassword,
  getAdminStats,
  getProfile,
  updateProfile
};
