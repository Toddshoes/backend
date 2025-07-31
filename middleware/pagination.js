const paginationMiddleware = (model) => {
  return async (req, res, next) => {
    const page = parseInt(req.query.page) || 1 // Default to page 1
    const limit = parseInt(req.query.limit) || 10 // Default to limit 5
    const startIndex = (page - 1) * limit

    // Attach pagination details to the request object
    res.paginatedResults = {
      startIndex,
      limit,
    }

    next()
  }
}

module.exports = paginationMiddleware
