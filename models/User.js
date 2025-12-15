const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["buyer", "seller", "admin"],
      required: true,
    },

    // COMMON FIELDS
    name: {
      type: String,
      required: function () {
        return this.role === "buyer";
      },
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: false,
    },
    address: {
      type: String,
      required: false,
    },
    pincode: {
      type: String,
      required: false,
    },

    // SELLER FIELDS
    businessName: {
      type: String,
      default: null,
    },
    ownerName: {
      type: String,
      default: null,
    },
    organicCertificate: {
      type: String,
      default: null, // optional
    },
    logo: {
      type: String, // image URL
      default: null,
    },
    // Additional seller registration fields
    additionalInfo: {
      type: String, // Optional info text seller can write
      default: null,
    },
    sellerImages: {
      type: [String], // Array of image URLs
      default: [],
    },
    priceSheetPdf: {
      type: String, // PDF URL
      default: null,
    },
    website: {
      type: String,
      default: null,
    },
    documentDate: {
      type: Date, // Date when documents/products/pricing were uploaded
      default: null,
    },
    
    // Selected products during registration
    selectedProducts: {
      type: [{
        id: String,
        name: String,
        price: Number,
        unit: String,
        image: String,
        category: String
      }],
      default: []
    },

    // ADMIN / MODERATION FIELDS
    isApproved: {
      type: Boolean,
      default: function () {
        return this.role !== "seller";
      },
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },

    // PASSWORD RESET
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },

  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = User
