const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  category: { type:mongoose.Schema.Types.ObjectId, ref: "Category",  },
  unit: { type: String, default: "kg" },  
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  description: { type: String },
  image: { type: String },
  isApproved: { type: Boolean, default: true } // optional moderation
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);
module.exports = Product