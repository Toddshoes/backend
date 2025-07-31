// Import necessary modules from Express, Passport, and controllers
const express = require('express')
const router = express.Router()
const passport = require('passport')

const {
  register,
  login,
  getMe,
  updatePassword,
  forgotPassword,
  resetPassword,
  allusers,
  deleteuser,
  registeruseradminpanel,
  updateuser,
  countuser,
  verifyEmail,
  verifyEmailSend,
  updateUserProfile,
  getUserProfile,
  getUserMetrics,
  getUserMetrics2,
  subscribe
} = require('../controllers/auth')
const { protect, authorize } = require('../middleware/auth')

const cloudinary = require('cloudinary').v2


const upload = require('../middleware/multer')

// Route for user registration
router.post('/register', upload.single('image'), register)

router.post('/registeruser', registeruseradminpanel)

router.post('/login', login)

// Route to get user details (requires authentication)
router.get('/getMe', protect, getMe)
router.get('/getusermetrics', protect, getUserMetrics)
router.get('/getusermetrics2', protect, getUserMetrics2)
router.post('/subscribe', subscribe)
router.post('/forgotPassword', forgotPassword)

router.put('/resetpassword/:resettoken', resetPassword)

router.post('/updatePassword', protect, updatePassword)

router.get('/verify-email/:token', verifyEmail)
router.get('/verify-email', protect, verifyEmailSend)

// Update user profile

router.post('/updateuserprofile',upload.single('image'), protect, updateUserProfile)
router.get('/getuserprofile', protect, getUserProfile)



// Admin routes
router.get('/allusers', protect, authorize('admin'), allusers)
router.delete('/deleteuser/:id', protect, authorize('admin'), deleteuser)
router.put('/updateuser/:id', protect, authorize('admin'), updateuser)
router.get('/countuser', countuser)

// Export the router for use in other parts of the application
module.exports = router
