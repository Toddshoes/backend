const Product = require('../models/Product')
const asyncHandler = require('../middleware/async')
const User = require('../models/User')
const Trade = require('../models/Trade');
const Question = require('../models/question');
const { default: mongoose } = require('mongoose');
const ConvenienceFee = require('../models/ConvenienceFee')
// Create a new product


exports.createProduct = asyncHandler(async (req, res) => {
  try {
    const {
      name,
      price,
      description,
      width,
      length,
      height,
      weight,
      condition,
      brand,
      size,
    } = req.body

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
    console.log(req.body)

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length < 3) {
      return res
        .status(400)
        .json({ message: 'Product name must be at least 3 characters long.' })
    }

    if (!price || isNaN(price) || price <= 0) {
      return res
        .status(400)
        .json({ message: 'Please provide a valid price greater than 0.' })
    }

    if (
      !description ||
      (typeof description !== 'string' || description.trim().length < 10)
    ) {
      return res
        .status(400)
        .json({ message: 'Description must be at least 10 characters long.' })
    }

    if (!width || (isNaN(width) || width <= 0)) {
      return res
        .status(400)
        .json({ message: 'Width is required and must be a positive number.' })
    }

    if (!length && (isNaN(length) || length <= 0)) {
      return res
        .status(400)
        .json({ message: 'Length is required and must be a positive number.' })
    }

    if (!height && (isNaN(height) || height <= 0)) {
      return res
        .status(400)
        .json({ message: 'Height is required and must be a positive number.' })
    }

    if (!weight && (isNaN(weight) || weight <= 0)) {
      return res
        .status(400)
        .json({ message: 'Weight is required and must be a positive number.' })
    }

    if (
      condition &&
      !['great', 'fair'].includes(condition.toLowerCase())
    ) {
      return res
        .status(400)
        .json({ message: "Condition is required" })
    }

    if (!brand || typeof brand !== 'string') {
      return res.status(400).json({ message: 'Brand must be a valid string.' })
    }

    if (!size || typeof size !== 'string') {
      return res.status(400).json({ message: 'Size must be a valid string.' })
    }

    // Ensure imageUrl is set (required), but imageUrl1 & imageUrl2 are optional
    if (!req.files || !req.files.imageUrl || req.files.imageUrl.length === 0) {
      return res.status(400).json({ message: 'Product image is required.' })
    }

    const imageUrl = req.files.imageUrl ? req.files.imageUrl[0].path : ''
    const imageUrl1 = req.files.imageUrl1 ? req.files.imageUrl1[0].path : ''
    const imageUrl2 = req.files.imageUrl2 ? req.files.imageUrl2[0].path : ''

    // Create and save the product
    const product = new Product({
      name,
      price,
      currency: 'USD',
      description,
      userId: req.user.id,
      length,
      width,
      height,
      weight,
      condition,
      brand,
      size,
      imageUrl,
      imageUrl1, // Optional additional image
      imageUrl2, // Optional additional image
    })

    await product.save()
    res.status(201).json({ message: 'Product created successfully.', product })
  } catch (error) {
    console.error('Error creating product:', error)
    res
      .status(500)
      .json({ message: 'Internal Server Error. Please try again later.' })
  }
})




// Get all products
exports.getAllProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ status: 'available' }) // Only fetch products that are not exchanged
  
    .populate('userId')
  res.status(200).json(products)
})


exports.getUserProducts = asyncHandler(async (req, res) => {
  // Fetch products for the logged-in user
  const products = await Product.find({
    status: 'available',
    userId: req.user.id,
  })
  
    .populate('userId')
    .lean() // Use lean to convert documents to plain JavaScript objects

  // Count trades for each product
  const productIds = products.map((product) => product._id)
  const tradesCount = await Trade.aggregate([
    {
      $match: {
        $or: [
          { offererProduct: { $in: productIds } },
          { receiverProduct: { $in: productIds } },
        ],
      },
    },
    {
      $group: {
        _id: null, // Grouping by null to aggregate all trades together
        trades: {
          $push: {
            productId: {
              $cond: [
                { $in: ['$offererProduct', productIds] },
                '$offererProduct',
                '$receiverProduct',
              ],
            },
            count: { $sum: 1 },
          },
        },
      },
    },
    {
      $unwind: '$trades',
    },
    {
      $group: {
        _id: '$trades.productId',
        count: { $sum: '$trades.count' },
      },
    },
    {
      $project: {
        productId: '$_id',
        count: 1,
      },
    },
  ])

  const tradesCountMap = tradesCount.reduce((acc, { productId, count }) => {
    acc[productId] = count
    return acc
  }, {})

  // Attach the trades count to the products
  const productsWithTradesCount = products.map((product) => ({
    ...product,
    tradesCount: tradesCountMap[product._id] || 0, // Default to 0 if no trades found
  }))

  res.status(200).json({ data: productsWithTradesCount })
})




