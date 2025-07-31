"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var Product = require('../models/Product');

var asyncHandler = require('../middleware/async');

var User = require('../models/User');

var Trade = require('../models/Trade');

var Question = require('../models/question');

var _require = require('mongoose'),
    mongoose = _require["default"]; // Create a new product


exports.createProduct = asyncHandler(function _callee(req, res) {
  var _req$body, name, price, description, width, length, height, weight, condition, brand, size, imageUrl, imageUrl1, imageUrl2, product;

  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _req$body = req.body, name = _req$body.name, price = _req$body.price, description = _req$body.description, width = _req$body.width, length = _req$body.length, height = _req$body.height, weight = _req$body.weight, condition = _req$body.condition, brand = _req$body.brand, size = _req$body.size; // Validate input

          if (!(!name || !price)) {
            _context.next = 3;
            break;
          }

          return _context.abrupt("return", res.status(400).json({
            message: 'Please provide all required fields.'
          }));

        case 3:
          // Ensure imageUrl, imageUrl1, and imageUrl2 are set, even if no file is uploaded
          imageUrl = req.files.imageUrl ? req.files.imageUrl[0].path : '';
          imageUrl1 = req.files.imageUrl1 ? req.files.imageUrl1[0].path : '';
          imageUrl2 = req.files.imageUrl2 ? req.files.imageUrl2[0].path : ''; // Create and save the product

          product = new Product({
            name: name,
            price: price,
            currency: "USD",
            description: description,
            userId: req.user.id,
            length: length,
            width: width,
            height: height,
            weight: weight,
            condition: condition,
            brand: brand,
            size: size,
            imageUrl: imageUrl,
            imageUrl1: imageUrl1,
            // Add first additional image
            imageUrl2: imageUrl2 // Add second additional image

          });
          _context.next = 9;
          return regeneratorRuntime.awrap(product.save());

        case 9:
          res.status(201).json(product);

        case 10:
        case "end":
          return _context.stop();
      }
    }
  });
}); // Get all products

