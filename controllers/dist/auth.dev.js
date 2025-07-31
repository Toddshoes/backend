"use strict";

var User = require('../models/User');

var ErrorResponse = require('../utils/errorResponse');

var asyncHandler = require('../middleware/async');

var axios = require('axios');

var bcrypt = require('bcryptjs');

var sendEmail = require('../utils/sendEmail');

var crypto = require('crypto');

var _require = require('console'),
    error = _require.error;

var Trade = require('../models/Trade');

var Review = require('../models/Review');

var Question = require('../models/question'); // Controller for user registration


exports.register = asyncHandler(function _callee(req, res, next) {
  var _req$body, firstName, lastName, email, password, phonenumber, emailRegex, imageUrl, existingUser, user;

  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _req$body = req.body, firstName = _req$body.firstName, lastName = _req$body.lastName, email = _req$body.email, password = _req$body.password, phonenumber = _req$body.phonenumber; // Basic validation to check if required fields are present

          if (!(!firstName || !lastName || !email || !password || !phonenumber)) {
            _context.next = 3;
            break;
          }

          return _context.abrupt("return", res.status(400).json({
            message: 'Please provide all required fields'
          }));

        case 3:
          // Example: Additional validation
          emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

          if (emailRegex.test(email)) {
            _context.next = 6;
            break;
          }

          return _context.abrupt("return", res.status(400).json({
            message: 'Please provide a valid email address'
          }));

        case 6:
          if (!(password.length < 6)) {
            _context.next = 8;
            break;
          }

          return _context.abrupt("return", res.status(400).json({
            message: 'Password must be at least 6 characters long'
          }));

        case 8:
          if (/^\d+$/.test(phonenumber)) {
            _context.next = 10;
            break;
          }

          return _context.abrupt("return", res.status(400).json({
            message: 'Please provide a valid phone number'
          }));

        case 10:
          if (req.file) {
            imageUrl = req.file.path; // This is the URL returned by Cloudinary
          } // Check if the email already exists


          _context.next = 13;
          return regeneratorRuntime.awrap(User.findOne({
            email: email
          }));

        case 13:
          existingUser = _context.sent;

          if (!existingUser) {
            _context.next = 16;
            break;
          }

          return _context.abrupt("return", res.status(400).json({
            message: 'Email already exists'
          }));

        case 16:
          _context.next = 18;
          return regeneratorRuntime.awrap(User.create({
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: password,
            phoneNumber: phonenumber,
            photoURL: imageUrl // Save image URL to the user model, assuming the model has an 'image' field

          }));

        case 18:
          user = _context.sent;
          _context.next = 21;
          return regeneratorRuntime.awrap(sendEmail({
            email: user.email,
            subject: 'Signup on the OOWAP',
            message: "Hi ".concat(user.firstName, ". Thank you for signing up on OOWAP. Your account has been successfully created")
          }));

        case 21:
          sendTokenResponse(user, 200, res);

        case 22:
        case "end":
          return _context.stop();
      }
    }
  });
});
exports.registeruseradminpanel = asyncHandler(function _callee2(req, res, next) {
  var _req$body2, displayName, email, password, role, proAccount, isProAccount, user, _splitDisplayName, firstName, lastName, subscriber, body;

  return regeneratorRuntime.async(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _req$body2 = req.body, displayName = _req$body2.displayName, email = _req$body2.email, password = _req$body2.password, role = _req$body2.role, proAccount = _req$body2.proAccount;
          console.log(displayName, email, password, role, proAccount);
          isProAccount = proAccount === 'Yes'; // Renamed for clarity

          _context2.prev = 3;
          _context2.next = 6;
          return regeneratorRuntime.awrap(User.create({
            displayName: displayName,
            email: email,
            password: password,
            role: role,
            proAccount: isProAccount,
            planSelected: true
          }));

        case 6:
          user = _context2.sent;
          console.log(user);
          _splitDisplayName = splitDisplayName(displayName), firstName = _splitDisplayName.firstName, lastName = _splitDisplayName.lastName;
          subscriber = {
            email: email,
            first_name: firstName,
            last_name: lastName,
            tags: ['trial']
          };
          body = {
            email: email,
            tags: ['trial'],
            data: {
              'First Name': firstName,
              'Last Name': lastName,
              Name: firstName + ' ' + lastName
            }
          };
          _context2.prev = 11;
          _context2.next = 14;
          return regeneratorRuntime.awrap(axios.post("https://whirl.wynd.one/api/lists/".concat(List, "/feed"), body, {
            headers: {
              'X-Auth-APIKey': process.env.WHIRL_KEY
            }
          }));

        case 14:
          return _context2.abrupt("return", res.status(200).json(user));

        case 17:
          _context2.prev = 17;
          _context2.t0 = _context2["catch"](11);
          console.error('Error adding user to Drip:', _context2.t0); // Log the error and proceed without sending an error response

        case 20:
          return _context2.abrupt("return", res.status(200).json(user));

        case 23:
          _context2.prev = 23;
          _context2.t1 = _context2["catch"](3);
          console.log(_context2.t1); // Corrected variable name

          return _context2.abrupt("return", res.status(500).json({
            error: 'Server error'
          }));

        case 27:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[3, 23], [11, 17]]);
}); // @desc      Login user
// @route     POST /api/v1/auth/login
// @access    Public

