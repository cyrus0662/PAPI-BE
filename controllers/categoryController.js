const Category = require("../models/categoryModel");

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({});
    
    // Format categories with full image URLs
    const formattedCategories = categories.map(cat => {
      let imageUrl = null;
      if (cat.image) {
        // Handle both old format (just filename) and new format (with /uploads/ prefix)
        if (cat.image.startsWith("http")) {
          imageUrl = cat.image; // Already a full URL
        } else if (cat.image.startsWith("/uploads/")) {
          imageUrl = `${req.protocol}://${req.get("host")}${cat.image}`;
        } else {
          // Just filename, add /uploads/ prefix
          imageUrl = `${req.protocol}://${req.get("host")}/uploads/${cat.image}`;
        }
      }
      
      return {
        _id: cat._id,
        name: cat.name,
        slug: cat.slug,
        image: imageUrl,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
      };
    });
    
    res.json(formattedCategories);
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
    
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    const category = await Category.create({ name, slug, image });
    
    // Return formatted category with full image URL
    const imageUrl = category.image 
      ? (category.image.startsWith("/uploads/") 
          ? `${req.protocol}://${req.get("host")}${category.image}`
          : `${req.protocol}://${req.get("host")}/uploads/${category.image}`)
      : null;
    
    res.status(201).json({
      _id: category._id,
      name: category.name,
      slug: category.slug,
      image: imageUrl,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Update Category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Handle image upload
    if (req.file) {
      req.body.image = `/uploads/${req.file.filename}`;
    }

    const category = await Category.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!category) return res.status(404).json({ message: "Category not found" });

    // Return formatted category with full image URL
    const imageUrl = category.image 
      ? (category.image.startsWith("/uploads/") 
          ? `${req.protocol}://${req.get("host")}${category.image}`
          : category.image.startsWith("http")
          ? category.image
          : `${req.protocol}://${req.get("host")}/uploads/${category.image}`)
      : null;
    
    res.json({
      _id: category._id,
      name: category.name,
      slug: category.slug,
      image: imageUrl,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    });
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