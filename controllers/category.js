const Category = require('../models/Category')
const asyncHandler = require('../middleware/async')

// Create a new category
exports.createCategory = asyncHandler(async (req, res) => {
  const { name } = req.body

  if (!name) {
    return res.status(400).json({ message: 'Category name is required.' })
  }

  const category = new Category({ name })
  await category.save()
  res.status(201).json(category)
})

// Get all categories
exports.getAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find()
  res.status(200).json(categories)
})

// Get a single category by ID
exports.getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id)

  if (!category) {
    return res.status(404).json({ message: 'Category not found.' })
  }

  res.status(200).json(category)
})

// Update a category by ID
exports.updateCategoryById = asyncHandler(async (req, res) => {
  const { name } = req.body

  const category = await Category.findById(req.params.id)

  if (!category) {
    return res.status(404).json({ message: 'Category not found.' })
  }

  category.name = name || category.name

  await category.save()
  res.status(200).json(category)
})

// Delete a category by ID
exports.deleteCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id)

  if (!category) {
    return res.status(404).json({ message: 'Category not found.' })
  }

  res.status(200).json({ message: 'Category deleted successfully.' })
})
