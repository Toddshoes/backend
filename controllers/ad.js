const Ad = require('../models/Ad')
const asyncHandler = require('../middleware/async')

// Controller to handle the creation of a new ad
const createAd = asyncHandler(async (req, res) => {
  const { position, enabled, htmlCode } = req.body
  const newAd = new Ad({ position, enabled, htmlCode })
  const savedAd = await newAd.save()

  res.status(201).json(savedAd)
})

// Controller to get all ads
const getAllAds = asyncHandler(async (req, res) => {
  const ads = await Ad.find()
  res.status(200).json(ads)
})

// Controller to get a single ad by ID
const getAdById = asyncHandler(async (req, res) => {
  const adId = req.params.id
  const ad = await Ad.findById(adId)

  if (!ad) {
    return res.status(404).json({ error: 'Ad not found' })
  }

  res.status(200).json(ad)
})

// Controller to update an existing ad by ID
const editAd = asyncHandler(async (req, res) => {
  const { enabled, htmlCode } = req.body
  const adId = req.params.id

  const updatedAd = await Ad.findByIdAndUpdate(
    adId,
    { enabled, htmlCode },
    { new: true }, // Return the updated document
  )

  if (!updatedAd) {
    return res.status(404).json({ error: 'Ad not found' })
  }

  res.status(200).json(updatedAd)
})

module.exports = { createAd, getAllAds, getAdById, editAd }
