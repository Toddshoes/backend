const Question = require('../models/question')
const Product = require('../models/Product')
const User = require('../models/User')

// Ask a question about a product
exports.askQuestion = async (req, res) => {
  try {
    const { productId } = req.params
    const { question } = req.body
    const userId = req.user.id // Assuming you have authentication middleware
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }

    if (user.role === 'inactive') {
      return res.status(403).json({
        message:
          'Your account is inactive. Please open a dispute or contact the owner to verify your account.',
      })
    }
    
    // Check if the product exists
    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }

    // Create and save the question
    const newQuestion = new Question({
      productId,
      askedBy: userId,
      question,
    })

    await newQuestion.save()

    res
      .status(201)
      .json({ message: 'Question asked successfully', question: newQuestion })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error })
  }
}

exports.getQuestions = async (req, res) => {
  try {
    const { productId } = req.params // Get productNumber from parameters
    const { page = 1, limit = 2 } = req.query // Get page and limit from query parameters

    // Calculate the number of questions to skip based on the page
    const skip = (page - 1) * limit

    // Find questions for the given productNumber
    const questions = await Question.find({
      productId,
      question: { $exists: true, $ne: null }, // Ensure 'question' exists
      answer: { $exists: true, $ne: null }, // Ensure 'answer' exists
    })
      .populate('askedBy', 'username') // Populate the user who asked the question
      .populate('answeredBy', 'username') // Populate the user who answered (if answered)
      .sort({ createdAt: -1 }) // Sort questions by the most recent
      .skip(skip) // Skip the questions based on pagination
      .limit(limit) // Limit to the number of questions per page

    // Format the questions in the desired FAQ format
    const faqs = questions.map((q) => ({
      _id: q._id,
      question: q.question, // Assuming the question text is in `question` field
      answer: q.answer || 'No answer provided', // Use answer or default text if none
    }))

    // Get total questions that match the criteria for pagination
    const totalQuestions = await Question.countDocuments({
      productId,
      question: { $exists: true, $ne: null }, // Ensure 'question' exists
      answer: { $exists: true, $ne: null }, // Ensure 'answer' exists
    })

    res.status(200).json({ faqs, totalQuestions }) // Send formatted FAQs and total questions as response
  } catch (error) {
    res.status(500).json({ message: 'Server error', error })
  }
}




exports.getUnansweredQuestions = async (req, res) => {
  try {
    const { productId } = req.params // Get productId from parameters
    const { page = 1, limit = 2 } = req.query // Get page and limit from query parameters

    // Calculate the number of questions to skip based on the page
    const skip = (page - 1) * limit

    // Find questions for the given productId where answer is null or does not exist
    const questions = await Question.find({
      productId: productId, // Assuming productId corresponds to productNumber
      // question: { $exists: true, $ne: null }, // Ensure 'question' exists
      // $or: [
      //   { answer: { $exists: false } }, // Answer does not exist
      //   { answer: null }, // Answer is null
      // ],
    })
      .populate('askedBy', 'username') // Populate the user who asked the question
      .sort({ createdAt: -1 }) // Sort questions by the most recent
      // .skip(skip) // Skip the questions based on pagination
      // .limit(limit) // Limit to the number of questions per page

    // Format the questions in the desired FAQ format
    // const unansweredQuestions = questions.map((q) => ({
    //   _id: q._id,
    //   question: q.question, // Assuming the question text is in `question` field
    //   answer: 'No answer provided', // Default text since the answer is null or does not exist
    // }))

    // Get total questions that match the criteria for pagination
    const totalQuestions = await Question.countDocuments({
      productId: productId, // Ensure productId is correct
      question: { $exists: true, $ne: null }, // Ensure 'question' exists
      $or: [
        { answer: { $exists: false } }, // Answer does not exist
        { answer: null }, // Answer is null
      ],
    })

    res.status(200).json({ unansweredQuestions: questions, totalQuestions }) // Send formatted unanswered questions and total questions as response
  } catch (error) {
    res.status(500).json({ message: 'Server error', error })
  }
}



// Answer a question (for the product owner)
exports.answerQuestion = async (req, res) => {
  try {
    const { questionId } = req.params
    const { answer } = req.body
    const userId = req.user.id // Assuming you have authentication middleware

    // Find the question
    const question = await Question.findById(questionId).populate('productId')
    if (!question) {
      return res.status(404).json({ message: 'Question not found' })
    }

    // Ensure that the user answering is the product owner
    if (question.productId.userId.toString() !== userId) {
      return res
        .status(403)
        .json({ message: 'You are not authorized to answer this question' })
    }

    // Update the question with the answer
    question.answer = answer
    question.answeredBy = userId
    question.answeredAt = Date.now()

    await question.save()

    res
      .status(200)
      .json({ message: 'Question answered successfully', question })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error })
  }
}
