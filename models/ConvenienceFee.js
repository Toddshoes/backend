// models/ConvenienceFee.js
const mongoose = require('mongoose')

const convenienceFeeSchema = new mongoose.Schema(
  {
    value: {
      type: Number,
      required: [true, 'Convenience fee percentage is required'],
      min: 0,
      max: 100,
      default: 0,
    },
    description: {
      type: String,
      default: 'Website convenience fee applied to all transactions',
    },
  },
  {
    timestamps: true,
  },
)

const ConvenienceFee = mongoose.model('ConvenienceFee', convenienceFeeSchema)

module.exports = ConvenienceFee