exports.login = asyncHandler(function _callee3(req, res, next) {
  var _req$body3, email, password, user, isMatch;

  return regeneratorRuntime.async(function _callee3$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _req$body3 = req.body, email = _req$body3.email, password = _req$body3.password; // Validate emil & password

          if (!(!email || !password)) {
            _context3.next = 3;
            break;
          }

          return _context3.abrupt("return", next(new ErrorResponse('Please provide an email and password', 400)));

        case 3:
          _context3.next = 5;
          return regeneratorRuntime.awrap(User.findOne({
            email: email
          }).select('+password'));

        case 5:
          user = _context3.sent;

          if (user) {
            _context3.next = 8;
            break;
          }

          return _context3.abrupt("return", next(new ErrorResponse('Invalid credentials', 401)));

        case 8:
          _context3.next = 10;
          return regeneratorRuntime.awrap(user.matchPassword(password));

        case 10:
          isMatch = _context3.sent;

          if (isMatch) {
            _context3.next = 13;
            break;
          }

          return _context3.abrupt("return", next(new ErrorResponse('Invalid credentials', 401)));

        case 13:
          sendTokenResponse(user, 200, res);

        case 14:
        case "end":
          return _context3.stop();
      }
    }
  });
});
exports.getMe = asyncHandler(function _callee4(req, res, next) {
  var user;
  return regeneratorRuntime.async(function _callee4$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _context4.next = 2;
          return regeneratorRuntime.awrap(User.findById(req.user.id));

        case 2:
          user = _context4.sent;
          res.status(200).json({
            success: true,
            data: user
          });

        case 4:
        case "end":
          return _context4.stop();
      }
    }
  });
}); // @desc      Update password
// @route     PUT /api/v1/auth/updatepassword
// @access    Private

exports.updatePassword = asyncHandler(function _callee5(req, res, next) {
  var user;
  return regeneratorRuntime.async(function _callee5$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          _context5.next = 2;
          return regeneratorRuntime.awrap(User.findById(req.user.id).select('+password'));

        case 2:
          user = _context5.sent;
          _context5.next = 5;
          return regeneratorRuntime.awrap(user.matchPassword(req.body.currentPassword));

        case 5:
          if (_context5.sent) {
            _context5.next = 7;
            break;
          }

          return _context5.abrupt("return", next(new ErrorResponse('Password is incorrect', 401)));

        case 7:
          user.password = req.body.newPassword;
          _context5.next = 10;
          return regeneratorRuntime.awrap(user.save());

        case 10:
          res.status(200).json({
            success: true
          });

        case 11:
        case "end":
          return _context5.stop();
      }
    }
  });
}); // @desc      Forgot password
// @route     POST /api/v1/auth/forgotpassword
// @access    Public

