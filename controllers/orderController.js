const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

const placeOrder = async (req, res) => {
  try {
    if (req.user.role !== "buyer") 
      return res.status(403).json({ message: "Only buyers allowed" });

    const { items, seller, address, pincode, contactNumber, deliveryNote } = req.body;

    if (!items || items.length === 0)
      return res.status(400).json({ message: "No items provided" });

    let total = 0;
    let orderItems = [];
    let productSellerId = null;

    // First, fetch all products and determine the seller from products
    for (const it of items) {
      const prod = await Product.findById(it.product);
      if (!prod)
        return res.status(400).json({ message: `Product not found: ${it.product}` });
      
      // Verify product has a seller
      if (!prod.seller) {
        return res.status(400).json({ 
          message: `Product ${prod.name} (${it.product}) has no seller assigned. This product was likely created incorrectly.` 
        });
      }
      
      // Set seller from first product, or verify all products belong to same seller
      if (!productSellerId) {
        productSellerId = prod.seller.toString();
      } else if (prod.seller.toString() !== productSellerId) {
        return res.status(400).json({ 
          message: `All products in an order must belong to the same seller. Product ${prod.name} belongs to a different seller.` 
        });
      }

      orderItems.push({
        product: prod._id,
        name: prod.name,
        qty: it.qty,
        price: prod.price,
        unit: prod.unit
      });

      total += prod.price * it.qty;
    }

    // Use seller from products if not provided, or validate provided seller matches
    const finalSellerId = seller || productSellerId;
    
    if (!finalSellerId) {
      return res.status(400).json({ message: "Unable to determine seller from products" });
    }

    // Validate that the seller exists and is a seller
    const sellerDoc = await User.findOne({ _id: finalSellerId, role: "seller" });
    if (!sellerDoc) {
      // Try to find if user exists with different role or doesn't exist at all
      const userExists = await User.findById(finalSellerId);
      if (userExists) {
        return res.status(400).json({ 
          message: `The seller for these products is not a valid seller. Current role: ${userExists.role}` 
        });
      }
      return res.status(400).json({ 
        message: `Seller not found. The seller for these products may have been deleted.` 
      });
    }

    // If seller was provided explicitly, verify it matches the products' seller
    if (seller && seller.toString() !== productSellerId) {
      return res.status(400).json({ 
        message: `Provided seller ID (${seller}) does not match the products' seller (${productSellerId})` 
      });
    }

    const order = await Order.create({
      buyer: req.user.id,
      seller: finalSellerId, // Use seller derived from products
      items: orderItems,
      total,
      address,
      pincode,
      contactNumber,
      deliveryNote
    });

    res.status(201).json(order);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    if (req.user.role !== "buyer")
      return res.status(403).json({ message: "Only buyers allowed" });

    const orders = await Order.find({ buyer: req.user.id })
      .populate("seller", "businessName ownerName phone");

    res.json(orders);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getOrdersForSeller = async (req, res) => {
  try {
    if (req.user.role !== "seller")
      return res.status(403).json({ message: "Only sellers allowed" });

    const orders = await Order.find({ seller: req.user.id })
      .populate("buyer", "name email phone address");

    res.json(orders);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowed = ["Pending","Accepted","Rejected","Packed","Out for Delivery","Delivered","Cancelled"];
    if (!allowed.includes(status))
      return res.status(400).json({ message: "Invalid order status" });

    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ message: "Order not found" });

    if (!["seller", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (req.user.role === "seller" && order.seller.toString() !== req.user.id)
      return res.status(403).json({ message: "Forbidden" });

    order.status = status;
    await order.save();

    res.json(order);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { placeOrder, getMyOrders, getOrdersForSeller, updateOrderStatus };
