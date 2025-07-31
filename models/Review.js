// models/Review.js
const mongoose = require('mongoose')

// Define the schema for the Review model
const ReviewSchema = new mongoose.Schema({
  trade: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trade',
    required: true,
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reviewee: {
    // Add this field
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    maxLength: 500,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Create a method to check if a user is eligible to review a trade
ReviewSchema.methods.isEligibleToReview = function (userId) {
  // Check if the user is part of the trade
  return (
    this.trade.offerer.toString() === userId ||
    this.trade.receiver.toString() === userId
  )
}

const Review = mongoose.model('Review', ReviewSchema)

module.exports = Review
