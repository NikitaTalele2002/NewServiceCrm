// debug_order_request_available.js
// Usage: node debug_order_request_available.js <orderRequestId>
// Prints the available quantity for each SKU in the order request, using the plant assigned to the service center.

import { sequelize, SpareRequest, SpareRequestItem, ServiceCenter, SpareInventory } from './models/index.js';

import React from 'react';
async function debugOrderRequestAvailable(orderRequestId) {
  if (!orderRequestId) {
    console.error('Usage: node debug_order_request_available.js <orderRequestId>');
    process.exit(1);
  }
  try {
    // Fetch the order request
    const request = await SpareRequest.findByPk(orderRequestId);
    if (!request) {
      console.error('Order request not found:', orderRequestId);
      process.exit(1);
    }
    // Find the service center and its plant
    const serviceCenter = await ServiceCenter.findByPk(request.ServiceCenterId);
    if (!serviceCenter) {
      console.error('Service center not found:', request.ServiceCenterId);
      process.exit(1);
    }
    const plantId = serviceCenter.plant_id;
    if (!plantId) {
      console.error('No plant_id assigned to service center:', serviceCenter.asc_id);
      process.exit(1);
    }
    // Fetch all items in the order request
    const items = await SpareRequestItem.findAll({ where: { RequestId: request.Id } });
    if (!items.length) {
      console.log('No items found for order request:', orderRequestId);
      return;
    }
    console.log(`Order Request: ${orderRequestId} (Service Center: ${serviceCenter.asc_id}, Plant: ${plantId})`);
    for (const item of items) {
      // Check plant inventory for this SKU
      const inv = await SpareInventory.findOne({
        where: {
          spare_id: item.Sku,
          location_type: 'plant',
          location_id: plantId
        }
      });
      const available = inv ? inv.qty_good : 0;
      console.log(`  SKU: ${item.Sku}, Requested: ${item.RequestedQty}, Available at Plant: ${available}`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sequelize.close();
  }
}

const [,, orderRequestId] = process.argv;
debugOrderRequestAvailable(orderRequestId);
