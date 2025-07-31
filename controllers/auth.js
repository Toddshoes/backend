const User = require('../models/User')
const ErrorResponse = require('../utils/errorResponse')
const asyncHandler = require('../middleware/async')
const axios = require('axios')
const bcrypt = require('bcryptjs')
const sendEmail = require('../utils/sendEmail')
const crypto = require('crypto')

const { error } = require('console')
const Trade = require('../models/Trade')
const Review = require('../models/Review')
const Question = require('../models/question')

exports.register = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, email, password, phonenumber } = req.body

  // Basic validation to check if required fields are present
  if (!firstName || !lastName || !email || !password || !phonenumber) {
    return res
      .status(400)
      .json({ success: false, message: 'Please provide all required fields' })
  }

  // Example: Additional validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res
      .status(400)
      .json({ success: false, message: 'Please provide a valid email address' })
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({
        success: false,
        message: 'Password must be at least 6 characters long',
      })
  }

  if (!/^\d+$/.test(phonenumber)) {
    return res
      .status(400)
      .json({
        success: false,
        message: 'Please provide a valid phone number (digits only)',
      })
  }

  try {
    // Check if the email already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: 'Email already exists' })
    }

    // Check if the file is uploaded
    let imageUrl
    if (req.file) {
      imageUrl = req.file.path // This is the URL returned by Cloudinary
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      phoneNumber: phonenumber,
      photoURL: imageUrl, // Save image URL to the user model
    })

    // Send welcome email
    await sendEmail({
      email: user.email,
      subject: 'Welcome to OOWAP',
      message: `Hi ${user.firstName}. Thank you for signing up on OOWAP. Your account has been successfully created`,
    })

    sendTokenResponse(user, 200, res)
  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to create account. Please try again.',
    })
  }
})
 

exports.registeruseradminpanel = asyncHandler(async (req, res, next) => {
  const { displayName, email, password, role, proAccount } = req.body

  console.log(displayName, email, password, role, proAccount)

  const isProAccount = proAccount === 'Yes' // Renamed for clarity

  try {
    // Create user
    const user = await User.create({
      displayName,
      email,
      password,
      role,
      proAccount: isProAccount,
      planSelected: true,
    })

    console.log(user)

    const { firstName, lastName } = splitDisplayName(displayName)

    const subscriber = {
      email,
      first_name: firstName,
      last_name: lastName,
      tags: ['trial'],
    }

    const body = {
      email,
      tags: ['trial'],
      data: {
        'First Name': firstName,
        'Last Name': lastName,
        Name: firstName + ' ' + lastName,
      },
    }

    try {
      // Attempt to add the subscriber to Drip
      // await drip.createUpdateSubscriber(subscriber)
      await axios.post(`https://whirl.wynd.one/api/lists/${List}/feed`, body, {
        headers: {
          'X-Auth-APIKey': process.env.WHIRL_KEY,
        },
      })

      return res.status(200).json(user)
    } catch (dripError) {
      console.error('Error adding user to Drip:', dripError)
      // Log the error and proceed without sending an error response
    }

    // Send token response (moved outside the inner catch block)
    return res.status(200).json(user)
  } catch (err) {
    console.log(err) // Corrected variable name
    return res.status(500).json({ error: 'Server error' })
  }
})

// @desc      Login user
// @route     POST /api/v1/auth/login
// @access    Public

exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body

  // Check if email and password are provided
  if (!email && !password) {
    return next(
      new ErrorResponse('Please provide both email and password', 400),
    )
  }

  // Individual field validation
  if (!email) {
    return next(new ErrorResponse('Email address is required', 400))
  }

  if (!password) {
    return next(new ErrorResponse('Password is required', 400))
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return next(new ErrorResponse('Please provide a valid email address', 400))
  }

  // Check for user
  const user = await User.findOne({ email }).select('+password')

  if (!user) {
    return next(
      new ErrorResponse('The email or password you entered is incorrect', 401),
    )
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password)

  if (!isMatch) {
    return next(
      new ErrorResponse('The email or password you entered is incorrect', 401),
    )
  }

  // Check if account is active (optional enhancement)
  if (user.status === 'inactive') {
    return next(
      new ErrorResponse(
        'Your account has been deactivated. Please contact support.',
        401,
      ),
    )
  }

  sendTokenResponse(user, 200, res)
})


exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id)

  res.status(200).json({
    success: true,
    data: user,
  })
})




// @desc      Update password
// @route     PUT /api/v1/auth/updatepassword
// @access    Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password')

  // Check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Password is incorrect', 401))
  }

  user.password = req.body.newPassword
  await user.save()

  res.status(200).json({
    success: true,
  })
})

