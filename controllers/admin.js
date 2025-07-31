// controllers/categoryController.js

const Category = require('../models/Category')
const User = require('../models/User')
// controllers/tradeController.js

const Trade = require('../models/Trade');

// controllers/wishlistController.js
const API_KEY = 'TEST_0NA3lhp1P0EW1i4qrcL9ymPzKiNOX2YAbyMXyK4q6qE';
const BASE_URL = 'https://api.shipengine.com/v1';
const Wishlist = require('../models/Wishlist');
// controllers/productController.js

const Product = require('../models/Product');
const Dispute = require('../models/Dispute');
const axios = require("axios")




const shipengineAPI = axios.create({
  baseURL: BASE_URL,
  headers: {
    'API-Key': API_KEY,
    'Content-Type': 'application/json'
  }
});



exports.reimburseUser = async (req, res) => {
  try {
    const { trade_id, reimburseType } = req.body
    console.log(trade_id, reimburseType)
    // Find the trade and populate necessary fields
    const trade = await Trade.findById(trade_id)
      .populate('offerer')
      .populate('receiver')
      .populate('offererProduct')
      .populate('receiverProduct')

    if (!trade) {
      return res
        .status(404)
        .json({ success: false, message: 'Trade not found' })
    }

    // Check if trade status is accepted
    if (trade.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Can only reimburse trades with "accepted" status',
      })
    }

    // Determine which user to reimburse and the amount
    if (reimburseType === 'offerer') {
      // Already reimbursed?
      if (trade.reImburseOfferer) {
        return res.status(400).json({
          success: false,
          message: 'Offerer has already been reimbursed',
        })
      }

      // Add receiver product price to offerer's balance
      await User.findByIdAndUpdate(trade.offerer._id, {
        $inc: { balance: trade.receiverProduct.price },
      })

      // Mark offerer as reimbursed
      trade.reImburseOfferer = true
      await trade.save()

      return res.status(200).json({
        success: true,
        message: `Successfully reimbursed ${trade.offerer.firstName} with $${trade.receiverProduct.price}`,
      })
    } else if (reimburseType === 'receiver') {
      // Already reimbursed?
      if (trade.reImburseReceiver) {
        return res.status(400).json({
          success: false,
          message: 'Receiver has already been reimbursed',
        })
      }

      // Add offerer product price to receiver's balance
      await User.findByIdAndUpdate(trade.receiver._id, {
        $inc: { balance: trade.offererProduct.price },
      })

      // Mark receiver as reimbursed
      trade.reImburseReceiver = true
      await trade.save()

      return res.status(200).json({
        success: true,
        message: `Successfully reimbursed ${trade.receiver.firstName} with $${trade.offererProduct.price}`,
      })
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid reimbursement type',
      })
    }
  } catch (error) {
    console.error('Reimbursement error:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error during reimbursement process',
    })
  }
}