exports.forgotPassword = asyncHandler(function _callee6(req, res, next) {
  var user, resetToken, resetUrl, message;
  return regeneratorRuntime.async(function _callee6$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          _context6.next = 2;
          return regeneratorRuntime.awrap(User.findOne({
            email: req.body.email
          }));

        case 2:
          user = _context6.sent;

          if (user) {
            _context6.next = 5;
            break;
          }

          return _context6.abrupt("return", next(new ErrorResponse('There is no user with that email', 404)));

        case 5:
          // Get reset token
          resetToken = user.getResetPasswordToken();
          _context6.next = 8;
          return regeneratorRuntime.awrap(user.save({
            validateBeforeSave: false
          }));

        case 8:
          // Create reset URL
          resetUrl = "".concat(process.env.CLIENT_URL, "/reset-password-account/").concat(resetToken);
          message = "Hello,\n\n\nWe received a request to reset the password for your OOOWAP account. If you requested this password reset, please click on the link below or copy and paste it into your browser to proceed:\n  \n\nReset Password: ".concat(resetUrl, "\n  \n\nIf you did not request this password reset, please ignore this email or contact us immediately at hey@OOOWAP.com if you suspect any suspicious activity. Your security is our top priority. We recommend creating a strong, unique password that includes a combination of letters, numbers, and special characters.\n  \n\nThank you for using OOOWAP.\n  \n\nBest Regards,\nOOOWAP");
          _context6.prev = 10;
          _context6.next = 13;
          return regeneratorRuntime.awrap(sendEmail({
            email: user.email,
            subject: 'Password Reset Request for Your OOOWAP Account',
            message: message
          }));

        case 13:
          res.status(200).json({
            success: true,
            data: 'Email sent'
          });
          _context6.next = 24;
          break;

        case 16:
          _context6.prev = 16;
          _context6.t0 = _context6["catch"](10);
          console.error(_context6.t0);
          user.resetPasswordToken = undefined;
          user.resetPasswordExpire = undefined;
          _context6.next = 23;
          return regeneratorRuntime.awrap(user.save({
            validateBeforeSave: false
          }));

        case 23:
          return _context6.abrupt("return", next(new ErrorResponse('Email could not be sent', 500)));

        case 24:
          res.status(200).json({
            success: true,
            data: user
          });

        case 25:
        case "end":
          return _context6.stop();
      }
    }
  }, null, null, [[10, 16]]);
}); // @desc      Reset password
// @route     PUT /api/v1/auth/resetpassword/:resettoken
// @access    Public

exports.resetPassword = asyncHandler(function _callee7(req, res, next) {
  var resetPasswordToken, user;
  return regeneratorRuntime.async(function _callee7$(_context7) {
    while (1) {
      switch (_context7.prev = _context7.next) {
        case 0:
          // Get hashed token
          resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');
          _context7.next = 3;
          return regeneratorRuntime.awrap(User.findOne({
            resetPasswordToken: resetPasswordToken,
            resetPasswordExpire: {
              $gt: Date.now()
            }
          }));

        case 3:
          user = _context7.sent;

          if (user) {
            _context7.next = 6;
            break;
          }

          return _context7.abrupt("return", next(new ErrorResponse('The provided token is invalid or has expired. Please request a new one.', 400)));

        case 6:
          // Set new password
          user.password = req.body.password;
          user.resetPasswordToken = undefined;
          user.resetPasswordExpire = undefined;
          _context7.next = 11;
          return regeneratorRuntime.awrap(user.save());

        case 11:
          res.status(200).json({
            success: true
          });

        case 12:
        case "end":
          return _context7.stop();
      }
    }
  });
});

