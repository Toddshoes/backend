const mongoose = require('mongoose')

// Create a schema for the StripeSubscription model
const SubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: true,
  },

  stripeSubscriptionId: {
    type: String,
    required: true,
  },
  planId: {
    type: String,
    required: true,
  },
  planInterval: {
    type: String,
  },
  amount: {
    type: Number,
    required: true,
  },
  paymentStatus: {
    type: String,
    required: true,
    default: 'unpaid',
  },
  status: {
    type: String,
  },
  currentPeriodStart: {
    type: Date,
  },
  currentPeriodEnd: {
    type: Date,
  },
  promoCode: {
    type: String,
  },
  isTrial: {
    type: Boolean,
    default: false, 
  },
  trialStart: {
    type: Date,
  },
  trialEnd: {
    type: Date,
  },
  upgradedFromTrial: {
    type: Boolean,
    default: false, 
  },
  proCancelled: {
    type: Boolean,
    default: false, 
  },
  created: {
    type: Date,
    default: Date.now,
  },
  // Add other Stripe subscription-related fields as needed
})

// Create the StripeSubscription model using the schema
const Subscription = mongoose.model('Subscription', SubscriptionSchema)

module.exports = Subscription
