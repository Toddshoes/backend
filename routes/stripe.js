const express = require('express')
const {
  stripeSubscription,
  cancelSubscription,
  updatePaymentStatus,
  customerPortal,
  promoCode,
  checkout,
  createCheckoutSessionWithTrialAndOneTimeFee,
  refundMultiplePayments
} = require('./../controllers/stripe')
const { stripeWebhooks } = require('./../webhooks/stripe')
const { protect } = require('../middleware/auth')

const router = express.Router()

router.post(
  '/webhooks',
  express.raw({ type: 'application/json' }),
  stripeWebhooks,
)

router.use(protect)
router.post('/one-time-checkout', createCheckoutSessionWithTrialAndOneTimeFee)
router.post('/refund', refundMultiplePayments)

router.post('/create-subscription', stripeSubscription)
// router.post('/cancel-subscrption', cancelSubscription)

router.post('/update-payment-status', updatePaymentStatus)

router.get('/customer-portal', customerPortal)

// router.post('/promo-code', promoCode)

router.get('/checkout/:id', checkout)

module.exports = router
