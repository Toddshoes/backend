const mongoose = require('mongoose')

const tradeSchema = new mongoose.Schema({
  offerer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  offererProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  receiverProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  offererReview: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review',
    default: null,
  },
  receiverReview: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review',
    default: null,
  },

  convenienceFee: {
    type: Number,
    default: 10,
  },

  shippingFee: Number,
  status: {
    type: String,
    enum: ['pending', 'accepted', 'completed', 'rejected'],
    default: 'pending',
  },
  startDate: Date,
  endDate: Date,

  // Tracking receipt of products
  offererReceived: {
    type: Boolean,
    default: false,
  },
  receiverReceived: {
    type: Boolean,
    default: false,
  },
  offererFinished: {
    type: Boolean,
    default: false,
  },
  receiverFinished: {
    type: Boolean,
    default: false,
  },

  reImburseOfferer: {
    type: Boolean,
    default: false,
  },
  reImburseReceiver: {
    type: Boolean,
    default: false,
  },

  shippingOfferer: {
    type: Object,
  },

  shippingReceiver: {
    type: Object,
  },
})

// Prevent model overwrite error
module.exports = mongoose.models.Trade || mongoose.model('Trade', tradeSchema)
