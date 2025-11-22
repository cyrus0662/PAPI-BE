const multer = require("multer");
const fs = require("fs");
const path = require("path");

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "-" + Math.round(Math.random()*1e9) + ext);
  }
});

const uploadSingle = multer({ storage }).single("image");
const uploadLogo = multer({ storage }).single("logo");

// Optional upload middleware that doesn't fail if no file is provided
const uploadSingleOptional = (req, res, next) => {
  uploadSingle(req, res, (err) => {
    // If error is "Unexpected field" or "No file received", ignore it (might be JSON request)
    if (err && (err.code === 'LIMIT_UNEXPECTED_FILE' || err.message.includes('No file'))) {
      // Clear the error and continue - this is likely a JSON request with Cloudinary URL
      return next();
    }
    // For other errors, pass them along
    if (err) return next(err);
    // No error, continue
    next();
  });
};

module.exports = { uploadSingle, uploadSingleOptional, uploadLogo };

