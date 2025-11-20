const Order = require("../models/Order");
const Product = require("../models/Product");

const placeOrder = async (req, res) => {
  try {
    if (req.user.role !== "buyer") 
      return res.status(403).json({ message: "Only buyers allowed" });

    const { items, seller, address, pincode, contactNumber } = req.body;

    if (!items || items.length === 0)
      return res.status(400).json({ message: "No items provided" });

    let total = 0;
    let orderItems = [];

    for (const it of items) {
      const prod = await Product.findById(it.product);
      if (!prod)
        return res.status(400).json({ message: `Product not found: ${it.product}` });

      orderItems.push({
        product: prod._id,
        name: prod.name,
        qty: it.qty,
        price: prod.price,
        unit: prod.unit
      });

      total += prod.price * it.qty;
    }

    const order = await Order.create({
      buyer: req.user.id,
      seller,
      items: orderItems,
      total,
      address,
      pincode,
      contactNumber
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
      .populate("seller", "businessName ownerName");

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
      .populate("buyer", "name email phone");

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
