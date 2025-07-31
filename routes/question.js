const express = require('express')
const router = express.Router()
const {
  askQuestion,
  getQuestions,
  answerQuestion,
  getUnansweredQuestions,
} = require('../controllers/question')
const { protect } = require('../middleware/auth')


router.use(protect)
// Route to ask a question about a product
router.post('/product/:productId/question', askQuestion)

// Route to get all questions for a product
router.get('/product/:productId/questions', getQuestions)

router.get('/product/:productId/questions1', getUnansweredQuestions)

// Route for product owner to answer a question
router.post('/question/:questionId/answer', answerQuestion)

module.exports = router