exports.cancelShipment = async (req, res) => {
  try {
    // Extract required data from the request body
    const { labelType, labelKey, label_id, trade_id } = req.body;

    // Validate label_id format
    if (!label_id?.startsWith("se-")) {
      return res.status(400).json({ error: "Invalid label ID format" });
    }


    const statusResponse = await shipengineAPI.get(`/labels/${label_id}`);
    const currentStatus = statusResponse.data.status;

    const nonVoidableStatuses = [
      'in_transit',    // Package scanned by USPS
      'out_for_delivery',
      'delivered',
      'returned',
      'unknown'        // Already in USPS system
    ];

    // 3. Handle non-voidable statuses
    if (nonVoidableStatuses.includes(currentStatus)) {
      // Update trade with final status
      const trade = await Trade.findById(trade_id);
      trade.shipping[labelType][labelKey].status = `${currentStatus} (cannot be voided)`;
      await trade.save();

      return res.status(409).json({
        error: `Label cannot be voided - current status: ${currentStatus}`,
        label_id,
        tracking_number: statusResponse.data.tracking_number
      });
    }


    // Void the label using the ShipEngine API
    const response = await shipengineAPI.put(`/labels/${label_id}/void`);

    // Import the Trade and User models (adjust the paths as needed)
    // const Trade = require("../models/Trade");
    // const User = require("../models/User");




    // Find the trade by its ID
    const trade = await Trade.findById(trade_id);
    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }

    let cost = 0;
    // Update the label status based on the labelType and labelKey (e.g. "label1" or "label2")
    if (labelType === "offerer") {
      if (
        trade.shippingOfferer &&
        trade.shippingOfferer[labelKey] &&
        trade.shippingOfferer[labelKey].label
      ) {
        cost = trade.shippingOfferer[labelKey].label.cost || 0;
        trade.shippingOfferer[labelKey].label.status = "voided";
        trade.markModified("shippingOfferer"); // Ensure nested changes are saved
      }
    } else if (labelType === "receiver") {
      if (
        trade.shippingReceiver &&
        trade.shippingReceiver[labelKey] &&
        trade.shippingReceiver[labelKey].label
      ) {
        cost = trade.shippingReceiver[labelKey].label.cost || 0;
        trade.shippingReceiver[labelKey].label.status = "voided";
        trade.markModified("shippingReceiver");
      }
    }

    // Save the updated trade document
    await trade.save();

    // Update the balance of the user whose label was voided.
    // For "offerer", update the offerer's balance; for "receiver", update the receiver's.
    const userId = labelType === "offerer" ? trade.offerer : trade.receiver;
    const user = await User.findById(userId);
    if (user) {
      user.balance += cost;
      await user.save();
    }

    // Respond with the voiding result from ShipEngine
    res.json({
      status: response.data.status || "voided",
      label_id: response.data.label_id,
      tracking_number: response.data.tracking_number,
      void_success: response.data.void_success,
    });
  } catch (error) {
    // Special case: label already voided or processed
    if (error.response?.status === 409) {
      return res.status(409).json({
        error: "Label already voided or processed",
      });
    }
    // Use your generic error handler
    handleError(res, error);
  }
};



// Generic error handler
function handleError(res, error) {
  console.error('ShipEngine Error:', error.response?.data || error.message);
  const status = error.response?.status || 500;
  const message = error.response?.data?.message || error.message;
  res.status(status).json({ error: message });
}

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find()
    res.json(categories)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
    res.json(category)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.createCategory = async (req, res) => {
  const newCategory = new Category(req.body)
  try {
    const category = await newCategory.save()
    res.status(201).json(category)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    })
    res.json(category)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