var email_sending = function email_sending(displayName, email, user, res) {
  var resetToken, resetUrl;
  return regeneratorRuntime.async(function email_sending$(_context8) {
    while (1) {
      switch (_context8.prev = _context8.next) {
        case 0:
          // Get reset token
          resetToken = user.generateEmailVerificationToken(); // Create reset URL

          resetUrl = "".concat(process.env.CLIENT_URL, "/email-verify/").concat(resetToken);
          message = "Dear ".concat(displayName, " \n\n,\n\n\n\nWelcome aboard and thank you for signing up for OOOWAP! You\u2019re just one step away from unlocking all the innovative features we have to offer. \n\n\n\n\n\nTo ensure the security of your account and to complete your registration process, please verify your email address by clicking on the link below:\n\n\n\n\n\n\nVerify Email Address \n\n").concat(resetUrl, "\n\n\n\nThis link will expire in 24 hours, so be sure to click it soon. If you did not sign up for a OOOWAP account, please disregard this email.\n\n\n\nWarmest regards,\n\n\n\nThe\xA0OOOWAP\xA0Team");
          _context8.prev = 3;
          _context8.next = 6;
          return regeneratorRuntime.awrap(sendEmail({
            email: email,
            subject: 'Email Verification Request for Your OOOWAP Account',
            message: message
          }));

        case 6:
          user.emailVerificationToken = resetToken;
          user.resetEmailExpire = Date.now();
          _context8.next = 10;
          return regeneratorRuntime.awrap(user.save({
            validateBeforeSave: false
          }));

        case 10:
          return _context8.abrupt("return", true);

        case 13:
          _context8.prev = 13;
          _context8.t0 = _context8["catch"](3);
          console.error(_context8.t0);
          user.emailVerificationToken = undefined;
          user.resetEmailExpire = undefined;
          _context8.next = 20;
          return regeneratorRuntime.awrap(user.save({
            validateBeforeSave: false
          }));

        case 20:
          return _context8.abrupt("return", false);

        case 21:
          return _context8.abrupt("return", true);

        case 22:
        case "end":
          return _context8.stop();
      }
    }
  }, null, null, [[3, 13]]);
}; // Email verification controller


exports.verifyEmail = function _callee8(req, res) {
  var token, user;
  return regeneratorRuntime.async(function _callee8$(_context9) {
    while (1) {
      switch (_context9.prev = _context9.next) {
        case 0:
          token = req.params.token;
          _context9.prev = 1;
          _context9.next = 4;
          return regeneratorRuntime.awrap(User.findOne({
            emailVerificationToken: token,
            isEmailVerified: false // resetEmailExpire: { $gt: Date.now() },

          }));

        case 4:
          user = _context9.sent;
          console.log(token);
          console.log(user);

          if (user) {
            _context9.next = 9;
            break;
          }

          return _context9.abrupt("return", res.status(400).send('Invalid or expired email verification token.'));

        case 9:
          user.isEmailVerified = true;
          user.emailVerificationToken = undefined; // Clear the token after verification

          console.log(user.isEmailVerified);
          _context9.next = 14;
          return regeneratorRuntime.awrap(user.save());

        case 14:
          res.send('Email verified successfully.');
          _context9.next = 21;
          break;

        case 17:
          _context9.prev = 17;
          _context9.t0 = _context9["catch"](1);
          console.error(_context9.t0);
          res.status(500).send('Server error during email verification.');

        case 21:
        case "end":
          return _context9.stop();
      }
    }
  }, null, null, [[1, 17]]);
}; // @desc      Verify Email
// @route     POST /api/v1/auth/forgotpassword
// @access    Public


exports.verifyEmailSend = asyncHandler(function _callee9(req, res, next) {
  var user, userdata, emailsend;
  return regeneratorRuntime.async(function _callee9$(_context10) {
    while (1) {
      switch (_context10.prev = _context10.next) {
        case 0:
          _context10.next = 2;
          return regeneratorRuntime.awrap(User.findOne({
            email: req.user.email
          }));

        case 2:
          user = _context10.sent;

          if (user) {
            _context10.next = 5;
            break;
          }

          return _context10.abrupt("return", next(new ErrorResponse('There is no user with that email', 404)));

        case 5:
          _context10.next = 7;
          return regeneratorRuntime.awrap(User.findById(user._id));

        case 7:
          userdata = _context10.sent;
          emailsend = email_sending(user.displayName, user.email, userdata, res);

          if (emailsend) {
            res.status(200).send('Email sent successfully');
          } else {
            res.status(400).send('Failed to send the email');
          } // Get reset token


        case 10:
        case "end":
          return _context10.stop();
      }
    }
  });
});

var sendTokenResponse = function sendTokenResponse(user, statusCode, res) {
  // Create token
  var token = user.getSignedJwtToken();
  var options = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    token: token,
    expiresIn: options.expires,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      image: user.photoURL,
      balance: user.balance,
      address: user.address,
      country: user.country,
      state: user.state,
      postalcode: user.postalcode,
      city: user.city
    }
  });
};

