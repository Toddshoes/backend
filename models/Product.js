const mongoose = require('mongoose')
const Schema = mongoose.Schema

const productSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  brand: {
    type: String,
    default: 'Other',
  },
  currency: {
    type: String,
    default: 'USD',
  },
  length: {
    // New field for length
    type: Number,
    default:10
  },
  width: {
    // New field for width
    type: Number,
  },
  height: {
    // New field for height
    type: Number,
  },
  weight: {
    // New field for height
    type: Number,
    default:1.5
  },
  featured: {
    type: Boolean,
    default: false,
  },
  condition: {
    type: String,
  },
  size: {
    type:String
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  description: {
    type: String,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  imageUrl1: {
    type: String,
  },
  imageUrl2: {
    type: String,
  },
  status: {
    type: String,
    enum: ['available', 'exchanged'],
    default: 'available',
  },
  popularity: {
    type: Number,
    default: 0,
  },
  exchangeHistory: [
    {
      exchangedAt: {
        type: Date,
        default: Date.now,
      },
      exchangedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    },
  ],
  productNumber: {
    type: String,
    unique: true, // Ensure product number is unique
  },
})

// Generate a random 6-digit number
function generateUniqueProductNumber() {
  return 'ooowap-' + Math.floor(100000 + Math.random() * 900000) // Generates a random 6-digit number
}

// Pre-save middleware to assign unique product number before saving the product
productSchema.pre('save', async function (next) {
  if (!this.productNumber) {
    let unique = false
    let productNumber

    // Ensure uniqueness by checking the database
    while (!unique) {
      productNumber = generateUniqueProductNumber()
      const existingProduct = await mongoose.models.Product.findOne({
        productNumber,
      })
      if (!existingProduct) {
        unique = true
      }
    }

    this.productNumber = productNumber
  }
  next()
})

const Product = mongoose.model('Product', productSchema)
module.exports = Product
