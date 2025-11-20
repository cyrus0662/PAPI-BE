const Category = require("../models/categoryModel");

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({});
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Create Category
const createCategory = async (req, res) => {
  try {
    const { name, slug } = req.body;

    const exists = await Category.findOne({ slug });
    if (exists) {
      return res.status(400).json({ message: "Slug already exists" });
    }
     const image = req.file ? req.file.filename : null;

    const category = await Category.create({ name, slug, image });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Update Category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!category) return res.status(404).json({ message: "Category not found" });

    res.json(category);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Delete Category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByIdAndDelete(id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

module.exports = {getCategories,createCategory,updateCategory,deleteCategory}