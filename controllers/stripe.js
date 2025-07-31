const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const User = require('../models/User')
const Subscription = require('../models/Subscription')
const Payment = require('../models/Payment')

async function setupStripeConfiguration() {
  try {
    const configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'ChadGPT',
      },
      features: {
        customer_update: {
          allowed_updates: [
            "name",
            
          ],
          enabled: true
        },
        invoice_history: {
          enabled: true,
        },
        payment_method_update: {
          enabled: true
        },
        subscription_cancel: {
          cancellation_reason: {
            enabled: true,
            options: [
              "too_expensive",
              "missing_features",
              "switched_service",
              "unused",
              "other"
            ]
          },
          enabled: true,
          mode: "at_period_end",
          proration_behavior: none
        },
        subscription_update: {
          default_allowed_updates: [],
          enabled: true,
          proration_behavior: "none"
        }
      },
    })
  } catch (error) {}
}

// Call this function at the appropriate place in your application
// For example, at startup or within a specific route handler
setupStripeConfiguration()

const createSubscription = async (
  userId,
  email,
  name,
  priceId,
  paymentMethod,
  promoId,
) => {
  try {
    // create a stripe customer

    const customer = await stripe.customers.create({
      name: name,
      email: email,
      payment_method: paymentMethod,
      invoice_settings: {
        default_payment_method: paymentMethod,
      },
    })

    // get the price id from the front-end

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_settings: {
        payment_method_options: {
          card: {
            request_three_d_secure: 'any',
          },
        },
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      coupon: promoId !== '' ? promoId : undefined,
    })

    let paymentsub = await Subscription.create({
      stripeSubscriptionId: subscription.id,
      user: userId,
      planId: subscription.plan.id,
      amount: subscription.plan.amount,
      currentPeriodStart: new Date(subscription.start_date * 1000),
      planInterval: subscription.plan.interval,
      promoCode: promoId !== '' ? promoId : null,
    })

    await User.findByIdAndUpdate(userId, {
      userSubscription: paymentsub,
    })

    // return the client secret and subscription id
    return {
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      subscriptionId: subscription.id,
    }
  } catch (error) {
    let errorMessage = error.raw.message

    if (errorMessage.includes('Coupon')) {
      // Handle the case where the coupon is used up
      return {
        success: false,
        error: 'Coupon is invalid, expired, or already used up.',
      }
    }

    // If the error message doesn't match the specific case, return the original error
    return {
      success: false,
      error: errorMessage,
    }
  }
}

const stripeSubscription = async (req, res, next) => {
  const { email, name, priceId, paymentMethod, promoId } = req.body

  let result = await createSubscription(
    req.user._id,
    email,
    name,
    priceId,
    paymentMethod,
    promoId,
  )

  res.send(result)
}

const updatePaymentStatus = async (req, res, next) => {
  const { subscriptionId } = req.body
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    console.log(subscription)

    if (subscription.status === 'active') {
      const updatedSubscription = await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: subscriptionId },
        {
          status: subscription.status,
          currentPeriodStart: new Date(
            subscription.current_period_start * 1000,
          ),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          paymentStatus: 'paid',
        },
        { new: true },
      )

      await User.findByIdAndUpdate(req.user._id, {
        proAccount: true,
        userSubscription: updatedSubscription._id,
      })
    } else {
      const updatedSubscription = await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: subscriptionId },
        {
          status: subscription.status,
          currentPeriodStart: new Date(
            subscription.current_period_start * 1000,
          ),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
        { new: true },
      )

      await User.findByIdAndUpdate(req.user._id, {
        proAccount: false,
      })
    }

    res.send({ success: true })
  } catch (error) {
    console.log(error)
    next(error)
  }
}

