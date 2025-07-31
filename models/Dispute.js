const mongoose = require('mongoose')

const disputeSchema = new mongoose.Schema({
  trade: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trade',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['open', 'resolved'],
    default: 'open',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model('Dispute', disputeSchema)
