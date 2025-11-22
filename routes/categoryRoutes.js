const express = require("express");
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require("../controllers/categoryController");
const { uploadSingleOptional } = require("../middleware/uploadMiddleware");
const { authMiddleware, authorize } = require("../middleware/authMiddleware");

router.get("/categories", getCategories);
router.post("/categories", authMiddleware, authorize("admin"), uploadSingleOptional, createCategory);        
router.put("/categories/:id", authMiddleware, authorize("admin"), uploadSingleOptional, updateCategory);  
router.delete("/categories/:id", authMiddleware, authorize("admin"), deleteCategory);
module.exports = router;
