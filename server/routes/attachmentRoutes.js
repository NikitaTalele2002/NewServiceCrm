import express from 'express';
import {
  getAttachmentsByEntity,
  getAttachmentById,
  createSampleAttachments
} from '../controllers/attachmentController.js';

const router = express.Router();

/**
 * Get all attachments for a specific entity
 * GET /api/attachments/:entityType/:entityId
 * Example: /api/attachments/call/123
 */
router.get('/:entityType/:entityId', getAttachmentsByEntity);

/**
 * Get a specific attachment by ID
 * GET /api/attachments/:attachmentId
 */
router.get('/detail/:attachmentId', getAttachmentById);

/**
 * Create sample attachments for testing
 * POST /api/attachments/demo/create-sample
 * Body: { callId: number }
 */
router.post('/demo/create-sample', createSampleAttachments);

export default router;
