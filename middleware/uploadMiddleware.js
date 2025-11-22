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
  // If request is JSON (not multipart), skip multer and continue
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/json')) {
    return next();
  }
  
  // Otherwise, try to handle as multipart/form-data
  uploadSingle(req, res, (err) => {
    // If error is "Unexpected field" or "No file received", ignore it (might be JSON request)
    if (err && (err.code === 'LIMIT_UNEXPECTED_FILE' || err.message.includes('No file') || err.code === 'LIMIT_FILE_SIZE')) {
      // Clear the error and continue - this is likely a JSON request or no file provided
      return next();
    }
    // For other errors, pass them along
    if (err) return next(err);
    // No error, continue
    next();
  });
};

module.exports = { uploadSingle, uploadSingleOptional, uploadLogo };