exports.getAllProducts = asyncHandler(function _callee2(req, res) {
  var products;
  return regeneratorRuntime.async(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.next = 2;
          return regeneratorRuntime.awrap(Product.find({
            status: 'available'
          }) // Only fetch products that are not exchanged
          .populate('userId'));

        case 2:
          products = _context2.sent;
          res.status(200).json(products);

        case 4:
        case "end":
          return _context2.stop();
      }
    }
  });
});
exports.getUserProducts = asyncHandler(function _callee3(req, res) {
  var products, productIds, tradesCount, tradesCountMap, productsWithTradesCount;
  return regeneratorRuntime.async(function _callee3$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _context3.next = 2;
          return regeneratorRuntime.awrap(Product.find({
            status: 'available',
            userId: req.user.id
          }).populate('userId').lean());

        case 2:
          products = _context3.sent;
          // Use lean to convert documents to plain JavaScript objects
          // Count trades for each product
          productIds = products.map(function (product) {
            return product._id;
          });
          _context3.next = 6;
          return regeneratorRuntime.awrap(Trade.aggregate([{
            $match: {
              $or: [{
                offererProduct: {
                  $in: productIds
                }
              }, {
                receiverProduct: {
                  $in: productIds
                }
              }]
            }
          }, {
            $group: {
              _id: null,
              // Grouping by null to aggregate all trades together
              trades: {
                $push: {
                  productId: {
                    $cond: [{
                      $in: ['$offererProduct', productIds]
                    }, '$offererProduct', '$receiverProduct']
                  },
                  count: {
                    $sum: 1
                  }
                }
              }
            }
          }, {
            $unwind: '$trades'
          }, {
            $group: {
              _id: '$trades.productId',
              count: {
                $sum: '$trades.count'
              }
            }
          }, {
            $project: {
              productId: '$_id',
              count: 1
            }
          }]));

        case 6:
          tradesCount = _context3.sent;
          tradesCountMap = tradesCount.reduce(function (acc, _ref) {
            var productId = _ref.productId,
                count = _ref.count;
            acc[productId] = count;
            return acc;
          }, {}); // Attach the trades count to the products

          productsWithTradesCount = products.map(function (product) {
            return _objectSpread({}, product, {
              tradesCount: tradesCountMap[product._id] || 0 // Default to 0 if no trades found

            });
          });
          res.status(200).json({
            data: productsWithTradesCount
          });

        case 10:
        case "end":
          return _context3.stop();
      }
    }
  });
});
exports.getUserProductsQuestions = asyncHandler(function _callee4(req, res) {
  var products, productIds, tradesCount, tradesCountMap, questionsCount, questionsCountMap, productsWithCounts;
  return regeneratorRuntime.async(function _callee4$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _context4.next = 2;
          return regeneratorRuntime.awrap(Product.find({
            status: 'available',
            userId: req.user.id
          }).populate('userId').lean());

        case 2:
          products = _context4.sent;
          // Use lean to convert documents to plain JavaScript objects
          // Extract product IDs
          productIds = products.map(function (product) {
            return product._id;
          }); // Count trades for each product

          _context4.next = 6;
          return regeneratorRuntime.awrap(Trade.aggregate([{
            $match: {
              $or: [{
                offererProduct: {
                  $in: productIds
                }
              }, {
                receiverProduct: {
                  $in: productIds
                }
              }]
            }
          }, {
            $group: {
              _id: null,
              trades: {
                $push: {
                  productId: {
                    $cond: [{
                      $in: ['$offererProduct', productIds]
                    }, '$offererProduct', '$receiverProduct']
                  },
                  count: {
                    $sum: 1
                  }
                }
              }
            }
          }, {
            $unwind: '$trades'
          }, {
            $group: {
              _id: '$trades.productId',
              count: {
                $sum: '$trades.count'
              }
            }
          }, {
            $project: {
              productId: '$_id',
              count: 1
            }
          }]));

        case 6:
          tradesCount = _context4.sent;
          // Create a map of productId to trades count
          tradesCountMap = tradesCount.reduce(function (acc, _ref2) {
            var productId = _ref2.productId,
                count = _ref2.count;
            acc[productId] = count;
            return acc;
          }, {}); // Count questions for each product

          _context4.next = 10;
          return regeneratorRuntime.awrap(Question.aggregate([{
            $match: {
              productId: {
                $in: productIds
              }
            }
          }, {
            $group: {
              _id: '$productId',
              count: {
                $sum: 1
              }
            }
          }]));

        case 10:
          questionsCount = _context4.sent;
          console.log("Questions Count", questionsCount); // Create a map of productId to questions count

          questionsCountMap = questionsCount.reduce(function (acc, _ref3) {
            var _id = _ref3._id,
                count = _ref3.count;
            acc[_id] = count;
            return acc;
          }, {}); // Attach the trades count and questions count to the products

          productsWithCounts = products.map(function (product) {
            return _objectSpread({}, product, {
              tradesCount: tradesCountMap[product._id] || 0,
              // Default to 0 if no trades found
              questionsCount: questionsCountMap[product._id] || 0 // Default to 0 if no questions found

            });
          });
          res.status(200).json({
            data: productsWithCounts
          });

        case 15:
        case "end":
          return _context4.stop();
      }
    }
  });
}); // Get a single product by ID

exports.getProductById = asyncHandler(function _callee5(req, res) {
  var product;
  return regeneratorRuntime.async(function _callee5$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          _context5.next = 2;
          return regeneratorRuntime.awrap(Product.findById(req.params.id).populate('userId'));

        case 2:
          product = _context5.sent;

          if (product) {
            _context5.next = 5;
            break;
          }

          return _context5.abrupt("return", res.status(404).json({
            message: 'Product not found.'
          }));

        case 5:
          res.status(200).json(product);

        case 6:
        case "end":
          return _context5.stop();
      }
    }
  });
});
exports.getProductByNumber = asyncHandler(function _callee6(req, res) {
  var product;
  return regeneratorRuntime.async(function _callee6$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          _context6.prev = 0;
          console.log('PRODUCT NUMBER', req.params.id); // Find the product by productNumber

          _context6.next = 4;
          return regeneratorRuntime.awrap(Product.findOne({
            productNumber: req.params.id
          }).populate('userId'));

        case 4:
          product = _context6.sent;

          if (product) {
            _context6.next = 7;
            break;
          }

          return _context6.abrupt("return", res.status(404).json({
            message: 'Product not found.'
          }));

        case 7:
          res.status(200).json(product);
          _context6.next = 14;
          break;

        case 10:
          _context6.prev = 10;
          _context6.t0 = _context6["catch"](0);
          console.error(_context6.t0);
          res.status(500).json({
            message: 'Server error. Please try again later.'
          });

        case 14:
        case "end":
          return _context6.stop();
      }
    }
  }, null, null, [[0, 10]]);
}); // Update a product by ID
// Update a product by ID

