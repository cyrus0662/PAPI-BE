const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Admin = require("../models/Admin");

const authMiddleware = async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) return res.status(401).json({ message: "Not authorized, no token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = { id: decoded.id, role: decoded.role };

    if (decoded.role === "admin") {
      req.userDoc = await Admin.findById(decoded.id).select("-password");
      if (!req.userDoc) {
        return res.status(401).json({ message: "Admin not found" });
      }
    } else {
      req.userDoc = await User.findById(decoded.id).select("-password");
      if (!req.userDoc) {
        return res.status(401).json({ message: "User not found" });
      }
      if (req.userDoc.isSuspended) {
        return res.status(403).json({ message: "Account suspended" });
      }
    }

    next();

  } catch (err) {
    return res.status(401).json({ message: "Token invalid" });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });

    if (!roles.includes(req.user.role))
      return res.status(403).json({ message: "Forbidden" });

    next();
  };
};

module.exports = { authMiddleware, authorize };
