const mongoose = require("mongoose");

const buyerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
  pincode: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, { timestamps: true });

const Buyer = mongoose.model("Buyer", buyerSchema);
module.exports = Buyer