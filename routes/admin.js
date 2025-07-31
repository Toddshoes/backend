// routes/adminRoutes.js

const express = require('express')
const router = express.Router()
const { protect, authorize } = require('../middleware/auth')
const AdminController = require('../controllers/admin')

router.get('/convenience-fee', AdminController.getConvenienceFee)
router.put('/convenience-fee', AdminController.updateConvenienceFee)
router.use(protect)
router.use(authorize('admin'))
// User routes
router.get('/users', AdminController.getAllUsers)
router.get('/users/:id', AdminController.getUserById)
router.post('/users', AdminController.createUser)
router.put('/users/:id', AdminController.updateUser)
router.delete('/users/:id', AdminController.deleteUser)

// Product routes
router.get('/products', AdminController.getAllProducts)
router.get('/products/search', AdminController.searchProducts)

router.post('/products', AdminController.createProduct)
router.get('/products/:id', AdminController.getProductById)
router.put('/products/:id', AdminController.updateProduct)
router.delete('/products/:id', AdminController.deleteProduct)



// Wishlist routes
router.get('/wishlists', AdminController.getAllWishlists)
router.get('/wishlists/:id', AdminController.getWishlistById)
router.post('/wishlists', AdminController.createWishlist)
router.put('/wishlists/:id', AdminController.updateWishlist)
router.delete('/wishlists/:id', AdminController.deleteWishlist)

// Trade routes
router.get('/trades', AdminController.getAllTrades)
router.get('/trades/:id', AdminController.getTradeById)
router.post('/trades', AdminController.createTrade)
router.put('/trades/:id', AdminController.updateTrade)
router.put('/trades/:id/void-label', AdminController.cancelShipment)
router.post('/trades/:id/reimburse', AdminController.reimburseUser)
router.delete('/trades/:id', AdminController.deleteTrade)


router.get('/disputes', AdminController.getAllDisputes)
router.get('/disputes/:id', AdminController.getDisputeById)
router.post('/disputes', AdminController.createDispute)
router.put('/disputes/:id', AdminController.updateDispute)
router.delete('/disputes/:id', AdminController.deleteDispute)

// Category routes
router.get('/categories', AdminController.getAllCategories)
router.get('/categories/:id', AdminController.getCategoryById)
router.post('/categories', AdminController.createCategory)
router.put('/categories/:id', AdminController.updateCategory)
router.delete('/categories/:id', AdminController.deleteCategory)


module.exports = router