exports.updateProductById = asyncHandler(function _callee7(req, res) {
  var _req$body2, name, price, description, status, brand, height, length, weight, width, size, condition, product, imageUrl, imageUrl1, imageUrl2;

  return regeneratorRuntime.async(function _callee7$(_context7) {
    while (1) {
      switch (_context7.prev = _context7.next) {
        case 0:
          _req$body2 = req.body, name = _req$body2.name, price = _req$body2.price, description = _req$body2.description, status = _req$body2.status, brand = _req$body2.brand, height = _req$body2.height, length = _req$body2.length, weight = _req$body2.weight, width = _req$body2.width, size = _req$body2.size, condition = _req$body2.condition;
          _context7.next = 3;
          return regeneratorRuntime.awrap(Product.findById(req.params.id));

        case 3:
          product = _context7.sent;

          if (product) {
            _context7.next = 6;
            break;
          }

          return _context7.abrupt("return", res.status(404).json({
            message: 'Product not found.'
          }));

        case 6:
          // Set image paths, using existing images if no new files are uploaded
          imageUrl = req.files.image ? req.files.image[0].path : product.imageUrl;
          imageUrl1 = req.files.imageUrl1 ? req.files.imageUrl1[0].path : product.imageUrl1;
          imageUrl2 = req.files.imageUrl2 ? req.files.imageUrl2[0].path : product.imageUrl2; // Update the product fields

          product.name = name || product.name;
          product.price = price || product.price;
          product.length = length || product.length;
          product.width = width || product.width;
          product.height = height || product.height;
          product.weight = weight || product.weight;
          product.description = description || product.description;
          product.status = status || product.status;
          product.brand = brand || product.brand;
          product.size = size || product.size;
          product.condition = condition || product.size;
          product.imageUrl = imageUrl;
          product.imageUrl1 = imageUrl1; // Update first additional image

          product.imageUrl2 = imageUrl2; // Update second additional image

          _context7.next = 25;
          return regeneratorRuntime.awrap(product.save());

        case 25:
          res.status(200).json(product);

        case 26:
        case "end":
          return _context7.stop();
      }
    }
  });
}); // Delete a product by ID

exports.deleteProductById = asyncHandler(function _callee8(req, res) {
  var product;
  return regeneratorRuntime.async(function _callee8$(_context8) {
    while (1) {
      switch (_context8.prev = _context8.next) {
        case 0:
          _context8.next = 2;
          return regeneratorRuntime.awrap(Product.findByIdAndDelete(req.params.id));

        case 2:
          product = _context8.sent;

          if (product) {
            _context8.next = 5;
            break;
          }

          return _context8.abrupt("return", res.status(404).json({
            message: 'Product not found.'
          }));

        case 5:
          res.status(200).json({
            message: 'Product deleted successfully.'
          });

        case 6:
        case "end":
          return _context8.stop();
      }
    }
  });
}); // Exchange a product