// @desc      Forgot password
// @route     POST /api/v1/auth/forgotpassword
// @access    Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email })

  if (!user) {
    return next(new ErrorResponse('There is no user with that email', 404))
  }

  // Get reset token
  const resetToken = user.getResetPasswordToken()

  await user.save({ validateBeforeSave: false })

  // Create reset URL
  const resetUrl = `${process.env.CLIENT_URL}/reset-password-account/${resetToken}`

  const message = `Hello,\n\n
We received a request to reset the password for your OOOWAP account. If you requested this password reset, please click on the link below or copy and paste it into your browser to proceed:
  \n
Reset Password: ${resetUrl}
  \n
If you did not request this password reset, please ignore this email or contact us immediately at hey@OOOWAP.com if you suspect any suspicious activity. Your security is our top priority. We recommend creating a strong, unique password that includes a combination of letters, numbers, and special characters.
  \n
Thank you for using OOOWAP.
  \n
Best Regards,
OOOWAP`

  try {
    // Call your custom sendEmail function
    await sendEmail({
      email: user.email,
      subject: 'Password Reset Request for Your OOOWAP Account',
      message,
    })

    res.status(200).json({ success: true, data: 'Email sent' })
  } catch (err) {
    console.error(err)
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined

    await user.save({ validateBeforeSave: false })

    return next(new ErrorResponse('Email could not be sent', 500))
  }

  res.status(200).json({
    success: true,
    data: user,
  })
})

// @desc      Reset password
// @route     PUT /api/v1/auth/resetpassword/:resettoken
// @access    Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex')

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  })

  if (!user) {
    return next(
      new ErrorResponse(
        'The provided token is invalid or has expired. Please request a new one.',
        400,
      ),
    )
  }

  // Set new password
  user.password = req.body.password
  user.resetPasswordToken = undefined
  user.resetPasswordExpire = undefined
  await user.save()

  res.status(200).json({
    success: true,
  })
})

const email_sending = async (displayName, email, user, res) => {
  // Get reset token
  const resetToken = user.generateEmailVerificationToken()

  // Create reset URL
  const resetUrl = `${process.env.CLIENT_URL}/email-verify/${resetToken}`

  message = `Dear ${displayName} \n\n,



Welcome aboard and thank you for signing up for OOOWAP! You’re just one step away from unlocking all the innovative features we have to offer. \n\n



To ensure the security of your account and to complete your registration process, please verify your email address by clicking on the link below:\n\n




Verify Email Address \n
${resetUrl}



This link will expire in 24 hours, so be sure to click it soon. If you did not sign up for a OOOWAP account, please disregard this email.



Warmest regards,



The OOOWAP Team`

  try {
    // Call your custom sendEmail function
    await sendEmail({
      email: email,
      subject: 'Email Verification Request for Your OOOWAP Account',
      message,
    })
    user.emailVerificationToken = resetToken
    user.resetEmailExpire = Date.now()
    await user.save({ validateBeforeSave: false })
    // res.status(200).json({ success: true, data: 'Email sent' })
    return true
  } catch (err) {
    console.error(err)
    user.emailVerificationToken = undefined
    user.resetEmailExpire = undefined

    await user.save({ validateBeforeSave: false })

    return false
  }

  return true
}

// Email verification controller
exports.verifyEmail = async (req, res) => {
  const { token } = req.params

  try {
    const user = await User.findOne({
      emailVerificationToken: token,
      isEmailVerified: false,
      // resetEmailExpire: { $gt: Date.now() },
    })
    console.log(token)
    console.log(user)
    if (!user) {
      return res
        .status(400)
        .send('Invalid or expired email verification token.')
    }

    user.isEmailVerified = true
    user.emailVerificationToken = undefined // Clear the token after verification

    console.log(user.isEmailVerified)

    await user.save()

    res.send('Email verified successfully.')
  } catch (error) {
    console.error(error)
    res.status(500).send('Server error during email verification.')
  }
}

// @desc      Verify Email
// @route     POST /api/v1/auth/forgotpassword
// @access    Public
exports.verifyEmailSend = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.user.email })

  if (!user) {
    return next(new ErrorResponse('There is no user with that email', 404))
  }
  const userdata = await User.findById(user._id)
  const emailsend = email_sending(user.displayName, user.email, userdata, res)
  if (emailsend) {
    res.status(200).send('Email sent successfully')
  } else {
    res.status(400).send('Failed to send the email')
  }
  // Get reset token
})