exports.deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id)
    res.json({ message: 'Category deleted' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}






const mongoose = require('mongoose'); // Ensure mongoose is imported
const ConvenienceFee = require('../models/ConvenienceFee');
const asyncHandler = require('../middleware/async');



exports.getAllTrades = async (req, res) => {
  const { search, page = 1, limit = 10, tradeId } = req.query // Extract search, page, limit, and tradeId from query
  console.log('SEARCH:', search)
  // console.log('TRADE ID', tradeId)

  try {
    // Build the search query
    const searchQuery = search
      ? {
          $or: [
            { 'offerer.firstName': { $regex: search, $options: 'i' } }, // Case insensitive search by offerer's first name
            { 'receiver.firstName': { $regex: search, $options: 'i' } }, // Case insensitive search by receiver's first name
            { 'offererProduct.name': { $regex: search, $options: 'i' } }, // Case insensitive search by offerer product name
            { 'receiverProduct.name': { $regex: search, $options: 'i' } }, // Case insensitive search by receiver product name
          ],
        }
      : {} // No search criteria if no search query is provided

    // Pagination logic
    const skip = (page - 1) * limit // Calculate how many records to skip
    const limitNumber = parseInt(limit) // Ensure limit is a number

    if (search) {
      console.log("INSIDE")
      // If a trade ID is provided, fetch the specific trade
      if (!mongoose.isValidObjectId(search)) {
        return res.status(200).json({ trades: [] }) // Return an empty array if tradeId is invalid
      }

      // If a valid trade ID is provided, find the matching trade
      const trade = await Trade.findById(search)
        .populate('offerer', 'firstName') // Populate offerer to get the first name
        .populate('receiver', 'firstName') // Populate receiver to get the first name
        .populate('offererProduct', 'name') // Populate offererProduct to get the product name
        .populate('receiverProduct', 'name') // Populate receiverProduct to get the product name

      // Check if the trade exists
       console.log('Trade1', trade)
      if (!trade) {
        return res.status(200).json({ trades: [] }) // Return an empty array if trade not found
      }

      return res.status(200).json({ trades: [trade] }) // Return the found trade wrapped in an array
    } else {
      // If no trade ID is provided, fetch all trades with search and pagination
      const trades = await Trade.find(searchQuery)
        .populate('offerer', 'firstName') // Populate offerer to get the first name
        .populate('receiver', 'firstName') // Populate receiver to get the first name
        .populate('offererProduct', 'name') // Populate offererProduct to get the product name
        .populate('receiverProduct', 'name') // Populate receiverProduct to get the product name
        .skip(skip) // Skip the calculated number of records
        .limit(limitNumber) // Limit the number of records returned

      // Get the total number of trades that match the search query
      const totalTrades = await Trade.countDocuments(searchQuery)

      console.log("Trade2",trades)
      // Return the trades along with the pagination data
      return res.status(200).json({
        trades,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalTrades / limitNumber),
        totalTrades,
      })
    }
  } catch (error) {
    console.error('Error fetching trades:', error)
    return res.status(500).json({ message: 'Server error' })
  }
}