exports.exchangeProduct = asyncHandler(function _callee9(req, res) {
  var _req$body3, productId, exchangedBy, product;

  return regeneratorRuntime.async(function _callee9$(_context9) {
    while (1) {
      switch (_context9.prev = _context9.next) {
        case 0:
          _req$body3 = req.body, productId = _req$body3.productId, exchangedBy = _req$body3.exchangedBy; // Validate input

          if (!(!productId || !exchangedBy)) {
            _context9.next = 3;
            break;
          }

          return _context9.abrupt("return", res.status(400).json({
            message: 'Product ID and exchangedBy user ID are required.'
          }));

        case 3:
          _context9.next = 5;
          return regeneratorRuntime.awrap(Product.findById(productId));

        case 5:
          product = _context9.sent;

          if (product) {
            _context9.next = 8;
            break;
          }

          return _context9.abrupt("return", res.status(404).json({
            message: 'Product not found.'
          }));

        case 8:
          // Update exchange history
          product.exchangeHistory.push({
            exchangedAt: Date.now(),
            exchangedBy: exchangedBy
          }); // Update product status

          product.status = 'exchanged';
          _context9.next = 12;
          return regeneratorRuntime.awrap(product.save());

        case 12:
          res.status(200).json(product);

        case 13:
        case "end":
          return _context9.stop();
      }
    }
  });
});
exports.getUserFeaturedProducts = asyncHandler(function _callee10(req, res) {
  var user, featuredProducts;
  return regeneratorRuntime.async(function _callee10$(_context10) {
    while (1) {
      switch (_context10.prev = _context10.next) {
        case 0:
          _context10.prev = 0;
          _context10.next = 3;
          return regeneratorRuntime.awrap(User.findById(req.user.id).select('description'));

        case 3:
          user = _context10.sent;

          if (user) {
            _context10.next = 6;
            break;
          }

          return _context10.abrupt("return", res.status(404).json({
            message: 'User not found'
          }));

        case 6:
          _context10.next = 8;
          return regeneratorRuntime.awrap(Product.find({
            userId: req.user.id,
            featured: true
          }));

        case 8:
          featuredProducts = _context10.sent;
          console.log(user.description); // Send back the user's description and featured products

          res.status(200).json({
            userDescription: user.description,
            featuredProducts: featuredProducts
          });
          _context10.next = 17;
          break;

        case 13:
          _context10.prev = 13;
          _context10.t0 = _context10["catch"](0);
          console.error(_context10.t0);
          res.status(500).json({
            message: 'Server Error'
          });

        case 17:
        case "end":
          return _context10.stop();
      }
    }
  }, null, null, [[0, 13]]);
});
exports.getFilteredProducts = asyncHandler(function _callee11(req, res) {
  var _req$query, brands, tiers, popularity, priceMin, priceMax, userId, _req$query$page, page, _req$query$limit, limit, query, skip, products, totalProducts;

  return regeneratorRuntime.async(function _callee11$(_context11) {
    while (1) {
      switch (_context11.prev = _context11.next) {
        case 0:
          _context11.prev = 0;
          // console.log("ZEUZEU")
          // Destructure query params for filtering and pagination
          _req$query = req.query, brands = _req$query.brands, tiers = _req$query.tiers, popularity = _req$query.popularity, priceMin = _req$query.priceMin, priceMax = _req$query.priceMax, userId = _req$query.userId, _req$query$page = _req$query.page, page = _req$query$page === void 0 ? 1 : _req$query$page, _req$query$limit = _req$query.limit, limit = _req$query$limit === void 0 ? 10 : _req$query$limit; // Build the query object for filtering products

          query = {
            status: 'available' // Only fetch available products

          }; // Check if userId is provided and is a valid ObjectId

          if (userId) {
            if (!mongoose.isValidObjectId(userId)) {// return res.status(400).json({ message: 'Invalid userId' }) // Return error if userId is invalid
            } else {
              query.userId = {
                $ne: userId
              }; // Exclude products owned by the user
            }
          } // Filter by brands if provided


          if (brands && brands !== 'All') {
            if (brands === 'Other') {
              // Match products where the brand is missing (null) or explicitly "Other"
              query.$or = [{
                brand: 'Other'
              }, {
                brand: {
                  $exists: false
                }
              }, {
                brand: null
              }];
            } else {
              query.brand = brands; // Apply standard brand filtering
            }
          } // Apply tier-based price filtering


          if (tiers === '0-200') {
            query.price = {
              $gte: 0,
              $lt: 200
            };
          } else if (tiers === '201-500') {
            query.price = {
              $gte: 201,
              $lte: 500
            };
          } else if (tiers === '501-above') {
            query.price = {
              $gt: 501
            };
          } // Apply min/max price filtering if price range is provided


          if (priceMin !== undefined || priceMax !== undefined) {
            query.price = {};

            if (priceMin !== undefined) {
              query.price.$gte = priceMin;
            }

            if (priceMax !== undefined) {
              query.price.$lte = priceMax;
            }
          }

          console.log(query); // Debugging line to check the final query
          // Pagination logic

          skip = (page - 1) * limit; // Calculate how many records to skip
          // Fetch the products based on the query, and apply pagination

          _context11.next = 11;
          return regeneratorRuntime.awrap(Product.find(query).populate('userId', 'firstName lastName email') // Populate user details
          .skip(skip) // Skip records for pagination
          .limit(parseInt(limit)));

        case 11:
          products = _context11.sent;
          _context11.next = 14;
          return regeneratorRuntime.awrap(Product.countDocuments(query));

        case 14:
          totalProducts = _context11.sent;
          return _context11.abrupt("return", res.status(200).json({
            products: products,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalProducts / limit),
            totalProducts: totalProducts
          }));

        case 18:
          _context11.prev = 18;
          _context11.t0 = _context11["catch"](0);
          console.error('Error fetching products:', _context11.t0);
          res.status(500).json({
            message: 'Server Error'
          });

        case 22:
        case "end":
          return _context11.stop();
      }
    }
  }, null, null, [[0, 18]]);
});
exports.getFeaturedProducts = asyncHandler(function _callee12(req, res) {
  var userId, filter, featuredProducts;
  return regeneratorRuntime.async(function _callee12$(_context12) {
    while (1) {
      switch (_context12.prev = _context12.next) {
        case 0:
          _context12.prev = 0;
          userId = req.body.userId || null; // Extract userId from the request body (or use req.user.id if authenticated)
          // Create the filter object conditionally

          filter = {
            featured: true
          }; // Only fetch featured products

          console.log(userId);

          if (userId) {
            // If userId is provided and not null, exclude the user's own products
            filter.userId = {
              $ne: userId
            };
          } // Fetch the top 3 featured products that are not owned by the logged-in user (if userId is provided)


          _context12.next = 7;
          return regeneratorRuntime.awrap(Product.find(filter).limit(3) // Limit to 3 products
          .populate('userId', 'firstName lastName email'));

        case 7:
          featuredProducts = _context12.sent;
          // Populate user details
          // Send back the featured products
          res.status(200).json({
            featuredProducts: featuredProducts
          });
          _context12.next = 15;
          break;

        case 11:
          _context12.prev = 11;
          _context12.t0 = _context12["catch"](0);
          console.error(_context12.t0);
          res.status(500).json({
            message: 'Server Error'
          });

        case 15:
        case "end":
          return _context12.stop();
      }
    }
  }, null, null, [[0, 11]]);
});
exports.makeFeaturedProduct = asyncHandler(function _callee13(req, res) {
  var id, featured, product;
  return regeneratorRuntime.async(function _callee13$(_context13) {
    while (1) {
      switch (_context13.prev = _context13.next) {
        case 0:
          _context13.prev = 0;
          id = req.params.id;
          featured = req.body.featured;
          console.log("DATA");
          _context13.next = 6;
          return regeneratorRuntime.awrap(Product.findById(id));

        case 6:
          product = _context13.sent;

          if (product) {
            _context13.next = 9;
            break;
          }

          return _context13.abrupt("return", res.status(404).json({
            message: 'Product not found'
          }));

        case 9:
          product.featured = featured;
          _context13.next = 12;
          return regeneratorRuntime.awrap(product.save());

        case 12:
          res.status(200).json(product);
          _context13.next = 19;
          break;

        case 15:
          _context13.prev = 15;
          _context13.t0 = _context13["catch"](0);
          console.log(_context13.t0);
          res.status(500).json({
            message: 'Server error'
          });

        case 19:
        case "end":
          return _context13.stop();
      }
    }
  }, null, null, [[0, 15]]);
});
exports.ProductPageProducts = asyncHandler(function _callee14(req, res) {
  var _req$body4, id, userId, query, filteredProducts;

  return regeneratorRuntime.async(function _callee14$(_context14) {
    while (1) {
      switch (_context14.prev = _context14.next) {
        case 0:
          _context14.prev = 0;
          _req$body4 = req.body, id = _req$body4.id, userId = _req$body4.userId; // Destructure the id and userId from the request body
          // Build the base query object

          query = {
            _id: {
              $ne: id
            },
            status: 'available' // Only fetch available products

          }; // If userId is not null or undefined, exclude products from the current user

          if (userId) {
            query.userId = {
              $ne: userId
            };
          } // Fetch the filtered products and populate the userId field


          _context14.next = 6;
          return regeneratorRuntime.awrap(Product.find(query).populate('userId', 'firstName lastName email').limit(4));

        case 6:
          filteredProducts = _context14.sent;
          // Send back the filtered products
          res.status(200).json({
            filteredProducts: filteredProducts
          });
          _context14.next = 14;
          break;

        case 10:
          _context14.prev = 10;
          _context14.t0 = _context14["catch"](0);
          console.error(_context14.t0);
          res.status(500).json({
            message: 'Server Error'
          });

        case 14:
        case "end":
          return _context14.stop();
      }
    }
  }, null, null, [[0, 10]]);
});
exports.visitProductPage = asyncHandler(function _callee15(req, res) {
  var productNumber, userId, product;
  return regeneratorRuntime.async(function _callee15$(_context15) {
    while (1) {
      switch (_context15.prev = _context15.next) {
        case 0:
          productNumber = req.params.productNumber; // Assuming productNumber is passed in the URL params

          userId = req.body.userId;
          _context15.next = 4;
          return regeneratorRuntime.awrap(Product.findOne({
            productNumber: productNumber
          }));

        case 4:
          product = _context15.sent;

          if (product) {
            _context15.next = 7;
            break;
          }

          return _context15.abrupt("return", res.status(404).json({
            message: 'Product not found.'
          }));

        case 7:
          if (!(!userId || userId.toString() !== product.userId.toString())) {
            _context15.next = 11;
            break;
          }

          product.popularity += 1;
          _context15.next = 11;
          return regeneratorRuntime.awrap(product.save());

        case 11:
          res.status(200).json({
            message: 'Product visited successfully',
            popularity: product.popularity
          });

        case 12:
        case "end":
          return _context15.stop();
      }
    }
  });
});

