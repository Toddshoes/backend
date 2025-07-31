// middleware/multer.js
const multer = require('multer')
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const cloudinary = require('../config/cloudinary')

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'uploads', // Optional: Folder name on Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg','webp'], // Optional: allowed formats
  },
})

const upload = multer({ storage: storage })

module.exports = upload
