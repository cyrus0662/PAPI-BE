const Buyer = require("../models/Buyer");
const Seller = require("../models/Seller");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken")


// ADMIN LOGIN
const adminLogin = async (req, res) => {
  const { email, password } = req.body;
console.log(req.body);

  const admin = await Admin.findOne({ email });

  if (!admin) return res.status(400).json({ message: "Admin not found" });

  const match = await bcrypt.compare(password, admin.password);
  if (!match) return res.status(400).json({ message: "Invalid password" });

  const token = jwt.sign({ id: admin._id, role: "admin" }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
console.log("Admin", {role: "admin"});

  res.json({ message: "Login success", token , role: "admin",});
};

const getAllUsers = async (req, res) => {
  const buyers = await Buyer.find().select("-password");
  const sellers = await Seller.find().select("-password");
  res.json({ buyers, sellers });
};

const updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { isApproved, isSuspended, role } = req.body;
  if (role === "seller") {
    const user = await Seller.findById(id);
    if (!user) return res.status(404).json({ message: "Not found" });
    if (isApproved !== undefined) user.isApproved = isApproved;
    if (isSuspended !== undefined) user.isSuspended = isSuspended;
    await user.save();
    return res.json(user);
  } else if (role === "buyer") {
    const user = await Buyer.findById(id);
    if (!user) return res.status(404).json({ message: "Not found" });
    if (isSuspended !== undefined) user.isSuspended = isSuspended;
    await user.save();
    return res.json(user);
  }
  res.status(400).json({ message: "role required" });
};

const getAllProducts = async (req, res) => {
  const products = await Product.find().populate("seller", "businessName ownerName");
  res.json(products);
};

const getAllOrders = async (req, res) => {
  const orders = await Order.find().populate("buyer seller");
  res.json(orders);
};



module.exports = {adminLogin,getAllUsers,updateUserStatus,getAllProducts,getAllOrders}