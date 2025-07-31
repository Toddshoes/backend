const express = require('express')
const path = require('path')
const dotenv = require('dotenv')
const cors = require('cors')
const colors = require('colors')

const session = require('express-session')

const mongoSanitize = require('express-mongo-sanitize')
const hpp = require('hpp')
const helmet = require('helmet')
const cron = require('node-cron')
const bodyParser = require('body-parser')

const axios = require('axios')

const cookieParser = require('cookie-parser')
const errorHandler = require('./middleware/error')
const connectDB = require('./config/db')
dotenv.config({ path: './.env' })


const User = require('./models/User')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)








const app = express()
app.use(helmet({ contentSecurityPolicy: false }))

app.use((req, res, next) => {
  if (req.originalUrl === '/api/v1/stripe/webhooks') {
    // Skip this middleware for Stripe webhook route
    next()
  } else {
    // Use express.json() middleware for all other routes
    express.json()(req, res, next)
  }
})
app.use(cookieParser())
app.use(hpp())
app.use(mongoSanitize())

const allowedOrigins = [
  'http://localhost:3000',
  'https://ooowap-frontend.vercel.app',
  'ooowap-fronend.vercel.app',
  'www.ooowap-frontend.vercel.app',
  'https://ooowap-backend.onrender.com',
  'https://ooowap-frontend-new.onrender.com',
]

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true)

    // Check if the origin is in the allowedOrigins array
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true) // Allow request
    } else {
      callback(new Error('Not allowed by CORS')) // Block request
    }
  },
}

app.use(cors(corsOptions))

connectDB()



app.use('/api/v1/auth', require('./routes/auth'))
app.use('/api/v1/wishlist', require('./routes/wishlist'))
app.use('/api/v1/product', require('./routes/product'))
app.use('/api/v1/category', require('./routes/category'))
app.use('/api/v1/trade', require('./routes/trade'))
app.use('/api/v1/review', require('./routes/review'))
app.use('/api/v1/dispute', require('./routes/dispute'))
app.use('/api/v1/contact', require('./routes/contact'))
app.use('/api/v1/question', require('./routes/question'))
app.use('/api/v1/shipping', require('./routes/shipping'))



app.use('/api/v1/stripe', require('./routes/stripe'))



app.use('/api/v1/admin', require('./routes/admin'))
// Test Commit

// --------------------------DEPLOYMENT------------------------------

// if (process.env.NODE_ENV === 'production') {
//   app.use(express.static(path.join(__dirname, 'client', 'build')))

//   app.get('*', (req, res) => {
//     return res.sendFile(
//       path.resolve(__dirname, 'client', 'build', 'index.html'),
//     )
//   })
// } else {
//   app.use(
//     express.static(
//       path.join(__dirname, './../../../../client/_work/chadgpt-front', 'build'),
//     ),
//   )

//   app.get('*', (req, res) => {
//     return res.sendFile(
//       path.resolve(
//         __dirname,
//         './../../../../client/_work/chadgpt-front',
//         'build',
//         'index.html',
//       ),
//     )
//   })
// }

// --------------------------DEPLOYMENT------------------------------

app.use(errorHandler)

const PORT = process.env.PORT || 5000

const server = app.listen(PORT, () =>
  console.log(`Server running on PORT ${PORT}`),
)

// Handling server errors with clean error messages
process.on('unhandledRejection', (err, promise) => {
  console.log(`Logged Error: ${err.message}`)
  server.close(() => process.exit(1))
})









