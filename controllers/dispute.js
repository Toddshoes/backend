const Dispute = require('../models/Dispute')
const Trade = require('../models/Trade')
const asyncHandler = require('../middleware/async')

// Create a new dispute
exports.createDispute = asyncHandler(async (req, res) => {
  const { tradeId, reason } = req.body

  // Find the trade
  const trade = await Trade.findById(tradeId)
  if (!trade) {
    return res.status(404).json({ message: 'Trade not found.' })
  }

  // Check if the user is involved in the trade
  if (
    trade.offerer.toString() !== req.user.id &&
    trade.receiver.toString() !== req.user.id
  ) {
    return res.status(403).json({ message: 'You are not part of this trade.' })
  }

  // Create a new dispute
  const dispute = await Dispute.create({
    trade: tradeId,
    user: req.user.id,
    reason,
  })
  await dispute.populate('trade')
  res.status(201).json({ success: true, data: dispute })
})

// Get all disputes for the logged-in user
exports.getDisputes = asyncHandler(async (req, res) => {
  const disputes = await Dispute.find({ user: req.user.id })
    .populate({
      path: 'trade',
      populate: [
        { path: 'offererProduct', model: 'Product' }, // Populate offererProduct
        { path: 'receiverProduct', model: 'Product' }, // Populate receiverProduct
      ],
    })
    .exec()

  res.status(200).json({ success: true, data: disputes })
})
