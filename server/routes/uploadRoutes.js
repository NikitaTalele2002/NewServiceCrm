import express from 'express';
import {
  upload,
  uploadProductGroupsController,
  uploadStatesController,
  uploadCitiesController,
  uploadPincodesController,
  uploadSparePartsController
} from '../controllers/uploadController.js';

const router = express.Router();

/**
 * Product Groups Upload
 * POST /api/upload/product-groups
 * Body: Form-data with 'file' field containing Excel file
 */
router.post('/product-groups', upload.single('file'), uploadProductGroupsController);

/**
 * States Upload
 * POST /api/upload/states
 */
router.post('/states', upload.single('file'), uploadStatesController);

/**
 * Cities Upload
 * POST /api/upload/cities
 */
router.post('/cities', upload.single('file'), uploadCitiesController);

/**
 * Pincodes Upload
 * POST /api/upload/pincodes
 */
router.post('/pincodes', upload.single('file'), uploadPincodesController);

/**
 * Spare Parts Upload
 * POST /api/upload/spare-parts
 */
router.post('/spare-parts', upload.single('file'), uploadSparePartsController);

export default router;