exports.getUserStore = function _callee16(req, res) {
  var userId, user, products;
  return regeneratorRuntime.async(function _callee16$(_context16) {
    while (1) {
      switch (_context16.prev = _context16.next) {
        case 0:
          _context16.prev = 0;
          userId = req.params.userId; // Fetch user info

          _context16.next = 4;
          return regeneratorRuntime.awrap(User.findById(userId).select('name email firstName lastName photoURL description'));

        case 4:
          user = _context16.sent;

          if (user) {
            _context16.next = 7;
            break;
          }

          return _context16.abrupt("return", res.status(404).json({
            message: 'User not found'
          }));

        case 7:
          _context16.next = 9;
          return regeneratorRuntime.awrap(Product.find({
            userId: userId
          }).populate('userId', 'firstName lastName email') // Populate userId to get user's name and email for each product
          .select('name price brand width height featured condition imageUrl status popularity productNumber'));

        case 9:
          products = _context16.sent;
          return _context16.abrupt("return", res.status(200).json({
            userInfo: _objectSpread({
              id: user._id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              description: user.description
            }, user.photoURL && {
              photoURL: user.photoURL
            }),
            products: products
          }));

        case 13:
          _context16.prev = 13;
          _context16.t0 = _context16["catch"](0);
          console.error(_context16.t0);
          return _context16.abrupt("return", res.status(500).json({
            message: 'Server error'
          }));

        case 17:
        case "end":
          return _context16.stop();
      }
    }
  }, null, null, [[0, 13]]);
};

