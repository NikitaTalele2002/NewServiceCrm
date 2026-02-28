import express from 'express';
const router = express.Router();

import authApi from '../mobile-api/authApi.js';
import technicianCallsApi from '../mobile-api/technicianCallsApi.js';
import spareRequestsApi from '../mobile-api/spareRequestsApi.js';
import spareReturnRequestApi from '../mobile-api/spareReturnRequestApi.js';
import technicianTrackingApi from '../mobile-api/technicianTrackingApi.js';
import technicianApi from '../mobile-api/technicianApi.js';
import inventoryApi from '../mobile-api/inventoryApi.js';

/**
 * Mobile-API Sub-Router Mounting
 * All functional routes are exported as res.json handlers
 */
router.use('/auth', authApi);
router.use('/calls', technicianCallsApi);
router.use('/spare-requests', spareRequestsApi);
router.use('/spare-returns', spareReturnRequestApi);
router.use('/tracking', technicianTrackingApi);
router.use('/profile', technicianApi);
router.use('/inventory', inventoryApi);

export default router;