exports.getTradeById = async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id).populate('offerer').populate('receiver').populate('offererProduct').populate('receiverProduct');
    res.json(trade);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createTrade = async (req, res) => {
  const newTrade = new Trade(req.body);
  try {
    const trade = await newTrade.save();
    res.status(201).json(trade);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateTrade = async (req, res) => {
  try {
    const trade = await Trade.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(trade);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteTrade = async (req, res) => {
  try {
    await Trade.findByIdAndDelete(req.params.id);
    res.json({ message: 'Trade deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};










exports.getAllWishlists = async (req, res) => {
  try {
    const wishlists = await Wishlist.find().populate('user').populate('products');
    res.json(wishlists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getWishlistById = async (req, res) => {
  try {
    const wishlist = await Wishlist.findById(req.params.id).populate('user').populate('products');
    res.json(wishlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createWishlist = async (req, res) => {
  const newWishlist = new Wishlist(req.body);
  try {
    const wishlist = await newWishlist.save();
    res.status(201).json(wishlist);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(wishlist);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteWishlist = async (req, res) => {
  try {
    await Wishlist.findByIdAndDelete(req.params.id);
    res.json({ message: 'Wishlist deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




// exports.getAllProducts = async (req, res) => {
//   const { query, page = 1, limit = 5 } = req.query // Retrieve search term, page, and limit from query params
//   // const currentPage = parseInt(page, 10) // Ensure page is an integer
//   // const pageSize = parseInt(limit, 10) // Ensure limit is an integer

//   try {
//     let products
//     let totalProducts
    
//  const skip = (page - 1) * limit
//     if (query) {
//       // If a search term is provided, filter products by name or productNumber (case-insensitive)
//       totalProducts = await Product.countDocuments({
//         $or: [
//           { name: { $regex: query, $options: 'i' } }, // Search by name
//           { productNumber: { $regex: query, $options: 'i' } }, // Search by productNumber
//         ],
//       })
//       products = await Product.find({
//         $or: [
//           { name: { $regex: query, $options: 'i' } }, // Search by name
//           { productNumber: { $regex: query, $options: 'i' } }, // Search by productNumber
//         ],
//       })
//         .populate('userId', 'firstName email') // Populate userId to get user firstName and email
//         .skip(skip)
//         .limit(parseInt(limit)) // Limit the number of products returned
//     } else {
//       // If no search term, return all products with pagination
//       totalProducts = await Product.countDocuments() // Total number of products

//       products = await Product.find()
//         .populate('userId', 'firstName email')
//         .skip(skip)
//         .limit(parseInt(limit))
//     }

//     // Calculate the total number of pages
//     // const totalPages = Math.ceil(totalProducts / parseInt(limit))

//     res.json({
//       products,
//       currentPage: parseInt(page),
//       totalPages: Math.ceil(totalProducts / limit),
//       totalProducts, // Total number of products matching the search
//     })
//   } catch (error) {
//     console.error('Error fetching products:', error)
//     res.status(500).json({ message: 'Server error' })
//   }
// }
exports.getAllProducts = async (req, res) => {
  const { search, page = 1, limit = 10 } = req.query // Extract search, page, and limit from query params
  console.log('SEARCH:', req.query)

  try {
    // Build the search query
    const searchQuery = search
      ? {
        $or: [
          { firstName: { $regex: search, $options: 'i' } }, // Case insensitive search by first name
          { email: { $regex: search, $options: 'i' } }, // Case insensitive search by email
        ],
      }
      : {} // No search criteria if no search query is provided

    // Pagination logic
    const skip = (page - 1) * limit // Calculate how many records to skip

    // Fetch users based on search criteria and apply pagination
   const products = await Product.find(searchQuery)
     .populate('userId') // Populate the userId field with user details
     .skip(skip)
     .limit(parseInt(limit))

    // Get the total number of users that match the search query
    const totalProducts = await Product.countDocuments(searchQuery)
    console.log(totalProducts)
    console.log(products)
    // Return the users along with the pagination data
    return res.status(200).json({
      products,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalProducts / limit),
      totalProducts,
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return res.status(500).json({ message: 'Server error' })
  }
}



exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createProduct = async (req, res) => {
  const newProduct = new Product(req.body);
  try {
    const product = await newProduct.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.searchProducts = async (req, res) => {
  const { query } = req.query // Retrieve search term from query params if provided

  try {
    let products

    if (query) {
      // If a search term is provided, filter products by name or productNumber (case-insensitive)
      products = await Product.find({
        $or: [
          { name: { $regex: query, $options: 'i' } }, // Search by name
          { productNumber: { $regex: new RegExp(`.*${query}.*`, 'i') } }, // Search by productNumber, allowing partial match
        ],
      }).populate('userId', 'firstName email') // Populate userId to get user firstName and email
    } else {
      // If no search term, return all products
      products = await Product.find().populate('userId', 'firstName email')
    }

    res.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    res.status(500).json({ message: 'Server error' })
  }
}










// exports.getAllUsers = async (req, res) => {
//   const { search } = req.query // Extract search query from request query params
//   console.log('SEARCH:', req.query)

//   try {
//     // Build the search query
//     const searchQuery = search
//       ? {
//           $or: [
//             { firstName: { $regex: search, $options: 'i' } }, // Case insensitive search by first name
//             { email: { $regex: search, $options: 'i' } }, // Case insensitive search by email
//           ],
//         }
//       : {} // No search criteria if no search query is provided

//     // Fetch users based on search criteria
//     const users = await User.find(searchQuery)
//     return res.status(200).json(users)
//   } catch (error) {
//     console.error('Error fetching users:', error)
//     return res.status(500).json({ message: 'Server error' })
//   }
// }

exports.getAllUsers = async (req, res) => {
  const { search, page = 1, limit = 10 } = req.query // Extract search, page, and limit from query params
  console.log('SEARCH:', req.query)

  try {
    // Build the search query
    const searchQuery = search
      ? {
          $or: [
            { firstName: { $regex: search, $options: 'i' } }, // Case insensitive search by first name
            { email: { $regex: search, $options: 'i' } }, // Case insensitive search by email
          ],
        }
      : {} // No search criteria if no search query is provided

    // Pagination logic
    const skip = (page - 1) * limit // Calculate how many records to skip

    // Fetch users based on search criteria and apply pagination
    const users = await User.find(searchQuery).skip(skip).limit(parseInt(limit))

    // Get the total number of users that match the search query
    const totalUsers = await User.countDocuments(searchQuery)

    // Return the users along with the pagination data
    return res.status(200).json({
      users,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalUsers / limit),
      totalUsers,
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return res.status(500).json({ message: 'Server error' })
  }
}



exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createUser = async (req, res) => {
  const newUser = new User(req.body);
  try {
    const user = await newUser.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};





exports.getAllDisputes = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query // Extract search, page, and limit from query
    let query = {} // Initialize the query object

    // If search query exists, filter based on dispute ID
    if (search) {
      // Check if the search is a valid ObjectId
      if (mongoose.isValidObjectId(search)) {
        // If it's a valid ObjectId, search by dispute ID
        query = {
          _id: search, // Directly search by the full dispute ID
        }
      } else {
        // If the search term is invalid, return an empty array
        return res.status(200).json([]) // Return empty array if invalid ID
      }
    }

    // Pagination logic
    const skip = (page - 1) * limit // Calculate how many records to skip
    const limitNumber = parseInt(limit) // Ensure limit is a number

    // Fetch disputes based on the constructed query with pagination
    const disputes = await Dispute.find(query)
      .populate('user', 'firstName lastName') // Populate user details if needed
      .populate({
        path: 'trade',
        populate: { path: 'offerer receiver', select: 'firstName lastName' }, // Populate trade details if needed
      })
      .skip(skip) // Skip the calculated number of records
      .limit(limitNumber) // Limit the number of records returned

    // Get the total number of disputes that match the search query
    const totalDisputes = await Dispute.countDocuments(query)

    // Return the disputes along with the pagination data
    res.status(200).json({
      disputes,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalDisputes / limitNumber),
      totalDisputes,
    })
  } catch (error) {
    console.error('Error fetching disputes:', error)
    res.status(500).json({ message: 'Failed to fetch disputes' })
  }
}


exports.getDisputeById = async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate('trade')
      .populate('user')
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' })
    }
    res.json(dispute)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.createDispute = async (req, res) => {
  const { trade, user, reason } = req.body
  const dispute = new Dispute({ trade, user, reason })
  try {
    const newDispute = await dispute.save()
    res.status(201).json(newDispute)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

exports.updateDispute = async (req, res) => {
  try {
    const dispute = await Dispute.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    })
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' })
    }
    res.json(dispute)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

exports.deleteDispute = async (req, res) => {
  try {
    const dispute = await Dispute.findByIdAndDelete(req.params.id)
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' })
    }
    res.json({ message: 'Dispute deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}











const CONVENIENCE_FEE_ID = 'convenience-fee-singleton'

/**
 * @desc    Get current convenience fee
 * @route   GET /api/admin/convenience-fee
 * @access  Admin
 */
exports.getConvenienceFee = asyncHandler(async (req, res) => {
  // Find the fee (there should only be one record)
  let fee = await ConvenienceFee.findOne({})

  // If no fee exists yet, create the singleton
  if (!fee) {
    fee = await ConvenienceFee.create({
      value: 0,
      description: 'Website convenience fee applied to all transactions',
    })
  }

  res.status(200).json(fee)
})

/**
 * @desc    Update convenience fee
 * @route   PUT /api/admin/convenience-fee
 * @access  Admin
 */
exports.updateConvenienceFee = asyncHandler(async (req, res) => {
  const { value } = req.body

  // Validate input
  if (value === undefined || isNaN(value) || value < 0 || value > 100) {
    res.status(400)
    throw new Error(
      'Please provide a valid convenience fee value between 0 and 100',
    )
  }

  // Use findOneAndUpdate with upsert to ensure there's only one record
  const fee = await ConvenienceFee.findOneAndUpdate(
    {}, // Empty filter to match any document (will match the first one)
    {
      value,
      description: 'Website convenience fee applied to all transactions',
    },
    {
      new: true, // Return the updated document
      upsert: true, // Create if it doesn't exist
      setDefaultsOnInsert: true, // Apply schema defaults if creating
    },
  )

  res.status(200).json(fee)
})
