// Import Mongoose for schema creation
const mongoose = require('mongoose')

// Define the schema for the 'Structure' model
const structureSchema = new mongoose.Schema({
  // Reference to the 'User' model using ObjectId
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Referencing the 'User' model
  },
  // Parent field can be of any type, allowing for flexibility
  parent: mongoose.Schema.Types.Mixed,
  // Boolean flag indicating whether the structure is droppable
  droppable: Boolean,
  // Text field for storing the content of the structure
  text: {
    type: String,
    default: '', // Default value if not provided
    maxLength: 400,
  },

  // Type of the structure, either 'File' or 'Folder'
  type: {
    type: String,
    enum: ['File', 'Folder'], // Enumerated values for type
  },
  // Category of the structure, either 'History', 'Prompt', or 'System'
  category: {
    type: String,
    enum: ['History', 'Prompt', 'System'], // Enumerated values for category
  },
  isShared: {
    type: Boolean,
    default:false
    
  },
})

// Create the 'Structure' model using the defined schema
const Structure = mongoose.model('Structure', structureSchema)

// Export the 'Structure' model for use in other parts of the application
module.exports = Structure