const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken()

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  }

  if (process.env.NODE_ENV === 'production') {
    options.secure = true
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      expiresIn: options.expires,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName:user.lastName,
        email: user.email,
        role: user.role,
        image: user.photoURL,
        balance:user.balance,
        address:user.address,
        country:user.country,
        state:user.state,
        postalcode :user.postalcode ,
        city:user.city

       
      },
    })
}

function splitDisplayName(displayName) {
  // Assuming the display name is formatted as "FirstName LastName"
  const nameParts = displayName.split(' ')

  // Extract first name and last name
  const firstName = nameParts[0]
  const lastName = nameParts.slice(1).join(' ') // Join the remaining parts as the last name

  return { firstName, lastName }
}

exports.allusers = asyncHandler(async (req, res, next) => {
  const users = await User.find({})

  return res.status(200).json({
    success: true,
    data: users,
  })
})

exports.deleteuser = asyncHandler(async (req, res, next) => {
  console.log('User id', req.params.id)
  const user = await User.findByIdAndDelete(req.params.id)

  if (!user) {
    return next(new ErrorResponse(`No user with the id of ${req.params.id}`))
  }

  return res.status(200).json({
    success: true,
    data: user,
  })
})

exports.updateuser = asyncHandler(async (req, res, next) => {
  console.log('User id', req.params.id)
  const user = await User.findById(req.params.id)
  console.log(req.body)
  if (user) {
    console.log('user found')
    user.firstName = req.body.firstName || user.firstName
    user.lastName = req.body.lastName || user.lastName
    user.email = req.body.email || user.email
    user.role = req.body.role || user.role
    user.phoneNumber = req.body.phoneNumber || user.phoneNumber

    if (req.body.password != '') {
      user.password = req.body.password || user.password
    }

    const updatedUser = await user.save()

    return res.json({
      _id: updatedUser._id,
      displayName: updatedUser.displayName,
      email: updatedUser.email,
      role: updatedUser.role,
     
    })
  }

  return res.status(500).json({
    message: 'User not found',
  })
})



exports.updateUserProfile = asyncHandler(async (req, res, next) => {
  console.log('User ID:', req.user.id)
  console.log(req.body)

  const user = await User.findById(req.user.id).select('+password') // Include the password field explicitly

  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  console.log('User found')

  // Update profile fields from the request body or retain existing values
  user.firstName = req.body.firstName || user.firstName
  user.lastName = req.body.lastName || user.lastName
  user.email = req.body.email || user.email
  user.phoneNumber = req.body.phoneNumber || user.phoneNumber
  user.address = req.body.address || user.address
  user.country = req.body.country || user.country
  user.state = req.body.state || user.state
  user.city = req.body.city || user.city
  user.postalcode = req.body.postalcode || user.postalcode
  user.description = req.body.description || user.description

  let imageUrl
  if (req.file) {
    imageUrl = req.file.path // This is the URL returned by Cloudinary
  }
  user.photoURL = imageUrl || user.photoURL

  // Handle password update if provided
  if (req.body.password && req.body.newPassword) {
    // Check if the user has a password set
    if (!user.password) {
      return res
        .status(400)
        .json({ message: 'User does not have a password set' })
    }

    // Use the matchPassword method from the schema to compare the entered password
    const isMatch = await user.matchPassword(req.body.password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' })
    }

    // Update the password and let the pre('save') hook hash it
    user.password = req.body.newPassword
  }

  const updatedUser = await user.save() // Save the updated user data

  // Return the updated user data to the frontend
  console.log('Updated user', updatedUser)
  return res.json({
    _id: updatedUser._id,
    firstName: updatedUser.firstName,
    lastName: updatedUser.lastName,
    email: updatedUser.email,
    phoneNumber: updatedUser.phoneNumber,
    address: updatedUser.address,
    country: updatedUser.country,
    state: updatedUser.state,
    city: updatedUser.city,
    postalCode: updatedUser.postalcode,
    description: updatedUser.description,
    image: updatedUser.photoURL,
  })
})





exports.getUserProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('-password') // Exclude the password field

  if (user) {
    // Return the user data to the frontend (excluding password)
    return res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      address: user.address,
      country: user.country,
      state: user.state,
      city: user.city,
      postalcode: user.postalcode,
      description: user.description,
      image: user.photoURL,
      balance: user.balance
    })
  }

  // Return error if the user is not found
  return res.status(404).json({ message: 'User not found' })
})










