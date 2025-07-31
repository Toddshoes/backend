const Contact = require("../models/Contact");

const asyncHandler = require('../middleware/async')
const sendEmail = require('../utils/sendEmail')
exports.createContact = async (req, res) => {
  try {
    const newContact = new Contact(req.body)
    await newContact.save()
    res.status(201).json({ message: 'Message sent successfully!' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message.' })
  }
}

exports.getAllContacts = async (req, res) => {
  const { search = '', page = 1, limit = 10 } = req.query // Extract search, page, and limit from query parameters
  try {
    // Build the search query
    const searchQuery = {
      name: { $regex: search, $options: 'i' }, // Case-insensitive search
    }

    // Pagination logic
    const skip = (page - 1) * limit // Calculate how many records to skip
    const limitNumber = parseInt(limit) // Ensure limit is a number

    // Fetch contacts based on search criteria and apply pagination
    const contacts = await Contact.find(searchQuery)
      .skip(skip) // Skip the calculated number of records
      .limit(limitNumber) // Limit the number of records returned

    // Get the total number of contacts that match the search query
    const totalContacts = await Contact.countDocuments(searchQuery)

    // Return the contacts along with the pagination data
    res.status(200).json({
      contacts,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalContacts / limitNumber),
      totalContacts,
    })
  } catch (error) {
    console.error('Error fetching contacts:', error)
    res.status(500).json({ message: 'Error fetching contacts' })
  }
}


exports.deleteContact = async (req, res) => {
  try {
    const contactId = req.params.id

    // Find and delete the contact
    const contact = await Contact.findByIdAndDelete(contactId)

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      })
    }

    res.status(200).json({
      success: true,
      message: 'Contact deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting contact:', error)
    res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}