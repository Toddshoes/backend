// models/Wishlist.js
const mongoose = require('mongoose')

const WishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  products: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const Wishlist = mongoose.model('Wishlist', WishlistSchema)

module.exports = Wishlist
