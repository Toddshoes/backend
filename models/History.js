// Import Mongoose for schema creation
const mongoose = require('mongoose')

// Define the schema for the 'History' model
const historySchema = new mongoose.Schema({
  // Reference to the 'Structure' model using ObjectId
  structure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Structure', // Referencing the 'Structure' model
  },
  // Reference to the 'User' model using ObjectId
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Referencing the 'User' model
  },
  // Role of the user in the interaction (user or assistant)
  role: {
    type: String,
    enum: ['user', 'assistant'], // Enumerated values for role
  },
  // Content of the interaction
  content: {
    type: String,
    default: '', // Default value if not provided
  },
  imageKey: {
    type: String,
   
  },
  // Timestamp for when the history entry was created
  createdAt: {
    type: Date,
    default: Date.now, // Default value is the current timestamp
  },
})

// Create the 'History' model using the defined schema
const History = mongoose.model('History', historySchema)

// Export the 'History' model for use in other parts of the application
module.exports = History