exports.fetchUserProductsExcludingId = function _callee17(req, res) {
  var _req$params, userId, excludeProductId, userProducts;

  return regeneratorRuntime.async(function _callee17$(_context17) {
    while (1) {
      switch (_context17.prev = _context17.next) {
        case 0:
          _req$params = req.params, userId = _req$params.userId, excludeProductId = _req$params.excludeProductId; // Assuming userId and excludeProductId are in the route parameters

          _context17.prev = 1;
          _context17.next = 4;
          return regeneratorRuntime.awrap(Product.find({
            userId: userId,
            _id: {
              $ne: excludeProductId
            } // Exclude the specified product ID

          }));

        case 4:
          userProducts = _context17.sent;
          return _context17.abrupt("return", res.status(200).json({
            success: true,
            products: userProducts
          }));

        case 8:
          _context17.prev = 8;
          _context17.t0 = _context17["catch"](1);
          console.error('Error fetching user products:', _context17.t0);
          return _context17.abrupt("return", res.status(500).json({
            success: false,
            message: 'Server error while fetching user products.'
          }));

        case 12:
        case "end":
          return _context17.stop();
      }
    }
  }, null, null, [[1, 8]]);
};

exports.countUserProducts = function _callee18(req, res) {
  var productCount;
  return regeneratorRuntime.async(function _callee18$(_context18) {
    while (1) {
      switch (_context18.prev = _context18.next) {
        case 0:
          _context18.prev = 0;
          _context18.next = 3;
          return regeneratorRuntime.awrap(Product.countDocuments({
            userId: req.user.id
          }));

        case 3:
          productCount = _context18.sent;
          return _context18.abrupt("return", res.status(200).json({
            success: true,
            message: 'Product count fetched successfully',
            productCount: productCount
          }));

        case 7:
          _context18.prev = 7;
          _context18.t0 = _context18["catch"](0);
          console.error('Error fetching product count:', _context18.t0);
          return _context18.abrupt("return", res.status(500).json({
            success: false,
            message: 'An error occurred while fetching the product count',
            error: _context18.t0.message
          }));

        case 11:
        case "end":
          return _context18.stop();
      }
    }
  }, null, null, [[0, 7]]);
};