const Product = require("../models/Product");
const Order = require("../models/Order");
const Admin = require("../models/Admin");
const User = require("../models/User");
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
  const buyers = await User.find({ role: "buyer" }).select("-password");
  const sellers = await User.find({ role: "seller" }).select("-password");
  res.json({ buyers, sellers });
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const { isApproved, isSuspended, ...rest } = req.body;

  const user = await User.findById(id);
  if (!user || !["buyer", "seller"].includes(user.role)) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.role === "seller" && isApproved !== undefined) {
    user.isApproved = isApproved;
  }
  if (isSuspended !== undefined) {
    user.isSuspended = isSuspended;
  }

  const editableFields =
    user.role === "seller"
      ? ["businessName", "ownerName", "address", "pincode", "phone", "organicCertificate", "logo"]
      : ["name", "phone", "address", "pincode", "email"];

  editableFields.forEach((field) => {
    if (rest[field] !== undefined) {
      user[field] = rest[field];
    }
  });

  await user.save();
  res.json(user);
};

const resetUserPassword = async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({ message: "Password reset successfully" });
};

const getAllProductsAdmin = async (req, res) => {
  const { isApproved } = req.query;
  const filter = {};
  if (isApproved !== undefined) {
    filter.isApproved = isApproved === "true";
  }
  const products = await Product.find(filter).populate("seller", "businessName ownerName email");
  res.json(products);
};

const updateProductApproval = async (req, res) => {
  const { id } = req.params;
  const { isApproved } = req.body;

  const product = await Product.findById(id);
  if (!product) return res.status(404).json({ message: "Product not found" });

  product.isApproved = Boolean(isApproved);
  await product.save();

  res.json(product);
};

const getAllOrdersAdmin = async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) {
    filter.status = status;
  }
  const orders = await Order.find(filter).populate("buyer seller");
  res.json(orders);
};

const overrideOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ["Pending","Accepted","Rejected","Packed","Out for Delivery","Delivered","Cancelled"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid order status" });
  }

  const order = await Order.findById(id);
  if (!order) return res.status(404).json({ message: "Order not found" });

  order.status = status;
  await order.save();

  res.json(order);
};



module.exports = {
  adminLogin,
  getAllUsers,
  updateUser,
  resetUserPassword,
  getAllProductsAdmin,
  updateProductApproval,
  getAllOrdersAdmin,
  overrideOrderStatus
}