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

productroute.get("/products/my", getSellerProducts);
productroute.post("/products", uploadSingle, createProduct);
productroute.put("/products/:id", uploadSingle, updateProduct);
productroute.delete("/products/:id", authMiddleware, authorize("seller"), deleteProduct);
productroute.get('/products/:id',getSingleProduct)
productroute.get("/products/category/:category", getProductsByCategory);
productroute.post("/cart/add", addToCart);
productroute.get("/cart/get/:userId", getCart);
productroute.post("/cart/remove", removeItem);
productroute.post("/cart/update", updateQuantity);
productroute.post("/cart/clear", clearCart);


module.exports = productroute;
