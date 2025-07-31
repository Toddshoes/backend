const mongoose = require('mongoose')

const adSchema = new mongoose.Schema(
  {
    position: {
      type: String, // Adjust the data type based on your requirements
      required: true,
      unique: true,
    },
    enabled: {
      type: Boolean,
      default: false, // Default value if not provided
    },
    htmlCode: {
      type: String, // Assuming HTML code is stored as a string
      required: true,
    },
  },
  { timestamps: true },
)

const Ad = mongoose.model('Ad', adSchema)

module.exports = Ad
