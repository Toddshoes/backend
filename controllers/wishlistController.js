// controllers/wishlistController.js
const Wishlist = require('../models/Wishlist')
const Product = require('../models/Product')
const User = require('../models/User')
const asyncHandler = require('../middleware/async')

// Add product to wishlist
exports.addToWishlist = asyncHandler(async (req, res) => {
  const {productId } = req.body

  if ( !productId) {
    return res
      .status(400)
      .json({ message: 'User ID and Product ID are required.' })
  }

  // Check if the user exists
  const user = await User.findById(req.user.id)
  if (!user) {
    return res.status(404).json({ message: 'User not found.' })
  }

  // Check if the product exists and is not owned by the user
  const product = await Product.findById(productId)
  if (!product) {
    return res.status(404).json({ message: 'Product not found.' })
  }

  if (product.userId.toString() === req.user.id.toString()) {
    return res
      .status(400)
      .json({ message: 'You cannot add your own product to the wishlist.' })
  }

  // Find or create a wishlist for the user
  let wishlist = await Wishlist.findOne({ user: req.user.id })
  if (!wishlist) {
    wishlist = await Wishlist.create({
      user: req.user.id,
      products: [productId],
    })
  } else {
    if (!wishlist.products.includes(productId)) {
      wishlist.products.push(productId)
      await wishlist.save()
    }
  }

  res.status(200).json({ message: 'Product added to wishlist.' })
})

// Remove product from wishlist
exports.removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body

  if (!productId) {
    return res
      .status(400)
      .json({ message: 'User ID and Product ID are required.' })
  }

  // Find the wishlist for the user
  const wishlist = await Wishlist.findOne({ user: req.user.id })
  if (!wishlist) {
    return res.status(404).json({ message: 'Wishlist not found.' })
  }

  // Remove the product from the wishlist
  const index = wishlist.products.indexOf(productId)
  if (index > -1) {
    wishlist.products.splice(index, 1)
    await wishlist.save()
  }

  res.status(200).json({ message: 'Product removed from wishlist.' })
})

// Get user's wishlist
exports.getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user.id }).populate(
    'products',
  )

  if (!wishlist) {
    // Return an empty array if no wishlist is found for this user
    return res.status(200).json({ products: [] })
  }

  res.status(200).json(wishlist)
})



exports.toggleWishlistProduct = async (req, res) => {
  const { productId } = req.body
  const userId = req.user.id;

  try {
    // Check if the productId is valid
    // if (!mongoose.Types.ObjectId.isValid(productId)) {
    //   return res.status(400).json({ message: 'Invalid product ID' })
    // }

    // Find the user's wishlist
    let wishlist = await Wishlist.findOne({ user: userId })

    if (!wishlist) {
      // If the wishlist doesn't exist, create a new one
      wishlist = new Wishlist({ user: userId, products: [productId] })
      await wishlist.save()
      return res.status(201).json({ products: wishlist.products })
    }

    // Check if the product is already in the wishlist
    const productIndex = wishlist.products.indexOf(productId)

    if (productIndex > -1) {
      // If the product is in the wishlist, remove it
      wishlist.products.splice(productIndex, 1)
      await wishlist.save()
    } else {
      // If the product is not in the wishlist, add it
      wishlist.products.push(productId)
      await wishlist.save()
    }

    // Return the updated wishlist (array of product IDs)
    return res.status(200).json({ products: wishlist.products })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Server error', error })
  }
}



exports.getUserProductWishlist = async (req, res) => {
  const userId = req.user.id

  try {
    // Find the user's wishlist
    const wishlist = await Wishlist.findOne({ user: userId })

    if (!wishlist) {
      // Return an empty array if no wishlist is found for this user
      return res.status(200).json({ products: [] })
    }

    // Return only the array of product IDs
    return res.status(200).json({ products: wishlist.products })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Server error', error })
  }
}