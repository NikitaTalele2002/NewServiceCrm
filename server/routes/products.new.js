import express from 'express';
import productController from '../controllers/productController.js';
import { authenticateToken as authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', productController.listProducts);
router.get('/by-phone/:phone', productController.productsByPhone);
router.post('/add', productController.addProduct);
router.post('/search', productController.searchProducts);
router.get('/groups', productController.getGroups);
router.get('/products/:groupId', productController.getProductsForGroup);
router.get('/models/:productId', productController.getModelsForProduct);
router.get('/spares/group/:groupId', authenticate, productController.getSparesForGroup);
router.get('/spares/product/:productId', authenticate, productController.getSparesForProduct);
router.get('/inventory', authenticate, productController.getInventory);

export default router;
