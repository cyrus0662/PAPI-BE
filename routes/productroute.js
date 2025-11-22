const express = require("express");
const {
  getAllProducts,
  getSellerProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getSingleProduct,
  getProductsByCategory,
  addToCart,
  getCart,
  removeItem,
  updateQuantity,
  clearCart
} = require("../controllers/productController");

const { authMiddleware, authorize } = require("../middleware/authMiddleware");

const { uploadSingle } = require("../middleware/uploadMiddleware");

const productroute = express.Router();

productroute.get("/products", getAllProducts);

productroute.get("/products/my", authMiddleware, authorize("seller"), getSellerProducts);
productroute.post("/products", authMiddleware, authorize("seller"), uploadSingle, createProduct);
productroute.put("/products/:id", authMiddleware, authorize("seller"), uploadSingle, updateProduct);
productroute.delete("/products/:id", authMiddleware, authorize("seller"), deleteProduct);
productroute.get('/products/:id',getSingleProduct)
productroute.get("/products/category/:category", getProductsByCategory);
productroute.post("/cart/add", authMiddleware, authorize("buyer"), addToCart);
productroute.get("/cart", authMiddleware, authorize("buyer"), getCart);
productroute.post("/cart/remove", authMiddleware, authorize("buyer"), removeItem);
productroute.post("/cart/update", authMiddleware, authorize("buyer"), updateQuantity);
productroute.post("/cart/clear", authMiddleware, authorize("buyer"), clearCart);


module.exports = productroute;
