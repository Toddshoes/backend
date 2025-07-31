// controllers/reviewController.js
const Review = require('../models/Review')
const Trade = require('../models/Trade')
const Product = require('../models/Product')
const asyncHandler = require('../middleware/async')
const User = require('../models/User')

// Add a review
exports.addReview = asyncHandler(async (req, res) => {
  const { tradeId, productId, rating, comment } = req.body
  const reviewer = req.user.id

  // Find the trade
  const trade = await Trade.findById(tradeId)
  if (!trade) {
    return res.status(404).json({ message: 'Trade not found.' })
  }

  // Check if the reviewer is part of the trade
  if (!trade.offerer.equals(reviewer) && !trade.receiver.equals(reviewer)) {
    return res
      .status(403)
      .json({ message: 'You are not eligible to review this trade.' })
  }

  // Determine who is being reviewed (but we don't store this in our current model)
  let revieweeId = null
  if (trade.offerer.equals(reviewer)) {
    revieweeId = trade.receiver // Fixed typo: reciever -> receiver
  } else {
    revieweeId = trade.offerer
  }

  console.log(revieweeId, reviewer)
  // Create the review with the current user as reviewer (person giving the review)
  const review = await Review.create({
    trade: tradeId,
    reviewer: reviewer, // This should be the current user (person creating the review)
    reviewee: revieweeId, // This should be the person being reviewed
    product: productId,
    rating,
    comment,
  })

  // Add review to the product
  await Product.findByIdAndUpdate(productId, { $push: { reviews: review._id } })

  res.status(201).json(review)
})


// Get reviews for a product
exports.getReviewsForProduct = asyncHandler(async (req, res) => {
  const productId = req.params.productId

  // Find reviews for the product
  const reviews = await Review.find({ product: productId }).populate(
    'reviewer',
    'firstName lastName',
  )

  if (!reviews.length) {
    return res
      .status(404)
      .json({ message: 'No reviews found for this product.' })
  }

  res.status(200).json(reviews)
})

// Get reviews for a trade
exports.getReviewsForTrade = asyncHandler(async (req, res) => {
  const tradeId = req.params.tradeId

  // Find reviews for the trade
  const reviews = await Review.find({ trade: tradeId }).populate(
    'reviewer',
    'firstName lastName',
  )

  if (!reviews.length) {
    return res.status(404).json({ message: 'No reviews found for this trade.' })
  }

  res.status(200).json(reviews)
})

// Update a review
exports.updateReview = asyncHandler(async (req, res) => {
  const reviewId = req.params.reviewId
  const { rating, comment } = req.body
  const reviewer = req.user.id

  // Find the review
  const review = await Review.findById(reviewId)
  if (!review) {
    return res.status(404).json({ message: 'Review not found.' })
  }

  // Check if the user is the reviewer
  if (!review.reviewer.equals(reviewer)) {
    return res
      .status(403)
      .json({ message: 'You are not authorized to update this review.' })
  }

  // Update the review
  review.rating = rating || review.rating
  review.comment = comment || review.comment
  await review.save()

  res.status(200).json(review)
})

// Delete a review
exports.deleteReview = asyncHandler(async (req, res) => {
  const reviewId = req.params.reviewId
  const reviewer = req.user.id

  // Find the review
  const review = await Review.findById(reviewId)
  if (!review) {
    return res.status(404).json({ message: 'Review not found.' })
  }

  // Check if the user is the reviewer
  if (!review.reviewer.equals(reviewer)) {
    return res
      .status(403)
      .json({ message: 'You are not authorized to delete this review.' })
  }

  // Delete the review
  await review.remove()

  // Remove the review reference from the product
  await Product.findByIdAndUpdate(review.product, {
    $pull: { reviews: reviewId },
  })

  res.status(200).json({ message: 'Review deleted successfully.' })
})


