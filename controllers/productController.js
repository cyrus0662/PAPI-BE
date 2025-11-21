const Cart = require("../models/cart");
const Product = require("../models/Product");

const createProduct = async (req, res) => {
  try {
    const { name, category, unit, price, stock, description } = req.body;

    if (req.user.role !== "seller") {
      return res.status(403).json({ message: "Only sellers allowed" });
    }

    if (!req.userDoc.isApproved) {
      return res.status(403).json({ message: "Seller pending approval" });
    }

    const product = await Product.create({
      seller: req.user.id,
      name,
      category,
      unit,
      price,
      stock,
      description,
      image: req.file ? "/uploads/" + req.file.filename : undefined,
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const getSingleProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("seller", "businessName ownerName email phone")
      .populate("category", "name");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Response front-end friendly format
    const formattedProduct = {
      id: product.id,
      name: product.name,
      category: product.category,
      unit: product.unit,
      price: product.price,
      stock: product.stock,
      description: product.description,
      image: product.image
        ? `${req.protocol}://${req.get("host")}${product.image}`
        : null,
      seller: {
        name: product.seller?.businessName || "Unknown",
        owner: product.seller?.ownerName,
        email: product.seller?.email,
      },
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };

    res.json(formattedProduct);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const updateProduct = async (req, res) => {
  try {
    if (req.user.role !== "seller") {
      return res.status(403).json({ message: "Only sellers allowed" });
    }
    const product = await Product.findOne({ _id: req.params.id, seller: req.user.id });
    if (!product) return res.status(404).json({ message: "Product not found" });
    Object.assign(product, req.body);
    if (req.file) product.image = "/uploads/" + req.file.filename;
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, seller: req.user.id });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getAllProducts = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: "i" };
    if (!req.user || req.user.role !== "admin") {
      filter.isApproved = true;
    }

    let prods = await Product.find(filter)
      .populate("seller", "businessName ownerName email _id phone");

    // Fix: Build card-compatible response
    const finalProducts = prods.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      unit: p.unit,
      price: p.price,
      stock: p.stock,
      description: p.description,
      image: p.image ? `${req.protocol}://${req.get("host")}${p.image}` : null,
      sellerName: p.seller?.businessName || "Unknown",
      sellerId: p.seller?._id
    }));

    res.json(finalProducts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const getSellerProducts = async (req, res) => {
  try {
    if (req.user.role !== "seller") {
      return res.status(403).json({ message: "Only sellers allowed" });
    }
    const products = await Product.find({ seller: req.user.id });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const getProductsByCategory = async (req, res) => {
  try {
    const products = await Product.find({ category: req.params.category });

    res.json(products);
  } catch (error) {
    console.error("Category fetch error:", error);
    res.status(500).json({ error: "Failed to fetch products by category" });
  }
};

const calculateTotals = (cart) => {
  let subTotal = 0;

  cart.items.forEach(item => {
    subTotal += item.totalPrice;
  });

  cart.subTotal = subTotal;
  cart.grandTotal = subTotal;
  return cart;
};

const addToCart = async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      return res.status(403).json({ message: "Only buyers allowed" });
    }
    const { productId, quantity } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    let cart = await Cart.findOne({ user: req.user.id });

    const qty = Number(quantity) || 1;
    if (qty < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }
    const priceAtTime = product.price;
    const totalPrice = qty * priceAtTime;

    if (!cart) {
      cart = new Cart({
        user: req.user.id,
        items: [
          {
            product: productId,
            seller: product.seller,
            quantity: qty,
            priceAtTime,
            totalPrice,
          },
        ],
      });
    } else {
      const existingItem = cart.items.find(
        (item) => item.product.toString() === productId
      );

      if (existingItem) {
        existingItem.quantity += qty;
        existingItem.totalPrice = existingItem.quantity * existingItem.priceAtTime;
      } else {
        cart.items.push({
          product: productId,
          seller: product.seller,
          quantity: qty,
          priceAtTime,
          totalPrice,
        });
      }
    }

    calculateTotals(cart);
    await cart.save();

    res.json({ message: "Added to cart", cart });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCart = async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      return res.status(403).json({ message: "Only buyers allowed" });
    }

    const cart = await Cart.findOne({ user: req.user.id })
      .populate({
        path: "items.product",
        populate: {
          path: "seller",
          select: "businessName ownerName phone",
        },
      })
      .populate("items.seller", "businessName ownerName phone");

    res.json(cart || { message: "Cart empty" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateQuantity = async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      return res.status(403).json({ message: "Only buyers allowed" });
    }

    const { productId, quantity } = req.body;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find(
      (i) => i.product.toString() === productId
    );

    if (!item) return res.status(404).json({ message: "Item not found" });

    const qty = Number(quantity);
    if (!qty || qty < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    item.quantity = qty;
    item.totalPrice = item.quantity * item.priceAtTime;

    calculateTotals(cart);
    await cart.save();

    res.json({ message: "Quantity updated", cart });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const removeItem = async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      return res.status(403).json({ message: "Only buyers allowed" });
    }
    const { productId } = req.body;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    calculateTotals(cart);
    await cart.save();

    res.json({ message: "Item removed", cart });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const clearCart = async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      return res.status(403).json({ message: "Only buyers allowed" });
    }

    await Cart.findOneAndDelete({ user: req.user.id });

    res.json({ message: "Cart cleared" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {createProduct,getAllProducts,getSellerProducts,updateProduct,deleteProduct,clearCart,getSingleProduct,getProductsByCategory,addToCart,getCart,updateQuantity,removeItem}