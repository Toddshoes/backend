// Import Mongoose for schema creation
const mongoose = require('mongoose')

// Define the schema for the 'Prompt' model
const promptSchema = mongoose.Schema(
  {
    // Reference to the 'User' model using ObjectId
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Referencing the 'User' model
    },
    // Reference to the 'Structure' model using ObjectId
    structure: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Structure', // Referencing the 'Structure' model
    },
    // Reference to the 'PromptFile' model using ObjectId
    promptFile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Structure', // Referencing the 'PromptFile' model
    },
    // Name of the prompt, required field
    name: {
      type: String,
      required: true,
    },
    // Description of the prompt, required field
    description: {
      type: String,
      required: true,
    },
    // Content of the prompt, required field
    content: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true, // Automatically add timestamps (createdAt, updatedAt)
  },
)

// Create the 'Prompt' model using the defined schema
const Prompt = mongoose.model('Prompt', promptSchema)

// Export the 'Prompt' model for use in other parts of the application
module.exports = Prompt
