const express = require("express");
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require("../controllers/categoryController");
const { uploadSingle } = require("../middleware/uploadMiddleware");

router.get("/categories", getCategories);
router.post("/categories",uploadSingle ,createCategory);        
router.put("/categories/:id",uploadSingle, updateCategory);  
router.delete("/categories/:id", deleteCategory);
module.exports = router;
