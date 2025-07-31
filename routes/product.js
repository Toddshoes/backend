const express = require('express')
const router = express.Router()
const productController = require('../controllers/product')
const upload = require('../middleware/multer')
const { protect } = require('../middleware/auth')
const paginationMiddleware = require('../middleware/pagination')
const Product = require('../models/Product')
// Existing routes (for completeness)



router.post('/featured-products', productController.getFeaturedProducts)
router.get('/countuserproducts', protect,productController.countUserProducts)
router.post('/:productId/visit', productController.visitProductPage)
router.get(
  '/filtered',
  // paginationMiddleware(Product),
  productController.getFilteredProducts,
)
router.get('/:id', productController.getProductById)

router.get('/productnumber/:id', productController.getProductByNumber)

router.post(
  '/productpageproducts',
  
  productController.ProductPageProducts,
)
router.get('/store/:userId', productController.getUserStore)


router.use(protect)

router.post(
  '/products',
  upload.fields([
    { name: 'imageUrl', maxCount: 1 },
    { name: 'imageUrl1', maxCount: 1 },
    { name: 'imageUrl2', maxCount: 1 },
  ]),
  productController.createProduct,
)
router.get('/', productController.getAllProducts)
router.get('/products/userproducts', productController.getUserProducts)
router.get(
  '/products/userproductsquestions',
  productController.getUserProductsQuestions,
)
router.get('/products/featured-products', productController.getUserFeaturedProducts)
router.get(
  '/products/:userId/exclude/:excludeProductId',
  productController.fetchUserProductsExcludingId,
)



router.put('/products/:id/feature', productController.makeFeaturedProduct)


router.put(
  '/products/:id',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'imageUrl1', maxCount: 1 },
    { name: 'imageUrl2', maxCount: 1 },
  ]),
  productController.updateProductById,
)
router.delete('/:id', productController.deleteProductById)

// New route for exchanging a product
router.put('/exchange', productController.exchangeProduct)

module.exports = router