exports.getUserProductsQuestions = asyncHandler(async (req, res) => {
  // Fetch products for the logged-in user
  const products = await Product.find({
    // status: 'available',
    userId: req.user.id,
  })
    .populate('userId')
    .lean() // Use lean to convert documents to plain JavaScript objects

  // Extract product IDs
  const productIds = products.map((product) => product._id)

  // Count trades for each product
  const tradesCount = await Trade.aggregate([
    {
      $match: {
        $or: [
          { offererProduct: { $in: productIds } },
          { receiverProduct: { $in: productIds } },
        ],
      },
    },
    {
      $group: {
        _id: null,
        trades: {
          $push: {
            productId: {
              $cond: [
                { $in: ['$offererProduct', productIds] },
                '$offererProduct',
                '$receiverProduct',
              ],
            },
            count: { $sum: 1 },
          },
        },
      },
    },
    {
      $unwind: '$trades',
    },
    {
      $group: {
        _id: '$trades.productId',
        count: { $sum: '$trades.count' },
      },
    },
    {
      $project: {
        productId: '$_id',
        count: 1,
      },
    },
  ])

  // Create a map of productId to trades count
  const tradesCountMap = tradesCount.reduce((acc, { productId, count }) => {
    acc[productId] = count
    return acc
  }, {})

  // Count questions for each product
  const questionsCount = await Question.aggregate([
    {
      $match: { productId: { $in: productIds } },
    },
    {
      $group: {
        _id: '$productId',
        count: { $sum: 1 },
      },
    },
  ])

  console.log("Questions Count",questionsCount)

  // Create a map of productId to questions count
  const questionsCountMap = questionsCount.reduce((acc, { _id, count }) => {
    acc[_id] = count
    return acc
  }, {})

  // Attach the trades count and questions count to the products
  const productsWithCounts = products.map((product) => ({
    ...product,
    tradesCount: tradesCountMap[product._id] || 0, // Default to 0 if no trades found
    questionsCount: questionsCountMap[product._id] || 0, // Default to 0 if no questions found
  }))

  res.status(200).json({ data: productsWithCounts })
})




// Get a single product by ID
exports.getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    
    .populate('userId')

  if (!product) {
    return res.status(404).json({ message: 'Product not found.' })
  }

  res.status(200).json(product)
})


exports.getProductByNumber = asyncHandler(async (req, res) => {
  try {
    console.log('PRODUCT NUMBER', req.params.id)
    // Find the product by productNumber
    const product = await Product.findOne({
      productNumber: req.params.id,
    }).populate('userId') // Populating userId as before

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' })
    }

    res.status(200).json(product)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error. Please try again later.' })
  }
})


// Update a product by ID
// Update a product by ID
exports.updateProductById = asyncHandler(async (req, res) => {
  const { name, price, description, status,brand , height,length,weight, width,size,condition} = req.body;

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

  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ message: 'Product not found.' });
  }

 
 

  // Set image paths, using existing images if no new files are uploaded
  const imageUrl = req.files.image ? req.files.image[0].path : product.imageUrl;
  const imageUrl1 = req.files.imageUrl1 ? req.files.imageUrl1[0].path : product.imageUrl1;
  const imageUrl2 = req.files.imageUrl2 ? req.files.imageUrl2[0].path : product.imageUrl2;

  // Update the product fields
  product.name = name || product.name;
  
  product.price = price || product.price;
  product.length = length || product.length;
  product.width = width || product.width;
   product.height = height || product.height
   product.weight = weight || product.weight
  product.description = description || product.description;
  product.status = status || product.status;
  product.brand = brand || product.brand;
  product.size = size || product.size
  product.condition = condition || product.size

  product.imageUrl = imageUrl;
  product.imageUrl1 = imageUrl1; // Update first additional image
  product.imageUrl2 = imageUrl2; // Update second additional image

  await product.save();
  res.status(200).json(product);
});




