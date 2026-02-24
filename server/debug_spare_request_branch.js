// debug_spare_request_branch.js
// Usage: node debug_spare_request_branch.js <spareRequestId>
// Prints the BranchId (should be plant_id), ServiceCenterId, and plant_id for the request.

import { sequelize, SpareRequest, ServiceCenter } from './models/index.js';

async function debugSpareRequestBranch(spareRequestId) {
  if (!spareRequestId) {
    console.error('Usage: node debug_spare_request_branch.js <spareRequestId>');
    process.exit(1);
  }
  try {
    const request = await SpareRequest.findByPk(spareRequestId);
    if (!request) {
      console.error('SpareRequest not found:', spareRequestId);
      process.exit(1);
    }
    const serviceCenter = await ServiceCenter.findByPk(request.ServiceCenterId);
    if (!serviceCenter) {
      console.error('ServiceCenter not found:', request.ServiceCenterId);
      process.exit(1);
    }
    console.log(`SpareRequestId: ${spareRequestId}`);
    console.log(`  BranchId (should be plant_id): ${request.BranchId}`);
    console.log(`  ServiceCenterId: ${request.ServiceCenterId}`);
    console.log(`  ServiceCenter.plant_id: ${serviceCenter.plant_id}`);
    if (request.BranchId === serviceCenter.plant_id) {
      console.log('✅ BranchId matches plant_id.');
    } else {
      console.log('❌ BranchId does NOT match plant_id!');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sequelize.close();
  }
}

const [,, spareRequestId] = process.argv;
debugSpareRequestBranch(spareRequestId);
