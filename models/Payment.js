const mongoose = require('mongoose')

const PaymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  paymentIntentId: { type: String, required: false },
  sessionId: { type: String, required: true },
  customerEmail: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true, default: 'usd' },
  description: { type: String, required: true },
  status: { type: String, required: true, default: 'pending' }, // pending, succeeded, partially_refunded, refunded
  createdAt: { type: Date, default: Date.now },
  refunds: [
    {
      refundId: { type: String },
      amount: { type: Number, required: true },
      status: { type: String, default: 'pending' }, // pending, succeeded, failed
      refundedAt: { type: Date, default: Date.now },
    },
  ],
})

module.exports = mongoose.model('Payment', PaymentSchema)