const customerPortal = async (req, res, next) => {
  const { email } = req.user // Get email from the request body

  try {
    // List customers with the given email
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    })

    // Check if a customer was found
    if (customers.data.length === 0) {
      return res
        .status(404)
        .send({ success: false, error: 'Customer not found' })
    }

    const customerId = customers.data[0].id

    // Create a billing portal session for the found customer
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.CLIENT_URL}/dashboard`,
    })

    res.status(200).json({ success: true, url: session.url })
  } catch (error) {
    next(error)
  }
}

const promoCode = async (req, res, next) => {
  const { promoCode } = req.body

  // const promoCode = 'Test123'

  try {
    const coupons = await stripe.promotionCodes.list()

    // Find the coupon that matches the promoCode
    const coupon = coupons.data.find((c) => c.code == promoCode)

    console.log(coupon)

    if (!coupon || coupon.valid == false) {
      return res
        .status(404)
        .json({ success: false, message: 'Invalid or expired promo code' })
    }

    // Count Subscriptions where the user and paymentStatus is active
    const count = await Subscription.countDocuments({
      user: req.user._id,
      paymentStatus: 'paid',
    })

    // If the user has an active subscription, return an error
    if (count > 0 && coupon.restrictions.first_time_transaction == true) {
      return res.status(404).json({
        success: false,
        message: 'This code is valid for first-time purchases only.',
      })
    }
    res.send({ success: true, data: coupon.coupon })
  } catch (error) {
    next(error)
  }
}

const cancelSubscription = async (req, res, next) => {
  const { subId } = req.body
  try {
    const canceledSubscription = await stripe.subscriptions.cancel(subId)

    res.send({ success: true })
  } catch (error) {
    next(error)
  }
}

const checkout = async (req, res, next) => {
  const { id } = req.params

  const { displayName, email, _id } = req.user

  const subscriptionId = id

  try {
    if (subscriptionId === '0') {
      await User.findOneAndUpdate({ _id }, { planSelected: true })
      return res.status(200).json({ session: { url: '/dashboard' } })
    }

    await User.findOneAndUpdate({ _id }, { unConverted: true })
    const existingSubscription = await Subscription.findOne({
      user: _id.toString(),
    })

    if (existingSubscription) {
      const session = await checkoutSession(
        subscriptionId,
        email,
        displayName,
        _id,
      )
      return res.status(200).json({ session: session })
    } else {
      const session = await checkoutSession(
        subscriptionId,
        email,
        displayName,
        _id,
      )
      return res.status(200).json({ session: session })
    }
  } catch (error) {
    console.error(`Error creating checkout session: ${error.message}`)
    res.status(500).json({ error: 'Error creating checkout session' })
  }
}

// async function createCheckoutSessionWithTrialAndOneTimeFee(
//   subscriptionId,
//   customerEmail,
//   displayName,
//   userId,
// ) {
//   try {
//     const customer = await createOrRetrieveCustomer(customerEmail, displayName)
//     //
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ['card'],

//       // payment_method_types: ['card','paypal','cashapp'],
//       customer: customer.id,
//       line_items: [
//         {
//           price: subscriptionId,
//           quantity: 1,
//         },
   
//       ],

//       mode: 'subscription',
//       subscription_data: {
//         trial_period_days: 14,
//       },
//       metadata: {
//         isVerificationFee: 'true',
//         userId: userId.toString(),
//       },
//       success_url: `${process.env.CLIENT_URL}/dashboard?checkout_Id={CHECKOUT_SESSION_ID}&checkout_status=success&checkout_value=0.00`,
//       cancel_url: `${process.env.CLIENT_URL}/dashboard?checkout_Id={CHECKOUT_SESSION_ID}&checkout_status=failed&checkout_value=0.00`,
//     })

//     return session
//   } catch (error) {
//     console.error(`Error creating checkout session: ${error.message}`)
//     throw error
//   }
// }

// const createCheckoutSessionWithTrialAndOneTimeFee = async (req, res, next) => {
//   const {
//     customerEmail,
//     displayName,
//     userId,
//     oneTimeFeeAmount, // Dynamic amount for the one-time fee
//     oneTimeFeeDescription, // Description for the one-time fee
//   } = req.body;
//   try {
//     console.log("GGGG")
//     const customer = await createOrRetrieveCustomer(customerEmail, displayName)
//     console.log("ww",customer)
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ['card'],

//       // Optional: Uncomment to include additional payment methods
//       // payment_method_types: ['card','paypal','cashapp'],
//       customer: customer.id,
//       line_items: [
//         {
//           price_data: {
//             currency: 'usd', // Replace 'usd' with the relevant currency
//             product_data: {
//               name: oneTimeFeeDescription,
//             },
//             unit_amount: oneTimeFeeAmount * 100, // Stripe expects the amount in cents
//           },
//           quantity: 1,
//         },
//       ],

//       mode: 'payment', // Changed mode to 'payment' for one-time payments
//       success_url: `${process.env.CLIENT_URL}/dashboard?checkout_Id={CHECKOUT_SESSION_ID}&checkout_status=success&checkout_value=${oneTimeFeeAmount}`,
//       cancel_url: `${process.env.CLIENT_URL}/dashboard?checkout_Id={CHECKOUT_SESSION_ID}&checkout_status=failed&checkout_value=0.00`,
//     })

//     return session
//   } catch (error) {
//     console.error(`Error creating checkout session: ${error.message}`)
//     throw error
//   }
// }



// Main Deposit
const createCheckoutSessionWithTrialAndOneTimeFee = async (req, res) => {
  try {
    const {
      customerEmail,
      displayName,
      userId,
      oneTimeFeeAmount,
      oneTimeFeeDescription,
    } = req.body

    // Retrieve or create the Stripe customer
    const customer = await createOrRetrieveCustomer(customerEmail, displayName)

    // Create the Checkout session with a one-time fee
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], // Only card payments (credit cards will be blocked by Radar)
      payment_method_options: {
        card: {
          request_three_d_secure: 'any', // Can help enforce extra security for debit cards
        },
      },
      customer: customer.id,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: oneTimeFeeDescription,
            },
            unit_amount: oneTimeFeeAmount * 100, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/home/payment?checkout_Id={CHECKOUT_SESSION_ID}&checkout_status=success&checkout_value=${oneTimeFeeAmount}`,
      cancel_url: `${process.env.CLIENT_URL}/home/payment?checkout_Id={CHECKOUT_SESSION_ID}&checkout_status=failed&checkout_value=0.00`,
      client_reference_id: userId,
    })

    console.log('Session', session)

    // Save the payment intent and session details in the database
    const paymentRecord = new Payment({
      userId: userId,
      sessionId: session.id,
      customerEmail: customerEmail,
      amount: oneTimeFeeAmount,
      currency: 'usd',
      description: oneTimeFeeDescription,
      status: 'pending',
    })

    await paymentRecord.save()

    // Return the URL for the Stripe Checkout page
    res.status(200).json({ url: session.url })
  } catch (error) {
    console.error(`Error creating checkout session: ${error.message}`)
    res.status(500).json({ error: 'Failed to create checkout session' })
  }
}



