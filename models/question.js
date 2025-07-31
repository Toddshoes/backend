const mongoose = require('mongoose')
const Schema = mongoose.Schema

const questionSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  askedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  answer: {
    type: String,
  },
  answeredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  answeredAt: {
    type: Date,
  },
})

const Question = mongoose.model('Question', questionSchema)
module.exports = Question
