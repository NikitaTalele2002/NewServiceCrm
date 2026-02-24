// debug_spare_request_visibility.js
// Usage: node debug_spare_request_visibility.js <rsmUserId>
// Prints all spare requests, their requested_to_id, and plant/state mapping for the RSM.

import { sequelize, SpareRequest, ServiceCenter, Plant, RSMStateMapping } from './models/index.js';

async function debugSpareRequestVisibility(rsmUserId) {
  if (!rsmUserId) {
    console.error('Usage: node debug_spare_request_visibility.js <rsmUserId>');
    process.exit(1);
  } 
  try {
    // Find all state_ids assigned to this RSM
    const mappings = await RSMStateMapping.findAll({ where: { rsm_user_id: rsmUserId, is_active: true } });
    const stateIds = mappings.map(m => m.state_id);
    if (!stateIds.length) {
      console.log('No states assigned to RSM:', rsmUserId);
      return;
    }
    // Find all plants in those states
    const plants = await Plant.findAll({ where: { state_id: stateIds } });
    const plantIds = plants.map(p => p.plant_id);
    if (!plantIds.length) {
      console.log('No plants found for RSM states:', stateIds);
      return;
    }
    // Print plant mapping
    console.log(`RSM ${rsmUserId} assigned states: ${stateIds.join(', ')}`);
    console.log(`Plants in those states: ${plantIds.join(', ')}`);
    // Find all spare requests
    const requests = await SpareRequest.findAll();
    if (!requests.length) {
      console.log('No spare requests found');
      return;
    }
    for (const req of requests) {
      const visible = plantIds.includes(req.requested_to_id) ? 'VISIBLE' : 'NOT VISIBLE';
      console.log(`RequestId: ${req.request_id}, From SC: ${req.requested_source_id}, To Plant: ${req.requested_to_id}, Reason: ${req.request_reason}, Status: ${req.status_id}, ${visible}`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sequelize.close();
  }
}

const [,, rsmUserId] = process.argv;
debugSpareRequestVisibility(rsmUserId);

