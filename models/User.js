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
      // required: function () {
      //   return this.role === "seller";
      // },
      default:null
    },
    ownerName: {
      type: String,
      // required: function () {
      //   return this.role === "seller";
      // },
      default:null
    },
    organicCertificate: {
      type: String,
      default: null, // optional
    },
    logo: {
      type: String, // image URL
      default: null,
    },

    // ADMIN FIELDS
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