// Main Refund

const refundMultiplePayments = async (req, res) => {
  try {
    console.log("ss")
    const userId = req.user.id
    const { amount } = req.body

    console.log(
      'Checkpoint 1: Received refund request for user:',
      userId,
      'Amount:',
      amount,
    )

    // Fetch the user to update their balance after refund
    const user = await User.findById(userId)
    if (!user) {
      throw new Error('User not found')
    }
    console.log('Checkpoint 2: User found:', user.email)

    // Check if the user has enough balance to cover the refund
    if (user.balance < amount) {
      throw new Error(`Insufficient balance. User balance: $${user.balance}`)
    }

    // Fetch all completed and partially refunded payments for the user sorted by oldest first
    const payments = await Payment.find({
      userId,
      status: { $in: ['completed', 'partially_refunded'] },
    }).sort({ createdAt: 1 })

    console.log(
      'Checkpoint 3: Fetched eligible payments for refund. Number of payments:',
      payments.length,
    )

    let remainingAmountToRefund = amount
    const refundResults = [] // To store refund results for each payment intent

    for (const payment of payments) {
      if (remainingAmountToRefund <= 0) {
        console.log('Checkpoint 4: Refund completed. Exiting loop.')
        break
      }

      const alreadyRefunded = payment.refunds.reduce(
        (sum, refund) => sum + refund.amount,
        0,
      )
      const availableToRefund = payment.amount - alreadyRefunded

      if (availableToRefund <= 0) {
        console.log(
          'Checkpoint 5: Payment already fully refunded. Skipping payment ID:',
          payment._id,
        )
        continue
      }

      const refundAmountForThisPayment = Math.min(
        availableToRefund,
        remainingAmountToRefund,
      )
      console.log(
        `Checkpoint 6: Refunding $${refundAmountForThisPayment} from payment ID: ${payment._id}`,
      )

      const refund = await stripe.refunds.create({
        payment_intent: payment.paymentIntentId,
        amount: refundAmountForThisPayment * 100, // Stripe amounts are in cents
      })
      console.log(
        'Checkpoint 7: Stripe refund created for payment intent:',
        payment.paymentIntentId,
      )

      payment.refunds.push({
        refundId: refund.id,
        amount: refundAmountForThisPayment,
        status: refund.status,
      })

      const totalRefundedFromPayment = payment.refunds.reduce(
        (sum, refund) => sum + refund.amount,
        0,
      )
      payment.status =
        totalRefundedFromPayment === payment.amount
          ? 'refunded'
          : 'partially_refunded'
      await payment.save()
      console.log(
        'Checkpoint 8: Payment status updated. Payment ID:',
        payment._id,
      )

      remainingAmountToRefund -= refundAmountForThisPayment
      console.log(
        'Checkpoint 9: Remaining refund amount:',
        remainingAmountToRefund,
      )

      refundResults.push({
        paymentId: payment._id,
        refundAmount: refundAmountForThisPayment,
      })
    }

    if (remainingAmountToRefund > 0) {
      throw new Error(
        `Insufficient funds to refund the full amount. Remaining: $${remainingAmountToRefund}`,
      )
    }

    // Subtract the refund amount from the user's balance
    user.balance -= amount
    await user.save()
    console.log(
      'Checkpoint 10: User balance updated. New balance:',
      user.balance,
    )

    return res.status(200).json({
      success: true,
      message: `Refunded $${amount} across multiple payments and updated user balance.`,
      refundResults,
    })
  } catch (error) {
    console.error(`Error processing refund: ${error.message}`)
    return res.status(500).json({ success: false, message: error.message })
  }
}

























