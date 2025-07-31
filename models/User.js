// Import necessary modules from Node.js and Mongoose
const crypto = require('crypto')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

// Define the schema for the 'User' model
const UserSchema = new mongoose.Schema({
  // Display name of the user
  firstName: {
    type: String,
    default: '',
    maxLength: 200,
  },

  lastName: {
    type: String,
    default: '',
    maxLength: 200,
  },
  // Email of the user (required, unique, and validated against a regular expression)
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      'Please add a valid email',
    ],
  },

  // Role of the user (enum: 'user' or 'admin', default: 'user')
  role: {
    type: String,
    enum: ['user', 'admin','inactive'],
    default: 'user',
  },
  // Password of the user (minlength: 6, not selected by default in queries)
  password: {
    type: String,
    minlength: 6,
    select: false,
  },
  // URL of the user's profile photo
  photoURL: {
    type: String,
  },

  phoneNumber: {
    type: String,
  },

  address: {
    type: String,
    default: '',
  },

  country: {
    type: String,
    default: '',
  },

  state: {
    type: String,
    default: '',
  },

  city: {
    type: String,
    default: '',
  },

  postalcode: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default:''
  },
  balance: {
    type: Number,
    default: 0, // Initial balance
  },

  // Token for resetting the user's password
  resetPasswordToken: String,
  // Expiry date for the reset password token
  resetPasswordExpire: Date,
  // Timestamp for when the user account was created
  createdAt: {
    type: Date,
    default: Date.now,
  },

  // isEmailVerified: {
  //   type: Boolean,
  //   default: true,
  // },
  // emailVerificationToken: String,
  // resetEmailExpire: Date,
})

// Encrypt password using bcrypt before saving to the database
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next()
  }

  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

// Generate a signed JWT token for the user
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  })
}

// Match user entered password to hashed password in the database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

// Generate and hash password token for password reset
UserSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex')

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')

  // Set expiry date for the reset password token
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000 // Token expires in 10 minutes

  return resetToken
}

// UserSchema.methods.generateEmailVerificationToken = function () {
//   const verificationToken = crypto.randomBytes(20).toString('hex')

//   // Hash token and set to emailVerificationToken field
//   this.emailVerificationToken = crypto
//     .createHash('sha256')
//     .update(verificationToken)
//     .digest('hex')

//   return verificationToken
// }


// Create the 'User' model using the defined schema
const User = mongoose.model('User', UserSchema)

// Export the 'User' model for use in other parts of the application
module.exports = User
