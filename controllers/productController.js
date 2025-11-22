const mongoose = require("mongoose");
const Cart = require("../models/cart");
const Product = require("../models/Product");
const Category = require("../models/categoryModel");

const createProduct = async (req, res) => {
  try {
    const { name, category, unit, price, stock, description, image } = req.body;

    // Allow both seller and admin to create products
    if (req.user.role !== "seller" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only sellers and admins allowed" });
    }

    // Sellers need approval, admins don't
    if (req.user.role === "seller" && !req.userDoc.isApproved) {
      return res.status(403).json({ message: "Seller pending approval" });
    }

    if (!category) {
      return res.status(400).json({ 
        message: "Category is required. Please select a category." 
      });
    }

    let categoryId = category;
    let categoryDoc = null;

    if (mongoose.Types.ObjectId.isValid(category)) {
      categoryDoc = await Category.findById(category);
    } else {
      const normalizedCategory = category.trim().toLowerCase();
      categoryDoc = await Category.findOne({
        $or: [
          { slug: { $regex: new RegExp(`^${normalizedCategory}$`, "i") } },
          { name: { $regex: new RegExp(`^${normalizedCategory}$`, "i") } }
        ]
      });
    }

    if (!categoryDoc) {
      const normalizedCategory = category.trim().toLowerCase();
      
      const validCategories = {
        'vegetables': { name: 'Vegetables', slug: 'vegetables' },
        'fruits': { name: 'Fruits', slug: 'fruits' },
        'leafy greens': { name: 'Leafy Greens', slug: 'leafy-greens' },
        'leafy-greens': { name: 'Leafy Greens', slug: 'leafy-greens' },
        'root vegetables': { name: 'Root Vegetables', slug: 'root-vegetables' },
        'root-vegetables': { name: 'Root Vegetables', slug: 'root-vegetables' }
      };

      const categoryInfo = validCategories[normalizedCategory];
      
      if (categoryInfo) {
        categoryDoc = await Category.findOne({
          $or: [
            { slug: categoryInfo.slug },
            { name: { $regex: new RegExp(`^${categoryInfo.name}$`, "i") } }
          ]
        });

        if (!categoryDoc) {
          try {
            categoryDoc = await Category.create({
              name: categoryInfo.name,
              slug: categoryInfo.slug
            });
          } catch (createErr) {
            if (createErr.code === 11000) {
              categoryDoc = await Category.findOne({ slug: categoryInfo.slug });
            } else {
              return res.status(500).json({ 
                message: "Failed to create category. Please try again." 
              });
            }
          }
        }
      } else {
        return res.status(400).json({ 
          message: `Category not found. Please select a valid category from the dropdown.` 
        });
      }
    }

    if (!categoryDoc) {
      return res.status(400).json({ 
        message: `Category not found. Please select a valid category from the dropdown.` 
      });
    }

    categoryId = categoryDoc._id;

    // Handle image: priority is file upload, then Cloudinary URL from body, then undefined
    let imageUrl = undefined;
    if (req.file) {
      // File upload (Multer) - store local path
      imageUrl = "/uploads/" + req.file.filename;
    } else if (image && typeof image === 'string' && image.trim()) {
      // Cloudinary URL from req.body
      imageUrl = image.trim();
    }

    // For admin-created products, set seller to admin's ID (admin acts as seller for these products)
    // For seller-created products, use seller's ID
    const product = await Product.create({
      seller: req.user.id,
      name,
      category: categoryId,
      unit,
      price,
      stock,
      description,
      image: imageUrl,
      // Admin-created products are auto-approved
      isApproved: req.user.role === "admin" ? true : undefined,
    });
    res.status(201).json(product);
  } catch (err) {
    if (err.name === "ValidationError") {
      const errorMessages = Object.values(err.errors).map(e => e.message).join(", ");
      return res.status(400).json({ message: `Product validation failed: ${errorMessages}` });
    }
    res.status(500).json({ message: err.message });
  }
};


const getSingleProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("seller", "businessName ownerName name email phone")
      .populate("category", "name");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Get seller name with fallbacks
    const sellerName = product.seller?.businessName || 
                       product.seller?.ownerName || 
                       product.seller?.name || 
                       "Unknown";

    // Response front-end friendly format
    const formattedProduct = {
      id: product.id,
      name: product.name,
      category: product.category?._id || product.category || null,
      categoryName: product.category?.name || null,
      unit: product.unit,
      price: product.price,
      stock: product.stock,
      description: product.description,
      image: product.image
        ? (product.image.startsWith('http://') || product.image.startsWith('https://')
            ? product.image
            : `${req.protocol}://${req.get("host")}${product.image}`)
        : null,
      sellerName: sellerName,
      sellerId: product.seller?._id || product.seller,
      seller: {
        name: sellerName,
        owner: product.seller?.ownerName,
        email: product.seller?.email,
        businessName: product.seller?.businessName,
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
    // Allow both seller and admin to update products
    if (req.user.role !== "seller" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only sellers and admins allowed" });
    }
    
    // Sellers can only update their own products, admins can update any product
    let product;
    if (req.user.role === "admin") {
      product = await Product.findById(req.params.id);
    } else {
      product = await Product.findOne({ _id: req.params.id, seller: req.user.id });
    }
    
    if (!product) return res.status(404).json({ message: "Product not found" });
    
    // Update all fields from req.body except image (handle separately)
    const { image, ...otherFields } = req.body;
    Object.assign(product, otherFields);
    
    // Handle image: priority is file upload, then Cloudinary URL from body
    if (req.file) {
      // File upload (Multer) - store local path
      product.image = "/uploads/" + req.file.filename;
    } else if (image && typeof image === 'string' && image.trim()) {
      // Cloudinary URL from req.body
      product.image = image.trim();
    }
    // If no image provided, keep existing image
    
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    // Sellers can only delete their own products, admins can delete any product
    let product;
    if (req.user.role === "admin") {
      product = await Product.findOneAndDelete({ _id: req.params.id });
    } else {
      product = await Product.findOneAndDelete({ _id: req.params.id, seller: req.user.id });
    }
    
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
      .populate("seller", "businessName ownerName name email _id phone")
      .populate("category", "name");

    // Fix: Build card-compatible response
    const finalProducts = prods.map(p => {
      const sellerName = p.seller?.businessName || p.seller?.ownerName || p.seller?.name || "Unknown";
      return {
        id: p.id,
        name: p.name,
        category: p.category?._id || p.category || null,
        categoryName: p.category?.name || null,
        unit: p.unit,
        price: p.price,
        stock: p.stock,
        description: p.description,
        image: p.image 
          ? (p.image.startsWith('http://') || p.image.startsWith('https://') 
              ? p.image 
              : `${req.protocol}://${req.get("host")}${p.image}`)
          : null,
        sellerName: sellerName,
        sellerId: p.seller?._id
      };
    });

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
      
      return {
        ...p.toObject(),
        image: imageUrl
      };
    });
    
    res.json(formattedProducts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    if (!category || category === 'undefined') {
      return res.status(400).json({ error: "Category parameter is required" });
    }

    const products = await Product.find({ category, isApproved: true })
      .populate("seller", "businessName ownerName name email _id phone");

    // Format products to match frontend expectations
    const formattedProducts = products.map(p => {
      const sellerName = p.seller?.businessName || p.seller?.ownerName || p.seller?.name || "Unknown";
      return {
        id: p.id,
        _id: p._id,
        name: p.name,
        category: p.category,
        unit: p.unit,
        price: p.price,
        stock: p.stock,
        description: p.description,
        image: p.image 
          ? (p.image.startsWith('http://') || p.image.startsWith('https://') 
              ? p.image 
              : `${req.protocol}://${req.get("host")}${p.image}`)
          : null,
        sellerName: sellerName,
        sellerId: p.seller?._id
      };
    });

    res.json({ products: formattedProducts });
  } catch (error) {
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

    // First, get the cart with populate
    const cart = await Cart.findOne({ user: req.user.id })
      .populate({
        path: "items.product",
        populate: {
          path: "seller",
          select: "_id businessName ownerName phone name",
        },
      })
      .populate("items.seller", "_id businessName ownerName phone name");

    if (!cart) {
      return res.json({ message: "Cart empty" });
    }

    // Get raw cart with ObjectIds (before populate) to access seller ObjectIds
    const rawCart = await Cart.findOne({ user: req.user.id }).lean();

    // If cart exists, ensure seller IDs are always accessible
    if (cart.items && cart.items.length > 0 && rawCart && rawCart.items) {
      // Process items asynchronously to fetch missing seller info
      const processedItems = await Promise.all(
        cart.items.map(async (item, index) => {
          const rawItem = rawCart.items[index];
          
          // Convert to plain object
          const itemObj = item.toObject ? item.toObject() : item;
          
          // If item.seller is null (populate failed), try multiple fallbacks
          if (!itemObj.seller || (typeof itemObj.seller === 'object' && !itemObj.seller._id)) {
            // Method 1: Get seller ObjectId from raw cart item (stored when cart was created)
            if (rawItem && rawItem.seller) {
              const sellerId = rawItem.seller.toString();
              
              // Fetch seller info from database
              try {
                const User = require("../models/User");
                const sellerDoc = await User.findById(sellerId).select("_id businessName ownerName phone name");
                if (sellerDoc) {
                  itemObj.seller = sellerDoc.toObject ? sellerDoc.toObject() : sellerDoc;
                } else {
                  itemObj.seller = { _id: sellerId };
                }
              } catch (err) {
                itemObj.seller = { _id: sellerId };
              }
            }
            // Method 2: Fetch seller from product directly from database
            if ((!itemObj.seller || !itemObj.seller._id) && itemObj.product && itemObj.product._id) {
              try {
                // Fetch product directly (not populated) to get the raw seller ObjectId
                const rawProduct = await Product.findById(itemObj.product._id).lean();
                
                if (rawProduct && rawProduct.seller) {
                  const sellerId = rawProduct.seller.toString();
                  
                  // Fetch seller details
                  const User = require("../models/User");
                  const sellerDoc = await User.findById(sellerId).select("_id businessName ownerName phone name").lean();
                  
                  if (sellerDoc) {
                    itemObj.seller = sellerDoc;
                    // Also update product object
                    if (!itemObj.product.seller) {
                      itemObj.product.seller = sellerDoc;
                    }
                  } else {
                    // Seller doesn't exist, but we have the ID
                    itemObj.seller = { _id: sellerId };
                  }
                }
              } catch (err) {
              }
            }
          }
          
          return itemObj;
        })
      );
      
      cart.items = processedItems;
    }

    res.json(cart);
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