async function checkoutSession(
  subscriptionId,
  customerEmail,
  displayName,
  userId,
) {
  try {
    const customer = await createOrRetrieveCustomer(customerEmail, displayName)
    let subscriptionPrice = await stripe.prices.retrieve(subscriptionId)
    subscriptionPrice = subscriptionPrice.unit_amount / 100
    subscriptionPrice = subscriptionPrice.toFixed(2) // Convert to 2 decimal places

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],

      // payment_method_types: ['card','paypal','cashapp'],
      customer: customer.id,
      line_items: [
        {
          price: subscriptionId,
          quantity: 1,
        },
      ],

      
      mode: 'subscription',

      metadata: {
        userId: userId.toString(),
      },
      success_url: `${process.env.CLIENT_URL}/dashboard?checkout_Id={CHECKOUT_SESSION_ID}&checkout_status=success&checkout_value=0.00`,
      cancel_url: `${process.env.CLIENT_URL}/dashboard?checkout_Id={CHECKOUT_SESSION_ID}&checkout_status=failed&checkout_value=0.00`,
    })

    return session
  } catch (error) {
    console.error(`Error creating checkout session: ${error.message}`)
    throw error
  }
}




async function createOrRetrieveCustomer(email, displayName) {
  // Search for existing customers with the given email
  const customers = await stripe.customers.list({
    email: email,
    limit: 1,
  })

  if (customers.data.length > 0) {
    return customers.data[0] // Return existing customer
  } else {
    // Create a new customer if not found, using name or metadata for firstName and lastName
    const newCustomer = await stripe.customers.create({
      email: email,
      name: displayName,
    })
    return newCustomer
  }
}

module.exports = {
  stripeSubscription,
  cancelSubscription,
  updatePaymentStatus,
  customerPortal,
  promoCode,
  checkout,
  createCheckoutSessionWithTrialAndOneTimeFee,
  refundMultiplePayments,
}