// Delete a product by ID
exports.deleteProductById = asyncHandler(async (req, res) => {

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
  const product = await Product.findByIdAndDelete(req.params.id)

  if (!product) {
    return res.status(404).json({ message: 'Product not found.' })
  }

  res.status(200).json({ message: 'Product deleted successfully.' })
})

// Exchange a product
exports.exchangeProduct = asyncHandler(async (req, res) => {
  const { productId, exchangedBy } = req.body

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
  // Validate input
  if (!productId || !exchangedBy) {
    return res
      .status(400)
      .json({ message: 'Product ID and exchangedBy user ID are required.' })
  }

  const product = await Product.findById(productId)

  if (!product) {
    return res.status(404).json({ message: 'Product not found.' })
  }

  // Update exchange history
  product.exchangeHistory.push({
    exchangedAt: Date.now(),
    exchangedBy,
  })

  // Update product status
  product.status = 'exchanged'

  await product.save()
  res.status(200).json(product)
})


exports.getUserFeaturedProducts = asyncHandler(async (req, res) => {
  try {
    // Fetch the user's description from the User model
    const user = await User.findById(req.user.id).select('description')

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Fetch the featured products for the user
    const featuredProducts = await Product.find({
      userId: req.user.id,
      featured: true,
    })

    // Fetch the convenience fee
    let fee = await ConvenienceFee.findOne({})

    console.log(user.description)

    // Send back the user's description, featured products, and convenience fee
    res.status(200).json({
      userDescription: user.description,
      featuredProducts,
      convenienceFee: fee ? fee.value : 10, // Assuming 'amount' is the field storing the fee
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server Error' })
  }
})









exports.getFilteredProducts = asyncHandler(async (req, res) => {
  try {
    // Destructure query params for filtering and pagination
    const {
      brands,
      tiers,
      popularity,
      priceMin,
      priceMax,
      userId,
      page = 1,
      limit = 10,
    } = req.query

    // Build the query object for filtering products
    const query = {
      status: 'available', // Only fetch available products
    }

    // Check if userId is provided and is a valid ObjectId
    if (userId) {
      if (!mongoose.isValidObjectId(userId)) {
        // return res.status(400).json({ message: 'Invalid userId' }) // Return error if userId is invalid
      } else {
        query.userId = { $ne: userId } // Exclude products owned by the user
      }
    }

    // Filter by brands if provided
    if (brands && brands !== 'All') {
      if (brands === 'Other') {
        // Match products where the brand is missing (null) or explicitly "Other"
        query.$or = [
          { brand: 'Other' },
          { brand: { $exists: false } },
          { brand: null },
        ]
      } else {
        query.brand = brands // Apply standard brand filtering
      }
    }

    // Apply tier-based price filtering
    if (tiers === '0-200') {
      query.price = { $gte: 0, $lt: 200 }
    } else if (tiers === '201-500') {
      query.price = { $gte: 201, $lte: 500 }
    } else if (tiers === '501-above') {
      query.price = { $gt: 501 }
    }

    // Apply min/max price filtering if price range is provided
    if (priceMin !== undefined || priceMax !== undefined) {
      query.price = {}
      if (priceMin !== undefined) {
        query.price.$gte = priceMin
      }
      if (priceMax !== undefined) {
        query.price.$lte = priceMax
      }
    }

    console.log(query) // Debugging line to check the final query

    // Pagination logic
    const skip = (page - 1) * limit // Calculate how many records to skip

    // Fetch the products based on the query, and apply pagination
    const products = await Product.find(query)
      .populate('userId', 'firstName lastName email') // Populate user details
      .skip(skip) // Skip records for pagination
      .limit(parseInt(limit)) // Limit the number of results

    // Get the total number of products that match the query
    const totalProducts = await Product.countDocuments(query)

    // Fetch the convenience fee
    let fee = await ConvenienceFee.findOne({})

    // Return the products along with pagination data and convenience fee
    return res.status(200).json({
      products,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalProducts / limit),
      totalProducts,
      convenienceFee: fee ? fee.value : 10, // Assuming 'amount' is the fee field
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    res.status(500).json({ message: 'Server Error' })
  }
})










exports.getFeaturedProducts = asyncHandler(async (req, res) => {
  try {
    const userId = req.body.userId || null // Extract userId from the request body (or use req.user.id if authenticated)

    // Create the filter object conditionally
    let filter = { featured: true } // Only fetch featured products
    console.log(userId)
    if (userId) {
      // If userId is provided and not null, exclude the user's own products
      filter.userId = { $ne: userId }
    }

    // Fetch the top 3 featured products that are not owned by the logged-in user (if userId is provided)
    const featuredProducts = await Product.find(filter)
      .limit(3) // Limit to 3 products
      .populate('userId', 'firstName lastName email') // Populate user details

    // Fetch the convenience fee
    let fee = await ConvenienceFee.findOne({})
    console.log(fee)
    // Send back the featured products with the convenience fee
    res.status(200).json({
      featuredProducts,
      convenienceFee: fee ? fee.value : 0, // Assuming 'amount' is the fee field
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server Error' })
  }
})






exports.makeFeaturedProduct = asyncHandler( async (req, res) => {
  try {
    const { id } = req.params
    const { featured } = req.body
    console.log("DATA")
    const product = await Product.findById(id)

    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }

    product.featured = featured
    await product.save()

    res.status(200).json(product)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Server error' })
  }
})









exports.ProductPageProducts = asyncHandler(async (req, res) => {
  try {
    const { id, userId } = req.body // Destructure the id and userId from the request body

    // Build the base query object
    let query = {
      _id: { $ne: id },
      status: 'available', // Only fetch available products
    }

    // If userId is not null or undefined, exclude products from the current user
    if (userId) {
      query.userId = { $ne: userId }
    }

    // Fetch the filtered products and populate the userId field
    const filteredProducts = await Product.find(query)
      .populate('userId', 'firstName lastName email')
      .limit(4)

    // Send back the filtered products
    res.status(200).json({
      filteredProducts,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server Error' })
  }
})




exports.visitProductPage = asyncHandler(async (req, res) => {
  const { productNumber } = req.params // Assuming productNumber is passed in the URL params
  const { userId } = req.body

  const product = await Product.findOne({ productNumber }) // Find the product by productNumber

  if (!product) {
    return res.status(404).json({ message: 'Product not found.' })
  }

  if (!userId || userId.toString() !== product.userId.toString()) {
    product.popularity += 1
    await product.save()
  }

  res.status(200).json({
    message: 'Product visited successfully',
    popularity: product.popularity,
  })
})







exports.getUserStore = async (req, res) => {
  try {
    const { userId } = req.params

    // Fetch user info
    const user = await User.findById(userId).select(
      'name email firstName lastName photoURL description',
    ) // Select necessary fields
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Fetch all products for the user and populate the userId field
    const products = await Product.find({ userId })
      .populate('userId', 'firstName lastName email') // Populate userId to get user's name and email for each product
      .select(
        'name price brand width height featured condition imageUrl status popularity productNumber',
      ) // Select only the fields you need

    // Fetch the convenience fee
    let fee = await ConvenienceFee.findOne({})

    return res.status(200).json({
      userInfo: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        description: user.description,
        ...(user.photoURL && { photoURL: user.photoURL }), // Add photoURL only if it exists
      },
      products,
      convenienceFee: fee ? fee.value : 10, // Assuming 'amount' is the fee field
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Server error' })
  }
}




exports.fetchUserProductsExcludingId = async (req, res) => {
  const { userId, excludeProductId } = req.params // Assuming userId and excludeProductId are in the route parameters

  try {
    // Fetch all products for the user, excluding the specified product ID
    const userProducts = await Product.find({
      userId: userId,
      _id: { $ne: excludeProductId }, // Exclude the specified product ID
    })

    return res.status(200).json({
      success: true,
      products: userProducts,
    })
  } catch (error) {
    console.error('Error fetching user products:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching user products.',
    })
  }
}


exports.countUserProducts = async (req, res) => {
  try {
    // console.log("REQ USER", req);
    
    // Fetch the count of products belonging to the logged-in user
    const productCount = await Product.countDocuments({ userId: req.user.id })

    // Return the count to the client
    return res.status(200).json({
      success: true,
      message: 'Product count fetched successfully',
      productCount,
    })
  } catch (error) {
    console.error('Error fetching product count:', error)
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching the product count',
      error: error.message,
    })
  }
}


