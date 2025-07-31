const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const Payment = require('../models/Payment')
const User = require('../models/User')

const stripeWebhooks = async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    )
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object
      await handleCheckoutSessionCompleted(session)
      break

    case 'charge.refunded':
      const charge = event.data.object
      await handleChargeRefunded(charge)
      break

    case 'charge.refund.failed':
      const failedCharge = event.data.object
      await handleChargeRefundFailed(failedCharge)
      break

    case 'charge.refund.updated':
      const updatedRefund = event.data.object
      await handleChargeRefundUpdated(updatedRefund)
      break

    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  res.status(200).json({ received: true })
}

async function handleCheckoutSessionCompleted(session) {
  try {
    const payment = await Payment.findOne({ sessionId: session.id })

    if (payment) {
      payment.paymentIntentId = session.payment_intent
      payment.status = 'completed'
      await payment.save()

      const user = await User.findById(payment.userId)
      if (user) {
        user.balance += payment.amount // Add the payment amount to the user's balance
        await user.save()
      }
    }
  } catch (error) {
    console.error(`Error in post-payment processing: ${error.message}`)
  }
}

async function handleChargeRefunded(charge) {
  try {
    const payment = await Payment.findOne({
      paymentIntentId: charge.payment_intent,
    })
    if (payment) {
      payment.status = 'refunded' // Update the payment status
      await payment.save()

      const user = await User.findById(payment.userId)
      if (user) {
        user.balance -= payment.amount // Deduct from user's balance
        await user.save()
      }
    }
  } catch (error) {
    console.error(`Error handling refunded charge: ${error.message}`)
  }
}

async function handleChargeRefundFailed(charge) {
  console.error(`Refund failed for charge: ${charge.id}`)
}

async function handleChargeRefundUpdated(refund) {
  console.log(`Refund updated: ${refund.id}`)
}

module.exports = { stripeWebhooks }
