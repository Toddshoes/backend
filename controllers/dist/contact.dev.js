"use strict";

var Contact = require("../models/Contact");

var asyncHandler = require('../middleware/async');

var sendEmail = require('../utils/sendEmail');

exports.createContact = function _callee(req, res) {
  var newContact;
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          newContact = new Contact(req.body);
          _context.next = 4;
          return regeneratorRuntime.awrap(newContact.save());

        case 4:
          res.status(201).json({
            message: 'Message sent successfully!'
          });
          _context.next = 10;
          break;

        case 7:
          _context.prev = 7;
          _context.t0 = _context["catch"](0);
          res.status(500).json({
            message: 'Failed to send message.'
          });

        case 10:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 7]]);
};

exports.getAllContacts = function _callee2(req, res) {
  var _req$query, _req$query$search, search, _req$query$page, page, _req$query$limit, limit, searchQuery, skip, limitNumber, contacts, totalContacts;

  return regeneratorRuntime.async(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _req$query = req.query, _req$query$search = _req$query.search, search = _req$query$search === void 0 ? '' : _req$query$search, _req$query$page = _req$query.page, page = _req$query$page === void 0 ? 1 : _req$query$page, _req$query$limit = _req$query.limit, limit = _req$query$limit === void 0 ? 10 : _req$query$limit; // Extract search, page, and limit from query parameters

          _context2.prev = 1;
          // Build the search query
          searchQuery = {
            name: {
              $regex: search,
              $options: 'i'
            } // Case-insensitive search

          }; // Pagination logic

          skip = (page - 1) * limit; // Calculate how many records to skip

          limitNumber = parseInt(limit); // Ensure limit is a number
          // Fetch contacts based on search criteria and apply pagination

          _context2.next = 7;
          return regeneratorRuntime.awrap(Contact.find(searchQuery).skip(skip) // Skip the calculated number of records
          .limit(limitNumber));

        case 7:
          contacts = _context2.sent;
          _context2.next = 10;
          return regeneratorRuntime.awrap(Contact.countDocuments(searchQuery));

        case 10:
          totalContacts = _context2.sent;
          // Return the contacts along with the pagination data
          res.status(200).json({
            contacts: contacts,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalContacts / limitNumber),
            totalContacts: totalContacts
          });
          _context2.next = 18;
          break;

        case 14:
          _context2.prev = 14;
          _context2.t0 = _context2["catch"](1);
          console.error('Error fetching contacts:', _context2.t0);
          res.status(500).json({
            message: 'Error fetching contacts'
          });

        case 18:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[1, 14]]);
};