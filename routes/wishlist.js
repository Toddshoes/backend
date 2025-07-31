// routes/wishlistRoutes.js
const express = require('express')
const router = express.Router()
const wishlistController = require('../controllers/wishlistController')


const { protect } = require('../middleware/auth')
router.use(protect)
// Route to add product to wishlist
router.post('/add', wishlistController.addToWishlist)

// Route to remove product from wishlist
router.post('/remove', wishlistController.removeFromWishlist)
router.post('/toggle', wishlistController.toggleWishlistProduct)
router.get('/product', wishlistController.getUserProductWishlist)
// Route to get user's wishlist
router.get('/', wishlistController.getWishlist)

module.exports = router
