const express = require('express')
const {
  createDispute,
  getDisputes,
} = require('../controllers/dispute')
const { protect } = require('../middleware/auth')

const router = express.Router()

// POST: Create a new dispute
router.post('/create', protect, createDispute)

// GET: Get all disputes for the logged-in user
router.get('/', protect, getDisputes)

module.exports = router