exports.countuser = asyncHandler(async (req, res, next) => {
  try {
    // Current date in UTC-8
    const nowUtc8 = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }),
    )

    // Start of the month in UTC-8
    const startOfMonthUtc8 = new Date(
      nowUtc8.getFullYear(),
      nowUtc8.getMonth(),
      1,
    )

    // Start of the day in UTC-8
    const startOfDayUtc8 = new Date(
      nowUtc8.getFullYear(),
      nowUtc8.getMonth(),
      nowUtc8.getDate(),
    )

    // Current date and start of the month
    const startOfMonth = new Date(
      Date.UTC(
        startOfMonthUtc8.getFullYear(),
        startOfMonthUtc8.getMonth(),
        startOfMonthUtc8.getDate(),
      ),
    )
    const startOfDay = new Date(
      Date.UTC(
        startOfDayUtc8.getFullYear(),
        startOfDayUtc8.getMonth(),
        startOfDayUtc8.getDate(),
      ),
    )
    const now = new Date(
      Date.UTC(
        nowUtc8.getFullYear(),
        nowUtc8.getMonth(),
        nowUtc8.getDate(),
        nowUtc8.getHours(),
        nowUtc8.getMinutes(),
        nowUtc8.getSeconds(),
      ),
    )

    // Count total users
    const totalUsers = await User.countDocuments()


    // Count monthly registered users
    const monthlyUsers = await User.countDocuments({
      createdAt: {
        $gte: startOfMonth,
        $lte: now,
      },
    })

    // Count daily registered users
    const dailyUsers = await User.countDocuments({
      createdAt: {
        $gte: startOfDay,
        $lte: now,
      },
    })

    // Return the counts
    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        
        monthlyUsers,
        dailyUsers,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
    })
  }
})




exports.getUserMetrics = async (req, res) => {
  try {
    const userId = req.user.id // Assuming you have middleware to set req.user

    // Fetch metrics
    const tradesCount = await Trade.countDocuments({
      $or: [{ offerer: userId }, { receiver: userId }],
    })

    const reviewsCount = await Review.countDocuments({
      reviewee: userId,
    })
 const questionsCount = await Question.countDocuments({ asker: userId }) 
    res.status(200).json({
      trades: tradesCount,
      reviews: reviewsCount,
      totalQuestions: questionsCount,
    })
  } catch (error) {
    console.error(error) // Log the error for debugging
    res
      .status(500)
      .json({ message: 'Error fetching user metrics', error: error.message })
  }
}




exports.getUserMetrics2 = async (req, res) => {
  try {
    const userId = req.user.id // Assuming user ID is set in req.user

    // Fetch user creation date
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Fetch total trades
   const tradesCount = await Trade.countDocuments({
     $and: [
       { $or: [{ offerer: userId }, { receiver: userId }] }, // Matches either the offerer or receiver
       { status: 'completed' }, // Ensures the trade status is completed
     ],
   })

    // Fetch average reviews
    const reviews = await Review.find({ reviewee: userId })
    const averageRating =
      reviews.length > 0
        ? reviews.reduce((acc, review) => acc + review.rating, 0) /
          reviews.length
        : 0

    // Fetch total questions asked by the user
    const questionsCount = await Question.countDocuments({ asker: userId }) // Adjust 'asker' to your actual field name

    res.status(200).json({
      creationDate: user.createdAt,
      totalTrades: tradesCount,
      averageRating: averageRating.toFixed(2), // Format to 2 decimal places
      totalQuestions: questionsCount, // Include the total questions count
    })
  } catch (error) {
    console.error(error)
    res
      .status(500)
      .json({ message: 'Error fetching user metrics', error: error.message })
  }
}



exports.subscribe = asyncHandler(async (req, res, next) => {
  const { email } = req.body

  // Basic validation to check if email is provided
  if (!email) {
    return res.status(400).json({ message: 'Please provide an email address' })
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res
      .status(400)
      .json({ message: 'Please provide a valid email address' })
  }

  try {
    // Send notification email to admin email
    await sendEmail({
      email: 'Contactooowap@gmail.com',
      subject: 'New Newsletter Subscription',
      message: `A new user has subscribed to the newsletter! 
      
Subscriber Email: ${email}
Date: ${new Date().toLocaleString()}

The user has successfully been added to your newsletter subscribers.`,
    })

    // Optional: Save the subscriber to database
    // const subscriber = await Subscriber.create({ email });

    // Optional: Send confirmation to the subscriber
    await sendEmail({
      email: email,
      subject: 'Subscription Confirmation - OOWAP Newsletter',
      message: `Thank you for subscribing to the OOWAP newsletter! 
      
You'll now receive updates about our latest products, features, and offers.

Best regards,
The OOWAP Team`,
    })

    return res.status(200).json({
      success: true,
      message: 'Successfully subscribed to the newsletter',
    })
  } catch (error) {
    console.error('Subscription error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to process subscription. Please try again later.',
    })
  }
})
