const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    image: { type: String }, // Stores path like "/uploads/filename.jpg"
  },
  { timestamps: true }
);

const Category = mongoose.model("Category", categorySchema);
module.exports = Category