function splitDisplayName(displayName) {
  // Assuming the display name is formatted as "FirstName LastName"
  var nameParts = displayName.split(' '); // Extract first name and last name

  var firstName = nameParts[0];
  var lastName = nameParts.slice(1).join(' '); // Join the remaining parts as the last name

  return {
    firstName: firstName,
    lastName: lastName
  };
}

exports.allusers = asyncHandler(function _callee10(req, res, next) {
  var users;
  return regeneratorRuntime.async(function _callee10$(_context11) {
    while (1) {
      switch (_context11.prev = _context11.next) {
        case 0:
          _context11.next = 2;
          return regeneratorRuntime.awrap(User.find({}));

        case 2:
          users = _context11.sent;
          return _context11.abrupt("return", res.status(200).json({
            success: true,
            data: users
          }));

        case 4:
        case "end":
          return _context11.stop();
      }
    }
  });
});
exports.deleteuser = asyncHandler(function _callee11(req, res, next) {
  var user;
  return regeneratorRuntime.async(function _callee11$(_context12) {
    while (1) {
      switch (_context12.prev = _context12.next) {
        case 0:
          console.log('User id', req.params.id);
          _context12.next = 3;
          return regeneratorRuntime.awrap(User.findByIdAndDelete(req.params.id));

        case 3:
          user = _context12.sent;

          if (user) {
            _context12.next = 6;
            break;
          }

          return _context12.abrupt("return", next(new ErrorResponse("No user with the id of ".concat(req.params.id))));

        case 6:
          return _context12.abrupt("return", res.status(200).json({
            success: true,
            data: user
          }));

        case 7:
        case "end":
          return _context12.stop();
      }
    }
  });
});
exports.updateuser = asyncHandler(function _callee12(req, res, next) {
  var user, updatedUser;
  return regeneratorRuntime.async(function _callee12$(_context13) {
    while (1) {
      switch (_context13.prev = _context13.next) {
        case 0:
          console.log('User id', req.params.id);
          _context13.next = 3;
          return regeneratorRuntime.awrap(User.findById(req.params.id));

        case 3:
          user = _context13.sent;
          console.log(req.body);

          if (!user) {
            _context13.next = 17;
            break;
          }

          console.log('user found');
          user.firstName = req.body.firstName || user.firstName;
          user.lastName = req.body.lastName || user.lastName;
          user.email = req.body.email || user.email;
          user.role = req.body.role || user.role;
          user.phoneNumber = req.body.phoneNumber || user.phoneNumber;

          if (req.body.password != '') {
            user.password = req.body.password || user.password;
          }

          _context13.next = 15;
          return regeneratorRuntime.awrap(user.save());

        case 15:
          updatedUser = _context13.sent;
          return _context13.abrupt("return", res.json({
            _id: updatedUser._id,
            displayName: updatedUser.displayName,
            email: updatedUser.email,
            role: updatedUser.role
          }));

        case 17:
          return _context13.abrupt("return", res.status(500).json({
            message: 'User not found'
          }));

        case 18:
        case "end":
          return _context13.stop();
      }
    }
  });
});
exports.updateUserProfile = asyncHandler(function _callee13(req, res, next) {
  var user, imageUrl, isMatch, updatedUser;
  return regeneratorRuntime.async(function _callee13$(_context14) {
    while (1) {
      switch (_context14.prev = _context14.next) {
        case 0:
          console.log('User ID:', req.user.id);
          console.log(req.body);
          _context14.next = 4;
          return regeneratorRuntime.awrap(User.findById(req.user.id).select('+password'));

        case 4:
          user = _context14.sent;

          if (user) {
            _context14.next = 7;
            break;
          }

          return _context14.abrupt("return", res.status(404).json({
            message: 'User not found'
          }));

        case 7:
          console.log('User found'); // Update profile fields from the request body or retain existing values

          user.firstName = req.body.firstName || user.firstName;
          user.lastName = req.body.lastName || user.lastName;
          user.email = req.body.email || user.email;
          user.phoneNumber = req.body.phoneNumber || user.phoneNumber;
          user.address = req.body.address || user.address;
          user.country = req.body.country || user.country;
          user.state = req.body.state || user.state;
          user.city = req.body.city || user.city;
          user.postalcode = req.body.postalcode || user.postalcode;
          user.description = req.body.description || user.description;

          if (req.file) {
            imageUrl = req.file.path; // This is the URL returned by Cloudinary
          }

          user.photoURL = imageUrl || user.photoURL; // Handle password update if provided

          if (!(req.body.password && req.body.newPassword)) {
            _context14.next = 29;
            break;
          }

          if (user.password) {
            _context14.next = 23;
            break;
          }

          return _context14.abrupt("return", res.status(400).json({
            message: 'User does not have a password set'
          }));

        case 23:
          _context14.next = 25;
          return regeneratorRuntime.awrap(user.matchPassword(req.body.password));

        case 25:
          isMatch = _context14.sent;

          if (isMatch) {
            _context14.next = 28;
            break;
          }

          return _context14.abrupt("return", res.status(400).json({
            message: 'Incorrect current password'
          }));

        case 28:
          // Update the password and let the pre('save') hook hash it
          user.password = req.body.newPassword;

        case 29:
          _context14.next = 31;
          return regeneratorRuntime.awrap(user.save());

        case 31:
          updatedUser = _context14.sent;
          // Save the updated user data
          // Return the updated user data to the frontend
          console.log('Updated user', updatedUser);
          return _context14.abrupt("return", res.json({
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
            image: updatedUser.photoURL
          }));

        case 34:
        case "end":
          return _context14.stop();
      }
    }
  });
});
exports.getUserProfile = asyncHandler(function _callee14(req, res, next) {
  var user;
  return regeneratorRuntime.async(function _callee14$(_context15) {
    while (1) {
      switch (_context15.prev = _context15.next) {
        case 0:
          _context15.next = 2;
          return regeneratorRuntime.awrap(User.findById(req.user.id).select('-password'));

        case 2:
          user = _context15.sent;

          if (!user) {
            _context15.next = 5;
            break;
          }

          return _context15.abrupt("return", res.json({
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
          }));

        case 5:
          return _context15.abrupt("return", res.status(404).json({
            message: 'User not found'
          }));

        case 6:
        case "end":
          return _context15.stop();
      }
    }
  });
});
exports.countuser = asyncHandler(function _callee15(req, res, next) {
  var nowUtc8, startOfMonthUtc8, startOfDayUtc8, startOfMonth, startOfDay, now, totalUsers, monthlyUsers, dailyUsers;
  return regeneratorRuntime.async(function _callee15$(_context16) {
    while (1) {
      switch (_context16.prev = _context16.next) {
        case 0:
          _context16.prev = 0;
          // Current date in UTC-8
          nowUtc8 = new Date(new Date().toLocaleString('en-US', {
            timeZone: 'America/Los_Angeles'
          })); // Start of the month in UTC-8

          startOfMonthUtc8 = new Date(nowUtc8.getFullYear(), nowUtc8.getMonth(), 1); // Start of the day in UTC-8

          startOfDayUtc8 = new Date(nowUtc8.getFullYear(), nowUtc8.getMonth(), nowUtc8.getDate()); // Current date and start of the month

          startOfMonth = new Date(Date.UTC(startOfMonthUtc8.getFullYear(), startOfMonthUtc8.getMonth(), startOfMonthUtc8.getDate()));
          startOfDay = new Date(Date.UTC(startOfDayUtc8.getFullYear(), startOfDayUtc8.getMonth(), startOfDayUtc8.getDate()));
          now = new Date(Date.UTC(nowUtc8.getFullYear(), nowUtc8.getMonth(), nowUtc8.getDate(), nowUtc8.getHours(), nowUtc8.getMinutes(), nowUtc8.getSeconds())); // Count total users

          _context16.next = 9;
          return regeneratorRuntime.awrap(User.countDocuments());

        case 9:
          totalUsers = _context16.sent;
          _context16.next = 12;
          return regeneratorRuntime.awrap(User.countDocuments({
            createdAt: {
              $gte: startOfMonth,
              $lte: now
            }
          }));

        case 12:
          monthlyUsers = _context16.sent;
          _context16.next = 15;
          return regeneratorRuntime.awrap(User.countDocuments({
            createdAt: {
              $gte: startOfDay,
              $lte: now
            }
          }));

        case 15:
          dailyUsers = _context16.sent;
          // Return the counts
          res.status(200).json({
            success: true,
            data: {
              totalUsers: totalUsers,
              monthlyUsers: monthlyUsers,
              dailyUsers: dailyUsers
            }
          });
          _context16.next = 22;
          break;

        case 19:
          _context16.prev = 19;
          _context16.t0 = _context16["catch"](0);
          res.status(500).json({
            success: false,
            error: 'Server Error'
          });

        case 22:
        case "end":
          return _context16.stop();
      }
    }
  }, null, null, [[0, 19]]);
});

