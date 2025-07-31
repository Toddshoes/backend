const express = require('express')
const {
    validateAddress,
    getRates,
    createLabel,
    trackShipment,
    listCarriers,
    cancelShipment,
    checkVoidEligibility,
    getLabelStatus,
    calculateShippingRates
} = require('../controllers/shipping')
const router = express.Router()



const { protect } = require('../middleware/auth') 
router.use(protect)
router.post('/validate-address', validateAddress)
router.post('/get-rates', getRates)
router.post('/create-label', createLabel)
router.post('/get-trade-rates', calculateShippingRates)

router.get('/labels/:label_id', getLabelStatus);
router.delete('/labels/:label_id/void', cancelShipment);
router.get('/labels/:label_id/void-eligibility', checkVoidEligibility);
router.post('/track/:carrier_code/:tracking_number', trackShipment)
router.get('/list-carrier', listCarriers)

module.exports = router
