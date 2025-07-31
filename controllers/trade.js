// controllers/tradeController.js
const Trade = require('../models/Trade')
const Product = require('../models/Product')
const User = require('../models/User')
const asyncHandler = require('../middleware/async')
const Review = require('../models/Review')
const mongoose = require('mongoose')
const API_KEY = 'TEST_0NA3lhp1P0EW1i4qrcL9ymPzKiNOX2YAbyMXyK4q6qE';
const BASE_URL = 'https://api.shipengine.com/v1';
const axios = require("axios")
const sendEmail = require('../utils/sendEmail')
const ConvenienceFee = require('../models/ConvenienceFee')
// Configure Axios instance
const shipengineAPI = axios.create({
  baseURL: BASE_URL,
  headers: {
    'API-Key': API_KEY,
    'Content-Type': 'application/json'
  }
});


exports.sendTradeOffer = asyncHandler(async (req, res) => {
  const {
    offererProduct,
    receiverProduct,
    startDate,
    endDate,
  } = req.body;

  let shippingFee = 10;
  const offerer = req.user.id;
  const receiver = req.params.receiverId;


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


  if (offerer === receiver) {
    return res.status(400).json({ message: 'You cannot trade with yourself.' });
  }

  const offererProductData = await Product.findById(offererProduct);
  const receiverProductData = await Product.findById(receiverProduct);
  const offererUser = await User.findById(offerer);
  const receiverUser = await User.findById(receiver);

  

  if (!offererProductData || !receiverProductData || !offererUser || !receiverUser) {
    return res.status(404).json({ message: 'User or product not found.' });
  }

  if (
    !offererUser.address ||
    !offererUser.city ||
    !offererUser.state ||
    !offererUser.country ||
    !offererUser.postalcode
  ) {
    return res.status(400).json({
      message: 'Please complete your profile before making a trade offer.'
    });
  }
  let convenienceFee = 10 // Default value
  const feeRecord = await ConvenienceFee.findOne({})
  if (feeRecord) {
    convenienceFee = feeRecord.value
  }

  const totalCost = receiverProductData.price + convenienceFee;
  if (offererUser.balance < totalCost) {
    return res.status(400).json({ message: 'Insufficient balance.' });
  }

  const existingTrade = await Trade.findOne({
    offerer,
    receiver,
    offererProduct,
    receiverProduct,
    status: { $in: ['pending', 'accepted'] },
  });

  if (existingTrade) {
    return res.status(400).json({ message: 'A similar trade is already pending or accepted.' });
  }

  const newTradeOffer = new Trade({
    offerer,
    receiver,
    offererProduct,
    receiverProduct,
    convenienceFee:convenienceFee,
    startDate,
    endDate,
    status: 'pending',
    shippingFee,
  });

  await newTradeOffer.save();

  const offererMessage = `Hello ${offererUser.firstName},\n\n` +
    `You have sent a trade offer to ${receiverUser.firstName}.\n\n` +
    `============================\n` +
    `Trade Details:\n` +
    `============================\n` +
    `📦 Product 1: ${offererProductData.name} (Cost: $${offererProductData.price})\n` +
    `📦 Product 2: ${receiverProductData.name} (Cost: $${receiverProductData.price})\n` +
    // `🚚 Shipping Fee: $${shippingFee}\n` +
    // `💰 Total Cost: $${totalCost}\n` +
    `============================\n\n` +
    `Best Regards,\nOOOWAP`;

  const receiverMessage = `Hello ${receiverUser.firstName},\n\n` +
    `You have received a new trade offer from ${offererUser.firstName}.\n\n` +
    `============================\n` +
    `Trade Details:\n` +
    `============================\n` +
    `📦 Product 1: ${offererProductData.name} (Cost: $${offererProductData.price})\n` +
    `📦 Product 2: ${receiverProductData.name} (Cost: $${receiverProductData.price})\n` +
    // `🚚 Shipping Fee: $${shippingFee}\n` +
    // `💰 Total Cost: $${totalCost}\n` +
    `============================\n\n` +
    `Best Regards,\nOOOWAP`;

  try {
    await sendEmail({
      email: offererUser.email,
      subject: 'Trade Offer Sent',
      message: offererMessage,
    });

    await sendEmail({
      email: receiverUser.email,
      subject: 'New Trade Offer Received',
      message: receiverMessage,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Email could not be sent.' });
  }

  return res.status(201).json({ message: 'Trade offer created successfully and emails sent.' });
});








// exports.reverseTradeOffer = asyncHandler(async (req, res) => {
//   try {
//     const { tradeId, selectedOffererProductId } = req.body // tradeId of the original trade offer and the new product selected by the 2nd user

//     // Find the original trade offer
//     const originalTrade = await Trade.findById(tradeId)
//     if (!originalTrade) {
//       return res
//         .status(404)
//         .json({ message: 'Original trade offer not found.' })
//     }

//     // Ensure the request is coming from the original receiver (2nd user)
//     if (originalTrade.receiver.toString() !== req.user.id) {
//       return res
//         .status(403)
//         .json({ message: 'You are not authorized to reverse this trade.' })
//     }

//     // Fetch the selected product of the original offerer (1st user)
//     const selectedOffererProduct = await Product.findById(
//       selectedOffererProductId,
//     )

//     console.log(originalTrade.receiverProduct,selectedOffererProduct)

//     if (!selectedOffererProduct) {
//       return res
//         .status(404)
//         .json({ message: 'Selected product of offerer not found.' })
//     }

//     // Ensure the selected product belongs to the original offerer and is available for trade
//     if (
//       selectedOffererProduct.userId.toString() !==
//       originalTrade.offerer.toString()
//     ) {
//       return res
//         .status(400)
//         .json({
//           message: 'Selected product does not belong to the original offerer.',
//         })
//     }

//     if (selectedOffererProduct.status !== 'available') {
//       return res
//         .status(400)
//         .json({ message: 'Selected product is not available for trade.' })
//     }



//     // Check if a reverse trade already exists for these users and products
//     const existingReverseTrade = await Trade.findOne({
//       offerer: originalTrade.receiver, // Swapping roles
//       receiver: originalTrade.offerer, // Swapping roles
//       offererProduct: originalTrade.receiverProduct, // The product of the original receiver
//       receiverProduct: selectedOffererProduct._id, // The new selected product of the original offerer
//       status: { $in: ['pending', 'accepted'] }, // Check for pending or accepted trades
//     })

//     if (existingReverseTrade) {
//       return res
//         .status(400)
//         .json({
//           message: 'A reverse trade offer is already pending or accepted.',
//         })
//     }

//     // Create a new reverse trade offer
//     const reverseTradeOffer = new Trade({
//       offerer: originalTrade.receiver, // Reverse: 2nd user becomes the offerer
//       receiver: originalTrade.offerer, // Reverse: 1st user becomes the receiver
//       offererProduct: originalTrade.receiverProduct, // The product of the 2nd user
//       receiverProduct: selectedOffererProduct._id, // The newly selected product of the 1st user
//       status: 'pending', // Status remains 'pending'
//       shippingFee: originalTrade.shippingFee, // Keep the original shipping fee
//       tradeDate: originalTrade.tradeDate, // Keep the original trade date
//       startDate: originalTrade.startDate, // Keep the original start date
//       endDate: originalTrade.endDate, // Keep the original end date
//     })

//     await reverseTradeOffer.save()
//      await Trade.findByIdAndDelete(tradeId)
//     return res.status(201).json({
//       message: 'Reverse trade offer created successfully.',
//       reverseTradeOffer,
//     })
//   } catch (error) {
//     console.error(error)
//     res.status(500).json({ message: 'Server error. Please try again later.' })
//   }
// })


exports.reverseTradeOffer = asyncHandler(async (req, res) => {
  try {



    const { tradeId, selectedOffererProductId } = req.body;


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

    const originalTrade = await Trade.findById(tradeId)
      .populate('receiverProduct')
      .populate('offerer');

    if (!originalTrade) {
      return res.status(404).json({ message: 'Original trade offer not found.' });
    }

    if (originalTrade.receiver._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to reverse this trade.' });
    }

    const selectedOffererProduct = await Product.findById(selectedOffererProductId);
    if (!selectedOffererProduct) {
      return res.status(404).json({ message: 'Selected product of offerer not found.' });
    }

    if (selectedOffererProduct.userId.toString() !== originalTrade.offerer._id.toString()) {
      return res.status(400).json({ message: 'Selected product does not belong to the original offerer.' });
    }

    if (selectedOffererProduct.status !== 'available') {
      return res.status(400).json({ message: 'Selected product is not available for trade.' });
    }

    let convenienceFee = 10 // Default value
    const feeRecord = await ConvenienceFee.findOne({})
    if (feeRecord) {
      convenienceFee = feeRecord.value
    }

    const reverseTradeOffer = new Trade({
      offerer: originalTrade.receiver._id,
      receiver: originalTrade.offerer._id,
      offererProduct: originalTrade.receiverProduct._id,
      receiverProduct: selectedOffererProduct._id,
      convenienceFee:convenienceFee,
      status: 'pending',
      shippingFee: originalTrade.shippingFee,
      tradeDate: originalTrade.tradeDate,
      startDate: originalTrade.startDate,
      endDate: originalTrade.endDate,
    });

    await reverseTradeOffer.save();
    await Trade.findByIdAndDelete(tradeId);

    const offererUser = await User.findById(reverseTradeOffer.offerer);
    const receiverUser = await User.findById(reverseTradeOffer.receiver);

    const offererMessage = `Hello ${offererUser.name},\n\n` +
      `You have sent a reverse trade offer to ${receiverUser.name}.\n\n` +
      `============================\n` +
      `Trade Details:\n` +
      `============================\n` +
      `📦 Product Sent: ${originalTrade.receiverProduct.name} (Value: $${originalTrade.receiverProduct.price})\n` +
      `📦 Product Requested: ${selectedOffererProduct.name} (Value: $${selectedOffererProduct.price})\n` +
      `============================\n\n` +
      `Best Regards,\nOOOWAP`;

    const receiverMessage = `Hello ${receiverUser.name},\n\n` +
      `You have received a reverse trade offer from ${offererUser.name}.\n\n` +
      `============================\n` +
      `Trade Details:\n` +
      `============================\n` +
      `📦 Product Requested: ${originalTrade.receiverProduct.name} (Value: $${originalTrade.receiverProduct.price})\n` +
      `📦 Product Sent: ${selectedOffererProduct.name} (Value: $${selectedOffererProduct.price})\n` +
      `============================\n\n` +
      `Best Regards,\nOOOWAP`;

    await sendEmail({ email: offererUser.email, subject: 'Reverse Trade Offer Sent', message: offererMessage });
    await sendEmail({ email: receiverUser.email, subject: 'New Reverse Trade Offer Received', message: receiverMessage });

    return res.status(201).json({ message: 'Reverse trade offer created successfully and emails sent.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});








// exports.rejectTradeOffer = asyncHandler(async (req, res) => {
//   const { tradeId } = req.body

//   const trade = await Trade.findById(tradeId)
//   if (!trade) {
//     return res.status(404).json({ message: 'Trade offer not found.' })
//   }

//   if (trade.receiver.toString() !== req.user.id) {
//     return res
//       .status(403)
//       .json({ message: 'You are not authorized to reject this trade.' })
//   }

//   // Mark trade as rejected
//   trade.status = 'rejected'
//   await trade.save()

//   res.status(200).json(trade)
// })


exports.rejectTradeOffer = asyncHandler(async (req, res) => {
  const { tradeId } = req.body;

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

  const trade = await Trade.findById(tradeId);
  if (!trade) {
    return res.status(404).json({ message: 'Trade offer not found.' });
  }

  if (trade.receiver.toString() !== req.user.id) {
    return res.status(403).json({ message: 'You are not authorized to reject this trade.' });
  }

  trade.status = 'rejected';
  await trade.save();

  const offererUser = await User.findById(trade.offerer);
  const receiverUser = await User.findById(trade.receiver);
  const offererProductData = await Product.findById(trade.offererProduct);
  const receiverProductData = await Product.findById(trade.receiverProduct);

  const offererMessage = `Hello ${offererUser.firstName},\n\n` +
    `Your trade has been rejected by ${receiverUser.firstName}.\n\n` +
    `============================\n` +
    `Trade Details:\n` +
    `============================\n` +
    `📦 Product 1: ${offererProductData.name} (Cost: $${offererProductData.price})\n` +
    `📦 Product 2: ${receiverProductData.name} (Cost: $${receiverProductData.price})\n` +
    `============================\n\n` +
    `Best Regards,\nOOOWAP`;

  const receiverMessage = `Hello ${receiverUser.firstName},\n\n` +
    `You have rejected the trade of:\n\n` +
    `============================\n` +
    `Trade Details:\n` +
    `============================\n` +
    `📦 Product 1: ${offererProductData.name} (Cost: $${offererProductData.price})\n` +
    `📦 Product 2: ${receiverProductData.name} (Cost: $${receiverProductData.price})\n` +
    `============================\n\n` +
    `Best Regards,\nOOOWAP`;

  try {
    await sendEmail({ email: offererUser.email, subject: 'Trade Offer Rejected', message: offererMessage });
    await sendEmail({ email: receiverUser.email, subject: 'Trade Offer Rejected Confirmation', message: receiverMessage });
  } catch (err) {
    console.error(err);
  }

  res.status(200).json(trade);
});



// Complete trade
exports.completeTrade = asyncHandler(async (req, res) => {
  const { tradeId } = req.body

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

  const trade = await Trade.findById(tradeId)
  if (!trade) {
    return res.status(404).json({ message: 'Trade not found.' })
  }

  if (trade.status !== 'accepted') {
    return res
      .status(400)
      .json({ message: 'Trade must be accepted before it can be completed.' })
  }

  // Update trade status and product availability
  trade.status = 'completed'
  await trade.save()

  await Product.findByIdAndUpdate(trade.offererProduct, {
    $set: { isAvailable: true },
  })
  await Product.findByIdAndUpdate(trade.receiverProduct, {
    $set: { isAvailable: true },
  })

  res.status(200).json(trade)
})




// Handle review submission for a trade
exports.addReview = async (req, res) => {
  const { tradeId, rating, reviewingFor } = req.body;


  const userId = req.user._id;

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

  try {
    // Find the trade and populate offerer and receiver fields
    const trade = await Trade.findById(tradeId).populate('offerer receiver');

    // Check if the trade exists
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    // Ensure the user is part of the trade
    if (
      trade.offerer._id.toString() !== userId.toString() &&
      trade.receiver._id.toString() !== userId.toString()
    ) {
      return res.status(403).json({ message: 'You are not part of this trade' });
    }
    console.log('RECEIVING FOR: ', reviewingFor)
    // Check if the review already exists for the respective user
    if (
      (reviewingFor === 'offerer' && trade.offererReview) ||
      (reviewingFor === 'receiver' && trade.receiverReview)
    ) {
      return res.status(400).json({ message: 'You have already submitted a review for this trade' });
    }

    // Create the review and link it to the trade
    const review = await Review.create({
      trade: tradeId,
      reviewer: userId,
      reviewee:
        trade.offerer._id.toString() === userId.toString()
          ? trade.receiver._id
          : trade.offerer._id,

      product:
        reviewingFor === 'offerer'
          ? trade.offererProduct
          : trade.receiverProduct,
      rating,
    })

    // Update the trade with the review ID
    if (reviewingFor === 'offerer') {
      trade.offererReview = review._id;
    } else if (reviewingFor === 'receiver') {
      trade.receiverReview = review._id;
    }

    // Save the updated trade
    await trade.save();

    res.status(200).json({ message: 'Review submitted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};




exports.getTradeReviews = async (req, res) => {
  const { tradeId } = req.params

  try {
    const reviews = await Review.find({ trade: tradeId })
      .populate('reviewer', 'name') // Populate reviewer info if needed
      .populate('product') // Populate product info if needed

    res.status(200).json(reviews)
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching reviews', error: error.message })
  }
}

// Get all reviews for the authenticated user
exports.getUserReviews = async (req, res) => {
  const userId = req.user._id // Assuming you have middleware for authentication

  try {
    const reviews = await Review.find({ reviewer: userId })
      .populate('trade') // Populate the trade info if needed
      .populate('product') // Populate product info if needed

    res.status(200).json(reviews)
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching reviews', error: error.message })
  }
}











// Controller to get all pending trades for a specific user
exports.getPendingTrades = async (req, res) => {
  try {
    const userId = req.user.id // Assuming user ID is extracted from JWT token after authentication

    // Find trades where the user is the receiver and the status is "pending"
    const pendingTrades = await Trade.find({
      receiver: userId,
      status: 'pending',
    })
      .populate('offererProduct') // Populate offererProduct details
      .populate('receiverProduct') // Populate receiverProduct details
      .populate('offerer', 'name email') // Optional: populate offerer details (name, email)
      .populate('receiver', 'name email') // Optional: populate receiver details (name, email)

    // Return the found trades
    res.status(200).json({
      success: true,
      data: pendingTrades,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      message: 'Server Error',
    })
  }
}



// Get trade history for the logged-in user
exports.getTradeHistory = asyncHandler(async (req, res) => {
  // Fetch all trades where the user is either the offerer or the receiver, regardless of status
  const trades = await Trade.find({
    $or: [
      { offerer: req.user._id },
      { receiver: req.user._id }
    ]
  })
    .populate('offererProduct receiverProduct') // Populate product details
    .exec();

  res.status(200).json({
    success: true,
    data: trades,
  });
});





// Controller to fetch accepted or completed trades of a specific user
exports.getUserTradeHistory = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id // Assuming user ID is available in req.user

    const trades = await Trade.find({
      $or: [{ offerer: userId }, { receiver: userId }],
      status: { $in: ['accepted', 'completed'] },
    })
    .sort({ createdAt: -1 })
      .populate('offerer')
      .populate('receiver')
      .populate('offererProduct')
      .populate('receiverProduct')

    res.status(200).json(trades)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error, could not fetch trades' })
  }
}) 




exports.getTradeById = async (req, res) => {
  try {
    // Get trade ID from URL parameters and user ID from the request
    const { id } = req.params
    const userId = req.user.id // Assuming req.user contains the authenticated user's details

    // Validate trade ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid trade ID' })
    }

    // Find the trade by ID and populate the related fields for better clarity
    const trade = await Trade.findById(id)
      .populate('offerer', 'firstName lastName email')
      .populate('receiver', 'firstName lastName email')
      .populate('offererProduct', 'name price imageUrl')
      .populate('receiverProduct', 'name price imageUrl')
      .populate('offererReview', 'rating comment')
      .populate('receiverReview', 'rating comment')

    // Check if the trade exists
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' })
    }

    // Check if the logged-in user is either the offerer or receiver
    const isOfferer = trade.offerer._id.toString() === userId
    const isReceiver = trade.receiver._id.toString() === userId

    if (!isOfferer && !isReceiver) {
      return res
        .status(403)
        .json({ message: 'Not authorized to view this trade' })
    }

    // If the user is authorized, return the trade details
    return res.status(200).json(trade)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Server error' })
  }
}


exports.toggleFinishStatus = async (req, res) => {
  const { tradeId } = req.params // Get trade ID from request parameters
  const userId = req.user.id // Get the current user's ID from the request (assuming req.user exists)

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
  try {
    // Find the trade by its ID
    const trade = await Trade.findById(tradeId)
      .populate('offerer')
      .populate('receiver')
      .populate('offererProduct', 'price') // Get the price of the offerer's product
      .populate('receiverProduct', 'price') // Get the price of the receiver's product

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' })
    }

    // Check if the current date is the same as or after the end date of the trade
    const currentDate = new Date()
    if (!trade.endDate || currentDate < new Date(trade.endDate)) {
      return res
        .status(403)
        .json({ message: 'Trade cannot be completed before the end date' })
    }

    // Toggle the finished status based on the user
    let isOfferer = false
    if (trade.offerer._id.toString() === userId) {
      trade.offererFinished = !trade.offererFinished // Invert the offerer's finished status
      isOfferer = true
    } else if (trade.receiver._id.toString() === userId) {
      trade.receiverFinished = !trade.receiverFinished // Invert the receiver's finished status
    } else {
      return res.status(403).json({ message: 'User not part of this trade' })
    }

    // If both the offerer and receiver have finished, mark the trade as completed
    if (trade.offererFinished && trade.receiverFinished) {
      trade.status = 'completed'
      // trade.endDate = new Date() // Set the end date of the trade (if not already set)

      // Refund balance: receiver gets offerer's product price, and offerer gets receiver's product price
      const offererProductPrice = trade.offererProduct.price
      const receiverProductPrice = trade.receiverProduct.price

      // Update offerer's and receiver's balance
      const offerer = await User.findById(trade.offerer._id)
      const receiver = await User.findById(trade.receiver._id)

      console.log("Before1 balance", offerer.balance, receiver.balance)
      // Adjust balances: add receiver's product price to offerer, and vice versa
      offerer.balance += receiverProductPrice
      receiver.balance += offererProductPrice

      // Save both users with updated balances
      await offerer.save()
      await receiver.save()

       console.log('After1 balance', offerer.balance, receiver.balance)
    }
   

    // Save the updated trade
    await trade.save()

    return res.status(200).json({
      message: `${isOfferer ? 'Offerer' : 'Receiver'} finished status toggled`,
      trade,
    })
  } catch (error) {
    console.error('Error updating trade:', error)
    return res.status(500).json({ message: 'Server error' })
  }
}







exports.markOffererReceived = async (req, res) => {
  const { id } = req.params;

  try {
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
    

    const trade = await Trade.findById(id);
    if (!trade) return res.status(404).send('Trade not found');

    // Check if user is part of the trade
    if (trade.offerer.toString() !== req.user.id && trade.receiver.toString() !== req.user.id) {
      return res.status(403).send('Not authorized');
    }

    if (trade.offerer.toString() == req.user.id) {
      trade.offererReceived = !trade.offererReceived
    }
    else if (trade.receiver.toString() == req.user.id) {
      trade.receiverReceived = !trade.receiverReceived
    }
      // trade.offererReceived = !trade.offererReceived // Mark offerer product as received
    await trade.save();

    res.status(200).json(trade);
  } catch (error) {
    res.status(500).send('Server error');
  }
};

// Mark the receiver product as received
// exports.markReceiverReceived = async (req, res) => {
//   const { id } = req.params;

//   try {
//     const trade = await Trade.findById(id);
//     if (!trade) return res.status(404).send('Trade not found');

//     // Check if user is part of the trade
//     if (trade.offerer.toString() !== req.user.id && trade.receiver.toString() !== req.user.id) {
//       return res.status(403).send('Not authorized');
//     }

//     trade.receiverReceived = true; // Mark receiver product as received
//     await trade.save();

//     res.status(200).json(trade);
//   } catch (error) {
//     res.status(500).send('Server error');
//   }
// }


exports.markOffererFinished = async (req, res) => {
  try {
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
    
    const trade = await Trade.findById(req.params.id)
      .populate('offererProduct') // Populate offererProduct details
      .populate('receiverProduct') // Populate receiverProduct details
      .populate('offerer') // Populate offerer user details
      .populate('receiver');

    if (!trade) return res.status(404).json({ message: 'Trade not found' });

    if (trade.offerer._id.toString() == req.user.id) {
      trade.offererFinished = !trade.offererFinished;
    } else if (trade.receiver._id.toString() == req.user.id) {
      trade.receiverFinished = !trade.receiverFinished;
    }

    // Check if both users have finished
    if (trade.offererFinished && trade.receiverFinished) {
      trade.status = 'completed' // Mark trade as completed

      // Update both products' status to 'available'
      await Product.findByIdAndUpdate(trade.offererProduct._id, {
        status: 'available',
      })
      await Product.findByIdAndUpdate(trade.receiverProduct._id, {
        status: 'available',
      })
      // Fetch both offerer and receiver users by their IDs
      const offererUser = await User.findById(trade.offerer) // Fetch offerer
      const receiverUser = await User.findById(trade.receiver) // Fetch receiver

      if (!offererUser || !receiverUser) {
        return res.status(404).json({ message: 'Users not found' })
      }

      // Add back the product prices to each user's balance
      offererUser.balance += trade.receiverProduct.price // Add receiverProduct price to offerer's balance
      receiverUser.balance += trade.offererProduct.price // Add offererProduct price to receiver's balance

      // Save the updated user balances
      await offererUser.save()
      await receiverUser.save()

      // Email notifications
      const offererMessage =
        `Hello ${offererUser.firstName},\n\n` +
        `Your trade with ${receiverUser.firstName} has been successfully completed.\n\n` +
        `============================\n` +
        `Trade Details:\n` +
        `============================\n` +
        `📦 Your Product: ${trade.offererProduct.name} (Cost: $${trade.offererProduct.price})\n` +
        `📦 Received Product: ${trade.receiverProduct.name} (Cost: $${trade.receiverProduct.price})\n` +
        `💰 Your balance has been updated.\n` +
        `============================\n\n` +
        `Best Regards,\nOOOWAP`

      const receiverMessage =
        `Hello ${receiverUser.firstName},\n\n` +
        `Your trade with ${offererUser.firstName} has been successfully completed.\n\n` +
        `============================\n` +
        `Trade Details:\n` +
        `============================\n` +
        `📦 Your Product: ${trade.receiverProduct.name} (Cost: $${trade.receiverProduct.price})\n` +
        `📦 Received Product: ${trade.offererProduct.name} (Cost: $${trade.offererProduct.price})\n` +
        `💰 Your balance has been updated.\n` +
        `============================\n\n` +
        `Best Regards,\nOOOWAP`

      try {
        await sendEmail({
          email: offererUser.email,
          subject: 'Trade Completed Successfully',
          message: offererMessage,
        })

        await sendEmail({
          email: receiverUser.email,
          subject: 'Trade Completed Successfully',
          message: receiverMessage,
        })
      } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Email could not be sent.' })
      }
    }

    await trade.save();
    return res.json(trade);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};




// exports.markReceiverFinished = async (req, res) => {
// try {
//     const trade = await Trade.findById(req.params.id);
//     if (!trade) return res.status(404).json({ message: 'Trade not found' });

//     // Update the receiver's finished status
//     trade.receiverFinished = true;

//     // Check if both users have finished
//     if (trade.offererFinished && trade.receiverFinished) {
//       trade.status = 'completed'; // Mark trade as completed
//     }

//     await trade.save();
//     return res.json(trade);
//   } catch (error) {
//     return res.status(500).json({ message: error.message });
//   }
// };






// exports.acceptTradeOffer = asyncHandler(async (req, res) => {
//   try {
//     const { tradeId } = req.body;

//     const trade = await Trade.findById(tradeId);
//     if (!trade) {
//       return res.status(404).json({ message: 'Trade offer not found.' });
//     }

//     if (trade.receiver.toString() !== req.user.id) {
//       return res
//         .status(403)
//         .json({ message: 'You are not authorized to accept this trade.' });
//     }

//     // Fetch users and products involved in the trade
//     const offerer = await User.findById(trade.offerer);
//     const receiver = await User.findById(trade.receiver);

//     const offererProduct = await Product.findById(trade.offererProduct);
//     const receiverProduct = await Product.findById(trade.receiverProduct);

//     if (!offererProduct || !receiverProduct) {
//       return res.status(404).json({ message: 'One or both products not found.' });
//     }

//     // Check if both products are available for trade
//     if (
//       !offererProduct.status == 'available' &&
//       !receiverProduct.status == 'available'
//     ) {
//       return res
//         .status(400)
//         .json({ message: 'One or both products are not available for trade.' })
//     }

//     let getRatesForOfferer = await calculateShippingRates(offererProduct._id, receiverProduct._id)
//     let getRatesForReceiver = await calculateShippingRates(receiverProduct._id, offererProduct._id)

//     let getRatesForOffererCost = getRatesForOfferer.shipments.total_shipping_cost.amount;
//     let getRatesForReceiverCost = getRatesForReceiver.shipments.total_shipping_cost.amount;
//     // Calculate total costs (product price + shipping fee)
//     const offererTotalCost = receiverProduct.price + trade.shippingFee + getRatesForOffererCost;
//     const receiverTotalCost = offererProduct.price + trade.shippingFee + getRatesForReceiverCost;

//     console.log(
//       offererTotalCost,
//       receiverTotalCost,
//       offerer.balance,
//       receiver.balance,
//     )
//     // Check if the offerer has enough balance to cover the receiver's product price + shipping fee
//     if (offerer.balance < offererTotalCost) {
//       return res.status(400).json({
//         message: `Offerer does not have enough balance. They need at least ${offererTotalCost} to cover the trade.`,
//       });
//     }

//     // Check if the receiver has enough balance to cover the offerer's product price + shipping fee
//     if (receiver.balance < receiverTotalCost) {
//       return res.status(400).json({
//         message: `You do not have enough balance. You need at least ${receiverTotalCost} to cover the trade.`,
//       });
//     }


//     const prepareShipmentForOfferer1 = generateShipment(receiver,offerer, receiverProduct)
//     const prepareShipmentForOfferer2 = generateShipment(offerer,receiver, receiverProduct)
//     const prepareShipmentForReceiver1 = generateShipment(offerer,receiver, offererProduct)
//     const prepareShipmentForReceiver2 = generateShipment(receiver,offerer, offererProduct)


   
//     let LabelToShowOfferer1 = await createLabel(prepareShipmentForReceiver1)
//     let LabelToShowOfferer2 = await createLabel(prepareShipmentForOfferer2)
//     let LabelToShowReceiver1 = await createLabel(prepareShipmentForOfferer1)
//     let LabelToShowReceiver2 = await createLabel(prepareShipmentForReceiver2)

//     trade.shipping.offerer.label1 = LabelToShowOfferer1
//     trade.shipping.offerer.label2 = LabelToShowOfferer2
//     trade.shipping.receiver.label1 = LabelToShowReceiver1
//     trade.shipping.receiver.label2 = LabelToShowReceiver2

//     // Deduct amounts and shipping fees from both users
//     offerer.balance -= offererTotalCost;
//     receiver.balance -= receiverTotalCost;

//     // Update users' balances
//     await offerer.save();
//     await receiver.save();

//     console.log("After",
     
//       offerer.balance,
//       receiver.balance,
//     )

//     // Mark trade as accepted
//     trade.status = 'accepted';
//     await trade.save();

//     // Update products' availability
//     await Product.findByIdAndUpdate(trade.offererProduct, {
//       $set: { isAvailable: false },
//     });
//     await Product.findByIdAndUpdate(trade.receiverProduct, {
//       $set: { isAvailable: false },
//     });

//     res.status(200).json(trade);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error. Please try again later.' });
//   }
// });




exports.acceptTradeOffer = asyncHandler(async (req, res) => {
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
  
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { tradeId } = req.body;
    if (!tradeId) {
      return res.status(400).json({ message: 'Trade ID is required' });
    }

    // 1. Trade Validation
    const trade = await Trade.findById(tradeId).session(session);
    if (!trade) {
      return res.status(404).json({ message: 'Trade offer not found' });
    }

    if (trade.status !== 'pending') {
      return res.status(409).json({ 
        message: 'Trade already processed',
        currentStatus: trade.status 
      });
    }

    // 2. Authorization Check
    if (trade.receiver.toString() !== req.user.id) {
      return res.status(403).json({ 
        message: 'Unauthorized to accept this trade',
        requiredUser: trade.receiver 
      });
    }

    // 3. Fetch Related Data with Session
    const [offerer, receiver, offererProduct, receiverProduct] = await Promise.all([
      User.findById(trade.offerer).session(session),
      User.findById(trade.receiver).session(session),
      Product.findById(trade.offererProduct).session(session),
      Product.findById(trade.receiverProduct).session(session)
    ]);

    // 4. Product Validation
    const productValidation = [];
    if (!offererProduct) productValidation.push('Offerer product not found');
    if (!receiverProduct) productValidation.push('Receiver product not found');
    if (productValidation.length) {
      return res.status(404).json({ errors: productValidation });
    }

    // 5. Availability Check (Fixed logical error)
    if (offererProduct.status !== 'available' || receiverProduct.status !== 'available') {
      return res.status(409).json({
        message: 'Products not available for trade',
        offererProductStatus: offererProduct.status,
        receiverProductStatus: receiverProduct.status
      });
    }

    // 6. Shipping Rate Validation
    const [ratesOfferer, ratesReceiver] = await Promise.all([
      calculateShippingRates(offererProduct._id, receiverProduct._id),
      calculateShippingRates(receiverProduct._id, offererProduct._id)
    ]);

//     console.log("MUZU",ratesOfferer,ratesReceiver)
// console.log("Huhu",ratesOfferer.total_shipping_cost.amount)
    if (!ratesOfferer?.shipments || !ratesReceiver?.shipments) {
      return res.status(500).json({
        message: 'Failed to calculate shipping rates',
        offererRatesError: ratesOfferer.error,
        receiverRatesError: ratesReceiver.error
      });
    }

    // 7. Cost Calculation with Validation
    const offererTotalCost =
      receiverProduct.price +
      (trade.convenienceFee || 10) +
      parseFloat(ratesOfferer.total_shipping_cost.amount)
    const receiverTotalCost =
      offererProduct.price +
      (trade.convenienceFee || 10) +
      parseFloat(ratesReceiver.total_shipping_cost.amount)

    // 8. Balance Validation with Detailed Feedback
    const balanceIssues = [];
    if (offerer.balance < offererTotalCost) {
      balanceIssues.push({
        user: 'offerer',
        balance: offerer.balance,
        required: offererTotalCost,
        deficit: offererTotalCost - offerer.balance
      });
    }
    if (receiver.balance < receiverTotalCost) {
      balanceIssues.push({
        user: 'receiver',
        balance: receiver.balance,
        required: receiverTotalCost,
        deficit: receiverTotalCost - receiver.balance
      });
    }
    if (balanceIssues.length) {
      return res.status(402).json({
        message: 'One of the parties has insufficient balance',
        balanceIssues,
      })
    }

    // 9. Label Creation with Validation
    const labelRequests = [
      await generateShipment(receiver, offerer, receiverProduct),
      await generateShipment(offerer, receiver, receiverProduct),
      await generateShipment(offerer, receiver, offererProduct),
      await generateShipment(receiver, offerer, offererProduct)
    ];
    
    console.log(labelRequests[2], labelRequests[2].shipment.packages,labelRequests[1],labelRequests[1].shipment.packages)

    const labels = await Promise.all(labelRequests.map(async (shipment, index) => {
      try {
        const label = await createLabel(shipment);
        if (!label?.label_id) throw new Error('Invalid label response');
        return label;
      } catch (error) {
        console.error(`Label creation failed for shipment ${index + 1}:`, error);
        throw new Error(`Label ${index + 1} creation failed: ${error.message}`);
      }
    }));

    console.log(labels)
    let gg = {
      label1: {
            address: labelRequests[0] || {}, // Extract `ship_to` as address
            label: labels[0] || {} // Store the whole label object
          },
          label2: {
            address: labelRequests[1] || {},
            label: labels[1] || {}
          }
    }
    let gg1 = {
      label1: {
            address: labelRequests[2] || {},
            label: labels[2] || {}
          },
          label2: {
            address: labelRequests[3] || {},
            label: labels[3] || {}
          }}
    // 10. Trade Document Update
    trade.status = "accepted"
    trade.shippingOfferer = gg;
    trade.shippingReceiver = gg1;
    

    // 11. Balance Updates
    offerer.balance -= offererTotalCost;
    receiver.balance -= receiverTotalCost;

    // 12. Product Availability Update
    const productUpdates = [
      Product.findByIdAndUpdate(
        trade.offererProduct,
        { $set: { isAvailable: false, status: 'exchanged' } },
        { session },
      ),
      Product.findByIdAndUpdate(
        trade.receiverProduct,
        { $set: { isAvailable: false, status: 'exchanged' } },
        { session },
      ),
    ]

    // 13. Atomic Save Operations
    await Promise.all([
      offerer.save({ session }),
      receiver.save({ session }),
      trade.save({ session }),
      ...productUpdates
    ]);

    await session.commitTransaction();


    
      
      // Send confirmation emails
      const offererMessage = `Hello ${offerer.firstName},\n\n` +
        `Your trade offer has been accepted by ${receiver.firstName}.\n\n` +
        `============================\n` +
        `Trade Details:\n` +
        `============================\n` +
        `📦 Product You're Sending: ${offererProduct.name} (Value: $${offererProduct.price})\n` +
        `📦 Product You're Receiving: ${receiverProduct.name} (Value: $${receiverProduct.price})\n` +
        // `💵 Shipping Fee: $${trade.shippingFee}\n` +
        // `🚚 Shipping Cost: $${ratesOfferer.total_shipping_cost.amount}\n` +
        // `💰 Total Deducted from Your Balance: $${offererTotalCost}\n` +
        `============================\n\n` +
        `Shipping labels have been generated for your products. You can view them in your trade details.\n\n` +
        `Best Regards,\nOOOWAP`;
  
      const receiverMessage = `Hello ${receiver.firstName},\n\n` +
        `You have accepted the trade offer from ${offerer.firstName}.\n\n` +
        `============================\n` +
        `Trade Details:\n` +
        `============================\n` +
        `📦 Product You're Sending: ${receiverProduct.name} (Value: $${receiverProduct.price})\n` +
        `📦 Product You're Receiving: ${offererProduct.name} (Value: $${offererProduct.price})\n` +
        // `💵 Shipping Fee: $${trade.shippingFee}\n` +
        // `🚚 Shipping Cost: $${ratesReceiver.total_shipping_cost.amount}\n` +
        // `💰 Total Deducted from Your Balance: $${receiverTotalCost}\n` +
        `============================\n\n` +
        `Shipping labels have been generated for your products. You can view them in your trade details.\n\n` +
        `Best Regards,\nOOOWAP`;
  
      // try {
        await sendEmail({
          email: offerer.email,
          subject: 'Trade Accepted Confirmation',
          message: offererMessage,
        });
  
        await sendEmail({
          email: receiver.email,
          subject: 'Trade Accepted Confirmation',
          message: receiverMessage,
        });
      // } catch (err) {
      //   console.error(err);
      //   return res.status(500).json({ message: 'Email could not be sent.' });
      // }







    
    res.status(200).json({
      message: 'Trade accepted successfully',
      trade: trade.toObject(),
      newBalances: {
        offerer: offerer.balance,
        receiver: receiver.balance
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.log(error)
    // Void created labels if any
    if (labels) {
      await Promise.all(labels.map(async label => {
        if (label?.label_id) {
          try {
            await shipengineAPI.post(`/labels/${label.label_id}/void`);
          } catch (voidError) {
            console.error('Failed to void label:', label.label_id, voidError);
          }
        }
      }));
    }

    console.error('Trade acceptance failed:', error);
    res.status(500).json({
      message: 'Trade processing failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    session.endSession();
  }
});




async function generateShipment(user1, user2, product) {
  try {
    if (!user1 || !user2 || !product) {
      throw new Error("Invalid user or product data");
    }

    // Handle weight conversion with validation
    const getWeightInOunces = () => {
      const rawWeight = product.weight || 1.5; // Default to 1.5 lbs if missing
      const unit = product.weightUnit?.toLowerCase() || 'pound'; // Assume pounds if unit not specified
      
      if (unit === 'pound') {
        return Math.round(rawWeight * 16); // Convert lbs to oz
      }
      if (unit === 'ounce') {
        return Math.round(rawWeight);
      }
      throw new Error(`Invalid weight unit: ${unit}. Use 'pound' or 'ounce'`);
    };

    // Validate and format dimensions
    const getDimensions = () => {
      const length = product.length || 12; // Default dimensions if missing
      const width = product.width || 8;
      const height = product.height || 4;

      if (length <= 0 || width <= 0 || height <= 0) {
        throw new Error('Invalid dimensions: values must be positive');
      }

      return {
        length,
        width,
        height,
        unit: 'inch'
      };
    };

    // Build the shipment object
    return {
      shipment:{
      ship_to: {
        name: `${user1.firstName} ${user1.lastName}`.trim(),
        address_line1: user1.address || 'Address not provided',
        phone: user1.phoneNumber || '000-000-0000',
        city_locality: user1.city || 'Unknown City',
        state_province: user1.state || 'CA',
        postal_code: user1.postalcode || '00000',
        country_code: user1.country || "US",
        address_residential_indicator: "yes",
      },
      ship_from: {
        name: `${user2.firstName} ${user2.lastName}`.trim(),
        address_line1: user2.address || 'Address not provided',
        phone: user2.phoneNumber || '000-000-0000',
        city_locality: user2.city || 'Unknown City',
        state_province: user2.state || 'CA',
        postal_code: user2.postalcode || '00000',
        country_code: user2.country || "US",
        address_residential_indicator: "yes",
      },
      packages: [
        {
          package_code: "package",
          weight: {
            value: 32,
            unit: "ounce"
          },
          dimensions: {
          length: 6,
          width: 14,
          height: 14,
          unit: 'inch'
        }
        }
      ]
      // packages: [
      //   {
      //     package_code: "package",
      //     weight: {
      //       value: getWeightInOunces(),
      //       unit: "ounce"
      //     },
      //     dimensions: getDimensions()
      //   }
      // ]
    }
    };
  } catch (error) {
    console.error("Shipment generation failed:", error.message);
    throw new Error(`Failed to create shipment: ${error.message}`);
  }
}



// const createLabel = async (shipment) => {
//   try {
//     // 1. Validate request structure
//     // const { shipment } = req.body;
//     if (!shipment?.packages?.length) {
//       return res.status(400).json({ error: 'At least one package required' });
//     }

//     // 2. Get USPS carrier
//     const { data: { carriers } } = await shipengineAPI.get('/carriers');
//     const uspsCarrier = carriers.find(c => c.carrier_code === 'stamps_com');
//     if (!uspsCarrier) return res.status(400).json({ error: 'USPS carrier not connected' });

//     // 3. Validate package requirements
//     const [pkg] = shipment.packages;
//     const errors = [];
    
//     // Weight validation
//     if (!pkg.weight?.unit || pkg.weight.unit.toLowerCase() !== 'ounce') {
//       errors.push('Weight must be in ounces');
//     }

//     // Dimensions validation
//     if (!pkg.dimensions?.unit || !['inch', 'cm'].includes(pkg.dimensions.unit.toLowerCase())) {
//       errors.push('Dimensions required with unit (inch/cm)');
//     }

//     if (errors.length) return res.status(400).json({ errors });

//     // 4. Build USPS-compliant request
//     const labelData = {
//       shipment: {
//         carrier_id: uspsCarrier.carrier_id,
//         service_code: 'usps_priority_mail',
//         ship_to: {
//           ...shipment.ship_to,
//           address_residential_indicator: shipment.ship_to.address_residential_indicator || 'yes'
//         },
//         ship_from: {
//           ...shipment.ship_from,
//           address_residential_indicator: shipment.ship_from.address_residential_indicator || 'no'
//         },
//         packages: [{
//           package_code: 'package',
//           weight: pkg.weight,
//           dimensions: pkg.dimensions
//         }]
//       },
//       // test_label: true // Keep for sandbox, remove for production
//     };

//     // 5. Create label
//     const { data } = await shipengineAPI.post('/labels', labelData);
    
//     return ({
//       label_id: data.label_id,
//       tracking_number: data.tracking_number,
//       status: data.status,
//       label_url: data.label_download?.pdf,
//       cost: data.shipment_cost
//     });

//   } catch (error) {
//     // Handle specific USPS validation errors
//     if (error.response?.data?.errors?.some(e => e.error_code === 'invalid_weight')) {
//       return ({ error: 'Invalid weight format' });
//     }
//     handleError(res, error);
//   }
// };


const createLabel = async (shipment) => {
  try {
    // Validate package exists
    if (!shipment?.shipment?.packages?.length) {
      throw new Error('At least one package required');
    }

    // Get USPS carrier
    const { data: { carriers } } = await shipengineAPI.get('/carriers');
    const uspsCarrier = carriers.find(c => c.carrier_code === 'stamps_com');
    if (!uspsCarrier) {
      throw new Error('USPS carrier not connected');
    }

    // Validate package requirements
    const [pkg] = shipment.shipment.packages;
    const errors = [];
    
    if (!pkg.weight?.unit || pkg.weight.unit.toLowerCase() !== 'ounce') {
      errors.push('Weight must be in ounces');
    }

    if (!pkg.dimensions?.unit || !['inch', 'cm'].includes(pkg.dimensions.unit.toLowerCase())) {
      errors.push('Invalid dimensions unit');
    }

    if (errors.length) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    // Create label
    const { data } = await shipengineAPI.post('/labels', {
      shipment: {
        carrier_id: uspsCarrier.carrier_id,
        service_code: 'usps_priority_mail',
        ...shipment.shipment
      }
    });

    return {
      label_id: data.label_id,
      tracking_number: data.tracking_number, 
      status: data.status, 
      label_url: data.label_download?.pdf,
      cost: data.shipment_cost?.amount || 0
    };

  } catch (error) {
    console.error('Label creation failed:', error.message);
    throw new Error(`Label creation failed: ${error.message}`);
  }
};











const calculateShippingRates = async (loggedInUserProductId, otherUserProductId) => {
  try {
    // const { loggedInUserProductId, otherUserProductId } = req.body;

    const loggedInUserProduct = await Product.findById(loggedInUserProductId);
    const otherUserProduct = await Product.findById(otherUserProductId);
    if (!loggedInUserProduct || !otherUserProduct) {
      return res.status(404).json({ message: 'One or both products not found' });
    }

    const validateDimensions = (product, productName) => {
      const length = product.length || 12;
      const width = product.width || 8;
      const height = product.height || 4;
      const girth = 2 * (width + height);
      const total = length + girth;
      if (total > 108) {
        throw new Error(
          `${productName} dimensions (L:${length}", W:${width}", H:${height}") exceed USPS maximum. ` +
          `Length + girth (${total}") must be ≤ 108"`
        );
      }
    };

    // try {
    //   validateDimensions(loggedInUserProduct, 'Your product');
    // } catch (error) {
    //   return res.status(400).json({
    //     message: error.message,
    //     errorCode: 'SHIPPING_DIMENSIONS_EXCEEDED',
    //     maxAllowed: 108,
    //     errorDetails: error.message
    //   });
    // }

    // try {
    //   validateDimensions(otherUserProduct, "Other user's product");
    // } catch (error) {
    //   return res.status(400).json({
    //     message: error.message,
    //     errorCode: 'SHIPPING_DIMENSIONS_EXCEEDED',
    //     maxAllowed: 108,
    //     errorDetails: error.message
    //   });
    // }

    const loggedInUser = await User.findById(loggedInUserProduct.userId);
    const otherUser = await User.findById(otherUserProduct.userId);
    if (!loggedInUser || !otherUser) {
      return res.status(404).json({ message: 'One or both users not found' });
    }

    const prepareShipment = (fromUser, toUser, product) => ({
      ship_to: {
        name: `${toUser.firstName} ${toUser.lastName}`.trim(),
        phone: toUser.phoneNumber || '000-000-0000',
        address_line1: toUser.address || 'Address not provided',
        city_locality: toUser.city || 'Unknown City',
        state_province: toUser.state || 'CA',
        postal_code: toUser.postalcode || '00000',
        country_code: toUser.country || 'US',
      },
      ship_from: {
        name: `${fromUser.firstName} ${fromUser.lastName}`.trim(),
        phone: fromUser.phoneNumber || '000-000-0000',
        address_line1: fromUser.address || 'Address not provided',
        city_locality: fromUser.city || 'Unknown City',
        state_province: fromUser.state || 'CA',
        postal_code: fromUser.postalcode || '00000',
        country_code: fromUser.country || 'US',
      },
      packages: [{
        package_code: 'package',
        weight: {
          value: 2,
          unit: 'pound'
        },
        dimensions: {
          length: 6,
          width: 14,
          height: 14,
          unit: 'inch'
        }
        // weight: {
        //   value: product.weight || 1.5,
        //   unit: 'pound'
        // },
        // dimensions: {
        //   length: product.length || 12,
        //   width: product.width || 8,
        //   height: product.height || 4,
        //   unit: 'inch'
        // }
      }]
    });

    const shipment2 = prepareShipment(loggedInUser, otherUser, otherUserProduct);
    const shipment1 = prepareShipment(otherUser, loggedInUser, otherUserProduct);

    const [response1, response2] = await Promise.all([
      shipengineAPI.post('/rates', { 
        rate_options: { 
          carrier_ids: ['se-1918923'],
          service_codes: ['usps_priority_mail'],
          package_types: ['package']
        }, 
        shipment: shipment1 
      }),
      shipengineAPI.post('/rates', { 
        rate_options: { 
          carrier_ids: ['se-1918923'],
          service_codes: ['usps_priority_mail'],
          package_types: ['package']
        }, 
        shipment: shipment2 
      }),
    ]);

    const filterPackageRates = (rates) => {
      return rates.filter(rate => 
        rate.service_code === 'usps_priority_mail' && 
        rate.package_type === 'package'
      );
    };

    const outgoingRates = filterPackageRates(response1.data.rate_response?.rates || []);
    const incomingRates = filterPackageRates(response2.data.rate_response?.rates || []);

    if (outgoingRates.length === 0 || incomingRates.length === 0) {
      return res.status(400).json({
        message: 'Requested USPS Priority Mail package rates not available',
        errorCode: 'RATE_UNAVAILABLE',
        details: {
          outgoingAvailable: outgoingRates.length > 0,
          incomingAvailable: incomingRates.length > 0
        }
      });
    }

    const calculateTotal = (rate) => {
      return [
        rate.shipping_amount?.amount || 0,
        rate.other_amount?.amount || 0,
        rate.insurance_amount?.amount || 0,
        rate.confirmation_amount?.amount || 0
      ].reduce((sum, val) => sum + val, 0);
    };

    const outgoingTotal = calculateTotal(outgoingRates[0]);
    const incomingTotal = calculateTotal(incomingRates[0]);
    const totalCost = outgoingTotal + incomingTotal;

    return ({
      shipments: {
        outgoing: {
          rates: outgoingRates,
          selected: outgoingRates[0],
          total: outgoingTotal.toFixed(2)
        },
        incoming: {
          rates: incomingRates,
          selected: incomingRates[0],
          total: incomingTotal.toFixed(2)
        }
      },
      total_shipping_cost: {
        currency: 'usd',
        amount: totalCost.toFixed(2)
      }
    });

  } catch (error) {
    console.error('Shipping rate error:', error.response?.data || error.message);
    const statusCode = error.response?.status || 500;
    res.status(statusCode).json({
      message: 'Error calculating shipping rates',
      error: error.response?.data || error.message,
      ...(error.response?.data?.errors && { errors: error.response.data.errors })
    });
  }
};



exports.cancelShipment = async (req, res) => {
  try {
    const { label_id } = req.params;
    
    if (!label_id?.startsWith('se-')) {
      return res.status(400).json({ 
        error: 'Invalid label ID format' 
      });
    }

    const response = await shipengineAPI.put(`/labels/${label_id}/void`);

    res.json({
      status: response.data.status || 'voided',
      label_id: response.data.label_id,
      tracking_number: response.data.tracking_number,
      void_success: response.data.void_success
    });

  } catch (error) {
    // Special case handling
    if (error.response?.status === 409) {
      return res.status(409).json({
        error: 'Label already voided or processed'
      });
    }
    handleError(res, error);
  }
};






exports.getPendingTradeCount = async (req, res) => {
  try {
    // Extract user ID from request (assuming authentication middleware sets req.user)
    const userId = req.user.id

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' })
    }

    // Count pending trades where the user is the receiver
    const pendingTradeCount = await Trade.countDocuments({
      receiver: userId,
      status: 'pending',
    })

    return res.status(200).json({ pendingTrades: pendingTradeCount })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Server error' })
  }
}