exports.getUserMetrics = function _callee16(req, res) {
  var userId, tradesCount, reviewsCount, questionsCount;
  return regeneratorRuntime.async(function _callee16$(_context17) {
    while (1) {
      switch (_context17.prev = _context17.next) {
        case 0:
          _context17.prev = 0;
          userId = req.user.id; // Assuming you have middleware to set req.user
          // Fetch metrics

          _context17.next = 4;
          return regeneratorRuntime.awrap(Trade.countDocuments({
            $or: [{
              offerer: userId
            }, {
              receiver: userId
            }]
          }));

        case 4:
          tradesCount = _context17.sent;
          _context17.next = 7;
          return regeneratorRuntime.awrap(Review.countDocuments({
            reviewer: userId
          }));

        case 7:
          reviewsCount = _context17.sent;
          _context17.next = 10;
          return regeneratorRuntime.awrap(Question.countDocuments({
            asker: userId
          }));

        case 10:
          questionsCount = _context17.sent;
          res.status(200).json({
            trades: tradesCount,
            reviews: reviewsCount,
            totalQuestions: questionsCount
          });
          _context17.next = 18;
          break;

        case 14:
          _context17.prev = 14;
          _context17.t0 = _context17["catch"](0);
          console.error(_context17.t0); // Log the error for debugging

          res.status(500).json({
            message: 'Error fetching user metrics',
            error: _context17.t0.message
          });

        case 18:
        case "end":
          return _context17.stop();
      }
    }
  }, null, null, [[0, 14]]);
};

