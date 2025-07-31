// routes/tradeRoutes.js
const express = require('express')
const router = express.Router()
const tradeController = require('../controllers/trade')
const { protect } = require('../middleware/auth')

// Send trade offer
router.post('/offer/:receiverId', protect, tradeController.sendTradeOffer)

// Accept trade offer
router.post('/accept', protect, tradeController.acceptTradeOffer)
router.post('/reject', protect, tradeController.rejectTradeOffer)
// Complete trade
router.post('/complete', protect, tradeController.completeTrade)
router.post('/reverse', protect, tradeController.reverseTradeOffer)

// Add review
router.post('/review', protect, tradeController.addReview)
router.get('/gettradereviews', protect, tradeController.getTradeReviews)
router.get('/getuserreviews', protect, tradeController.getUserReviews)
router.get('/pending', protect, tradeController.getPendingTrades)
router.get('/history', protect, tradeController.getTradeHistory)
router.get('/getusertradehistory', protect, tradeController.getUserTradeHistory)
router.get('/pending/count', protect, tradeController.getPendingTradeCount)
router.get('/toggletrade/:tradeId', protect, tradeController.toggleFinishStatus)
router.get('/trade/:id', protect, tradeController.getTradeById)
router.put('/trade/offerer-received/:id',protect, tradeController.markOffererReceived)
router.put('/trade/offerer-finished/:id',protect, tradeController.markOffererFinished)
module.exports = router


