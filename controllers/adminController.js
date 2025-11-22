const Product = require("../models/Product");
const Order = require("../models/Order");
const Admin = require("../models/Admin");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { notifySellerApproved, notifySellerSuspended, notifyProductApproved } = require("../utils/notificationHelper");


const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email });

  if (!admin) return res.status(400).json({ message: "Admin not found" });

  const match = await bcrypt.compare(password, admin.password);
  if (!match) return res.status(400).json({ message: "Invalid password" });

  const token = jwt.sign({ id: admin._id, role: "admin" }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.json({ message: "Login success", token , role: "admin",});
};

const getAllUsers = async (req, res) => {
  try {
    const buyers = await User.find({ role: "buyer" }).select("-password");
    const sellers = await User.find({ role: "seller" }).select("-password");
    res.json({ buyers, sellers });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch users" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved, isSuspended, ...rest } = req.body;

    const user = await User.findById(id);
    if (!user || !["buyer", "seller"].includes(user.role)) {
      return res.status(404).json({ message: "User not found" });
    }

    const wasApproved = user.isApproved;
    const wasSuspended = user.isSuspended;
    
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

    // Create notifications for seller status changes
    if (user.role === "seller") {
      if (isApproved !== undefined && isApproved !== wasApproved) {
        if (isApproved) {
          await notifySellerApproved(user._id);
        }
      }
      if (isSuspended !== undefined && isSuspended !== wasSuspended) {
        await notifySellerSuspended(user._id, isSuspended);
      }
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update user" });
  }
};

const resetUserPassword = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to reset password" });
  }
};

const getAllProductsAdmin = async (req, res) => {
  try {
    const { isApproved } = req.query;
    const filter = {};
    if (isApproved !== undefined) {
      filter.isApproved = isApproved === "true";
    }
    const products = await Product.find(filter).populate("seller", "businessName ownerName email");
    
    // Format products with correct image URLs
    const formattedProducts = products.map(p => {
      let imageUrl = null;
      if (p.image) {
        // If image is already a full URL (Cloudinary), use it as-is
        if (p.image.startsWith('http://') || p.image.startsWith('https://')) {
          imageUrl = p.image;
        } else {
          // Local upload - prepend server URL
          imageUrl = `${req.protocol}://${req.get("host")}${p.image}`;
        }
      }
      
      const productObj = p.toObject ? p.toObject() : p;
      return {
        ...productObj,
        image: imageUrl
      };
    });
    
    res.json(formattedProducts);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch products" });
  }
};

const updateProductApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;

    if (isApproved === undefined) {
      return res.status(400).json({ message: "isApproved field is required" });
    }

    // Get product before update to check seller and name
    const productBefore = await Product.findById(id);
    
    if (!productBefore) {
      return res.status(404).json({ message: "Product not found" });
    }

    const result = await Product.updateOne(
      { _id: id },
      { $set: { isApproved: Boolean(isApproved) } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Create notification for product approval change
    try {
      // Get seller ID - handle both ObjectId and populated object
      let sellerId = null;
      if (productBefore.seller) {
        // If seller is populated (object), use _id
        if (typeof productBefore.seller === 'object' && productBefore.seller._id) {
          sellerId = productBefore.seller._id;
        } 
        // If seller is just an ObjectId
        else if (productBefore.seller.toString) {
          sellerId = productBefore.seller;
        }
      }

      if (sellerId) {
        console.log('Creating notification for product approval:', {
          sellerId: sellerId.toString(),
          productId: id,
          productName: productBefore.name,
          isApproved: Boolean(isApproved)
        });
        const notification = await notifyProductApproved(
          sellerId,
          id,
          productBefore.name,
          Boolean(isApproved)
        );
        if (notification) {
          console.log('Notification created successfully:', notification._id);
        } else {
          console.warn('Notification creation returned null');
        }
      } else {
        console.warn('No seller found for product:', id, 'seller field:', productBefore.seller);
      }
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // Don't fail the request if notification creation fails
    }

    try {
      const product = await Product.findById(id)
        .populate("seller", "businessName ownerName email")
        .lean();
      
      if (product && product.category && typeof product.category === 'string') {
        product.category = null;
      }
      
      res.json(product);
    } catch (fetchError) {
      res.json({ 
        _id: id, 
        isApproved: Boolean(isApproved),
        message: "Product approval updated successfully" 
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update product approval" });
  }
};

const getAllOrdersAdmin = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) {
      filter.status = status;
    }
    const orders = await Order.find(filter).populate("buyer seller");
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch orders" });
  }
};

const overrideOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status field is required" });
    }

    const allowed = ["Pending","Accepted","Rejected","Packed","Out for Delivery","Delivered","Cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = status;
    await order.save();

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update order status" });
  }
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