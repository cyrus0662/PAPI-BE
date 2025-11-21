const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  name: String,
  qty: Number,
  price: Number,
  unit: String
}, { _id: false });

const orderSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [orderItemSchema],
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: [
      "Pending",
      "Accepted",
      "Rejected",
      "Packed",
      "Out for Delivery",
      "Delivered",
      "Cancelled"
    ],
    default: "Pending"
  },
  address: String,
  pincode: String,
  contactNumber: String,
  deliveryNote: String
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