exports.getUserMetrics2 = function _callee17(req, res) {
  var userId, user, tradesCount, reviews, averageRating, questionsCount;
  return regeneratorRuntime.async(function _callee17$(_context18) {
    while (1) {
      switch (_context18.prev = _context18.next) {
        case 0:
          _context18.prev = 0;
          userId = req.user.id; // Assuming user ID is set in req.user
          // Fetch user creation date

          _context18.next = 4;
          return regeneratorRuntime.awrap(User.findById(userId));

        case 4:
          user = _context18.sent;

          if (user) {
            _context18.next = 7;
            break;
          }

          return _context18.abrupt("return", res.status(404).json({
            message: 'User not found'
          }));

        case 7:
          _context18.next = 9;
          return regeneratorRuntime.awrap(Trade.countDocuments({
            $and: [{
              $or: [{
                offerer: userId
              }, {
                receiver: userId
              }]
            }, // Matches either the offerer or receiver
            {
              status: 'completed'
            } // Ensures the trade status is completed
            ]
          }));

        case 9:
          tradesCount = _context18.sent;
          _context18.next = 12;
          return regeneratorRuntime.awrap(Review.find({
            reviewer: userId
          }));

        case 12:
          reviews = _context18.sent;
          averageRating = reviews.length > 0 ? reviews.reduce(function (acc, review) {
            return acc + review.rating;
          }, 0) / reviews.length : 0; // Fetch total questions asked by the user

          _context18.next = 16;
          return regeneratorRuntime.awrap(Question.countDocuments({
            asker: userId
          }));

        case 16:
          questionsCount = _context18.sent;
          // Adjust 'asker' to your actual field name
          res.status(200).json({
            creationDate: user.createdAt,
            totalTrades: tradesCount,
            averageRating: averageRating.toFixed(2),
            // Format to 2 decimal places
            totalQuestions: questionsCount // Include the total questions count

          });
          _context18.next = 24;
          break;

        case 20:
          _context18.prev = 20;
          _context18.t0 = _context18["catch"](0);
          console.error(_context18.t0);
          res.status(500).json({
            message: 'Error fetching user metrics',
            error: _context18.t0.message
          });

        case 24:
        case "end":
          return _context18.stop();
      }
    }
  }, null, null, [[0, 20]]);
};