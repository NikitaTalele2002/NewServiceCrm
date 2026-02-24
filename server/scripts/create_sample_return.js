import { sequelize, SpareRequest, SpareRequestItem } from '../models/index.js';

async function createSampleReturn() {
  try {
    // Get service center ID (assuming first one)
    const serviceCenter = await sequelize.query('SELECT TOP 1 Id FROM ServiceCenters', { type: sequelize.QueryTypes.SELECT });
    const serviceCenterId = serviceCenter[0].Id;

    console.log('Service Center ID:', serviceCenterId);

    // Create return request
    const returnRequest = await SpareRequest.create({
      RequestNumber: 'RET-TEST-' + Date.now(),
      ServiceCenterId: serviceCenterId,
      Status: 'pending',
      ReturnType: 'return',
      CreatedAt: new Date(),
      UpdatedAt: new Date()
    });

    await SpareRequestItem.create({
      RequestId: returnRequest.Id,
      Sku: '000000FCCSNSTGS101',
      SpareName: 'Sample Spare Part',
      RequestedQty: 1
    });

    console.log('Created return request:', returnRequest.Id, returnRequest.RequestNumber);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

createSampleReturn();