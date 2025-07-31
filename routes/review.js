// routes/reviewRoutes.js
const express = require('express')
const {
  addReview,
  getReviewsForProduct,
  getReviewsForTrade,
  updateReview,
  deleteReview,
} = require('../controllers/review')
const { protect } = require('../middleware/auth') // Middleware to protect routes

const router = express.Router()

// Protect routes that require authentication
router.use(protect)

// Add a review
router.post('/', addReview)

// Get reviews for a product
router.get('/product/:productId', getReviewsForProduct)

// Get reviews for a trade
router.get('/trade/:tradeId', getReviewsForTrade)

// Update a review
router.put('/:reviewId', updateReview)

// Delete a review
router.delete('/:reviewId', deleteReview)

module.exports = router
