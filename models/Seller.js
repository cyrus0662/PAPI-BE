const mongoose = require("mongoose");

const sellerSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  ownerName: { type: String, required: true },
  address: { type: String },
  pincode: { type: String },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true },
  organicCertificate: { type: String, default: null },
  logo: { type: String, default: null },
  isApproved: { type: Boolean, default: false },
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, { timestamps: true });

const Seller = mongoose.model("Seller", sellerSchema);
module.exports = Seller