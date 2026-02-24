import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import * as adminController from '../controllers/adminController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const diskUpload = multer({ dest: uploadDir, limits: { fileSize: 50 * 1024 * 1024 } });
const memoryUpload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Upload routes
router.post("/upload-master", diskUpload.single("file"), adminController.uploadMasterData);
router.post("/upload-pincode", memoryUpload.single("file"), adminController.uploadPincode);

// Fetch master data routes
router.get("/master/models", adminController.getProductModels);
router.get("/master/state", adminController.getStates);
router.get("/master/city", adminController.getCities);
router.get("/master/pincode", adminController.getPincodes);
router.get("/master-data", adminController.getMasterData);

// CRUD master data routes
router.post('/master-data/:type', adminController.createMasterData);
router.put('/master-data/:type/:id', adminController.updateMasterData);
router.delete('/master-data/:type/:id', adminController.deleteMasterData);

// Admin specific routes
router.post('/assign-servicecenter-branch', authenticateToken, requireRole('admin'), adminController.assignServiceCentersToBranches);
router.get('/users', authenticateToken, requireRole(['admin', 'service_center']), adminController.getUsers);
router.get('/search-master', adminController.searchMasterData);
router.get('/replacement-history', authenticateToken, requireRole(['admin', 'service_center']), adminController.getReplacementHistory);

export default router;
